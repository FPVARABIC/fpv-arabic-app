import 'server-only';
import { cache } from 'react';
import { getStoreDoc, isServiceConfigured } from '../backend/supabase/adminData';
import {
  SETTINGS_DOC_PUBLIC, SETTINGS_DOC_PRIVATE,
  INITIAL_PUBLIC_SETTINGS, INITIAL_PRIVATE_SETTINGS,
  validatePublicSettings, validatePrivateSettings,
} from '@core/data/store/settings';
import type { StorePrivateSettings, StorePublicSettings } from '@core/data/store/types';

/**
 * The settings the shop actually runs on.
 *
 * The seeds in the core are what the store has before anybody has configured
 * it. This is where the configured values come from — and the whole reason the
 * seeds were written as seeds rather than constants: «change the margin» must
 * not be a deployment.
 *
 * WHY A FAILED READ FALLS BACK RATHER THAN THROWING
 * -------------------------------------------------
 * A shop that 500s because its settings document is unreachable is a shop that
 * is down. One that renders with its seed banner and its seed margin is a shop
 * running on last known-good policy — and since the margin only ever produces a
 * price that is then STORED on the product, a temporary fallback cannot silently
 * re-price anything a customer is looking at.
 *
 * Request-scoped, not process-scoped: an owner who raises the margin expects
 * the next page to use it.
 */

export const privateStoreSettings = cache(async (): Promise<StorePrivateSettings> => {
  if (!isServiceConfigured()) return INITIAL_PRIVATE_SETTINGS;
  try {
    const doc = await getStoreDoc('storeSettings', SETTINGS_DOC_PRIVATE);
    return doc ? validatePrivateSettings(doc) : INITIAL_PRIVATE_SETTINGS;
  } catch {
    return INITIAL_PRIVATE_SETTINGS;
  }
});

export const publicStoreSettings = cache(async (): Promise<StorePublicSettings> => {
  if (!isServiceConfigured()) return INITIAL_PUBLIC_SETTINGS;
  try {
    const doc = await getStoreDoc('storeSettings', SETTINGS_DOC_PUBLIC);
    return doc ? validatePublicSettings(doc) : INITIAL_PUBLIC_SETTINGS;
  } catch {
    return INITIAL_PUBLIC_SETTINGS;
  }
});
