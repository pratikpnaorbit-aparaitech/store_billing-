import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  StatusBar,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export default function SplashScreen({ navigation }) {
  // Animation Nodes
  const scaleAnim = useRef(new Animated.Value(0)).current; // सुरुवातीला पूर्ण गायब (0)
  const moveXAnim = useRef(new Animated.Value(0)).current; // X हालचाल
  const moveYAnim = useRef(new Animated.Value(0)).current; // Y हालचाल
  const contentAlpha = useRef(new Animated.Value(0)).current; // टेक्स्ट opacity
  const contentMoveY = useRef(new Animated.Value(15)).current; // टेक्स्ट खालून वर येण्यासाठी

  useEffect(() => {
    // १. लोगो बारीक मधून मोठा होणे (Spring Effect - No Jerk)
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 35,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // २. लोगो कोपऱ्यात सरकवणे आणि टेक्स्ट दाखवणे (Fluid Timing)
    setTimeout(() => {
      Animated.parallel([
        // लोगो डाव्या कोपऱ्यात जाणार
        Animated.timing(moveXAnim, {
          toValue: -width * 0.24,
          duration: 800,
          useNativeDriver: true,
        }),
        // लोगो वर जाणार
        Animated.timing(moveYAnim, {
          toValue: -height * 0.28,
          duration: 800,
          useNativeDriver: true,
        }),
        // कोपऱ्यात जाताना लोगोचा आकार किंचित कॉर्पोरेट-स्लीक (0.7) करणे
        Animated.timing(scaleAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        // टेक्स्ट हळूहळू दिसणे (Fade In)
        Animated.timing(contentAlpha, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // टेक्स्ट खालून ३० पिक्सेल वर सरकणार (Premium Entry)
        Animated.timing(contentMoveY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000); // १ सेकंद मधोमध थांबून अ‍ॅनिमेशन सुरू होईल

    // ३. थेट लॉगिन स्क्रीनवर नेव्हिगेट करणे
    const timer = setTimeout(() => {
      navigation.replace("Login");
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    // Fresh Corporate Gradient (Royal Blue to Navy Soft Slate)
    <LinearGradient
      colors={["#0A46E4", "#0732A3", "#0B1528"]}
      style={styles.container}
    >
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* कॉर्पोरेट अ‍ॅनिमेटेड लोगो कंटेनर */}
      <Animated.View
        style={[
          styles.logoBox,
          {
            transform: [
              { translateX: moveXAnim },
              { translateY: moveYAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <Animated.Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* टेक्स्ट कंटेंट - जो अत्यंत स्मूथली स्लाईड आणि फेड होईल */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: contentAlpha,
            transform: [{ translateY: contentMoveY }],
          },
        ]}
      >
        <Text style={styles.title}>Smart Billing</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>SCAN • BILL • PRINT</Text>
      </Animated.View>

      {/* व्हर्जन टॅग */}
      <Animated.Text style={[styles.version, { opacity: contentAlpha }]}>
        Version 1.0.0
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBox: {
    width: 130,
    height: 130,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    // Premium Glassmorphism Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 85,
    height: 85,
  },
  textContainer: {
    alignItems: "center",
    marginTop: 120,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: "#38BDF8", // Fresh Cyan Accent Line
    borderRadius: 2,
    marginVertical: 12,
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8", // Soft Muted Slate
    fontWeight: "600",
    letterSpacing: 3, // Corporate Spacing
  },
  version: {
    position: "absolute",
    bottom: 40,
    color: "rgba(255, 255, 255, 0.35)",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1,
  },
});
