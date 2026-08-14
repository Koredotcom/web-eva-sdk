# Background Threads — Implementation Notes

Internal architecture reference for the multi-thread / background generation
feature. Written so an agent (or a new engineer) can make a correct change here
without re-reading the whole chat subsystem.

Scope: how a chat thread keeps generating after the user navigates away, and how
async results are routed back to the thread that owns them.

## The problem this solves

Before background threads, the SDK assumed exactly one conversation existed: the
one on screen. Every async callback — the `advanceSearch` HTTP settle, socket
streaming chunks, agentic step chaining — read and wrote `state.questions`
directly. Clicking **New Chat** mid-generation therefore either lost the answer
or injected it into the new, unrelated chat.

The fix introduces per-request ownership: each request is stamped with the thread
it belongs to at dispatch time, and every async callback resolves that stamp
before deciding where to write.

## File map

| File | Role |
| --- | --- |
| `src/chat/threadRegistry.js` | Non-Redux `Map` of `reqId -> threadKey`. Ownership source of truth. |
| `src/redux/globalSlice.js` | `activeThreadKey`, `questionsByBoard`, `threadRuntimeState` + their reducers. |
| `src/chat/chat-utils.js` | `constructQuestionInitial` (stamps ownership), `constructQuestionPostCall` (routes HTTP settle), `settleThreadRequest`, `continueBackgroundAgenticFlow`. |
| `src/chat/ChatInterface.js` | `resolveStreamTarget` / `writeStreamQuestions` + the three socket consumers. |
| `src/chat/NewChat.js` | Backgrounds the current thread (does **not** abort it). |
| `src/chat/JoinChatThread.js` | Foregrounds a thread; hydrates from partition or REST. |
| `src/history/historyInterface.js` | Derives sidebar spinner / red-dot indicators and optimistic rows. |

## Core concepts

**threadKey** — identifies a conversation. Either a real server `boardId`, or a
`#`-prefixed *temp key* for a brand-new boardless chat. The temp key is the first
question's `reqId` (already `#`-prefixed by `generateShortUUID`). Use
`isTempThreadKey(key)` to tell them apart, never a manual `startsWith`.

**activeThreadKey** — the thread currently on screen. `null` after New Chat until
the first question is asked.

**Foreground vs background** — a request is foreground when its owning threadKey
equals `activeThreadKey`. Foreground work reads/writes `state.questions` exactly
as it did before this feature existed. Background work reads/writes only
`questionsByBoard[threadKey]` and must never touch the visible chat, steal focus,
or dispatch `setActiveBoardId` / `setCurrentQuestion` / context / quick actions.

## State shape

Two stores, deliberately:

**`threadRegistry.js`** — a plain module-level `Map`, not Redux. Ownership must be
readable synchronously inside callbacks without a dispatch/subscribe cycle, and
it is pure routing plumbing with no UI projection. API: `registerRequestThread`,
`resolveRequestThread`, `migrateRequestThread`, `releaseRequestThread`,
`threadHasActiveRequests`, `isTempThreadKey`.

**Redux (`globalSlice`)** — everything the UI renders:

```js
activeThreadKey: null,          // threadKey on screen
questionsByBoard: {},           // { [threadKey]: { [qId]: question } }
threadRuntimeState: {}          // { [threadKey]: { isGenerating, activeReqIds,
                                //   hasCompletedInBackground, showInHistory,
                                //   title, createdOn, lastUpdatedAt } }
```

Only threads with an active or unread generation keep a partition in
`questionsByBoard`; it is garbage-collected on background settle.

### The mirror

`updateChatData` calls `syncActiveThreadPartition`, which copies
`state.questions` into `questionsByBoard[activeThreadKey]` on every foreground
write. That is why navigating away mid-generation needs no explicit snapshot
step — the partition is already current.

This makes dispatch **ordering load-bearing** in `NewChat`: `setActiveThreadKey(null)`
runs *before* `updateChatData({})`, otherwise the mirror would wipe the outgoing
thread's partition with the empty foreground map.

## Lifecycles

### Asking a question

`constructQuestionInitial` resolves `threadKey = activeThreadKey || activeBoardId || uniqueMsgId`
(the last being the temp-key case), promotes it to active if needed, then stamps
ownership and raises the spinner:

```js
registerRequestThread(requestReqId, threadKey);
store.dispatch(markThreadGenerationStart({ threadKey, reqId: requestReqId, title }));
```

### Backgrounding

`NewChat()` detaches the thread key and clears foreground state. The in-flight
request is intentionally **not** aborted. `setActiveThreadKey` stamps
`showInHistory: true` on the outgoing thread so its history row survives even if
the user later reopens it.

### Settling (HTTP)

`constructQuestionPostCall` resolves the owner, picks the source map, and at the
end calls `settleThreadRequest`, which releases the registry entry, clears the
reqId from `activeReqIds`, raises the red dot for background settles, and frees
the partition once no requests remain for that thread.

### Reopening

`JoinChatThread` is the only sanctioned focus switch. If the thread is still
generating and has a live partition, it hydrates from the partition instantly and
returns without a REST call — streaming then continues through the normal
foreground path because owner now equals `activeThreadKey`. Temp threads never
hit REST (no server-side board exists yet). Otherwise it falls through to
`getSearchHistory`.

### Temp → real migration

When the server returns a `boardId` for a chat that started boardless, both the
registry and Redux must be renamed together:

```js
migrateRequestThread(ownerThreadKey, responseBoardId)                    // Map
store.dispatch(migrateThreadKey({ fromKey: ownerThreadKey, toKey: responseBoardId }))  // partition + runtime + activeThreadKey
```

`constructQuestionPostCall` does this in both the foreground and background
branches. The background branch additionally fires `fetchHistory({ limit: 1 })`
so the red dot has a real history row to attach to.

### Agentic (multi-step) flows

The foreground chain is `constructQuestionPostCall -> MultiIntentExecution().runNextTask -> runTask -> InitiateChatConversationAction`,
all of which are foreground-coupled. A backgrounded agentic flow would stall, so
`continueBackgroundAgenticFlow` mirrors the same bookkeeping on the partition and
dispatches the next step's `advanceSearch` directly.

Ordering there is also load-bearing: the next step is registered *before* the
current step settles. Otherwise `activeReqIds` momentarily empties, which flickers
the spinner, raises a premature red dot, and garbage-collects the partition
mid-flow.

## Routing rules

### Socket events — `resolveStreamTarget`

Used by `contentStreaming`, `agentThoughts`, and `appendAnswerContext` via
`writeStreamQuestions(isForeground, ownerThreadKey, questionsMap)`.

```js
const ownerThreadKey = resolveRequestThread(eventReqId);
const isForeground = ownerThreadKey
    ? ownerThreadKey === globalState.activeThreadKey
    : hasQuestionFor(globalState.questions, eventReqId);
```

An unregistered `reqId` is **ambiguous**: it is either a legacy event that was
never stamped (genuinely foreground) or a request whose ownership
`settleThreadRequest` already released (owned by whichever thread ran it).
Absence of an owner is therefore not sufficient to claim the foreground — the
visible map must actually hold the turn. `hasQuestionFor` does a two-step lookup
(direct key, then scan by `reqId`) because agentic turns are keyed by `messageId`
and carry `reqId` as a field.

Orphans fall through to an empty source map, and all three consumers already
return early on an empty map, so no dispatch with a `null` threadKey is reachable.

### HTTP settle — inline in `constructQuestionPostCall`

```js
const ownerThreadKey = resolveRequestThread(requestReqId) || state.activeThreadKey
const isForeground = !ownerThreadKey || ownerThreadKey === state.activeThreadKey
```

Note the asymmetry with the socket path: this one falls back to `activeThreadKey`,
so an unregistered settle is always treated as foreground. That is tolerable
because a settle carries the full payload and arrives once, whereas socket chunks
are repeated and arrive after release — but the two resolvers are **not**
interchangeable, and anyone unifying them should handle both fallbacks
deliberately.

## Invariants

Breaking any of these reintroduces cross-thread corruption:

1. A background code path must never dispatch `updateChatData`, `setActiveBoardId`,
   `setCurrentQuestion`, `setSelectedContext`, `setQuickActions`, or `setErrorState`.
   Gate them on `isForeground`.
2. Ownership must be stamped before the request is dispatched, never after.
3. Registry and Redux keys migrate together — never one without the other.
4. Register the next agentic step before settling the current one.
5. Detach `activeThreadKey` before clearing foreground state.
6. Never infer the foreground from the mere absence of an owner (see above).
7. Never write to a question map without confirming it contains the turn.

## Known gaps

- **Cancel/stop is foreground-only.** `cancelMessageReqAction` and `stopBotAnswer`
  read `state.currentQuestion` / `state.activeBoardId`, so a background thread's
  generation cannot be stopped from the UI. Their settle still routes correctly
  because both funnel into `constructQuestionPostCall`.
- **`markThreadGenerationSettled` accepts a `clearAll` flag that nothing dispatches.**
  It exists for a bulk-cancel path that was never wired up.
- **Late socket chunks for a settled request are dropped.** `settleThreadRequest`
  releases the reqId, so trailing chunks become orphans and hit the guard in
  `contentStreaming`. Acceptable in practice: the HTTP payload already carried the
  complete answer. This was the cause of a `TypeError: Cannot set properties of undefined`
  in `contentStreaming` before the guard existed.
- **Partition GC is coarse.** A background thread's partition is deleted as soon as
  it has no in-flight requests, so reopening a settled thread re-fetches over REST.

## Debugging

Everything is gated on `state.enableDebugging` (set via `initializeSDK`, see
`src/main.jsx`). Useful signals:

- `[EVA-SDK] dropping stream chunk with no matching question <reqId>` — an orphaned
  socket event. Compare the printed `reqId` against the question you expect: if it
  belongs to a *different* thread than the one on screen, ownership was released
  or never stamped.
- `src/redux/middleware/logger.js` logs the post-dispatch state; inspect
  `threadRuntimeState` there to see which threads believe they are generating.

Sidebar indicators are derived in `historyInterface.subscribe`, not stored:
`isGenerating` comes straight from runtime, and `hasUnreadAnswer` is
`!isGenerating && hasCompletedInBackground`. Threads absent from the loaded
history pages (a temp thread, or the window right after migration) are injected as
optimistic rows. A brand-new thread still on screen is hidden until `showInHistory`
is stamped.

## Reproducing the classic bug

1. Ask Q1.
2. Click New Chat before it finishes.
3. Ask Q2 — Q2 is foreground, Q1 continues in the background.
4. Q1's answer must land in Q1's partition and raise a red dot on its history row,
   never in Q2's chat, and must not throw.
