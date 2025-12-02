import reducer, { markDirty, markClean, loadMap } from '../../slices/mapSlice';

describe('mapSlice reducer', () => {
  it('should return the initial state on @@INIT', () => {
    const state = reducer(undefined, { type: '@@INIT' } as any);
    expect(state.isLoading).toBe(false);
    expect(state.isDirty).toBe(false);
    expect(state.isInitializing).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should set isDirty true on markDirty, and false on markClean (when not initializing)', () => {
    const state1 = reducer(undefined, { type: '@@INIT' } as any);
    const readyState = { ...state1, isInitializing: false } as any;
    const state2 = reducer(readyState, markDirty());
    expect(state2.isDirty).toBe(true);
    const state3 = reducer(state2, markClean());
    expect(state3.isDirty).toBe(false);
  });

  it('should set isLoading true on loadMap.pending', () => {
    const state1 = reducer(undefined, { type: '@@INIT' } as any);
    const state2 = reducer(state1, { type: (loadMap as any).pending.type });
    expect(state2.isLoading).toBe(true);
  });
});

