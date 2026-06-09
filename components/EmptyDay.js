import React from "react";
import { View, Text } from "react-native";

export default function EmptyDay() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <Text className="text-6xl mb-6">😌</Text>
      <Text className="text-white text-xl font-bold text-center mb-2">
        No classes today
      </Text>
      <Text className="text-gray-500 text-sm text-center leading-5">
        Take it easy. Recharge for tomorrow.
      </Text>
    </View>
  );
}
