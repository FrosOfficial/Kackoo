// Full weekly class schedule with consolidated time blocks.
// Each entry represents a single class session (multi-slot blocks merged).

export const SCHEDULE = {
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
};

// Ordered day names for navigation
export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Map JS Date.getDay() (0=Sun) to our day names
export function getDayName(date) {
  const jsDay = date.getDay(); // 0=Sun, 1=Mon, ...
  const map = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return map[jsDay];
}
