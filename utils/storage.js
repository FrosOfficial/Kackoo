import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCHEDULE } from '../data/scheduleData';

const SCHEDULE_KEY = 'KACKOO_CLASS_SCHEDULE';
const API_KEY_KEY = 'KACKOO_GEMINI_API_KEY';

/**
 * Load the class schedule. Fallback to default SCHEDULE if not found.
 */
export async function loadSchedule() {
  try {
    const jsonValue = await AsyncStorage.getItem(SCHEDULE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : SCHEDULE;
  } catch (e) {
    console.error("Failed to load schedule from storage:", e);
    return SCHEDULE;
  }
}

/**
 * Save custom schedule.
 */
export async function saveSchedule(schedule) {
  try {
    const jsonValue = JSON.stringify(schedule);
    await AsyncStorage.setItem(SCHEDULE_KEY, jsonValue);
  } catch (e) {
    console.error("Failed to save schedule to storage:", e);
  }
}

/**
 * Reset schedule back to default.
 */
export async function resetSchedule() {
  try {
    await AsyncStorage.removeItem(SCHEDULE_KEY);
  } catch (e) {
    console.error("Failed to reset schedule:", e);
  }
}

/**
 * Load Gemini API key.
 */
export async function loadApiKey() {
  try {
    return await AsyncStorage.getItem(API_KEY_KEY) || '';
  } catch (e) {
    console.error("Failed to load API key:", e);
    return '';
  }
}

/**
 * Save Gemini API key.
 */
export async function saveApiKey(key) {
  try {
    await AsyncStorage.setItem(API_KEY_KEY, key);
  } catch (e) {
    console.error("Failed to save API key:", e);
  }
}

const TERM_TYPE_KEY = 'KACKOO_TERM_TYPE';
const TOTAL_WEEKS_KEY = 'KACKOO_TOTAL_WEEKS';
const LEARNING_MODE_KEY = 'KACKOO_LEARNING_MODE';
const ONLINE_OFFSET_KEY = 'KACKOO_ONLINE_OFFSET';
const INPERSON_OFFSET_KEY = 'KACKOO_INPERSON_OFFSET';
const ONLINE_WEEK_PATTERN_KEY = 'KACKOO_ONLINE_WEEK_PATTERN';
const ALARM_SOUND_KEY = 'KACKOO_ALARM_SOUND';

/**
 * Load academic term settings.
 */
export async function loadTermSettings() {
  try {
    const termType = await AsyncStorage.getItem(TERM_TYPE_KEY) || 'trimester';
    const totalWeeksStr = await AsyncStorage.getItem(TOTAL_WEEKS_KEY);
    const totalWeeks = totalWeeksStr ? parseInt(totalWeeksStr, 10) : 14;
    const learningMode = await AsyncStorage.getItem(LEARNING_MODE_KEY) || 'blended';
    const onlineOffsetStr = await AsyncStorage.getItem(ONLINE_OFFSET_KEY);
    const onlineOffset = onlineOffsetStr ? parseInt(onlineOffsetStr, 10) : 5;
    const inpersonOffsetStr = await AsyncStorage.getItem(INPERSON_OFFSET_KEY);
    const inpersonOffset = inpersonOffsetStr ? parseInt(inpersonOffsetStr, 10) : 15;
    const onlineWeekPattern = await AsyncStorage.getItem(ONLINE_WEEK_PATTERN_KEY) || 'even';
    const alarmSound = await AsyncStorage.getItem(ALARM_SOUND_KEY) || 'alarm';
    return { termType, totalWeeks, learningMode, onlineOffset, inpersonOffset, onlineWeekPattern, alarmSound };
  } catch (e) {
    console.error("Failed to load term settings:", e);
    return { termType: 'trimester', totalWeeks: 14, learningMode: 'blended', onlineOffset: 5, inpersonOffset: 15, onlineWeekPattern: 'even', alarmSound: 'alarm' };
  }
}

/**
 * Save academic term settings.
 */
export async function saveTermSettings(termType, totalWeeks, learningMode, onlineOffset, inpersonOffset, onlineWeekPattern, alarmSound) {
  try {
    await AsyncStorage.setItem(TERM_TYPE_KEY, termType);
    await AsyncStorage.setItem(TOTAL_WEEKS_KEY, totalWeeks.toString());
    await AsyncStorage.setItem(LEARNING_MODE_KEY, learningMode);
    if (onlineOffset !== undefined && onlineOffset !== null) {
      await AsyncStorage.setItem(ONLINE_OFFSET_KEY, onlineOffset.toString());
    }
    if (inpersonOffset !== undefined && inpersonOffset !== null) {
      await AsyncStorage.setItem(INPERSON_OFFSET_KEY, inpersonOffset.toString());
    }
    if (onlineWeekPattern !== undefined && onlineWeekPattern !== null) {
      await AsyncStorage.setItem(ONLINE_WEEK_PATTERN_KEY, onlineWeekPattern);
    }
    if (alarmSound !== undefined && alarmSound !== null) {
      await AsyncStorage.setItem(ALARM_SOUND_KEY, alarmSound);
    }
  } catch (e) {
    console.error("Failed to save term settings:", e);
  }
}
