// Full weekly class schedule with consolidated time blocks.
// Each entry represents a single class session (multi-slot blocks merged).

export const SCHEDULE = {
  Monday: [
    { id: "mon-1", code: "ITS122P", start: "7:00AM", end: "10:30AM", room: "BM12", building: "MPO320" },
    { id: "mon-2", code: "MATH181", start: "11:40AM", end: "12:50PM", room: "EM02", building: "MPO311" },
    { id: "mon-3", code: "ITS132P", start: "2:00PM", end: "5:30PM", room: "BM12", building: "MPO320" },
    { id: "mon-4", code: "ITS181-01", start: "5:30PM", end: "9:00PM", room: "BM8", building: "MPO604" },
  ],
  Tuesday: [
    { id: "tue-1", code: "ITS122P", start: "8:10AM", end: "9:20AM", room: "BM12", building: "MPO604" },
    { id: "tue-2", code: "ITS151P", start: "12:50PM", end: "2:00PM", room: "BM12", building: "MPO604" },
    { id: "tue-3", code: "ITS132P", start: "2:00PM", end: "3:10PM", room: "BM12", building: "MPO606" },
    { id: "tue-4", code: "ITS141-1", start: "4:20PM", end: "5:30PM", room: "BM14", building: "MPO305" },
  ],
  Wednesday: [
    { id: "wed-1", code: "MATH181", start: "11:40AM", end: "12:50PM", room: "EM02", building: "MPO311" },
    { id: "wed-2", code: "ITS151P", start: "2:00PM", end: "5:30PM", room: "BM12", building: "MPO320" },
  ],
  Thursday: [
    { id: "thu-1", code: "ITS122P", start: "8:10AM", end: "9:20AM", room: "BM12", building: "MPO604" },
    { id: "thu-2", code: "ITS151P", start: "12:50PM", end: "2:00PM", room: "BM12", building: "MPO604" },
    { id: "thu-3", code: "ITS132P", start: "2:00PM", end: "3:10PM", room: "BM12", building: "MPO606" },
    { id: "thu-4", code: "ITS141-1", start: "4:20PM", end: "5:30PM", room: "BM14", building: "MPO322" },
  ],
  Friday: [
    { id: "fri-1", code: "MATH181", start: "11:40AM", end: "12:50PM", room: "EM02", building: "MPO311" },
  ],
  Saturday: [
    { id: "sat-1", code: "FW04-2", start: "10:30AM", end: "12:50PM", room: "BM9", building: "MPOGYM1" },
    { id: "sat-2", code: "ITS141-1", start: "2:00PM", end: "3:10PM", room: "BM14", building: "MPO604" },
  ],
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
