import {
  createBox,
  createText,
  useTheme as useRestyleTheme,
} from '@shopify/restyle';

import type { Theme } from './theme';

/** Layout primitive typed against the app theme. */
export const Box = createBox<Theme>();

/** Typography primitive typed against the app theme. */
export const Text = createText<Theme>();

/** Access theme tokens inside components/hooks. */
export const useAppTheme = () => useRestyleTheme<Theme>();
