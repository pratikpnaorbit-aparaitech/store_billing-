import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function AddProductScreen({ navigation }) {
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow gallery access to select product image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Product</Text>
      </View>

      <TouchableOpacity activeOpacity={0.85} style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.productImage} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={34} color="#0A46E4" />
            <Text style={styles.imageTitle}>Add Product Photo</Text>
            <Text style={styles.imageSub}>Tap to choose from gallery</Text>
          </>
        )}
      </TouchableOpacity>

      {image ? (
        <TouchableOpacity onPress={pickImage}>
          <Text style={styles.changeImage}>Change Image</Text>
        </TouchableOpacity>
      ) : null}

      {["Product Name", "Barcode", "Category", "Selling Price", "Stock Quantity", "Unit"].map((label) => (
        <View key={label} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput placeholder={label} placeholderTextColor="#94A3B8" style={styles.input} />
        </View>
      ))}

      <TouchableOpacity activeOpacity={0.85} style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Save Product</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20, paddingTop: 44, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 14,
  },
  title: { fontSize: 28, fontWeight: "900", color: "#0F172A" },
  imagePicker: {
    height: 170,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  productImage: { width: "100%", height: "100%" },
  imageTitle: { marginTop: 10, fontSize: 15, fontWeight: "900", color: "#0F172A" },
  imageSub: { marginTop: 4, fontSize: 12, fontWeight: "600", color: "#64748B" },
  changeImage: { textAlign: "center", color: "#0A46E4", fontWeight: "900", marginBottom: 18 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  input: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0F172A",
  },
  button: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0A46E4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
});
