// Week logic with configurable semester start date.
// Pattern: odd weeks = In-person, even weeks = Online (except 13 & 14).

// Configurable: change this to shift the entire semester calendar.
// This is the Monday of Week 1.
const SEMESTER_START = new Date(2026, 3, 6); // April 6, 2026

const WEEKS = [
  { weekNum: 1, mode: "In-person" },
  { weekNum: 2, mode: "Online" },
  { weekNum: 3, mode: "In-person" },
  { weekNum: 4, mode: "Online" },
  { weekNum: 5, mode: "In-person" },
  { weekNum: 6, mode: "Online" },
  { weekNum: 7, mode: "In-person" },
  { weekNum: 8, mode: "Online" },
  { weekNum: 9, mode: "In-person" },
  { weekNum: 10, mode: "Online" },
  { weekNum: 11, mode: "In-person" },
  { weekNum: 12, mode: "Online" },
  { weekNum: 13, mode: "In-person" },  // Lab finals and lectures
  { weekNum: 14, mode: "In-person" },  // Final exams
];

// Special labels for weeks 13 & 14
const SPECIAL_LABELS = {
  13: "In-person lab finals and lectures",
  14: "In-person final exams",
};

/**
 * Get the current week info based on a given date.
 * Returns { weekNum, mode, label, startDate, endDate } or null if outside semester.
 */
export function getCurrentWeek(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(SEMESTER_START.getFullYear(), SEMESTER_START.getMonth(), SEMESTER_START.getDate());

  const diffMs = d.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;

  const weekIndex = Math.floor(diffDays / 7);

  if (weekIndex >= WEEKS.length) return null;

  const week = WEEKS[weekIndex];
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() + weekIndex * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return {
    weekNum: week.weekNum,
    mode: week.mode,
    label: SPECIAL_LABELS[week.weekNum] || `${week.mode}`,
    startDate: weekStart,
    endDate: weekEnd,
  };
}

/**
 * Returns just the mode string ("Online" or "In-person") or null.
 */
export function getWeekMode(date = new Date()) {
  const week = getCurrentWeek(date);
  return week ? week.mode : null;
}

/**
 * Returns just the week number or null.
 */
export function getWeekNumber(date = new Date()) {
  const week = getCurrentWeek(date);
  return week ? week.weekNum : null;
}

/**
 * Get the semester start date (for reference/debugging).
 */
export function getSemesterStart() {
  return new Date(SEMESTER_START);
}
