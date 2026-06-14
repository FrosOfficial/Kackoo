import type { DayName, Schedule } from "../types";

// Full weekly class schedule with consolidated time blocks.
// Each entry represents a single class session (multi-slot blocks merged).

export const SCHEDULE: Schedule = {
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
};

// Ordered day names for navigation
export const DAY_NAMES: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Map JS Date.getDay() (0=Sun) to our day names
const DAY_MAP: DayName[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function getDayName(date: Date): DayName {
  return DAY_MAP[date.getDay()];
}
