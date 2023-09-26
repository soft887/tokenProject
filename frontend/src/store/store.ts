import { configureStore } from '@reduxjs/toolkit'

import vestingReducer from './vestingSlice';
import { useDispatch } from 'react-redux';

const store = configureStore({
  reducer: {
    vesting: vestingReducer,
  },
  // middleware: (getDefaultMiddleware) =>
  //   getDefaultMiddleware({
  //     serializableCheck: {
  //       // Ignore these action types
  //       ignoredActions: ['vestingContract/contractInfo/fulfilled'],
  //       // Ignore these field paths in all actions
  //       //  ignoredActionPaths: ['vestingContract/contractInfo/fulfilled'],
  //       // Ignore these paths in the state
  //        ignoredPaths: ['vesting.vestingContracts.entities'],
  //     },
  // }),
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>()
export default store;