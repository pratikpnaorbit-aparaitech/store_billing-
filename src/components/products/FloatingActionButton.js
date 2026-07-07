import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function FloatingActionButton({ onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={styles.shadow}>
      <LinearGradient colors={["#0A46E4", "#0732A3"]} style={styles.button}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: "absolute",
    right: 22,
    bottom: 92,
    shadowColor: "#0A46E4",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  button: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
