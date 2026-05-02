import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../services/api';

// Thunks
export const fetchAthletes = createAsyncThunk('athletes/fetchAll', async (params, { rejectWithValue }) => {
  try { return await api.getAthletes(params); }
  catch (e) { return rejectWithValue(e.message); }
});

export const fetchStats = createAsyncThunk('athletes/fetchStats', async (_, { rejectWithValue }) => {
  try { return await api.getStats(); }
  catch (e) { return rejectWithValue(e.message); }
});

export const uploadCSVThunk = createAsyncThunk('athletes/uploadCSV', async ({ formData, onProgress }, { rejectWithValue }) => {
  try { return await api.uploadCSV(formData, onProgress); }
  catch (e) { return rejectWithValue(e.message); }
});

export const deleteAthleteThunk = createAsyncThunk('athletes/delete', async (id, { rejectWithValue }) => {
  try { await api.deleteAthlete(id); return id; }
  catch (e) { return rejectWithValue(e.message); }
});

export const resetAthletesThunk = createAsyncThunk('athletes/reset', async (_, { rejectWithValue }) => {
  try { return await api.resetAthletes(); }
  catch (e) { return rejectWithValue(e.message); }
});

const athletesSlice = createSlice({
  name: 'athletes',
  initialState: {
    list: [],
    pagination: { total: 0, page: 1, limit: 100, pages: 1 },
    loading: false,
    uploadLoading: false,
    uploadProgress: 0,
    error: null,
    lastUpload: null,
    stats: { total: 0, trained: 0, untrained: 0, clusters: null },
  },
  reducers: {
    clearError: state => { state.error = null; },
    setUploadProgress: (state, action) => { state.uploadProgress = action.payload; },
  },
  extraReducers: builder => {
    builder
      // fetch
      .addCase(fetchAthletes.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchAthletes.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list = payload.athletes;
        state.pagination = payload.pagination;
      })
      .addCase(fetchAthletes.rejected, (state, { payload }) => {
        state.loading = false; state.error = payload;
      })
      // stats
      .addCase(fetchStats.fulfilled, (state, { payload }) => {
        state.stats = payload.stats;
      })
      // upload
      .addCase(uploadCSVThunk.pending, state => { state.uploadLoading = true; state.error = null; state.uploadProgress = 0; })
      .addCase(uploadCSVThunk.fulfilled, (state, { payload }) => {
        state.uploadLoading = false; state.uploadProgress = 100; state.lastUpload = payload;
      })
      .addCase(uploadCSVThunk.rejected, (state, { payload }) => {
        state.uploadLoading = false; state.error = payload;
      })
      // delete
      .addCase(deleteAthleteThunk.fulfilled, (state, { payload }) => {
        state.list = state.list.filter(a => a.id !== payload);
        state.pagination.total -= 1;
      })
      // reset
      .addCase(resetAthletesThunk.fulfilled, state => {
        state.list = []; state.pagination = { total: 0, page: 1, limit: 100, pages: 1 };
        state.lastUpload = null;
      });
  }
});

export const { clearError, setUploadProgress } = athletesSlice.actions;
export default athletesSlice.reducer;
