import { searchHistoryConversations } from "../redux/actions/global.action";
import { setHistorySearch } from "../redux/globalSlice";
import store from "../redux/store";

/*
 * Mirrors the Work app's history search (HistoryModal + searchHistoryConversations saga):
 * - search calls are debounced (300ms) so consumers can invoke it on every keystroke
 * - every new search bumps a session id, so resolved stale calls report 'cancelled'
 * - pagination is pageToken based — the token from the previous page fetches the next one
 */
const HISTORY_SEARCH_DEBOUNCE_MS = 300;
const HISTORY_SEARCH_LIMIT = 25;

let searchDebounceTimer = null;
let searchSession = 0;
let currentSearchTerm = '';
let currentSearchFilters = null;

const hasFilters = (filters) =>
    filters && typeof filters === 'object' && !Array.isArray(filters) && Object.keys(filters).length > 0;

const shapeError = (error) => {
    return error && typeof error === 'object' && !Array.isArray(error)
        ? error
        : { message: String(error ?? 'Unable to search history') };
}

const executeSearch = async (arg, sessionId) => {
    try {
        await store.dispatch(searchHistoryConversations(arg)).unwrap();
        if (sessionId !== searchSession) {
            return { status: 'cancelled', data: null, error: null };
        }
        const historySearch = store.getState().global.historySearch;
        return { status: 'success', data: historySearch?.data, error: null };
    } catch (error) {
        if (error?.cancelled || sessionId !== searchSession) {
            return { status: 'cancelled', data: null, error: null };
        }
        return { status: 'failed', data: null, error: shapeError(error) };
    }
}

/**
 * Debounced free-text search over the current user's history conversations.
 * Resolves with `{ status, data: { results, total, pageToken, moreAvailable }, error }`.
 * `status` is 'cancelled' when a newer search superseded this one.
 *
 * @param {object} props
 * @param {string} props.search Search term (alias: `query`). An empty term clears the search state.
 * @param {number} [props.limit=25]
 * @param {number} [props.debounce=300] Debounce window in ms (0 to search immediately).
 * @param {object} [props.filters] Extensible filter map sent in the request body (e.g. `{ agentId: ['ag-...'] }`).
 *   Carried through to `loadMoreSearchHistory` for pagination. Omitted when empty.
 */
const SearchHistoryData = (props = {}) => {
    return new Promise((resolve) => {
        const rawTerm = props?.search ?? props?.query;
        const term = typeof rawTerm === 'string' ? rawTerm.trim() : '';
        const filters = hasFilters(props?.filters) ? props.filters : null;
        clearTimeout(searchDebounceTimer);
        searchSession += 1;
        const sessionId = searchSession;

        if (!term) {
            currentSearchTerm = '';
            currentSearchFilters = null;
            ClearSearchHistoryData();
            resolve({ status: 'success', data: { results: [], total: 0, pageToken: null, moreAvailable: false }, error: null });
            return;
        }

        currentSearchTerm = term;
        currentSearchFilters = filters;
        const debounceMs = props?.debounce ?? HISTORY_SEARCH_DEBOUNCE_MS;
        searchDebounceTimer = setTimeout(async () => {
            const result = await executeSearch({
                query: term,
                limit: props?.limit || HISTORY_SEARCH_LIMIT,
                ...(filters ? { filters } : {}),
            }, sessionId);
            resolve(result);
        }, debounceMs);
    });
};

/**
 * Fetches the next page of results for the active search term using the pageToken
 * from the previous page and appends the results to `state.global.historySearch`.
 */
const LoadMoreSearchHistoryData = async (props = {}) => {
    const state = store.getState().global;
    const searchData = state.historySearch?.data;

    if (!currentSearchTerm) {
        return { status: 'failed', data: null, error: { message: 'no active search term' } };
    }
    if (!searchData?.moreAvailable || !searchData?.pageToken) {
        return { status: 'success', data: searchData, error: null };
    }

    return executeSearch({
        query: currentSearchTerm,
        limit: props?.limit || HISTORY_SEARCH_LIMIT,
        pageToken: searchData.pageToken,
        ...(currentSearchFilters ? { filters: currentSearchFilters } : {}),
    }, searchSession);
};

/**
 * Clears the active search term and resets `state.global.historySearch`.
 */
const ClearSearchHistoryData = () => {
    clearTimeout(searchDebounceTimer);
    searchSession += 1;
    currentSearchTerm = '';
    currentSearchFilters = null;
    store.dispatch(setHistorySearch({}));
};

export { LoadMoreSearchHistoryData, ClearSearchHistoryData };
export default SearchHistoryData;
