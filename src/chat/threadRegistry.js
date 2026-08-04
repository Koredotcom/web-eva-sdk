/**
 * Thread registry — per-request ownership plumbing for background threads.
 *
 * Every advanceSearch request is stamped at dispatch time with the thread it
 * belongs to (`reqId -> threadKey`). All async callbacks (HTTP settle, socket
 * streaming events, stop/cancel) resolve ownership through this registry
 * instead of assuming the request belongs to the currently visible thread.
 *
 * A `threadKey` is either:
 *  - a real server boardId (thread already exists), or
 *  - a temp key for a brand-new boardless chat — the first question's reqId
 *    (already `#`-prefixed via generateShortUUID), reconciled to the real
 *    boardId when the first response returns it.
 */

export const isTempThreadKey = (key) => typeof key === 'string' && key.startsWith('#');

// reqId -> threadKey (rewritten temp -> real on migration)
const reqIdToOwner = new Map();

export const registerRequestThread = (reqId, threadKey) => {
    if (!reqId || !threadKey) return;
    reqIdToOwner.set(reqId, threadKey);
};

export const resolveRequestThread = (reqId) => {
    if (!reqId) return null;
    return reqIdToOwner.get(reqId) || null;
};

/** Rewrite every in-flight request owned by `fromKey` to `toKey` (temp -> real reconcile). */
export const migrateRequestThread = (fromKey, toKey) => {
    if (!fromKey || !toKey || fromKey === toKey) return;
    reqIdToOwner.forEach((owner, reqId) => {
        if (owner === fromKey) {
            reqIdToOwner.set(reqId, toKey);
        }
    });
};

/** Drop bookkeeping for a settled request. */
export const releaseRequestThread = (reqId) => {
    if (!reqId) return;
    reqIdToOwner.delete(reqId);
};

/** True when any in-flight request is owned by the given thread. */
export const threadHasActiveRequests = (threadKey) => {
    if (!threadKey) return false;
    for (const owner of reqIdToOwner.values()) {
        if (owner === threadKey) return true;
    }
    return false;
};
