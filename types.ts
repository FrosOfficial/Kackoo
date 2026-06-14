// Shared type definitions for the Kackoo app.

export interface ClassEntry {
  id: string;
  code: string;
  start: string;
  end: string;
  room: string;
  building: string;
}

export type DayName =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type Schedule = Record<DayName, ClassEntry[]>;

export interface WeekInfo {
  weekNum: number;
  mode: "Online" | "In-person";
  label: string;
  startDate: Date;
  endDate: Date;
}

export type TermType = "semester" | "trimester" | "quad";
export type LearningMode = "blended" | "online" | "inperson";
export type OnlineWeekPattern = "even" | "odd";
export type AlarmSound = "default" | "alarm" | "chime" | "beep";

export interface TermSettings {
  termType: TermType;
  totalWeeks: number;
  learningMode: LearningMode;
  onlineOffset: number;
  inpersonOffset: number;
  onlineWeekPattern: OnlineWeekPattern;
  alarmSound: AlarmSound;
}
