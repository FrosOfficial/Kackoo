import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { DAY_NAMES } from "../data/scheduleData";

const DAY_ABBREV = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export default function DaySelector({ selectedDay, onSelectDay, todayName }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      className="mb-5"
    >
      {DAY_NAMES.map((day) => {
        const isSelected = selectedDay === day;
        const isToday = todayName === day;

        return (
          <TouchableOpacity
            key={day}
            onPress={() => onSelectDay(day)}
            activeOpacity={0.7}
            className={`px-4 py-3 rounded-2xl min-w-[52px] items-center ${
              isSelected
                ? "bg-white"
                : "bg-surface-700"
            }`}
            style={
              !isSelected && isToday
                ? {
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.2)",
                  }
                : undefined
            }
          >
            <Text
              className={`text-xs font-bold tracking-wider ${
                isSelected ? "text-surface-900" : "text-gray-400"
              }`}
            >
              {DAY_ABBREV[day]}
            </Text>
            {isToday && (
              <View
                className={`w-1.5 h-1.5 rounded-full mt-1 ${
                  isSelected ? "bg-surface-900" : "bg-white"
                }`}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
