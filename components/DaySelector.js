import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
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

export default function DaySelector({ selectedDay, onSelectDay, todayName, schedule = {} }) {
  const renderDayCard = (day) => {
    const isSelected = selectedDay === day;
    const isToday = todayName === day;
    const classes = schedule[day] || [];

    return (
      <TouchableOpacity
        key={day}
        onPress={() => onSelectDay(day)}
        activeOpacity={0.7}
        className={`p-2.5 rounded-2xl w-[31%] h-[150px] items-center justify-between ${
          isSelected ? "bg-white" : "bg-surface-700"
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
        {/* Header: Day name and today indicator */}
        <View className="items-center">
          <Text
            className={`text-xs font-bold tracking-wider ${
              isSelected ? "text-surface-900" : "text-gray-400"
            }`}
          >
            {DAY_ABBREV[day]}
          </Text>
          {isToday && (
            <View
              className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                isSelected ? "bg-surface-900" : "bg-cyan-400"
              }`}
            />
          )}
        </View>

        {/* Body: List of class codes */}
        <View className="w-full flex-1 justify-center items-center mt-1">
          {classes.length > 0 ? (
            <View className="w-full gap-1">
              {classes.slice(0, 6).map((cls, idx) => (
                <Text
                  key={cls.id || idx}
                  className={`text-[11px] font-extrabold text-center w-full ${
                    isSelected ? "text-surface-900" : "text-gray-200"
                  }`}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {cls.code.split("-")[0]}
                </Text>
              ))}
              {classes.length > 6 && (
                <Text
                  className={`text-[9px] text-center font-bold ${
                    isSelected ? "text-surface-900/60" : "text-gray-500"
                  }`}
                >
                  +{classes.length - 6} more
                </Text>
              )}
            </View>
          ) : (
            <Text
              className={`text-[11px] font-semibold italic ${
                isSelected ? "text-surface-900/50" : "text-gray-600"
              }`}
            >
              Free
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-row flex-wrap justify-between px-5 gap-y-2 mb-5 w-full">
      {/* Row 1 */}
      {renderDayCard("Monday")}
      {renderDayCard("Tuesday")}
      {renderDayCard("Wednesday")}

      {/* Row 2 */}
      {renderDayCard("Thursday")}
      {renderDayCard("Friday")}
      {renderDayCard("Saturday")}

      {/* Row 3: Centered Sunday */}
      <View className="w-[31%] h-[150px] opacity-0" />
      {renderDayCard("Sunday")}
      <View className="w-[31%] h-[150px] opacity-0" />
    </View>
  );
}
