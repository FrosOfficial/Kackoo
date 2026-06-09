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
