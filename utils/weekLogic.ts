import type { LearningMode, OnlineWeekPattern, WeekInfo } from "../types";

// Week logic with configurable semester/term duration.
// Pattern: odd weeks = In-person, even weeks = Online (except last 2 weeks which are always In-person).

// Configurable default start date.
// This is the Monday of Week 1.
const DEFAULT_SEMESTER_START = new Date(2026, 3, 6); // April 6, 2026

/**
 * Get the current week info based on a given date and term settings.
 * Returns WeekInfo or null if outside term.
 */
export function getCurrentWeek(
  date: Date = new Date(),
  totalWeeks: number = 14,
  learningMode: LearningMode = "blended",
  onlineWeekPattern: OnlineWeekPattern = "even",
  semesterStart: Date = DEFAULT_SEMESTER_START
): WeekInfo | null {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(
    semesterStart.getFullYear(),
    semesterStart.getMonth(),
    semesterStart.getDate()
  );

  const diffMs = d.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;

  const weekIndex = Math.floor(diffDays / 7);

  if (weekIndex >= totalWeeks) return null;

  const weekNum = weekIndex + 1;
  let mode: "Online" | "In-person" = "Online";
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
export function getWeekMode(
  date: Date = new Date(),
  totalWeeks: number = 14,
  learningMode: LearningMode = "blended",
  onlineWeekPattern: OnlineWeekPattern = "even",
  semesterStart: Date = DEFAULT_SEMESTER_START
): "Online" | "In-person" | null {
  const week = getCurrentWeek(
    date,
    totalWeeks,
    learningMode,
    onlineWeekPattern,
    semesterStart
  );
  return week ? week.mode : null;
}

/**
 * Returns just the week number or null.
 */
export function getWeekNumber(
  date: Date = new Date(),
  totalWeeks: number = 14,
  learningMode: LearningMode = "blended",
  onlineWeekPattern: OnlineWeekPattern = "even",
  semesterStart: Date = DEFAULT_SEMESTER_START
): number | null {
  const week = getCurrentWeek(
    date,
    totalWeeks,
    learningMode,
    onlineWeekPattern,
    semesterStart
  );
  return week ? week.weekNum : null;
}

/**
 * Get the semester start date (for reference/debugging).
 */
export function getSemesterStart(): Date {
  return new Date(DEFAULT_SEMESTER_START);
}
