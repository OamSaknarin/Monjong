/**
 * Shared date utilities for Thailand (Asia/Bangkok) timezone
 */

/**
 * Returns the current date in Thailand as a string in YYYY-MM-DD format.
 */
export const getThaiTodayStr = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

/**
 * Returns the current date components for Thailand.
 */
export const getThaiDateComponents = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateStr = formatter.format(date); // YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month: month - 1, day, dateStr };
};

/**
 * Returns a Date object representing the current time in Thailand.
 * Note: The Date object's UTC time will be shifted to match Thailand's local time.
 * Use this carefully for comparisons.
 */
export const getThaiNow = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
};

/**
 * Checks if a given UTC date string corresponds to today in Thailand.
 */
export const isTodayInThai = (dateStr: string): boolean => {
  return dateStr === getThaiTodayStr();
};
