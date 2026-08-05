import { registerSearchDocs } from '@core/data/kb/search/buildIndex';
import { projectSearchDocs } from './projectDocs';
import { storeSearchDocs } from './storeDocs';
import { pageSearchDocs } from './pageDocs';

/**
 * Teaching the one search engine about the sections only the web has.
 *
 * WHY THIS IS A FUNCTION AND NOT A TOP-LEVEL SIDE EFFECT
 * ------------------------------------------------------
 * An import with side effects is an import somebody deletes because it "looks
 * unused", and the failure is silent: the shop simply stops being findable and
 * nothing errors. A call the search page makes on every request is a call that
 * shows up in the file that needs it.
 *
 * It is cheap to call repeatedly. `registerSearchDocs` is keyed and idempotent,
 * and the providers are not invoked until the index is first built.
 *
 * WHY THE WHOLE PLATFORM IS ONE INDEX AND NOT THREE SEARCHES
 * ----------------------------------------------------------
 * Because a person looking for «مستقبل ExpressLRS» does not know whether they
 * want the article, the setup step, or the product — and being made to guess
 * which box to type into is the failure. One field, one engine, one ranking,
 * and the RESULTS are grouped by what kind of thing they are. That is also why
 * this layer is being built properly now rather than after the assistant: the
 * assistant will ask this same function, and an assistant that arrives with its
 * own index gives the platform two answers to every question.
 */

let done = false;

export function registerWebSearchSources(): void {
  if (done) return;
  registerSearchDocs('web:projects', projectSearchDocs);
  registerSearchDocs('web:store', storeSearchDocs);
  registerSearchDocs('web:pages', pageSearchDocs);
  done = true;
}

/** The keys this surface registers. Named once, asserted by the suite. */
export const WEB_SOURCE_KEYS = ['web:pages', 'web:projects', 'web:store'] as const;
