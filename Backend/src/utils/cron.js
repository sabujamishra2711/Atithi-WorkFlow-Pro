// Cron utility functions
export const isLastDayOfMonth = (date = new Date()) => {
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  return nextDay.getMonth() !== date.getMonth();
};

export const isFirstDayOfMonth = (date = new Date()) => {
  return date.getDate() === 1;
};

export const isDecember31st = (date = new Date()) => {
  return date.getMonth() === 11 && date.getDate() === 31; // Month is 0-based
};

export const isSunday = (date = new Date()) => {
  return date.getDay() === 0;
};