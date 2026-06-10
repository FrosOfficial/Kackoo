import notifee, {
  AndroidImportance,
  AndroidCategory,
  TriggerType,
  AlarmType,
} from "@notifee/react-native";
import { Platform } from "react-native";
import { SCHEDULE } from "../data/scheduleData";
import { getCurrentWeek } from "./weekLogic";
import { loadSchedule, loadTermSettings } from "./storage";

/**
 * Create the alarm notification channel (Android only).
 * Uses ALARM category for full-screen, high-priority alerts.
 */
async function ensureChannel() {
  if (Platform.OS === "android") {
    await notifee.createChannel({
      id: "class-alarm-v4",
      name: "Class Alarms",
      importance: AndroidImportance.HIGH,
      vibration: true,
      vibrationPattern: [500, 250, 500, 250],
      sound: "alarm",
      bypassDnd: true,
    });
  }
}

/**
 * Request notification/alarm permissions.
 */
export async function requestPermissions() {
  console.log("Requesting permissions...");
  try {
    // Request notification permission
    const settings = await notifee.requestPermission();
    console.log("Notification permissions settings:", settings);

    // On Android 12+, request exact alarm permission
    if (Platform.OS === "android") {
      const alarmPerm = await notifee.getNotificationSettings();
      console.log("Android Alarm permission status:", alarmPerm.android?.alarm);
      if (alarmPerm.android?.alarm !== 1) {
        console.log("Opening system settings for exact alarms...");
        await notifee.openAlarmPermissionSettings();
      }
    }

    await ensureChannel();
    console.log("Permissions successfully checked and channel ensured.");
    return true;
  } catch (err) {
    console.error("Error checking permissions:", err);
    return false;
  }
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
  const { totalWeeks, learningMode, onlineOffset, inpersonOffset, onlineWeekPattern } = await loadTermSettings();
  const weekInfo = getCurrentWeek(now, totalWeeks, learningMode, onlineWeekPattern);

  if (!weekInfo) return;

  const isOnline = weekInfo.mode === "Online";

  await ensureChannel();

  const scheduleData = await loadSchedule();

  // Schedule alarms for each remaining day in the week
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayOffset);

    const jsDayIndex = targetDate.getDay();
    const dayNameMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const scheduleDayName = dayNameMap[jsDayIndex];

    const classes = scheduleData[scheduleDayName] || [];

    for (const cls of classes) {
      const time = parseTime(cls.start);
      if (!time) continue;

      // Custom offsets or standard fallbacks
      const minutesLeft = isOnline ? (onlineOffset || 5) : (inpersonOffset || 15);

      // Build the trigger date
      const triggerDate = new Date(targetDate);
      triggerDate.setHours(time.hours, time.minutes - minutesLeft, 0, 0);

      // Skip if this time has already passed
      if (triggerDate <= now) continue;

      // Build notification body
      let body;
      if (isOnline) {
        body = `${cls.code} starts at ${cls.start} - Online class this week(${weekInfo.weekNum})`;
      } else {
        body = `${cls.code} starts at ${cls.start} - In-person class at ${cls.room} ${cls.building} this week(${weekInfo.weekNum})`;
      }

      // Format offset string for high-premium title view
      let offsetStr;
      if (minutesLeft >= 60) {
        const hrs = minutesLeft / 60;
        offsetStr = `${hrs} hour${hrs > 1 ? "s" : ""}`;
      } else {
        offsetStr = `${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}`;
      }

      // Schedule the alarm using notifee
      await notifee.createTriggerNotification(
        {
          title: `⏰ ${cls.code} in ${offsetStr}!`,
          body,
          android: {
            channelId: "class-alarm-v4",
            category: AndroidCategory.ALARM,
            importance: AndroidImportance.HIGH,
            sound: "alarm",
            vibrationPattern: [500, 250, 500, 250],
            loopSound: true,
            ongoing: true,
            autoCancel: false,
            fullScreenAction: {
              id: "default",
            },
            pressAction: {
              id: "default",
            },
            actions: [
              {
                title: "Dismiss",
                pressAction: {
                  id: "dismiss-alarm",
                },
              },
            ],
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

/**
 * Schedule a test alarm to fire 10 seconds from now.
 */
export async function scheduleTestAlarm() {
  await ensureChannel();
  const triggerTime = Date.now() + 10000; // 10 seconds from now
  console.log("Scheduling test alarm for:", new Date(triggerTime).toTimeString());

  try {
    await notifee.createTriggerNotification(
      {
        title: "⏰ Kackoo Test Alarm",
        body: "If you see this, your alarm configuration is working perfectly!",
        android: {
          channelId: "class-alarm-v4",
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          sound: "alarm",
          vibrationPattern: [500, 250, 500, 250],
          loopSound: true,
          ongoing: true,
          autoCancel: false,
          fullScreenAction: {
            id: "default",
          },
          pressAction: {
            id: "default",
          },
          actions: [
            {
              title: "Dismiss",
              pressAction: {
                id: "dismiss-alarm",
              },
            },
          ],
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime,
        alarmManager: {
          type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
        },
      }
    );
    console.log("Test alarm successfully scheduled!");
  } catch (err) {
    console.error("Failed to schedule test alarm:", err);
  }
}

