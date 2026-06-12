import React, { useEffect, useRef, useState } from "react";
import { HistoryInterface, LoadMoreHistoryData } from "../../history";
import { TemplateRenderer } from "../../templateRenderer";

/*
 * Mirrors the Work app's HistoryModal (sidebar-nav/history-modal):
 * - left panel: search bar (debounced inside the SDK) + the regular history grouped by
 *   Today / Yesterday / Last 7 Days / Last 30 days / Older; search results are a flat
 *   list of conversation hits (boards and messages) with pageToken pagination
 * - right panel: hovering an item (250ms delay) previews the thread's messages;
 *   search-result previews are fetched on demand and cached by the SDK
 * - clicking an item joins its thread and closes the modal
 */

const HISTORY_HEADINGS = {
    today: "Today",
    yesterday: "Yesterday",
    last7Days: "Last 7 Days",
    last30Days: "Last 30 days",
    older: "Older",
};

const HOVER_PREVIEW_DELAY_MS = 250;

const getDifferenceInDays = (date) => {
    return (new Date() - new Date(date)) / (1000 * 60 * 60 * 24);
};

const structureAllBoards = (boards) => {
    const sortedHistory = {};
    boards?.forEach((board) => {
        const daysDifference = getDifferenceInDays(board?.lastModified);
        let groupKey = "";
        if (daysDifference < 1) groupKey = "today";
        else if (daysDifference >= 1 && daysDifference < 2) groupKey = "yesterday";
        else if (daysDifference >= 2 && daysDifference < 7) groupKey = "last7Days";
        else if (daysDifference >= 7 && daysDifference < 30) groupKey = "last30Days";
        else groupKey = "older";

        if (!sortedHistory[groupKey]) sortedHistory[groupKey] = [];
        sortedHistory[groupKey].push(board);
    });

    for (const key in sortedHistory) {
        sortedHistory[key].sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    }

    return Object.fromEntries(
        Object.keys(HISTORY_HEADINGS)
            .filter((key) => sortedHistory[key]?.length > 0)
            .map((key) => [key, sortedHistory[key]])
    );
};

const HistorySearchModal = ({ visible, onHide, onThreadSelect }) => {
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchTotal, setSearchTotal] = useState(0);
    const [searchHasMore, setSearchHasMore] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [allBoards, setAllBoards] = useState([]);
    const [allHasMore, setAllHasMore] = useState(false);
    const [activeItemKey, setActiveItemKey] = useState(null);
    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const historyInterface = useRef();
    const listRef = useRef(null);
    const loadingMoreRef = useRef(false);
    const hoverTimerRef = useRef(null);
    const activePreviewKeyRef = useRef(null);

    const isSearching = !!searchText.trim();
    /*search results are shown as a flat list; date-grouping only applies to the regular history list*/
    const groupedBoards = isSearching ? {} : structureAllBoards(allBoards);

    const getItemKey = (item) => item?.id || item?.boardId || item?.messageId || item?.docId;

    useEffect(() => {
        historyInterface.current = HistoryInterface();
        const unsubscribe = historyInterface.current.subscribe((allHistory) => {
            setAllBoards(allHistory?.data || []);
            setAllHasMore(!!allHistory?.hasMore);
        });
        return () => {
            unsubscribe();
            clearTimeout(hoverTimerRef.current);
        };
    }, []);

    // On open: reset search and preview the most recent thread (Work app behaviour)
    useEffect(() => {
        if (!visible) return;
        setSearchText("");
        setSearchResults([]);
        setSearchTotal(0);
        setSearchHasMore(false);
        setSearchError(null);
        historyInterface.current?.clearHistorySearch?.();
        const mostRecent = allBoards?.[0];
        previewItem(mostRecent?.id ?? null);
    }, [visible]);

    useEffect(() => {
        if (!visible) return;
        const handleEsc = (e) => {
            if (e.key === "Escape") onHide?.();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [visible, onHide]);

    /*target is a boardId string (regular item) or a search result object*/
    const previewItem = async (target) => {
        clearTimeout(hoverTimerRef.current);
        const key = typeof target === "string" ? target : getItemKey(target);
        activePreviewKeyRef.current = key;

        if (!target) {
            setPreview(null);
            setPreviewLoading(false);
            return;
        }

        setActiveItemKey(key);
        setPreviewLoading(true);
        const result = await historyInterface.current?.getHistoryItemPreview(target);
        // A newer hover superseded this one — ignore it
        if (activePreviewKeyRef.current !== key) return;
        setPreview(result);
        setPreviewLoading(false);
    };

    // Hovering an item previews it after a small delay (Work app behaviour)
    const handleItemHover = (target) => {
        const key = typeof target === "string" ? target : getItemKey(target);
        if (!key || key === activeItemKey) return;
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => previewItem(target), HOVER_PREVIEW_DELAY_MS);
    };

    const handleItemLeave = () => {
        clearTimeout(hoverTimerRef.current);
    };

    // Search calls are debounced inside the SDK, so this runs on every keystroke
    const handleSearchTextChange = async (event) => {
        const value = event.target.value;
        setSearchText(value);

        if (!value.trim()) {
            historyInterface.current?.clearHistorySearch?.();
            setSearchResults([]);
            setSearchTotal(0);
            setSearchHasMore(false);
            setSearchError(null);
            setSearchLoading(false);
            const mostRecent = allBoards?.[0];
            previewItem(mostRecent?.id ?? null);
            return;
        }

        setSearchLoading(true);
        setSearchError(null);

        const res = await historyInterface.current?.searchHistory({ search: value });

        // A newer keystroke superseded this call — ignore it
        if (res?.status === "cancelled") return;

        if (res?.status === "success") {
            const results = res?.data?.results || [];
            setSearchResults(results);
            setSearchTotal(res?.data?.total || results.length);
            setSearchHasMore(!!res?.data?.moreAvailable);
            previewItem(results?.[0] ?? null);
            // New result set — start the list back at the top
            listRef.current?.scrollTo?.({ top: 0 });
        } else {
            setSearchResults([]);
            setSearchTotal(0);
            setSearchHasMore(false);
            setSearchError(res?.error?.message || "Unable to search history");
        }
        setSearchLoading(false);
    };

    const loadMoreResults = async () => {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
            if (isSearching) {
                const res = await historyInterface.current?.loadMoreSearchHistory();
                if (res?.status === "success") {
                    setSearchResults(res?.data?.results || []);
                    setSearchTotal(res?.data?.total || 0);
                    setSearchHasMore(!!res?.data?.moreAvailable);
                }
            } else {
                await LoadMoreHistoryData({ limit: 10 });
            }
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    };

    // Infinite scroll: fetch the next page when the list is scrolled near the bottom
    const handleListScroll = (event) => {
        const el = event.target;
        const hasMore = isSearching ? searchHasMore : allHasMore;
        if (!hasMore || loadingMoreRef.current) return;
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
        if (nearBottom) {
            loadMoreResults();
        }
    };

    // If the loaded items don't fill the container there is no scrollbar to trigger
    // pagination — keep fetching until the list is scrollable or no more pages remain
    useEffect(() => {
        if (!visible) return;
        const el = listRef.current;
        if (!el) return;
        const hasMore = isSearching ? searchHasMore : allHasMore;
        if (hasMore && el.scrollHeight <= el.clientHeight && !loadingMoreRef.current) {
            loadMoreResults();
        }
    }, [visible, searchResults, allBoards, searchHasMore, allHasMore]);

    const handleItemClick = (item) => {
        clearTimeout(hoverTimerRef.current);
        /*message hits carry the thread in boardId; board hits in id*/
        const boardId = isSearching ? (item?.boardId || item?.id) : item?.id;
        if (!boardId) return;
        onThreadSelect?.(boardId, item);
        onHide?.();
    };

    const renderRegularItem = (item) => (
        <div
            key={item?.id}
            className={`hsm-list-item${activeItemKey === item?.id ? " current" : ""}`}
            title={item?.name}
            onMouseEnter={() => handleItemHover(item?.id)}
            onMouseLeave={handleItemLeave}
            onClick={() => handleItemClick(item)}
        >
            {item?.name}
        </div>
    );

    const renderSearchResultItem = (item) => {
        const key = getItemKey(item);
        const title = item?.threadTitle || item?.title || item?.snippet || "Untitled";
        return (
            <div
                key={key}
                className={`hsm-list-item hsm-search-result${activeItemKey === key ? " current" : ""}`}
                title={title}
                onMouseEnter={() => handleItemHover(item)}
                onMouseLeave={handleItemLeave}
                onClick={() => handleItemClick(item)}
            >
                <div className="hsm-result-title">{title}</div>
                {item?.snippet && item?.snippet !== title ? (
                    <div className="hsm-result-snippet">{item.snippet}</div>
                ) : null}
            </div>
        );
    };

    const renderPreviewPane = () => {
        if (previewLoading) {
            return <div className="hsm-no-thread">Loading preview…</div>;
        }
        if (!preview) {
            return <div className="hsm-no-thread">{isSearching ? "Hover a result to preview it" : "Select a conversation to view messages"}</div>;
        }
        const questions = Object.values(preview?.questions || {});
        if (questions.length === 0) {
            return <div className="hsm-no-thread">No messages to preview</div>;
        }
        return (
            <>
                <div className="hsm-preview-title">{preview?.board?.name || ""}</div>
                <div className="hsm-preview-messages">
                    {questions.map((item) => {
                        const html = TemplateRenderer.generateHTMLTemplate(item, {
                            loadingText: "Analyzing",
                        });
                        const isMatch = preview?.matchedMessageId && item?.id === preview.matchedMessageId;
                        return (
                            <div
                                key={item?.id}
                                className={`chat-demo-message-row${isMatch ? " hsm-matched-message" : ""}`}
                                dangerouslySetInnerHTML={{ __html: html.innerHTML }}
                            />
                        );
                    })}
                </div>
            </>
        );
    };

    if (!visible) return null;

    return (
        <div className="hsm-overlay" onClick={onHide}>
            <div className="hsm-dialog" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="hsm-close-btn" onClick={onHide}>✕</button>

                <div className="hsm-left-panel">
                    <div className="hsm-search-bar">
                        <input
                            type="search"
                            autoFocus
                            value={searchText}
                            onChange={handleSearchTextChange}
                            placeholder="Search history"
                        />
                        {searchLoading ? <span className="hsm-search-loading">Searching…</span> : null}
                    </div>
                    <div className="hsm-thread-list" ref={listRef} onScroll={handleListScroll}>
                        {searchError ? <div className="hsm-error">{searchError}</div> : null}
                        {isSearching && !searchLoading && searchResults.length === 0 && !searchError ? (
                            <div className="hsm-empty">No results found</div>
                        ) : null}
                        {!isSearching && allBoards.length === 0 ? (
                            <div className="hsm-empty">No previous history!</div>
                        ) : null}
                        {isSearching ? (
                            <>
                                {searchResults.length > 0 ? (
                                    <div className="hsm-group-title">{`${searchTotal} result${searchTotal === 1 ? "" : "s"}`}</div>
                                ) : null}
                                {searchResults.map((item) => renderSearchResultItem(item))}
                            </>
                        ) : (
                            Object.entries(groupedBoards).map(([key, boards]) => (
                                <div className="hsm-list-group" key={key}>
                                    <div className="hsm-group-title">{HISTORY_HEADINGS[key]}</div>
                                    {boards.map((item) => renderRegularItem(item))}
                                </div>
                            ))
                        )}
                        {loadingMore ? (
                            <div className="hsm-loading-more">Loading more…</div>
                        ) : null}
                    </div>
                </div>

                <div className="hsm-right-panel">{renderPreviewPane()}</div>
            </div>
        </div>
    );
};

export default HistorySearchModal;
