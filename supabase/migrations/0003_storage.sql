-- FPVARABIC — Storage buckets and their policies, phase three.
--
-- NOT YET APPLIED TO THE REAL SUPABASE PROJECT. Proven against a local
-- PostgreSQL 16 by `scripts/testSupabaseStorage.ts`, and nowhere else yet.
--
-- THE NAMES WERE CHECKED AGAINST THE CONTRACTS BEFORE BEING ADOPTED
-- =================================================================
-- `storage.rules` today grants exactly two paths, and the buckets below keep
-- both shapes so nothing that already works has to change its mind:
--
--   community/posts/{uid}/{postId}/{file}   public read · owner write · owner delete
--   store/products/{productId}/{file}       public read · write:false · delete:false
--
-- The path prefix becomes the bucket, and the rest of the path is preserved
-- verbatim. `community-media/{uid}/{postId}/{file}` is the same contract with
-- `community/posts/` moved into the bucket name.
--
-- Note what `store/products` actually said: write AND delete are `false` for
-- every client, including an admin's browser. That is stricter than the brief's
-- «من يملك القدرة الإدارية المناسبة», and it is kept — an admin uploads through
-- a server action, which is also where the audit entry gets written. A policy
-- that let an admin's browser write directly would move that upload out of the
-- audit trail.
--
-- WHAT IS NOT HERE, AND MUST NOT BE
-- =================================
-- The static images committed to the repository:
--     web/public/assets/store/**      web/public/assets/projects/**
-- Those are version-controlled files with a manifest, uploaded through GitHub,
-- and they are served by Vercel as part of the build. They are not user
-- content, they have no owner, and giving them a bucket would create a second
-- place for a product photograph to live — which is exactly the ambiguity the
-- manifest exists to remove.
--
-- Storage here is ONLY for what is uploaded at runtime.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- The buckets
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `public` on a bucket means «readable without a token». It is true for three
-- of the four because the images genuinely appear on public pages — an avatar
-- beside a post, a product photograph in the shop — and a signed URL for every
-- one of them would mean the shop cannot be cached by a CDN at all.
--
-- It is NOT a licence to write. Public read and authenticated write are
-- separate concerns, and the policies below are what decide the second.
--
-- `file_size_limit` and `allowed_mime_types` are enforced by the Storage API
-- before an object is created. The policies repeat the checks, deliberately:
-- the bucket columns are configuration, and configuration is one console click
-- from being different.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- An avatar is small on purpose. A 5 MB profile picture is a 5 MB download
  -- on every feed row that shows it.
  ('avatars', 'avatars', true, 2 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp']),

  -- Community media carries video, so the ceiling is the video's, not the
  -- image's. The phone app already compresses before upload.
  ('community-media', 'community-media', true, 100 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
         'video/mp4', 'video/webm', 'video/quicktime']),

  -- Admin-uploaded product photography. Distinct from the committed
  -- `web/public/assets/store/**` set, which stays in the repository.
  ('store-products', 'store-products', true, 10 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp']),

  -- Same, for projects.
  ('project-images', 'project-images', true, 10 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared guards
-- ─────────────────────────────────────────────────────────────────────────────

/*
 * IS THIS OBJECT'S PATH ROOTED AT THE CALLER'S OWN FOLDER?
 *
 * `storage.foldername(name)` splits the object path; element 1 is the first
 * segment. Comparing it to `auth.uid()` is the whole «مسار المستخدم لا يكتبه
 * مستخدم آخر» rule, and it belongs in the database rather than in the code
 * that builds the path — a client picks its own path, so a check on the client
 * is a suggestion.
 */
create or replace function public.storage_path_is_own(object_name text)
returns boolean
language sql stable set search_path = storage, public, pg_temp as $$
  select (storage.foldername(object_name))[1] = auth.uid()::text
$$;

/*
 * REFUSE ANYTHING THAT IS NOT A PLAIN, EXPECTED FILE NAME.
 *
 * This is «منع المسارات خارج النطاق» and «منع رفع الملفات التنفيذية المتخفية»
 * in one predicate, and every clause below is a real trick:
 *
 *   `..`            climbs out of the caller's folder
 *   a leading `/`   re-roots the path
 *   `\`             is a separator on some clients and not others
 *   a NUL byte      truncates the name in C-based tooling, so `x.png\0.sh`
 *                   stores as one thing and is read as another
 *   two dots        `photo.png.sh` — the extension that matters is the LAST
 *                   one, and a double extension is how the first is used as
 *                   camouflage
 *
 * The extension allow-list is positive: anything not named is refused, so a
 * format nobody thought about is denied rather than permitted.
 */
create or replace function public.storage_name_is_safe(object_name text)
returns boolean
language sql immutable set search_path = pg_temp as $$
  select object_name is not null
     and length(object_name) between 3 and 512
     and object_name !~ '\.\.'
     and object_name !~ '^/'
     and object_name !~ '//'
     and object_name !~ '\\'
     and object_name !~ E'\\u0000'
     and object_name !~ '[[:cntrl:]]'
     -- Exactly one dot in the final segment: `a/b/photo.webp` passes,
     -- `a/b/photo.png.sh` does not.
     and (regexp_count(regexp_replace(object_name, '^.*/', ''), '\.')) = 1
$$;

create or replace function public.storage_ext_allowed(object_name text, kinds text[])
returns boolean
language sql immutable set search_path = pg_temp as $$
  select lower(regexp_replace(object_name, '^.*\.', '')) = any (kinds)
$$;

/*
 * THE DECLARED MIME TYPE MUST ALSO BE ON THE LIST.
 *
 * Checked as well as the extension because they are two different lies: a
 * `.png` carrying `application/x-sh`, or a `.sh` declared as `image/png`.
 * Requiring both to be sane and to agree in kind removes both.
 *
 * `metadata` is null on some code paths, so the null case is refused rather
 * than skipped — the safe reading of «I do not know what this is».
 */
create or replace function public.storage_mime_allowed(meta jsonb, kinds text[])
returns boolean
language sql immutable set search_path = pg_temp as $$
  select meta is not null
     and meta ? 'mimetype'
     and lower(meta->>'mimetype') = any (kinds)
$$;

create or replace function public.storage_size_within(meta jsonb, max_bytes bigint)
returns boolean
language sql immutable set search_path = pg_temp as $$
  select meta is not null
     and meta ? 'size'
     and (meta->>'size')::bigint > 0
     and (meta->>'size')::bigint <= max_bytes
$$;

grant execute on function
  public.storage_path_is_own, public.storage_name_is_safe,
  public.storage_ext_allowed, public.storage_mime_allowed,
  public.storage_size_within
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- avatars
-- ─────────────────────────────────────────────────────────────────────────────

create policy avatars_read_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy avatars_write_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and public.storage_path_is_own(name)
    and public.is_active()
    and public.storage_name_is_safe(name)
    and public.storage_ext_allowed(name, array['jpg','jpeg','png','webp'])
    and public.storage_mime_allowed(metadata, array['image/jpeg','image/png','image/webp'])
    and public.storage_size_within(metadata, 2 * 1024 * 1024)
  );

-- Replacing your own avatar is an update; replacing somebody else's is the
-- thing this exists to stop. `using` picks the row, `with check` validates the
-- replacement — both are needed, and omitting the second is the classic error.
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.storage_path_is_own(name))
  with check (
    bucket_id = 'avatars'
    and public.storage_path_is_own(name)
    and public.storage_name_is_safe(name)
    and public.storage_ext_allowed(name, array['jpg','jpeg','png','webp'])
    and public.storage_mime_allowed(metadata, array['image/jpeg','image/png','image/webp'])
    and public.storage_size_within(metadata, 2 * 1024 * 1024)
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.storage_path_is_own(name));

-- ─────────────────────────────────────────────────────────────────────────────
-- community-media  →  {uid}/{postId}/{file}
-- ─────────────────────────────────────────────────────────────────────────────

create policy community_media_read_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'community-media');

/*
 * «وسائط المجتمع تُربط بصاحبها والمنشور الخاص بها».
 *
 * Two segments are required and both mean something: the first is the owner,
 * the second is the post. A file at the bucket root belongs to no post and can
 * never be cleaned up, because nothing knows what it was for — so it is
 * refused at upload rather than swept up later.
 */
create policy community_media_write_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community-media'
    and public.storage_path_is_own(name)
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] <> ''
    and public.is_active()
    and public.storage_name_is_safe(name)
    and public.storage_ext_allowed(name,
      array['jpg','jpeg','png','webp','gif','mp4','webm','mov'])
    and public.storage_mime_allowed(metadata,
      array['image/jpeg','image/png','image/webp','image/gif',
            'video/mp4','video/webm','video/quicktime'])
    and public.storage_size_within(metadata, 100 * 1024 * 1024)
  );

create policy community_media_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-media' and public.storage_path_is_own(name));

-- Moderators remove media that violates the rules. They do NOT get a blanket
-- write: taking something down and putting something up are different powers,
-- and «عدم منح المشرف وصولاً ضمنياً لكل شيء إلا بقدرة صريحة» is the reason
-- there is no matching insert policy for them.
create policy community_media_delete_staff on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-media' and public.is_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- store-products and project-images — ADMIN WRITE ONLY
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Read is public because the shop and the project pages are public. Write is
-- `is_admin()`, NOT `is_staff()`: a moderator moderates community content, and
-- the catalogue is not community content. This is the same distinction that
-- keeps them out of `store_supply`, and getting it wrong here would be just as
-- invisible.
--
-- A normal user has no insert, update or delete policy on either bucket at
-- all, which is «المستخدم العادي لا يستطيع حذف أو استبدال صور المتجر».

create policy store_products_read_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'store-products');

create policy store_products_write_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'store-products'
    and public.is_admin()
    and array_length(storage.foldername(name), 1) >= 1
    and public.storage_name_is_safe(name)
    and public.storage_ext_allowed(name, array['jpg','jpeg','png','webp'])
    and public.storage_mime_allowed(metadata, array['image/jpeg','image/png','image/webp'])
    and public.storage_size_within(metadata, 10 * 1024 * 1024)
  );

create policy store_products_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'store-products' and public.is_admin())
  with check (
    bucket_id = 'store-products'
    and public.is_admin()
    and public.storage_name_is_safe(name)
    and public.storage_ext_allowed(name, array['jpg','jpeg','png','webp'])
  );

create policy store_products_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'store-products' and public.is_admin());

create policy project_images_read_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'project-images');

create policy project_images_write_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-images'
    and public.is_admin()
    and array_length(storage.foldername(name), 1) >= 1
    and public.storage_name_is_safe(name)
    and public.storage_ext_allowed(name, array['jpg','jpeg','png','webp'])
    and public.storage_mime_allowed(metadata, array['image/jpeg','image/png','image/webp'])
    and public.storage_size_within(metadata, 10 * 1024 * 1024)
  );

create policy project_images_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'project-images' and public.is_admin())
  with check (bucket_id = 'project-images' and public.is_admin());

create policy project_images_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-images' and public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Anything else is denied, and that includes buckets nobody has invented yet.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Every policy above names its `bucket_id`. An object in an unknown bucket
-- matches none of them, so RLS refuses it — which is «ملف يتيم أو مسار غير
-- معروف يُرفض» without needing a rule that tries to enumerate the unknown.

commit;
