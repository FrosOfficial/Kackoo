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
import { loadSchedule, saveSchedule, resetSchedule, loadApiKey, saveApiKey, loadTermSettings, saveTermSettings } from "./utils/storage";
import { parseScheduleImage, DEVELOPER_API_KEY } from "./utils/geminiParser";
import * as ImagePicker from "expo-image-picker";

export default function App() {
  const [now] = useState(new Date());
  const todayName = getDayName(now);
  const [selectedDay, setSelectedDay] = useState(todayName);
  const [termType, setTermType] = useState("trimester");
  const [totalWeeks, setTotalWeeks] = useState(14);
  const [learningMode, setLearningMode] = useState("blended");
  const [onlineOffset, setOnlineOffset] = useState(5);
  const [inpersonOffset, setInpersonOffset] = useState(15);
  const [onlineWeekPattern, setOnlineWeekPattern] = useState("even");
  const [alarmSound, setAlarmSound] = useState("alarm");
  const [isConfiguringUpload, setIsConfiguringUpload] = useState(false);
  const [weekInfo, setWeekInfo] = useState(() => getCurrentWeek(now, 14, "blended", "even"));
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
    if (!apiKey && !DEVELOPER_API_KEY) {
      alert("Please enter a Gemini API key in Settings first!");
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
      quality: 0.2,
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
    const initApp = async () => {
      const storedSchedule = await loadSchedule();
      setSchedule(storedSchedule);
      const storedKey = await loadApiKey();
      setApiKey(storedKey);
      
      const { termType: storedType, totalWeeks: storedWeeks, learningMode: storedMode, onlineOffset: storedOnline, inpersonOffset: storedInPerson, onlineWeekPattern: storedPattern, alarmSound: storedSound } = await loadTermSettings();
      setTermType(storedType);
      setTotalWeeks(storedWeeks);
      setLearningMode(storedMode);
      setOnlineOffset(storedOnline);
      setInpersonOffset(storedInPerson);
      setOnlineWeekPattern(storedPattern);
      setAlarmSound(storedSound);
      setWeekInfo(getCurrentWeek(now, storedWeeks, storedMode, storedPattern));
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
        const { totalWeeks, learningMode, onlineWeekPattern, alarmSound } = await loadTermSettings();
        const currentWeekInfo = getCurrentWeek(new Date(), totalWeeks, learningMode, onlineWeekPattern);
        const isOnlineWeek = currentWeekInfo?.mode === "Online";
        AlarmModule.playAlarm(alarmSound || "alarm", isOnlineWeek);
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
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const { totalWeeks: latestWeeks, learningMode: latestMode, onlineOffset: latestOnline, inpersonOffset: latestInPerson, onlineWeekPattern: latestPattern, alarmSound: latestSound } = await loadTermSettings();
        setWeekInfo(getCurrentWeek(new Date(), latestWeeks, latestMode, latestPattern));
        setOnlineOffset(latestOnline);
        setInpersonOffset(latestInPerson);
        setOnlineWeekPattern(latestPattern);
        setAlarmSound(latestSound);
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
                className="px-4 py-2 rounded-full bg-surface-700 items-center justify-center border border-white/5"
              >
                <Text className="text-white text-xs font-semibold">Settings</Text>
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
              schedule={schedule}
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
                Ringing - Tap to Stop Alarm
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings Modal */}
        {/* Settings Modal */}
        <Modal
          visible={isSettingsVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setIsSettingsVisible(false);
            setIsConfiguringUpload(false);
          }}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-surface-800 rounded-t-3xl p-6 border-t border-white/10" style={{ maxHeight: "85%" }}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white text-xl font-bold">
                  {isConfiguringUpload ? "Step 1: Choose Term Settings" : "Kackoo Settings"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsSettingsVisible(false);
                    setIsConfiguringUpload(false);
                  }}
                  className="w-8 h-8 rounded-full bg-surface-700 items-center justify-center"
                >
                  <Text className="text-white text-sm font-bold">✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {isConfiguringUpload ? (
                  <>
                    <View className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-2xl mb-5">
                      <Text className="text-cyan-400 text-sm font-bold">Setup Guide</Text>
                      <Text className="text-gray-300 text-xs mt-1 leading-4">
                        Please confirm your school's term system, total weeks, and learning mode first. Then tap the button at the bottom to upload your schedule photo!
                      </Text>
                    </View>

                    {/* Term System Selector */}
                    <Text className="text-gray-400 text-sm font-semibold mb-2">Term System</Text>
                    <View className="flex-row gap-2 mb-4">
                      {[
                        { id: "semester", label: "Semester" },
                        { id: "trimester", label: "Trimester" },
                        { id: "quad", label: "Quad Term" },
                      ].map((item) => {
                        const isActive = termType === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.8}
                            onPress={async () => {
                              const defaultWeeks =
                                item.id === "semester" ? 16 : item.id === "trimester" ? 14 : 10;
                              setTermType(item.id);
                              setTotalWeeks(defaultWeeks);
                              setWeekInfo(getCurrentWeek(now, defaultWeeks, learningMode, onlineWeekPattern));
                              await saveTermSettings(item.id, defaultWeeks, learningMode, onlineOffset, inpersonOffset, onlineWeekPattern, alarmSound);
                              await scheduleWeekAlarms();
                            }}
                            className={`flex-1 py-3 rounded-2xl items-center border ${
                              isActive ? "bg-cyan-500 border-cyan-500" : "bg-surface-700 border-white/5"
                            }`}
                          >
                            <Text className={`font-bold text-sm ${isActive ? "text-surface-900" : "text-gray-300"}`}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Total Weeks Selector */}
                    <Text className="text-gray-400 text-sm font-semibold mb-2">Total Weeks</Text>
                    <View className="flex-row gap-2 mb-4">
                      {(termType === "semester"
                        ? [16, 17, 18]
                        : termType === "trimester"
                        ? [12, 13, 14]
                        : [10, 11]
                      ).map((weeksNum) => {
                        const isActive = totalWeeks === weeksNum;
                        return (
                          <TouchableOpacity
                            key={weeksNum}
                            activeOpacity={0.8}
                            onPress={async () => {
                              setTotalWeeks(weeksNum);
                              setWeekInfo(getCurrentWeek(now, weeksNum, learningMode, onlineWeekPattern));
                              await saveTermSettings(termType, weeksNum, learningMode, onlineOffset, inpersonOffset, onlineWeekPattern, alarmSound);
                              await scheduleWeekAlarms();
                            }}
                            className={`flex-1 py-3 rounded-2xl items-center border ${
                              isActive ? "bg-cyan-500 border-cyan-500" : "bg-surface-700 border-white/5"
                            }`}
                          >
                            <Text className={`font-bold text-sm ${isActive ? "text-surface-900" : "text-gray-300"}`}>
                              {weeksNum} Week
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Learning Mode Selector */}
                    <Text className="text-gray-400 text-sm font-semibold mb-2">Learning Mode</Text>
                    <View className="flex-row gap-2 mb-4">
                      {[
                        { id: "blended", label: "Blended" },
                        { id: "online", label: "Full Online" },
                        { id: "inperson", label: "Full Face" },
                      ].map((item) => {
                        const isActive = learningMode === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.8}
                            onPress={async () => {
                              setLearningMode(item.id);
                              setWeekInfo(getCurrentWeek(now, totalWeeks, item.id, onlineWeekPattern));
                              await saveTermSettings(termType, totalWeeks, item.id, onlineOffset, inpersonOffset, onlineWeekPattern, alarmSound);
                              await scheduleWeekAlarms();
                            }}
                            className={`flex-1 py-3 rounded-2xl items-center border ${
                              isActive ? "bg-cyan-500 border-cyan-500" : "bg-surface-700 border-white/5"
                            }`}
                          >
                            <Text className={`font-bold text-xs ${isActive ? "text-surface-900" : "text-gray-300"}`}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Online Weeks Pattern */}
                    {learningMode === "blended" && (
                      <>
                        <Text className="text-gray-400 text-sm font-semibold mb-2">Online Weeks Pattern</Text>
                        <View className="flex-row gap-2 mb-4">
                          {[
                            { id: "even", label: "Even Weeks" },
                            { id: "odd", label: "Odd Weeks" },
                          ].map((item) => {
                            const isActive = onlineWeekPattern === item.id;
                            return (
                              <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.8}
                                onPress={async () => {
                                  setOnlineWeekPattern(item.id);
                                  setWeekInfo(getCurrentWeek(now, totalWeeks, learningMode, item.id));
                                  await saveTermSettings(termType, totalWeeks, learningMode, onlineOffset, inpersonOffset, item.id, alarmSound);
                                  await scheduleWeekAlarms();
                                }}
                                className={`flex-1 py-3 rounded-2xl items-center border ${
                                  isActive ? "bg-cyan-500 border-cyan-500" : "bg-surface-700 border-white/5"
                                }`}
                              >
                                <Text className={`font-bold text-xs ${isActive ? "text-surface-900" : "text-gray-300"}`}>
                                  {item.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}

                    {/* Online Alarm Offset */}
                    {(learningMode === "blended" || learningMode === "online") && (
                      <>
                        <Text className="text-gray-400 text-sm font-semibold mb-2">Online Alarm Offset</Text>
                        <View className="flex-row gap-2 mb-4">
                          {[
                            { val: 1, label: "1 Min" },
                            { val: 5, label: "5 Min" },
                            { val: 10, label: "10 Min" },
                            { val: 15, label: "15 Min" },
                          ].map((item) => {
                            const isActive = onlineOffset === item.val;
                            return (
                              <TouchableOpacity
                                key={item.val}
                                activeOpacity={0.8}
                                onPress={async () => {
                                  setOnlineOffset(item.val);
                                  await saveTermSettings(termType, totalWeeks, learningMode, item.val, inpersonOffset, onlineWeekPattern, alarmSound);
                                  await scheduleWeekAlarms();
                                }}
                                className={`flex-1 py-3 rounded-2xl items-center border ${
                                  isActive ? "bg-cyan-500 border-cyan-500" : "bg-surface-700 border-white/5"
                                }`}
                              >
                                <Text className={`font-bold text-xs ${isActive ? "text-surface-900" : "text-gray-300"}`}>
                                  {item.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}

                    {/* Face to Face Alarm Offset */}
                    {(learningMode === "blended" || learningMode === "inperson") && (
                      <>
                        <Text className="text-gray-400 text-sm font-semibold mb-2">Face to Face Alarm Offset</Text>
                        <View className="flex-row gap-2 mb-4">
                          {[
                            { val: 15, label: "15 Min" },
                            { val: 30, label: "30 Min" },
                            { val: 60, label: "1 Hr" },
                            { val: 120, label: "2 Hr" },
                          ].map((item) => {
                            const isActive = inpersonOffset === item.val;
                            return (
                              <TouchableOpacity
                                key={item.val}
                                activeOpacity={0.8}
                                onPress={async () => {
                                  setInpersonOffset(item.val);
                                  await saveTermSettings(termType, totalWeeks, learningMode, onlineOffset, item.val, onlineWeekPattern, alarmSound);
                                  await scheduleWeekAlarms();
                                }}
                                className={`flex-1 py-3 rounded-2xl items-center border ${
                                  isActive ? "bg-cyan-500 border-cyan-500" : "bg-surface-700 border-white/5"
                                }`}
                              >
                                <Text className={`font-bold text-xs ${isActive ? "text-surface-900" : "text-gray-300"}`}>
                                  {item.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}

                    {/* Alarm Sound Selector */}
                    <Text className="text-gray-400 text-sm font-semibold mb-2">Alarm Sound</Text>
                    <View className="flex-row gap-2 mb-6">
                      {[
                        { id: "alarm", label: "Default Beep" },
                        { id: "chime", label: "Gentle Chime" },
                        { id: "beep", label: "Double Beep" },
                      ].map((item) => {
                        const isActive = alarmSound === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.8}
                            onPress={async () => {
                              setAlarmSound(item.id);
                              await saveTermSettings(termType, totalWeeks, learningMode, onlineOffset, inpersonOffset, onlineWeekPattern, item.id);
                              await scheduleWeekAlarms();

                              // Play a brief sample preview of the selected sound
                              try {
                                AlarmModule.stopAlarm();
                                // Play without looping so it stops naturally or gets cut off
                                AlarmModule.playAlarm(item.id, false);
                                setTimeout(() => {
                                  AlarmModule.stopAlarm();
                                }, 2000); // stop preview after 2 seconds
                              } catch (err) {
                                console.error("Failed to play sound preview:", err);
                              }
                            }}
                            className={`flex-1 py-3 rounded-2xl items-center border ${
                              isActive ? "bg-cyan-500 border-cyan-500" : "bg-surface-700 border-white/5"
                            }`}
                          >
                            <Text className={`font-bold text-xs ${isActive ? "text-surface-900" : "text-gray-300"}`}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <>
                    {/* API Key Input */}
                    <Text className="text-gray-400 text-sm font-semibold mb-2">Gemini API Key</Text>
                    <TextInput
                      value={apiKey}
                      onChangeText={async (text) => {
                        setApiKey(text);
                        await saveApiKey(text);
                      }}
                      placeholder="Enter Gemini API Key..."
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={true}
                      className="bg-surface-700 border border-white/5 rounded-2xl px-4 py-3.5 text-white mb-6 text-sm"
                    />
                  </>
                )}

                {isParsing ? (
                  <View className="py-6 items-center">
                    <ActivityIndicator size="large" color="#06b6d4" />
                    <Text className="text-cyan-400 text-sm font-medium mt-4">
                      Gemini is reading your schedule...
                    </Text>
                  </View>
                ) : (
                  <View className="gap-3 mt-2">
                    {isConfiguringUpload ? (
                      <View className="flex-row gap-2 w-full">
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setIsConfiguringUpload(false)}
                          className="flex-1 bg-surface-700 py-4 rounded-2xl items-center border border-white/5"
                        >
                          <Text className="text-gray-300 text-base font-semibold">
                            ← Back
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={async () => {
                            setIsConfiguringUpload(false);
                            await handlePickImage();
                          }}
                          className="flex-[2] bg-cyan-500 py-4 rounded-2xl items-center"
                        >
                          <Text className="text-surface-900 text-base font-bold">
                            Select Photo
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setIsConfiguringUpload(true)}
                          className="bg-cyan-500 py-4 rounded-2xl items-center"
                        >
                          <Text className="text-surface-900 text-base font-bold">
                            Upload Schedule Image
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
                      </>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
