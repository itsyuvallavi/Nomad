/**
 * Redux Provider Wrapper
 *
 * Client-side wrapper for Redux Provider
 * Needed because Next.js layouts are Server Components by default
 */

'use client';

import { Provider } from 'react-redux';
import { store } from './index';

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
