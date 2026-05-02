import { configureStore } from '@reduxjs/toolkit';
import athletesReducer from './athletesSlice';
import clustersReducer from './clustersSlice';
import uiReducer from './uiSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    athletes: athletesReducer,
    clusters: clustersReducer,
    ui: uiReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export default store;
