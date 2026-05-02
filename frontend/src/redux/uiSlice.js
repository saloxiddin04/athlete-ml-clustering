import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    notification: null,
  },
  reducers: {
    toggleSidebar: state => { state.sidebarOpen = !state.sidebarOpen; },
    showNotification: (state, action) => { state.notification = action.payload; },
    clearNotification: state => { state.notification = null; },
  }
});

export const { toggleSidebar, showNotification, clearNotification } = uiSlice.actions;
export default uiSlice.reducer;
