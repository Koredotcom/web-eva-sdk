/**
 * Verifies request-to-thread ownership bookkeeping used by background chat
 * requests, including registration, cleanup, and temporary-thread migration.
 */
import {
  isTempThreadKey,
  migrateRequestThread,
  registerRequestThread,
  releaseRequestThread,
  resolveRequestThread,
  threadHasActiveRequests,
} from '../src/chat/threadRegistry.js';

describe('thread registry', () => {
  const registeredRequestIds = [];

  // Removes request entries created by a test so later tests start cleanly.
  afterEach(() => {
    registeredRequestIds.splice(0).forEach((requestId) => releaseRequestThread(requestId));
  });

  // Confirms that active request ownership can be resolved and released.
  it('registers, resolves, and releases request ownership', () => {
    const requestId = `req-${crypto.randomUUID()}`;
    registeredRequestIds.push(requestId);

    registerRequestThread(requestId, 'board-1');

    expect(resolveRequestThread(requestId)).toBe('board-1');
    expect(threadHasActiveRequests('board-1')).toBe(true);

    releaseRequestThread(requestId);

    expect(resolveRequestThread(requestId)).toBeNull();
    expect(threadHasActiveRequests('board-1')).toBe(false);
  });

  // Confirms that all in-flight requests follow a temporary thread after it
  // receives its permanent server board ID.
  it('migrates all active requests from a temporary thread to a real board', () => {
    const firstRequest = `req-${crypto.randomUUID()}`;
    const secondRequest = `req-${crypto.randomUUID()}`;
    registeredRequestIds.push(firstRequest, secondRequest);

    registerRequestThread(firstRequest, '#temporary-thread');
    registerRequestThread(secondRequest, '#temporary-thread');
    migrateRequestThread('#temporary-thread', 'board-42');

    expect(resolveRequestThread(firstRequest)).toBe('board-42');
    expect(resolveRequestThread(secondRequest)).toBe('board-42');
    expect(threadHasActiveRequests('#temporary-thread')).toBe(false);
    expect(threadHasActiveRequests('board-42')).toBe(true);
  });

  // Confirms the convention used to distinguish new boardless chats from real
  // server-backed conversation threads.
  it('recognizes only hash-prefixed thread keys as temporary', () => {
    expect(isTempThreadKey('#req-123')).toBe(true);
    expect(isTempThreadKey('board-123')).toBe(false);
    expect(isTempThreadKey(null)).toBe(false);
  });
});
