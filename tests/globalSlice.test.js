/**
 * Verifies Redux state transitions for active and background chat threads,
 * including partition mirroring, generation indicators, and thread migration.
 */
import { vi } from 'vitest';

vi.mock('../src/redux/store.js', () => ({
  default: {
    dispatch: vi.fn(),
    getState: vi.fn(() => ({ global: {} })),
  },
}));

import globalSlice, {
  markThreadGenerationSettled,
  markThreadGenerationStart,
  migrateThreadKey,
  setActiveThreadKey,
  updateChatData,
} from '../src/redux/globalSlice.js';

const reducer = globalSlice.reducer;

// Applies the slice reducer directly so these tests do not depend on the
// application's singleton Redux store.
describe('global thread state', () => {
  // Confirms that visible questions are mirrored into the active thread cache.
  it('mirrors active questions into the active thread partition', () => {
    let state = reducer(undefined, { type: '@@test/init' });
    state = reducer(state, setActiveThreadKey('board-1'));
    state = reducer(state, updateChatData({ 'question-1': { reqId: 'req-1' } }));

    expect(state.questions).toEqual({ 'question-1': { reqId: 'req-1' } });
    expect(state.questionsByBoard['board-1']).toEqual(state.questions);
  });

  // Confirms that a completed background response remains represented in the
  // history state and no longer reports active generation.
  it('keeps a background thread visible in runtime state after it settles', () => {
    let state = reducer(undefined, { type: '@@test/init' });
    state = reducer(state, setActiveThreadKey('board-1'));
    state = reducer(state, markThreadGenerationStart({
      threadKey: 'board-1',
      reqId: 'req-1',
      title: 'Background question',
    }));
    state = reducer(state, setActiveThreadKey(null));
    state = reducer(state, markThreadGenerationSettled({
      threadKey: 'board-1',
      reqId: 'req-1',
      background: true,
    }));

    expect(state.threadRuntimeState['board-1']).toMatchObject({
      isGenerating: false,
      hasCompletedInBackground: true,
      showInHistory: true,
    });
    expect(state.threadRuntimeState['board-1'].activeReqIds).toEqual({});
  });

  // Confirms that a temporary thread is renamed consistently across all
  // Redux structures when the backend returns a real board ID.
  it('migrates the partition, runtime state, and active key together', () => {
    let state = reducer(undefined, { type: '@@test/init' });
    state = reducer(state, setActiveThreadKey('#temporary'));
    state = reducer(state, updateChatData({ 'question-1': { reqId: 'req-1' } }));
    state = reducer(state, markThreadGenerationStart({
      threadKey: '#temporary',
      reqId: 'req-1',
      title: 'First question',
    }));
    state = reducer(state, migrateThreadKey({ fromKey: '#temporary', toKey: 'board-42' }));

    expect(state.activeThreadKey).toBe('board-42');
    expect(state.questionsByBoard['board-42']).toEqual({ 'question-1': { reqId: 'req-1' } });
    expect(state.questionsByBoard['#temporary']).toBeUndefined();
    expect(state.threadRuntimeState['board-42'].activeReqIds).toEqual({ 'req-1': true });
    expect(state.threadRuntimeState['#temporary']).toBeUndefined();
  });
});
