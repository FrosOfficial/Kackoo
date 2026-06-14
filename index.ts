import { registerRootComponent } from "expo";
import notifee, { EventType } from "@notifee/react-native";
import AlarmModule from "alarm-module";
import { loadTermSettings } from "./utils/storage";
import { getCurrentWeek } from "./utils/weekLogic";

import App from "./App";

// Handle alarm triggers and dismiss from background/lockscreen
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  console.log("Background event received:", type);

  if (type === EventType.DELIVERED) {
    console.log("Alarm triggered! Playing alarm stream audio...");
    try {
      const { totalWeeks, learningMode, onlineWeekPattern, alarmSound } =
        await loadTermSettings();
      const currentWeekInfo = getCurrentWeek(
        new Date(),
        totalWeeks,
        learningMode,
        onlineWeekPattern
      );
      const isOnlineWeek = currentWeekInfo?.mode === "Online";
      AlarmModule.playAlarm(alarmSound || "default", isOnlineWeek ?? true);
    } catch (err) {
      console.error("Failed to play background alarm:", err);
      // Fallback to default alarm looping as safe fallback
      AlarmModule.playAlarm("default", true);
    }
  } else if (
    (type === EventType.ACTION_PRESS &&
      pressAction?.id === "dismiss-alarm") ||
    type === EventType.DISMISSED ||
    type === EventType.PRESS
  ) {
    console.log("Stopping alarm stream audio...");
    AlarmModule.stopAlarm();
    if (notification?.id) {
      await notifee.cancelNotification(notification.id);
    }
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
