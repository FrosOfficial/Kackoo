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
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import { SCHEDULE, getDayName, DAY_NAMES } from "./data/scheduleData";
import { getCurrentWeek } from "./utils/weekLogic";
import {
  requestPermissions,
  scheduleWeekAlarms,
  scheduleTestAlarm,
} from "./utils/notifications";
import WeekBadge from "./components/WeekBadge";
import DaySelector from "./components/DaySelector";
import ClassCard from "./components/ClassCard";
import EmptyDay from "./components/EmptyDay";
import {
  loadSchedule,
  saveSchedule,
  resetSchedule,
  loadApiKey,
  loadTermSettings,
  saveTermSettings,
  isAppInitialized,
  setAppInitialized,
} from "./utils/storage";
import { parseScheduleImage, DEVELOPER_API_KEY } from "./utils/geminiParser";
import * as ImagePicker from "expo-image-picker";
import type {
  DayName,
  Schedule,
  WeekInfo,
  TermType,
  LearningMode,
  OnlineWeekPattern,
  AlarmSound,
} from "./types";

// Onboarding step config
const ONBOARDING_STEPS = [
  { num: 1, label: "TERM SYSTEM" },
  { num: 2, label: "TOTAL WEEKS" },
  { num: 3, label: "LEARNING MODE" },
  { num: 4, label: "WEEK PATTERN" },
  { num: 5, label: "ALARM OFFSETS" },
  { num: 6, label: "ALARM SOUND" },
  { num: 7, label: "UPLOAD SCHEDULE" },
];

export default function App() {
  const [now] = useState(new Date());
  const todayName: DayName = getDayName(now);
  const [selectedDay, setSelectedDay] = useState<DayName>(todayName);
  const [termType, setTermType] = useState<TermType | null>("trimester");
  const [totalWeeks, setTotalWeeks] = useState<number | null>(14);
  const [learningMode, setLearningMode] = useState<LearningMode | null>("blended");
  const [onlineOffset, setOnlineOffset] = useState<number>(5);
  const [inpersonOffset, setInpersonOffset] = useState<number>(15);
  const [onlineWeekPattern, setOnlineWeekPattern] = useState<OnlineWeekPattern | null>("even");
  const [alarmSound, setAlarmSound] = useState<AlarmSound | null>("default");
  const [isConfiguringUpload, setIsConfiguringUpload] = useState(false);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(() =>
    getCurrentWeek(now, 14, "blended", "even")
  );
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [schedule, setSchedule] = useState<Schedule>(SCHEDULE);
  const [apiKey, setApiKey] = useState("");
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [refActiveTab, setRefActiveTab] = useState<"tan" | "blocks" | "badges">("tan");

  // Stop alarm and cancel notification
  const handleStopAlarm = async () => {
    try {
      console.log("Stopping alarm from button click...");
      AlarmModule.stopAlarm();
      setIsAlarmActive(false);
      await notifee.cancelAllNotifications();
      await scheduleWeekAlarms();
    } catch (err) {
      console.error("Error stopping alarm:", err);
    }
  };

  // Finish onboarding setup and save settings
  const handleFinishSetup = async () => {
    try {
      const patternToSave: OnlineWeekPattern = onlineWeekPattern || "even";
      const soundToSave: AlarmSound = alarmSound || "default";
      await saveTermSettings(
        termType!,
        totalWeeks!,
        learningMode!,
        onlineOffset,
        inpersonOffset,
        patternToSave,
        soundToSave
      );
      await setAppInitialized(true);
      setIsFirstTime(false);
      setIsSettingsVisible(false);
      setWeekInfo(
        getCurrentWeek(
          now,
          totalWeeks!,
          learningMode!,
          patternToSave
        )
      );
      await scheduleWeekAlarms();
    } catch (err: any) {
      console.error("Error finishing setup:", err);
      alert("Failed to finish setup: " + err.message);
    }
  };

  // Pick an image of the schedule and parse it using OpenRouter
  const handlePickImage = async () => {
    if (!apiKey && !DEVELOPER_API_KEY) {
      alert("OpenRouter API key is not configured.");
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Permission to access the media library is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
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
        const parsed = await parseScheduleImage(base64!, mimeType, apiKey);
        if (parsed && typeof parsed === "object") {
          await saveSchedule(parsed);
          setSchedule(parsed);
          if (isFirstTime) {
            await handleFinishSetup();
            alert("Schedule uploaded and setup complete!");
          } else {
            await scheduleWeekAlarms();
            alert("Schedule updated successfully!");
            setIsSettingsVisible(false);
          }
        } else {
          throw new Error("Invalid schedule format returned.");
        }
      } catch (err: any) {
        console.error(err);
        if (err.message === "NOT_A_SCHEDULE") {
          alert("The uploaded image doesn't look like a school schedule. Please upload a clear schedule image.");
        } else {
          alert("Failed to parse schedule: " + err.message);
        }
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
    } catch (err: any) {
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

      const initialized = await isAppInitialized();
      if (!initialized) {
        setIsFirstTime(true);
        setIsSettingsVisible(true);
        setTermType(null);
        setTotalWeeks(null);
        setLearningMode(null);
        setOnlineWeekPattern(null);
        setAlarmSound(null);
        setSetupStep(1);
      } else {
        setIsFirstTime(false);
        const settings = await loadTermSettings();
        setTermType(settings.termType);
        setTotalWeeks(settings.totalWeeks);
        setLearningMode(settings.learningMode);
        setOnlineOffset(settings.onlineOffset);
        setInpersonOffset(settings.inpersonOffset);
        setOnlineWeekPattern(settings.onlineWeekPattern);
        setAlarmSound(settings.alarmSound);
        setWeekInfo(
          getCurrentWeek(
            now,
            settings.totalWeeks,
            settings.learningMode,
            settings.onlineWeekPattern
          )
        );
      }
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
    const unsubscribeForeground = notifee.onForegroundEvent(
      async ({ type, detail }) => {
        const { notification, pressAction } = detail;
        console.log("Foreground event received:", type);

        if (type === EventType.DELIVERED) {
          console.log("Alarm triggered in foreground! Playing audio...");
          const settings = await loadTermSettings();
          const currentWeekInfo = getCurrentWeek(
            new Date(),
            settings.totalWeeks,
            settings.learningMode,
            settings.onlineWeekPattern
          );
          const isOnlineWeek = currentWeekInfo?.mode === "Online";
          AlarmModule.playAlarm(
            settings.alarmSound || "default",
            isOnlineWeek ?? true
          );
          setIsAlarmActive(true);
        } else if (
          (type === EventType.ACTION_PRESS &&
            pressAction?.id === "dismiss-alarm") ||
          type === EventType.DISMISSED ||
          type === EventType.PRESS
        ) {
          console.log("Stopping alarm stream audio from foreground...");
          AlarmModule.stopAlarm();
          setIsAlarmActive(false);
          if (notification?.id) {
            await notifee.cancelNotification(notification.id);
          }
        }
      }
    );

    // Re-schedule alarms when app comes back to foreground
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const settings = await loadTermSettings();
        setWeekInfo(
          getCurrentWeek(
            new Date(),
            settings.totalWeeks,
            settings.learningMode,
            settings.onlineWeekPattern
          )
        );
        setOnlineOffset(settings.onlineOffset);
        setInpersonOffset(settings.inpersonOffset);
        setOnlineWeekPattern(settings.onlineWeekPattern);
        setAlarmSound(settings.alarmSound);
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
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onEnd((e) => {
      const currentIndex = DAY_NAMES.indexOf(selectedDay);
      if (e.translationX < -50 && currentIndex < DAY_NAMES.length - 1) {
        setSelectedDay(DAY_NAMES[currentIndex + 1]);
      } else if (e.translationX > 50 && currentIndex > 0) {
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

  // Sound preview helper
  const previewSound = (soundId: string) => {
    try {
      AlarmModule.stopAlarm();
      AlarmModule.playAlarm(soundId, false);
      setTimeout(() => {
        AlarmModule.stopAlarm();
      }, 2000);
    } catch (err) {
      console.error("Failed to play sound preview:", err);
    }
  };

  // Pill button renderer for selector groups
  const renderPill = (
    key: string,
    label: string,
    isActive: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      key={key}
      activeOpacity={0.8}
      onPress={onPress}
      style={[s.pill, isActive && s.pillActive]}
    >
      <Text style={[s.pillText, isActive && s.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  // Section card wrapper for settings groups
  const SectionCard = ({
    title,
    stepNum,
    children,
  }: {
    title: string;
    stepNum?: number;
    children: React.ReactNode;
  }) => (
    <View style={s.sectionCard}>
      <Text style={s.sectionTitle}>
        {stepNum ? `STEP ${stepNum}: ${title}` : title}
      </Text>
      {children}
    </View>
  );

  // Progress dots for onboarding
  const renderProgressDots = () => (
    <View style={s.dotsRow}>
      {ONBOARDING_STEPS.map((step) => {
        // Skip step 4 dot if not blended
        if (step.num === 4 && learningMode !== "blended") return null;
        const isCurrent = setupStep === step.num;
        const isDone = setupStep > step.num;
        return (
          <View
            key={step.num}
            style={[
              s.dot,
              isCurrent && s.dotCurrent,
              isDone && s.dotDone,
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 bg-surface-900" edges={["top"]}>
          <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

          <GestureDetector gesture={swipeGesture}>
            <View className="flex-1">
              {/* Header */}
              <View className="px-5 pt-14 pb-2 flex-row items-center justify-between">
                <View>
                  <Text className="text-white text-3xl font-bold">Kackoo</Text>
                  <Text className="text-gray-500 text-sm mt-1">{dateStr}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsSettingsVisible(true)}
                  className="px-4 py-2 rounded-full bg-surface-700 items-center justify-center border border-white/5"
                >
                  <Text className="text-white text-xs font-semibold">
                    Settings
                  </Text>
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
                    <Text className="text-white text-xs font-medium">
                      Today
                    </Text>
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
                  classes.length === 0
                    ? { flex: 1 }
                    : { paddingBottom: isAlarmActive ? 100 : 32 }
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
          <Modal
            visible={isSettingsVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
              if (!isFirstTime) {
                setIsSettingsVisible(false);
                setIsConfiguringUpload(false);
              }
            }}
          >
            <View style={[s.modalOverlay, isFirstTime && s.modalOverlayFull]}>
              <View style={[s.modalSheet, isFirstTime && s.modalSheetFull]}>
                {/* Header */}
                <View style={s.modalHeader}>
                  <View>
                    <Text style={s.modalTitle}>
                      {isFirstTime ? "WELCOME TO KACKOO" : "KACKOO SETTINGS"}
                    </Text>
                    {isFirstTime && (
                      <Text style={s.modalSubtitle}>
                        Let's set up your schedule alarm.
                      </Text>
                    )}
                  </View>
                  {!isFirstTime && (
                    <TouchableOpacity
                      onPress={() => setIsSettingsVisible(false)}
                      style={s.closeBtn}
                    >
                      <Text style={s.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Progress dots for onboarding */}
                {isFirstTime && renderProgressDots()}

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 24 }}
                >
                  {isFirstTime ? (
                    /* ===== ONBOARDING WIZARD ===== */
                    <View>
                      {/* Step 1: Term System */}
                      <SectionCard title="CHOOSE TERM SYSTEM" stepNum={1}>
                        <View style={s.pillRow}>
                          {(
                            [
                              { id: "semester" as TermType, label: "Semester" },
                              { id: "trimester" as TermType, label: "Trimester" },
                              { id: "quad" as TermType, label: "Quad Term" },
                            ] as const
                          ).map((item) =>
                            renderPill(item.id, item.label, termType === item.id, () => {
                              const defaultWeeks =
                                item.id === "semester"
                                  ? 16
                                  : item.id === "trimester"
                                  ? 14
                                  : 10;
                              setTermType(item.id);
                              setTotalWeeks(defaultWeeks);
                              if (setupStep < 2) setSetupStep(2);
                            })
                          )}
                        </View>
                      </SectionCard>

                      {/* Step 2: Total Weeks */}
                      {setupStep >= 2 && (
                        <SectionCard title="CHOOSE TOTAL WEEKS" stepNum={2}>
                          <View style={s.pillRow}>
                            {(termType === "semester"
                              ? [16, 17, 18]
                              : termType === "trimester"
                              ? [12, 13, 14]
                              : [10, 11]
                            ).map((weeksNum) =>
                              renderPill(
                                `weeks-${weeksNum}`,
                                `${weeksNum} Weeks`,
                                totalWeeks === weeksNum,
                                () => {
                                  setTotalWeeks(weeksNum);
                                  if (setupStep < 3) setSetupStep(3);
                                }
                              )
                            )}
                          </View>
                        </SectionCard>
                      )}

                      {/* Step 3: Learning Mode */}
                      {setupStep >= 3 && (
                        <SectionCard title="CHOOSE LEARNING MODE" stepNum={3}>
                          <View style={s.pillRow}>
                            {(
                              [
                                { id: "blended" as LearningMode, label: "Blended" },
                                { id: "online" as LearningMode, label: "Full Online" },
                                { id: "inperson" as LearningMode, label: "Full Face" },
                              ] as const
                            ).map((item) =>
                              renderPill(
                                item.id,
                                item.label,
                                learningMode === item.id,
                                () => {
                                  setLearningMode(item.id);
                                  if (item.id === "blended") {
                                    setOnlineWeekPattern("even");
                                    if (setupStep < 4) setSetupStep(4);
                                  } else {
                                    if (setupStep < 5) setSetupStep(5);
                                  }
                                }
                              )
                            )}
                          </View>
                        </SectionCard>
                      )}

                      {/* Step 4: Online Weeks Pattern */}
                      {learningMode === "blended" && setupStep >= 4 && (
                        <SectionCard title="ONLINE WEEKS PATTERN" stepNum={4}>
                          <View style={s.pillRow}>
                            {(
                              [
                                { id: "even" as OnlineWeekPattern, label: "Even Weeks" },
                                { id: "odd" as OnlineWeekPattern, label: "Odd Weeks" },
                              ] as const
                            ).map((item) =>
                              renderPill(
                                item.id,
                                item.label,
                                onlineWeekPattern === item.id,
                                () => {
                                  setOnlineWeekPattern(item.id);
                                  if (setupStep < 5) setSetupStep(5);
                                }
                              )
                            )}
                          </View>
                        </SectionCard>
                      )}

                      {/* Step 5: Alarm Offsets */}
                      {setupStep >= 5 && (
                        <SectionCard title="CHOOSE ALARM OFFSETS" stepNum={5}>
                          {(learningMode === "blended" ||
                            learningMode === "online") && (
                            <View style={{ marginBottom: 12 }}>
                              <Text style={s.subLabel}>Online Alarm Offset</Text>
                              <View style={s.pillRow}>
                                {[
                                  { val: 1, label: "1 Min" },
                                  { val: 5, label: "5 Min" },
                                  { val: 10, label: "10 Min" },
                                  { val: 15, label: "15 Min" },
                                ].map((item) =>
                                  renderPill(
                                    `online-${item.val}`,
                                    item.label,
                                    onlineOffset === item.val,
                                    () => setOnlineOffset(item.val)
                                  )
                                )}
                              </View>
                            </View>
                          )}

                          {(learningMode === "blended" ||
                            learningMode === "inperson") && (
                            <View style={{ marginBottom: 12 }}>
                              <Text style={s.subLabel}>
                                Face to Face Alarm Offset
                              </Text>
                              <View style={s.pillRow}>
                                {[
                                  { val: 15, label: "15 Min" },
                                  { val: 30, label: "30 Min" },
                                  { val: 60, label: "1 Hr" },
                                  { val: 120, label: "2 Hr" },
                                ].map((item) =>
                                  renderPill(
                                    `f2f-${item.val}`,
                                    item.label,
                                    inpersonOffset === item.val,
                                    () => setInpersonOffset(item.val)
                                  )
                                )}
                              </View>
                            </View>
                          )}

                          {setupStep === 5 && (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => setSetupStep(6)}
                              style={s.actionBtn}
                            >
                              <Text style={s.actionBtnText}>NEXT STEP →</Text>
                            </TouchableOpacity>
                          )}
                        </SectionCard>
                      )}

                      {/* Step 6: Alarm Sound */}
                      {setupStep >= 6 && (
                        <SectionCard title="CHOOSE ALARM SOUND" stepNum={6}>
                          <View style={s.pillRow}>
                            {(
                              [
                                { id: "default" as AlarmSound, label: "Phone Default" },
                                { id: "alarm" as AlarmSound, label: "Digital Beep" },
                                { id: "chime" as AlarmSound, label: "Gentle Chime" },
                                { id: "beep" as AlarmSound, label: "Double Beep" },
                              ] as const
                            ).map((item) =>
                              renderPill(
                                item.id,
                                item.label,
                                alarmSound === item.id,
                                () => {
                                  setAlarmSound(item.id);
                                  previewSound(item.id);
                                }
                              )
                            )}
                          </View>
                          <Text style={s.hintText}>
                            Tap a sound to preview it
                          </Text>

                          {setupStep === 6 && (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => setSetupStep(7)}
                              style={s.actionBtn}
                            >
                              <Text style={s.actionBtnText}>NEXT STEP →</Text>
                            </TouchableOpacity>
                          )}
                        </SectionCard>
                      )}

                      {/* Step 7: Upload Schedule */}
                      {setupStep >= 7 && (
                        <SectionCard title="UPLOAD YOUR SCHEDULE" stepNum={7}>
                          <Text style={s.infoText}>
                            Upload a screenshot or photo of your class schedule. Our AI will automatically parse your classes. You can skip this and customize it later.
                          </Text>

                          <View style={s.tabHeader}>
                            <Text style={s.tabHeaderLabel}>REFERENCE STYLES:</Text>
                            <View style={s.tabRow}>
                              {(
                                [
                                  { id: "tan" as const, label: "Portal Grid" },
                                  { id: "blocks" as const, label: "Block Calendar" },
                                  { id: "badges" as const, label: "Class Cards" },
                                ] as const
                              ).map((tab) => (
                                <TouchableOpacity
                                  key={tab.id}
                                  onPress={() => setRefActiveTab(tab.id)}
                                  style={[s.tabBtn, refActiveTab === tab.id && s.tabBtnActive]}
                                >
                                  <Text style={[s.tabBtnText, refActiveTab === tab.id && s.tabBtnTextActive]}>
                                    {tab.label}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          <View style={s.refImageContainer}>
                            {refActiveTab === "tan" && (
                              <Image
                                source={require("./assets/ref_schedule_tan.png")}
                                style={s.refImage}
                                resizeMode="contain"
                              />
                            )}
                            {refActiveTab === "blocks" && (
                              <Image
                                source={require("./assets/ref_schedule_blocks.png")}
                                style={s.refImage}
                                resizeMode="contain"
                              />
                            )}
                            {refActiveTab === "badges" && (
                              <Image
                                source={require("./assets/ref_schedule_badges.png")}
                                style={s.refImage}
                                resizeMode="contain"
                              />
                            )}
                          </View>

                          {isParsing ? (
                            <View style={s.parsingContainer}>
                              <ActivityIndicator size="large" color="#06b6d4" />
                              <Text style={s.parsingText}>
                                AI is reading your schedule...
                              </Text>
                            </View>
                          ) : (
                            <View style={{ gap: 10, marginTop: 8 }}>
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handlePickImage}
                                style={s.actionBtn}
                              >
                                <Text style={s.actionBtnText}>
                                  UPLOAD SCHEDULE IMAGE
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleFinishSetup}
                                style={s.secondaryBtn}
                              >
                                <Text style={s.secondaryBtnText}>
                                  SKIP FOR NOW & FINISH
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </SectionCard>
                      )}
                    </View>
                  ) : (
                    /* ===== STANDARD SETTINGS VIEW ===== */
                    <View>
                      <SectionCard title="TERM SYSTEM">
                        <View style={s.pillRow}>
                          {(
                            [
                              { id: "semester" as TermType, label: "Semester" },
                              { id: "trimester" as TermType, label: "Trimester" },
                              { id: "quad" as TermType, label: "Quad Term" },
                            ] as const
                          ).map((item) =>
                            renderPill(item.id, item.label, termType === item.id, async () => {
                              const defaultWeeks =
                                item.id === "semester"
                                  ? 16
                                  : item.id === "trimester"
                                  ? 14
                                  : 10;
                              setTermType(item.id);
                              setTotalWeeks(defaultWeeks);
                              setWeekInfo(
                                getCurrentWeek(
                                  now,
                                  defaultWeeks,
                                  learningMode!,
                                  onlineWeekPattern!
                                )
                              );
                              await saveTermSettings(
                                item.id,
                                defaultWeeks,
                                learningMode!,
                                onlineOffset,
                                inpersonOffset,
                                onlineWeekPattern!,
                                alarmSound!
                              );
                              await scheduleWeekAlarms();
                            })
                          )}
                        </View>
                      </SectionCard>

                      <SectionCard title="TOTAL WEEKS">
                        <View style={s.pillRow}>
                          {(termType === "semester"
                            ? [16, 17, 18]
                            : termType === "trimester"
                            ? [12, 13, 14]
                            : [10, 11]
                          ).map((weeksNum) =>
                            renderPill(
                              `weeks-${weeksNum}`,
                              `${weeksNum} Weeks`,
                              totalWeeks === weeksNum,
                              async () => {
                                setTotalWeeks(weeksNum);
                                setWeekInfo(
                                  getCurrentWeek(
                                    now,
                                    weeksNum,
                                    learningMode!,
                                    onlineWeekPattern!
                                  )
                                );
                                await saveTermSettings(
                                  termType!,
                                  weeksNum,
                                  learningMode!,
                                  onlineOffset,
                                  inpersonOffset,
                                  onlineWeekPattern!,
                                  alarmSound!
                                );
                                await scheduleWeekAlarms();
                              }
                            )
                          )}
                        </View>
                      </SectionCard>

                      <SectionCard title="LEARNING MODE">
                        <View style={s.pillRow}>
                          {(
                            [
                              { id: "blended" as LearningMode, label: "Blended" },
                              { id: "online" as LearningMode, label: "Full Online" },
                              { id: "inperson" as LearningMode, label: "Full Face" },
                            ] as const
                          ).map((item) =>
                            renderPill(
                              item.id,
                              item.label,
                              learningMode === item.id,
                              async () => {
                                setLearningMode(item.id);
                                setWeekInfo(
                                  getCurrentWeek(
                                    now,
                                    totalWeeks!,
                                    item.id,
                                    onlineWeekPattern!
                                  )
                                );
                                await saveTermSettings(
                                  termType!,
                                  totalWeeks!,
                                  item.id,
                                  onlineOffset,
                                  inpersonOffset,
                                  onlineWeekPattern!,
                                  alarmSound!
                                );
                                await scheduleWeekAlarms();
                              }
                            )
                          )}
                        </View>
                      </SectionCard>

                      {learningMode === "blended" && (
                        <SectionCard title="ONLINE WEEKS PATTERN">
                          <View style={s.pillRow}>
                            {(
                              [
                                { id: "even" as OnlineWeekPattern, label: "Even Weeks" },
                                { id: "odd" as OnlineWeekPattern, label: "Odd Weeks" },
                              ] as const
                            ).map((item) =>
                              renderPill(
                                item.id,
                                item.label,
                                onlineWeekPattern === item.id,
                                async () => {
                                  setOnlineWeekPattern(item.id);
                                  setWeekInfo(
                                    getCurrentWeek(
                                      now,
                                      totalWeeks!,
                                      learningMode!,
                                      item.id
                                    )
                                  );
                                  await saveTermSettings(
                                    termType!,
                                    totalWeeks!,
                                    learningMode!,
                                    onlineOffset,
                                    inpersonOffset,
                                    item.id,
                                    alarmSound!
                                  );
                                  await scheduleWeekAlarms();
                                }
                              )
                            )}
                          </View>
                        </SectionCard>
                      )}

                      {(learningMode === "blended" ||
                        learningMode === "online") && (
                        <SectionCard title="ONLINE ALARM OFFSET">
                          <View style={s.pillRow}>
                            {[
                              { val: 1, label: "1 Min" },
                              { val: 5, label: "5 Min" },
                              { val: 10, label: "10 Min" },
                              { val: 15, label: "15 Min" },
                            ].map((item) =>
                              renderPill(
                                `online-${item.val}`,
                                item.label,
                                onlineOffset === item.val,
                                async () => {
                                  setOnlineOffset(item.val);
                                  await saveTermSettings(
                                    termType!,
                                    totalWeeks!,
                                    learningMode!,
                                    item.val,
                                    inpersonOffset,
                                    onlineWeekPattern!,
                                    alarmSound!
                                  );
                                  await scheduleWeekAlarms();
                                }
                              )
                            )}
                          </View>
                        </SectionCard>
                      )}

                      {(learningMode === "blended" ||
                        learningMode === "inperson") && (
                        <SectionCard title="FACE TO FACE ALARM OFFSET">
                          <View style={s.pillRow}>
                            {[
                              { val: 15, label: "15 Min" },
                              { val: 30, label: "30 Min" },
                              { val: 60, label: "1 Hr" },
                              { val: 120, label: "2 Hr" },
                            ].map((item) =>
                              renderPill(
                                `f2f-${item.val}`,
                                item.label,
                                inpersonOffset === item.val,
                                async () => {
                                  setInpersonOffset(item.val);
                                  await saveTermSettings(
                                    termType!,
                                    totalWeeks!,
                                    learningMode!,
                                    onlineOffset,
                                    item.val,
                                    onlineWeekPattern!,
                                    alarmSound!
                                  );
                                  await scheduleWeekAlarms();
                                }
                              )
                            )}
                          </View>
                        </SectionCard>
                      )}

                      <SectionCard title="ALARM SOUND">
                        <View style={s.pillRow}>
                          {(
                            [
                              { id: "default" as AlarmSound, label: "Phone Default" },
                              { id: "alarm" as AlarmSound, label: "Digital Beep" },
                              { id: "chime" as AlarmSound, label: "Gentle Chime" },
                              { id: "beep" as AlarmSound, label: "Double Beep" },
                            ] as const
                          ).map((item) =>
                            renderPill(
                              item.id,
                              item.label,
                              alarmSound === item.id,
                              async () => {
                                setAlarmSound(item.id);
                                await saveTermSettings(
                                  termType!,
                                  totalWeeks!,
                                  learningMode!,
                                  onlineOffset,
                                  inpersonOffset,
                                  onlineWeekPattern!,
                                  item.id
                                );
                                await scheduleWeekAlarms();
                                previewSound(item.id);
                              }
                            )
                          )}
                        </View>
                        <Text style={s.hintText}>
                          Tap a sound to preview it
                        </Text>
                      </SectionCard>

                      {isParsing ? (
                        <View style={s.parsingContainer}>
                          <ActivityIndicator size="large" color="#06b6d4" />
                          <Text style={s.parsingText}>
                            AI is reading your schedule...
                          </Text>
                        </View>
                      ) : (
                        <View style={{ gap: 10, marginTop: 8 }}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handlePickImage}
                            style={s.actionBtn}
                          >
                            <Text style={s.actionBtnText}>
                              UPLOAD SCHEDULE IMAGE
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleResetSchedule}
                            style={s.dangerBtn}
                          >
                            <Text style={s.dangerBtnText}>
                              Reset to Default Schedule
                            </Text>
                          </TouchableOpacity>
                        </View>
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

// StyleSheet-based styles inspired by TouchGrass design
const s = StyleSheet.create({
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalOverlayFull: {
    justifyContent: "flex-start",
    backgroundColor: "#0a0a0f",
  },
  modalSheet: {
    backgroundColor: "#0e0e14",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    maxHeight: "88%",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  modalSheetFull: {
    flex: 1,
    maxHeight: "100%",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    paddingTop: 48,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#06b6d4",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
  },
  modalSubtitle: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1a1a26",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  closeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Progress dots
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2A2A2A",
  },
  dotCurrent: {
    backgroundColor: "#06b6d4",
    width: 18,
    borderRadius: 9,
  },
  dotDone: {
    backgroundColor: "#34C759",
  },

  // Section cards
  sectionCard: {
    backgroundColor: "#101018",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#06b6d4",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  subLabel: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },

  // Pills
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    flex: 1,
    minWidth: "22%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a26",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  pillActive: {
    backgroundColor: "#06b6d4",
    borderColor: "#06b6d4",
  },
  pillText: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "800",
  },
  pillTextActive: {
    color: "#0a0a0f",
  },

  // Hint text
  hintText: {
    color: "#555555",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10,
    letterSpacing: 0.5,
  },

  // Action buttons
  actionBtn: {
    backgroundColor: "#06b6d4",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  finishBtn: {
    marginTop: 16,
    height: 56,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  dangerBtn: {
    backgroundColor: "#1a1a26",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  dangerBtnText: {
    color: "#FF4444",
    fontSize: 14,
    fontWeight: "700",
  },

  // Parsing
  parsingContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  parsingText: {
    color: "#06b6d4",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 16,
  },

  infoText: {
    color: "#888888",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  tabHeader: {
    marginBottom: 12,
  },
  tabHeaderLabel: {
    color: "#555555",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#14141c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  tabBtnActive: {
    backgroundColor: "rgba(6,182,212,0.15)",
    borderColor: "#06b6d4",
  },
  tabBtnText: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
  },
  tabBtnTextActive: {
    color: "#06b6d4",
  },
  refImageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#161622",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  refImage: {
    width: "100%",
    height: "100%",
  },
  secondaryBtn: {
    backgroundColor: "#1a1a26",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  secondaryBtnText: {
    color: "#CCCCCC",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
