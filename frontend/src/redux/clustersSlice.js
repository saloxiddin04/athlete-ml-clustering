import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../services/api';

export const fetchClusters = createAsyncThunk('clusters/fetch', async (params, { rejectWithValue }) => {
  try { return await api.getClusters(params); }
  catch (e) { return rejectWithValue(e.message); }
});

export const trainModelsThunk = createAsyncThunk('clusters/train', async (params, { rejectWithValue }) => {
  try { return await api.trainModels(params); }
  catch (e) { return rejectWithValue(e.message); }
});

export const predictThunk = createAsyncThunk('clusters/predict', async (data, { rejectWithValue }) => {
  try { return await api.predict(data); }
  catch (e) { return rejectWithValue(e.message); }
});

export const fetchModelMeta = createAsyncThunk('clusters/fetchMeta', async (_, { rejectWithValue }) => {
  try { 
    const res = await api.getTrainingHistory();
    return res.history?.[0] || null;
  }
  catch (e) { return rejectWithValue(e.message); }
});

const clustersSlice = createSlice({
  name: 'clusters',
  initialState: {
    groups: [],
    points: [],
    modelMeta: null, // Store accuracy and total records
    loading: false,
    training: false,
    predicting: false,
    trainingResult: null,
    prediction: null,
    error: null,
  },
  reducers: {
    clearError: state => { state.error = null; },
    clearPrediction: state => { state.prediction = null; },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchClusters.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchClusters.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.groups = payload.groups || [];
        state.points = payload.points || [];
      })
      .addCase(fetchClusters.rejected, (state, { payload }) => {
        state.loading = false; state.error = payload;
      })
      .addCase(fetchModelMeta.fulfilled, (state, { payload }) => {
        state.modelMeta = payload;
      })
      .addCase(trainModelsThunk.pending, state => { state.training = true; state.error = null; state.trainingResult = null; })
      .addCase(trainModelsThunk.fulfilled, (state, { payload }) => {
        state.training = false;
        state.trainingResult = payload.results;
        // Dynamic Update: Immediately sync the new accuracy to the global state
        state.modelMeta = {
          accuracy: payload.results.accuracy,
          total_records: payload.results.total,
          trained_at: new Date().toISOString()
        };
      })
      .addCase(trainModelsThunk.rejected, (state, { payload }) => {
        state.training = false; state.error = payload;
      })
      .addCase(predictThunk.pending, state => { state.predicting = true; state.error = null; state.prediction = null; })
      .addCase(predictThunk.fulfilled, (state, { payload }) => {
        state.predicting = false; state.prediction = payload;
      })
      .addCase(predictThunk.rejected, (state, { payload }) => {
        state.predicting = false; state.error = payload;
      });
  }
});

export const { clearError, clearPrediction } = clustersSlice.actions;
export default clustersSlice.reducer;
