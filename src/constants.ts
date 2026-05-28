import { ViewMode } from './types';

export const PIXELS_PER_DAY: Record<ViewMode, number> = {
  Week: 12,    // 12 * 7 = 84px column width for a week
  Month: 4,    // 4 * 30 = 120px column width for a month
  Year: 1.6    // 1.6 * 365 = 584px column width for a year
};
