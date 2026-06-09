import "./global.css";
import React, { useState, useEffect } from "react";
import notifee, { EventType } from "@notifee/react-native";
import AlarmModule from "alarm-module";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  AppState,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import { SCHEDULE, getDayName, DAY_NAMES } from "./data/scheduleData";
import { getCurrentWeek } from "./utils/weekLogic";
import { requestPermissions, scheduleWeekAlarms, scheduleTestAlarm } from "./utils/notifications";
import WeekBadge from "./components/WeekBadge";
import DaySelector from "./components/DaySelector";
import ClassCard from "./components/ClassCard";
import EmptyDay from "./components/EmptyDay";

export default function App() {
  const [now] = useState(new Date());
  const todayName = getDayName(now);
  const [selectedDay, setSelectedDay] = useState(todayName);
  const [weekInfo, setWeekInfo] = useState(() => getCurrentWeek(now));
  const [isAlarmActive, setIsAlarmActive] = useState(false);

  // Stop alarm and cancel notification
  const handleStopAlarm = async () => {
    try {
      console.log("Stopping alarm from button click...");
      AlarmModule.stopAlarm();
      setIsAlarmActive(false);
      await notifee.cancelAllNotifications();
      await scheduleWeekAlarms(); // reschedule remaining alarms
    } catch (err) {
      console.error("Error stopping alarm:", err);
    }
  };

  // Initialize week info and notifications on mount
  useEffect(() => {
    const info = getCurrentWeek(now);
    setWeekInfo(info);

    const checkAlarmStatus = async () => {
      try {
        const playing = await AlarmModule.isAlarmPlaying();
        setIsAlarmActive(playing);
      } catch (err) {
        console.error("Error checking alarm status:", err);
      }
    };

    // Request permissions and schedule alarms
    (async () => {
      const granted = await requestPermissions();
      if (granted) {
        await scheduleWeekAlarms();
        await scheduleTestAlarm();
      }
      checkAlarmStatus();
    })();

    // Handle alarm trigger/dismiss in foreground
    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      const { notification, pressAction } = detail;
      console.log("Foreground event received:", type);

      if (type === EventType.DELIVERED) {
        console.log("Alarm triggered in foreground! Playing audio...");
        AlarmModule.playAlarm();
        setIsAlarmActive(true);
      } else if (
        (type === EventType.ACTION_PRESS && pressAction?.id === "dismiss-alarm") ||
        type === EventType.DISMISSED ||
        type === EventType.PRESS
      ) {
        console.log("Stopping alarm stream audio from foreground...");
        AlarmModule.stopAlarm();
        setIsAlarmActive(false);
        await notifee.cancelNotification(notification.id);
      }
    });

    // Re-schedule alarms when app comes back to foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setWeekInfo(getCurrentWeek(new Date()));
        scheduleWeekAlarms();
        checkAlarmStatus();
      }
    });

    return () => {
      sub.remove();
      unsubscribeForeground();
    };
  }, []);

  // Swipe gesture to navigate days
  const screenWidth = Dimensions.get("window").width;
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onEnd((e) => {
      const currentIndex = DAY_NAMES.indexOf(selectedDay);
      if (e.translationX < -50 && currentIndex < DAY_NAMES.length - 1) {
        // Swiped left, go to next day
        setSelectedDay(DAY_NAMES[currentIndex + 1]);
      } else if (e.translationX > 50 && currentIndex > 0) {
        // Swiped right, go to previous day
        setSelectedDay(DAY_NAMES[currentIndex - 1]);
      }
    })
    .runOnJS(true);

  const classes = SCHEDULE[selectedDay] || [];
  const isToday = selectedDay === todayName;

  // Format today's date
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <SafeAreaProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-surface-900" edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

        <GestureDetector gesture={swipeGesture}>
          <View className="flex-1">
            {/* Header */}
            <View className="px-5 pt-14 pb-2">
              <Text className="text-white text-3xl font-bold">Kackoo</Text>
              <Text className="text-gray-500 text-sm mt-1">{dateStr}</Text>
            </View>

            {/* Week badge */}
            <View className="mt-3">
              <WeekBadge weekInfo={weekInfo} />
            </View>

            {/* Day selector */}
            <DaySelector
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              todayName={todayName}
            />

            {/* Day title */}
            <View className="px-5 mb-3 flex-row items-center">
              <Text className="text-white text-lg font-bold">
                {selectedDay}
              </Text>
              {isToday && (
                <View className="ml-2 px-2 py-0.5 bg-white/10 rounded-full">
                  <Text className="text-white text-xs font-medium">Today</Text>
                </View>
              )}
              <Text className="text-gray-600 text-sm ml-auto">
                {classes.length} {classes.length === 1 ? "class" : "classes"}
              </Text>
            </View>

            {/* Class list or empty state */}
            <ScrollView
              className="flex-1"
              contentContainerStyle={
                classes.length === 0 ? { flex: 1 } : { paddingBottom: isAlarmActive ? 100 : 32 }
              }
              showsVerticalScrollIndicator={false}
            >
              {classes.length === 0 ? (
                <EmptyDay />
              ) : (
                classes.map((cls) => (
                  <ClassCard key={cls.id} cls={cls} weekInfo={weekInfo} />
                ))
              )}
            </ScrollView>
          </View>
        </GestureDetector>

        {/* Floating STOP ALARM button */}
        {isAlarmActive && (
          <View className="absolute bottom-6 left-4 right-4 bg-red-600 rounded-2xl overflow-hidden shadow-2xl">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleStopAlarm}
              className="py-4 items-center justify-center bg-red-600"
              style={{
                shadowColor: "#dc2626",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
                elevation: 10,
              }}
            >
              <Text className="text-white text-lg font-bold tracking-wider">
                ⏰ Ringing - Tap to Stop Alarm
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
