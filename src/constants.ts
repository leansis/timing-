import { ViewMode } from './types';

export const PIXELS_PER_DAY: Record<ViewMode, number> = {
  Week: 12,    // 12 * 7 = 84px column width for a week
  Month: 4,    // 4 * 30 = 120px column width for a month
  Year: 0.6    // 0.6 * 365 = 219px column width for a year
};
