import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function UserAvatar({ name = "Vivek" }) {
  const initial = name?.charAt(0)?.toUpperCase() || "U";

  return (
    <View style={styles.avatar}>
      <Text style={styles.initial}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: "#0A46E4",
    fontSize: 18,
    fontWeight: "900",
  },
});
