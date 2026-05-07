import store from '../redux/store';

/**
 * Returns the dislike categories sourced from `config.data.feedbackCategories`.
 * Reads the live Redux store on every call so consumers get the latest value
 * once config has finished loading. Always returns an array (never undefined).
 *
 * @returns {Array} feedback dislike categories, or `[]` if config is not loaded yet.
 */
export function feedbackDislikeCategories() {
  const state = store?.getState?.()?.global;
  if (state?.config?.status !== 'success') return [];
  const categories = state?.config?.data?.feedbackCategories;
  return Array.isArray(categories) ? categories : [];
}
