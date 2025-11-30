/**
 * Custom Redux Hooks
 *
 * Pre-typed versions of useDispatch and useSelector for type safety
 */

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

/**
 * Use throughout your app instead of plain `useDispatch`
 *
 * Example:
 * ```ts
 * const dispatch = useAppDispatch();
 * dispatch(addMessage({ role: 'user', content: 'Hello' }));
 * ```
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Use throughout your app instead of plain `useSelector`
 *
 * Example:
 * ```ts
 * const messages = useAppSelector(state => state.conversation.messages);
 * ```
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
