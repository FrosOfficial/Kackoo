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
  Modal,
  TextInput,
  ActivityIndicator,
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
import { loadSchedule, saveSchedule, resetSchedule, loadApiKey, saveApiKey } from "./utils/storage";
import { parseScheduleImage } from "./utils/geminiParser";
import * as ImagePicker from "expo-image-picker";

export default function App() {
  const [now] = useState(new Date());
  const todayName = getDayName(now);
  const [selectedDay, setSelectedDay] = useState(todayName);
  const [weekInfo, setWeekInfo] = useState(() => getCurrentWeek(now));
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [schedule, setSchedule] = useState(SCHEDULE);
  const [apiKey, setApiKey] = useState("");
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

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

  // Pick an image of the schedule and parse it using Gemini
  const handlePickImage = async () => {
    if (!apiKey) {
      alert("Please enter your Gemini API key in Settings first!");
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Permission to access the media library is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const base64 = asset.base64;
      
      const filename = asset.uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : "image";
      const mimeType = asset.mimeType || type;
      
      setIsParsing(true);
      try {
        const parsed = await parseScheduleImage(base64, mimeType, apiKey);
        if (parsed && typeof parsed === "object") {
          await saveSchedule(parsed);
          setSchedule(parsed);
          await scheduleWeekAlarms(); // reschedule all alarms
          alert("Schedule updated successfully!");
          setIsSettingsVisible(false);
        } else {
          throw new Error("Invalid schedule format returned.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse schedule: " + err.message);
      } finally {
        setIsParsing(false);
      }
    }
  };

  // Reset custom schedule to default
  const handleResetSchedule = async () => {
    try {
      await resetSchedule();
      const defaultSchedule = await loadSchedule();
      setSchedule(defaultSchedule);
      await scheduleWeekAlarms();
      alert("Schedule reset to default!");
      setIsSettingsVisible(false);
    } catch (err) {
      console.error(err);
      alert("Failed to reset schedule: " + err.message);
    }
  };

  // Initialize week info and notifications on mount
  useEffect(() => {
    const info = getCurrentWeek(now);
    setWeekInfo(info);

    const initApp = async () => {
      const storedSchedule = await loadSchedule();
      setSchedule(storedSchedule);
      const storedKey = await loadApiKey();
      setApiKey(storedKey);
    };

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
      await initApp();
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

  const classes = schedule[selectedDay] || [];
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
            <View className="px-5 pt-14 pb-2 flex-row items-center justify-between">
              <View>
                <Text className="text-white text-3xl font-bold">Kackoo</Text>
                <Text className="text-gray-500 text-sm mt-1">{dateStr}</Text>
              </View>
              {/* Settings button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsSettingsVisible(true)}
                className="w-10 h-10 rounded-full bg-surface-700 items-center justify-center border border-white/5"
              >
                <Text className="text-lg">⚙️</Text>
              </TouchableOpacity>
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

        {/* Settings Modal */}
        <Modal
          visible={isSettingsVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsSettingsVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-surface-800 rounded-t-3xl p-6 border-t border-white/10" style={{ maxHeight: "80%" }}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white text-xl font-bold">Kackoo Settings</Text>
                <TouchableOpacity
                  onPress={() => setIsSettingsVisible(false)}
                  className="w-8 h-8 rounded-full bg-surface-700 items-center justify-center"
                >
                  <Text className="text-white text-sm font-bold">✕</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-gray-400 text-sm font-semibold mb-2">Gemini API Key</Text>
              <TextInput
                secureTextEntry
                placeholder="Paste your Gemini API key..."
                placeholderTextColor="#4b5563"
                value={apiKey}
                onChangeText={(text) => {
                  setApiKey(text);
                  saveApiKey(text);
                }}
                className="bg-surface-700 text-white px-4 py-3 rounded-2xl mb-6 border border-white/5"
              />

              {isParsing ? (
                <View className="py-6 items-center">
                  <ActivityIndicator size="large" color="#06b6d4" />
                  <Text className="text-cyan-400 text-sm font-medium mt-4">
                    Gemini is reading your schedule...
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePickImage}
                    className="bg-cyan-500 py-4 rounded-2xl items-center"
                  >
                    <Text className="text-surface-900 text-base font-bold">
                      📸 Upload Schedule Image
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleResetSchedule}
                    className="bg-surface-700 py-4 rounded-2xl items-center border border-white/5"
                  >
                    <Text className="text-red-400 text-base font-semibold">
                      Reset to Default Schedule
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text className="text-gray-500 text-xs text-center mt-6 leading-4">
                Get a free API key from Google AI Studio. The image will be processed securely using Gemini 1.5 Flash.
              </Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
