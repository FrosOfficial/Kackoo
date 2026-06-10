// Week logic with configurable semester/term duration.
// Pattern: odd weeks = In-person, even weeks = Online (except last 2 weeks which are always In-person).

// Configurable default start date.
// This is the Monday of Week 1.
const DEFAULT_SEMESTER_START = new Date(2026, 3, 6); // April 6, 2026

/**
 * Get the current week info based on a given date and term settings.
 * Returns { weekNum, mode, label, startDate, endDate } or null if outside term.
 */
export function getCurrentWeek(date = new Date(), totalWeeks = 14, learningMode = "blended", onlineWeekPattern = "even", semesterStart = DEFAULT_SEMESTER_START) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(semesterStart.getFullYear(), semesterStart.getMonth(), semesterStart.getDate());

  const diffMs = d.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;

  const weekIndex = Math.floor(diffDays / 7);

  if (weekIndex >= totalWeeks) return null;

  const weekNum = weekIndex + 1;
  let mode = "Online";
  let label = "";

  if (learningMode === "online") {
    mode = "Online";
    label = "Online Class";
  } else if (learningMode === "inperson") {
    mode = "In-person";
    label = "In-person Class";
  } else {
    // Blended: Alternating odd/even. Last 2 weeks are always in-person exams/finals.
    if (weekNum === totalWeeks - 1) {
      mode = "In-person";
      label = "In-person lab finals and lectures";
    } else if (weekNum === totalWeeks) {
      mode = "In-person";
      label = "In-person final exams";
    } else {
      const isOddWeek = weekNum % 2 === 1;
      if (onlineWeekPattern === "odd") {
        mode = isOddWeek ? "Online" : "In-person";
      } else {
        mode = isOddWeek ? "In-person" : "Online";
      }
      label = mode;
    }
  }

  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() + weekIndex * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return {
    weekNum,
    mode,
    label,
    startDate: weekStart,
    endDate: weekEnd,
  };
}

/**
 * Returns just the mode string ("Online" or "In-person") or null.
 */
export function getWeekMode(date = new Date(), totalWeeks = 14, learningMode = "blended", onlineWeekPattern = "even", semesterStart = DEFAULT_SEMESTER_START) {
  const week = getCurrentWeek(date, totalWeeks, learningMode, onlineWeekPattern, semesterStart);
  return week ? week.mode : null;
}

/**
 * Returns just the week number or null.
 */
export function getWeekNumber(date = new Date(), totalWeeks = 14, learningMode = "blended", onlineWeekPattern = "even", semesterStart = DEFAULT_SEMESTER_START) {
  const week = getCurrentWeek(date, totalWeeks, learningMode, onlineWeekPattern, semesterStart);
  return week ? week.weekNum : null;
}

/**
 * Get the semester start date (for reference/debugging).
 */
export function getSemesterStart() {
  return new Date(DEFAULT_SEMESTER_START);
}
