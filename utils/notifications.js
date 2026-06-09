import notifee, {
  AndroidImportance,
  AndroidCategory,
  TriggerType,
  AlarmType,
} from "@notifee/react-native";
import { Platform } from "react-native";
import { SCHEDULE } from "../data/scheduleData";
import { getCurrentWeek } from "./weekLogic";

/**
 * Create the alarm notification channel (Android only).
 * Uses ALARM category for full-screen, high-priority alerts.
 */
async function ensureChannel() {
  if (Platform.OS === "android") {
    await notifee.createChannel({
      id: "class-alarm",
      name: "Class Alarms",
      importance: AndroidImportance.HIGH,
      vibration: true,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      sound: "default",
    });
  }
}

/**
 * Request notification/alarm permissions.
 */
export async function requestPermissions() {
  // Request notification permission
  const settings = await notifee.requestPermission();

  // On Android 12+, request exact alarm permission
  if (Platform.OS === "android") {
    const alarmPerm = await notifee.getNotificationSettings();
    if (alarmPerm.android?.alarm !== 1) {
      // Opens the system settings for exact alarm permission
      await notifee.openAlarmPermissionSettings();
    }
  }

  await ensureChannel();
  return true;
}

/**
 * Parse a time string like "7:00AM" or "2:00PM" into { hours, minutes } in 24h format.
 */
function parseTime(timeStr) {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;

  return { hours, minutes };
}

/**
 * Cancel all existing alarms and reschedule for the current week.
 * Uses notifee's alarm trigger for exact timing.
 */
export async function scheduleWeekAlarms() {
  // Cancel all existing scheduled notifications
  await notifee.cancelAllNotifications();

  const now = new Date();
  const weekInfo = getCurrentWeek(now);

  if (!weekInfo) return;

  const isOnline = weekInfo.mode === "Online";

  await ensureChannel();

  // Schedule alarms for each remaining day in the week
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayOffset);

    const jsDayIndex = targetDate.getDay();
    const dayNameMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const scheduleDayName = dayNameMap[jsDayIndex];

    const classes = SCHEDULE[scheduleDayName] || [];

    for (const cls of classes) {
      const time = parseTime(cls.start);
      if (!time) continue;

      // Build the trigger date: 15 minutes before class
      const triggerDate = new Date(targetDate);
      triggerDate.setHours(time.hours, time.minutes - 15, 0, 0);

      // Skip if this time has already passed
      if (triggerDate <= now) continue;

      // Build notification body
      let body;
      if (isOnline) {
        body = `${cls.code} starts at ${cls.start} - Online class this week(${weekInfo.weekNum})`;
      } else {
        body = `${cls.code} starts at ${cls.start} - In-person class at ${cls.room} ${cls.building} this week(${weekInfo.weekNum})`;
      }

      // Schedule the alarm using notifee
      await notifee.createTriggerNotification(
        {
          title: `⏰ ${cls.code} in 15 minutes!`,
          body,
          android: {
            channelId: "class-alarm",
            category: AndroidCategory.ALARM,
            importance: AndroidImportance.HIGH,
            sound: "default",
            vibrationPattern: [0, 500, 250, 500, 250, 500],
            fullScreenAction: {
              id: "default",
            },
            pressAction: {
              id: "default",
            },
            autoCancel: true,
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerDate.getTime(),
          alarmManager: {
            type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
          },
        }
      );
    }
  }
}
