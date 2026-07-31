import React from "react";
import { Image, View, Text, StyleSheet } from "react-native";

export default function UserAvatar({ name = "Vivek", uri }) {
  const initial = name?.charAt(0)?.toUpperCase() || "U";

  return (
    <View style={styles.avatar}>
      {uri ? <Image source={{ uri }} style={styles.image} /> : <Text style={styles.initial}>{initial}</Text>}
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
  image: { width: "100%", height: "100%", borderRadius: 18 },
});
