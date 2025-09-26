import type { RootState } from '../../store';
import {
  selectMapState,
  selectMapData,
  selectIsLoading,
  selectError,
  selectLastSaved,
  selectIsDirty,
  selectIsInitializing,
  selectAutoSaveEnabled,
  selectAutoSaveDelay,
} from '../mapSelectors';

describe('mapSelectors', () => {
  const baseState: RootState = {
    // @ts-expect-error: constructing minimal root state for selector tests
    map: {
      mapData: null,
      isLoading: false,
      error: null,
      lastSaved: null,
      isDirty: true,
      isInitializing: false,
      autoSaveEnabled: false,
      autoSaveDelay: 2000,
    },
  } as RootState;

  it('selectMapState', () => {
    expect(selectMapState(baseState)).toBe(baseState.map);
  });

  it('basic selectors return values from state', () => {
    expect(selectMapData(baseState)).toBeNull();
    expect(selectIsLoading(baseState)).toBe(false);
    expect(selectError(baseState)).toBeNull();
    expect(selectLastSaved(baseState)).toBeNull();
    expect(selectIsDirty(baseState)).toBe(true);
    expect(selectIsInitializing(baseState)).toBe(false);
    expect(selectAutoSaveEnabled(baseState)).toBe(false);
    expect(selectAutoSaveDelay(baseState)).toBe(2000);
  });
});

