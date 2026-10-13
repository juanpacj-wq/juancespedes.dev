import type { PortfolioCorpus } from '../../application/ports/chat';
import type { Locale } from '../../domain/shared/locale';

/*
 * Reads the corpus generated at build time (/chat-corpus/<lang>.txt) from the Worker's static
 * assets and keeps it in memory for the life of the isolate. Same text for every request, which
 * is what makes it cacheable by the model.
 */
export const makeAssetPortfolioCorpus = (
  fetchAsset: (path: string) => Promise<Response>,
): PortfolioCorpus => {
  const cache = new Map<Locale, Promise<string>>();
  return {
    get(locale) {
      const cached = cache.get(locale);
      if (cached) return cached;
      const loading = fetchAsset(`/chat-corpus/${locale}.txt`).then(async (response) => {
        if (!response.ok)
          throw new Error(`chat corpus for ${locale}: HTTP ${String(response.status)}`);
        return response.text();
      });
      // A failed load is not cached, so the next request tries again.
      loading.catch(() => cache.delete(locale));
      cache.set(locale, loading);
      return loading;
    },
  };
};
