import React from "react";
import { View, Text } from "react-native";

export default function WeekBadge({ weekInfo }) {
  if (!weekInfo) {
    return (
      <View className="self-center px-5 py-2 rounded-pill bg-surface-600 mb-4">
        <Text className="text-gray-400 text-sm font-semibold tracking-wide">
          No Active Semester
        </Text>
      </View>
    );
  }

  const isOnline = weekInfo.mode === "Online";

  return (
    <View
      className={`self-center px-5 py-2 rounded-pill mb-4 ${
        isOnline ? "bg-online-bg" : "bg-inperson-bg"
      }`}
      style={{
        borderWidth: 1,
        borderColor: isOnline
          ? "rgba(6, 182, 212, 0.3)"
          : "rgba(245, 158, 11, 0.3)",
      }}
    >
      <Text
        className={`text-sm font-bold tracking-wide ${
          isOnline ? "text-online" : "text-inperson"
        }`}
      >
        Week {weekInfo.weekNum} - {weekInfo.label}
      </Text>
    </View>
  );
}
