import React from "react";
import { View, Text } from "react-native";

export default function ClassCard({ cls, weekInfo }) {
  if (!weekInfo) return null;

  const isOnline = weekInfo.mode === "Online";
  const accentColor = isOnline ? "#06b6d4" : "#f59e0b";

  // Build the status line
  let statusText;
  if (isOnline) {
    statusText = `Online class at this week(${weekInfo.weekNum})`;
  } else {
    statusText = `In-person class at ${cls.room} ${cls.building} this week(${weekInfo.weekNum})`;
  }

  return (
    <View
      className="bg-surface-700 rounded-card mb-3 mx-4 overflow-hidden"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      {/* Accent left border */}
      <View className="flex-row">
        <View
          style={{
            width: 4,
            backgroundColor: accentColor,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
          }}
        />
        <View className="flex-1 p-4">
          {/* Class code */}
          <Text className="text-white text-lg font-bold tracking-wide">
            {cls.code}
          </Text>

          {/* Time range */}
          <Text className="text-gray-400 text-sm mt-1 font-medium">
            {cls.start} - {cls.end}
          </Text>

          {/* Status line */}
          <View className="flex-row items-center mt-2">
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: accentColor,
                marginRight: 8,
              }}
            />
            <Text
              className="text-sm font-medium"
              style={{ color: accentColor }}
            >
              {statusText}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
