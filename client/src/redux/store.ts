/* Redux Toolkit store scaffold: keep reducers empty until Phase 1 */
import { configureStore } from '@reduxjs/toolkit';
import mapReducer from './slices/mapSlice';

export const store = configureStore({
  reducer: {
    map: mapReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // allow Date objects in state (MapData metadata)
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

