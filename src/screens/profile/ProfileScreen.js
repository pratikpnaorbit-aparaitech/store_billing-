import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { LANGUAGE_OPTIONS, useTranslation } from "../../i18n";
import { uploadProductImage } from "../../services/uploadApi";

const LANGUAGE_SHORT_LABELS = {
  en: "ENG",
  hi: "HIN",
  mr: "MAR",
};

function formatPlan(subscription, t) {
  if (subscription?.status === "trial_active") {
    return `${subscription.trialDaysRemaining} ${t("trial days left")}`;
  }
  if (subscription?.status === "active") {
    const months = subscription.plan?.durationMonths || 1;
    return `₹${Number(subscription.plan?.amount || 0).toLocaleString("en-IN")} / ${months} ${t(months === 1 ? "month" : "months")}`;
  }
  return t("Subscription required");
}

function ProfileAction({ icon, title, detail, tone, onPress, badge }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.82}>
      <View style={[styles.actionIcon, { backgroundColor: `${tone}14` }]}>
        <Ionicons name={icon} size={23} color={tone} />
      </View>
      <View style={styles.flex}>
        <View style={styles.actionTitleRow}>
          <Text style={styles.actionTitle}>{title}</Text>
          {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
        </View>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color="#94A3B8" />
    </TouchableOpacity>
  );
}

function Field({ label, icon, value, onChangeText, keyboardType = "default", secureTextEntry }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={19} color="#64748B" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { language, t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);
  const changePassword = useAuthStore((state) => state.changePassword);
  const cloudMode = useAuthStore((state) => state.cloudMode);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const sharedCatalogueEnabled = settings.sharedCatalogueEnabled !== false;
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(user?.name || "");
  const [storeName, setStoreName] = useState(user?.storeName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [gstNo, setGstNo] = useState(user?.gstNo || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [gstRate, setGstRate] = useState(String(settings.gstRate));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showSecurity, setShowSecurity] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const subscription = user?.subscription || {};
  const priceChange = subscription.priceChange;

  const rootNavigate = (name, params) => navigation.getParent()?.navigate(name, params);

  const save = async () => {
    if (!name.trim() || !storeName.trim()) {
      return Alert.alert(t("Missing details"), t("Name and store name are required."));
    }
    const rate = Number(gstRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return Alert.alert(t("Invalid GST"), t("GST rate must be between 0 and 100."));
    }
    const normalizedPhone = phone.replace(/[\s()-]/g, "");
    if (!/^\+?\d{10,15}$/.test(normalizedPhone)) {
      return Alert.alert(t("Invalid mobile number"), t("Enter a valid 10 to 15 digit mobile number."));
    }
    const normalizedGst = gstNo.trim().toUpperCase();
    if (normalizedGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(normalizedGst)) {
      return Alert.alert(t("Invalid GST number"), t("Enter a valid 15-character GST number or leave it blank."));
    }
    setSaving(true);
    try {
      await Promise.all([
        updateProfile({
          name: name.trim(),
          storeName: storeName.trim(),
          phone: normalizedPhone,
          gstNo: normalizedGst,
          avatarUrl,
        }),
        updateSettings({ gstRate: rate }),
      ]);
      Alert.alert(t("Profile updated"), t("Your store name and billing preferences were saved."));
    } catch (error) {
      Alert.alert(t("Could not save"), error.message);
    } finally {
      setSaving(false);
    }
  };

  const chooseProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return Alert.alert(t("Permission required"), t("Allow photo access to choose a profile image."));
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      });
      if (result.canceled) return;
      setSaving(true);
      const uploaded = await uploadProductImage(result.assets[0].uri);
      setAvatarUrl(uploaded.url);
      await updateProfile({
        name: name.trim(),
        storeName: storeName.trim(),
        phone: phone.replace(/[\s()-]/g, ""),
        gstNo: gstNo.trim().toUpperCase(),
        avatarUrl: uploaded.url,
      });
    } catch (error) {
      Alert.alert(t("Image upload failed"), error.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async () => {
    if (!currentPassword || newPassword.length < 8) {
      return Alert.alert(
        t("Check password"),
        t("Enter the current password and a new password of at least 8 characters."),
      );
    }
    const result = await changePassword(currentPassword, newPassword);
    if (!result.ok) return Alert.alert(t("Password not changed"), result.message);
    setCurrentPassword("");
    setNewPassword("");
    setShowSecurity(false);
    return Alert.alert(t("Password changed"), t("Your account password was updated."));
  };

  const openSupport = async () => {
    const message = [
      t("Hello Smart Billing Support,"),
      t("I need help with my billing app account."),
      `${t("Store")}: ${user?.storeName || t("Not set")}`,
      `${t("Name")}: ${user?.name || t("User")}`,
      `${t("Email")}: ${user?.email || t("Not available")}`,
      "",
      t("My issue: "),
    ].join("\n");
    const url = `https://wa.me/919158852129?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("WhatsApp could not open"), t("Please contact support on +91 91588 52129."));
    }
  };

  const confirmSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await logout();
    setShowLogout(false);
    navigation.getParent()?.reset({ index: 0, routes: [{ name: "Login" }] });
    setSigningOut(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 18) }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.pageHeading}>
        <View>
          <Text style={styles.eyebrow}>{t("ACCOUNT & STORE")}</Text>
          <Text style={styles.pageTitle}>{t("Profile")}</Text>
        </View>
        <View style={[styles.cloudPill, connectionStatus === "online" ? styles.online : styles.offline]}>
          <View style={[styles.statusDot, { backgroundColor: connectionStatus === "online" ? "#16A34A" : "#D97706" }]} />
          <Text style={styles.cloudText}>{t(cloudMode ? connectionStatus : "offline")}</Text>
        </View>
      </View>

      <LinearGradient colors={["#0A46E4", "#0736B5", "#0F172A"]} style={styles.identityCard}>
        <TouchableOpacity style={styles.avatar} onPress={chooseProfileImage} activeOpacity={0.82}>
          {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : (
            <Text style={styles.avatarText}>{(name || "U").charAt(0).toUpperCase()}</Text>
          )}
          <View style={styles.cameraBadge}><Ionicons name="camera" size={12} color="#FFFFFF" /></View>
        </TouchableOpacity>
        <View style={styles.identityCopy}>
          <Text style={styles.storeName} numberOfLines={1}>{storeName || t("My Store")}</Text>
          <Text style={styles.ownerName}>{name || t("Store owner")}</Text>
          <View style={styles.emailRow}>
            <Ionicons name="mail-outline" size={14} color="#BFDBFE" />
            <Text style={styles.emailText} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>
        <View style={styles.planPill}>
          <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
          <Text style={styles.planPillText}>{formatPlan(subscription, t)}</Text>
        </View>
      </LinearGradient>

      {priceChange?.required ? (
        <TouchableOpacity
          style={styles.priceAlert}
          onPress={() => rootNavigate("ManageSubscription", { migration: true })}
          activeOpacity={0.84}
        >
          <View style={styles.priceAlertIcon}>
            <Ionicons name="notifications" size={22} color="#B45309" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.priceAlertTitle}>{t("Subscription price updated")}</Text>
            <Text style={styles.priceAlertText}>
              Current ₹{Number(priceChange.currentPlan?.amount || 0).toLocaleString("en-IN")} • Latest ₹{Number(priceChange.latestPlan?.amount || 0).toLocaleString("en-IN")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color="#B45309" />
        </TouchableOpacity>
      ) : null}

      <Text style={styles.sectionTitle}>{t("Business tools")}</Text>
      <View style={styles.actionList}>
        <ProfileAction
          icon="analytics-outline"
          title={t("Daily sales insights")}
          detail={t("Sales, bills and top product by date")}
          tone="#0A46E4"
          onPress={() => rootNavigate("SalesInsights")}
        />
        <ProfileAction
          icon="card-outline"
          title={t("Subscription")}
          detail={formatPlan(subscription, t)}
          tone="#7C3AED"
          badge={priceChange?.required ? "Update" : ""}
          onPress={() => rootNavigate("ManageSubscription", priceChange?.required ? { migration: true } : { manage: true })}
        />
        <ProfileAction
          icon="logo-whatsapp"
          title={t("Help & support")}
          detail={t("Chat with support on WhatsApp")}
          tone="#16A34A"
          onPress={openSupport}
        />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{t("App language")}</Text>
        <Text style={styles.sectionSubtitle}>{t("Choose the language used across the app.")}</Text>
      </View>
      <View style={styles.languageCard}>
        {LANGUAGE_OPTIONS.map((option) => {
          const active = language === option.code;
          return (
            <TouchableOpacity
              key={option.code}
              style={[styles.languageOption, active && styles.languageOptionActive]}
              onPress={() => updateSettings({ language: option.code })}
            >
              <View style={[styles.languageCheck, active && styles.languageCheckActive]}>
                {active ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
              </View>
              <View style={styles.flex}>
                <Text style={[styles.languageNative, active && styles.languageNativeActive]}>
                  {LANGUAGE_SHORT_LABELS[option.code]}
                </Text>
                <Text style={styles.languageEnglish}>{option.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{t("Product catalogue")}</Text>
        <Text style={styles.sectionSubtitle}>
          {t("Choose whether shared ready-to-use products should be visible.")}
        </Text>
      </View>
      <View style={styles.catalogueCard}>
        <View style={styles.catalogueIcon}>
          <Ionicons name="library-outline" size={23} color="#0A46E4" />
        </View>
        <View style={styles.flex}>
          <Text style={styles.catalogueTitle}>{t("Shared product catalogue")}</Text>
          <Text style={styles.catalogueText}>
            {t(sharedCatalogueEnabled
              ? "4,267 ready-to-use products are visible."
              : "Only products added by you are visible.")}
          </Text>
        </View>
        <Switch
          value={sharedCatalogueEnabled}
          onValueChange={(value) => updateSettings({ sharedCatalogueEnabled: value })}
          trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
          thumbColor={sharedCatalogueEnabled ? "#0A46E4" : "#FFFFFF"}
          accessibilityLabel={t("Shared product catalogue")}
        />
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>{t("Store details")}</Text>
          <Text style={styles.sectionSubtitle}>{t("This store name appears on every bill.")}</Text>
        </View>
      </View>
      <View style={styles.formCard}>
        <Field label={t("Owner name")} icon="person-outline" value={name} onChangeText={setName} />
        <Field label={t("Store name")} icon="storefront-outline" value={storeName} onChangeText={setStoreName} />
        <Field label={t("Mobile number")} icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label={`${t("GST number")} (${t("Optional")})`} icon="document-text-outline" value={gstNo} onChangeText={(value) => setGstNo(value.toUpperCase())} />
        <Field label={t("Default GST %")} icon="calculator-outline" value={gstRate} onChangeText={setGstRate} keyboardType="decimal-pad" />
        <View style={styles.readOnlyField}>
          <Text style={styles.label}>{t("Account email")}</Text>
          <View style={styles.readOnly}>
            <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
            <Text style={styles.readOnlyText}>{user?.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.save, saving && styles.disabled]} onPress={save} disabled={saving}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.saveText}>{saving ? t("Saving...") : t("Save store profile")}</Text>
        </TouchableOpacity>
      </View>

      {cloudMode ? (
        <View style={styles.securityCard}>
          <TouchableOpacity style={styles.securityHeader} onPress={() => setShowSecurity((value) => !value)}>
            <View style={styles.securityIcon}>
              <Ionicons name="key-outline" size={21} color="#0F172A" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.securityTitle}>{t("Password & security")}</Text>
              <Text style={styles.securityText}>{t("Change your account password")}</Text>
            </View>
            <Ionicons name={showSecurity ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
          </TouchableOpacity>
          {showSecurity ? (
            <View style={styles.securityForm}>
              <Field label={t("Current password")} icon="lock-closed-outline" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
              <Field label={t("New password")} icon="shield-outline" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              <TouchableOpacity style={styles.passwordButton} onPress={updatePassword}>
                <Text style={styles.passwordButtonText}>{t("Update password")}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity style={styles.logout} onPress={() => setShowLogout(true)}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={styles.logoutText}>{t("Log out from this phone")}</Text>
      </TouchableOpacity>
      <Text style={styles.note}>
        {cloudMode
          ? t("Your business data is securely synced. Cached data is removed from this phone after logout.")
          : t("Products, orders and customers are stored on this phone.")}
      </Text>

      <Modal visible={showLogout} transparent animationType="fade" onRequestClose={() => !signingOut && setShowLogout(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}><Ionicons name="log-out-outline" size={28} color="#DC2626" /></View>
            <Text style={styles.modalTitle}>{t("Log out?")}</Text>
            <Text style={styles.modalText}>{t("Cached company data will be cleared from this phone. You can sign in again anytime.")}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowLogout(false)} disabled={signingOut}>
                <Text style={styles.cancelText}>{t("Cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmSignOut} disabled={signingOut}>
                <Text style={styles.confirmText}>{signingOut ? t("Logging out...") : t("Log out")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F8FC", overflow: "hidden" },
  content: { width: "100%", minWidth: 0, paddingHorizontal: 20, paddingBottom: 120 },
  flex: { flex: 1 },
  pageHeading: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  eyebrow: { color: "#0A46E4", fontSize: 10, fontWeight: "900", letterSpacing: 1.6 },
  pageTitle: { color: "#0F172A", fontSize: 32, fontWeight: "900", marginTop: 2 },
  cloudPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 7 },
  online: { backgroundColor: "#DCFCE7" },
  offline: { backgroundColor: "#FEF3C7" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  cloudText: { color: "#334155", fontSize: 11, fontWeight: "900", textTransform: "capitalize" },
  identityCard: { width: "100%", maxWidth: "100%", minWidth: 0, minHeight: 190, borderRadius: 28, padding: 20, flexDirection: "row", alignItems: "flex-start", overflow: "hidden" },
  avatar: { width: 70, height: 70, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 23 },
  avatarText: { color: "#FFFFFF", fontSize: 29, fontWeight: "900" },
  cameraBadge: { position: "absolute", right: -4, bottom: -4, width: 25, height: 25, borderRadius: 10, backgroundColor: "#0F172A", borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  identityCopy: { flex: 1, minWidth: 0, marginLeft: 15, paddingTop: 5 },
  storeName: { width: "100%", flexShrink: 1, overflow: "hidden", color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  ownerName: { color: "#DBEAFE", fontSize: 13, fontWeight: "700", marginTop: 5 },
  emailRow: { flexDirection: "row", alignItems: "center", marginTop: 9, gap: 6 },
  emailText: { color: "#BFDBFE", fontSize: 11, flexShrink: 1 },
  planPill: { position: "absolute", left: 20, bottom: 18, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.16)" },
  planPillText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  priceAlert: { marginTop: 14, minHeight: 78, borderRadius: 22, padding: 14, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  priceAlertIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FEF3C7", marginRight: 11 },
  priceAlertTitle: { color: "#78350F", fontSize: 14, fontWeight: "900" },
  priceAlertText: { color: "#92400E", fontSize: 11, fontWeight: "700", marginTop: 4 },
  sectionHeading: { marginTop: 26 },
  sectionTitle: { color: "#0F172A", fontSize: 19, fontWeight: "900", marginTop: 26, marginBottom: 12 },
  sectionSubtitle: { color: "#64748B", fontSize: 12, marginTop: -8, marginBottom: 12 },
  languageCard: { flexDirection: "row", gap: 8, padding: 9, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  languageOption: { flex: 1, minWidth: 0, borderRadius: 17, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", padding: 11, alignItems: "center" },
  languageOptionActive: { backgroundColor: "#EFF6FF", borderColor: "#93C5FD" },
  languageCheck: { width: 24, height: 24, borderRadius: 9, borderWidth: 1, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", marginBottom: 7 },
  languageCheckActive: { backgroundColor: "#0A46E4", borderColor: "#0A46E4" },
  languageNative: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  languageNativeActive: { color: "#0A46E4" },
  languageEnglish: { color: "#64748B", fontSize: 9, fontWeight: "700", marginTop: 3 },
  catalogueCard: { minHeight: 86, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  catalogueIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  catalogueTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  catalogueText: { color: "#64748B", fontSize: 11, fontWeight: "600", lineHeight: 16, marginTop: 4, paddingRight: 5 },
  actionList: { borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" },
  actionCard: { minHeight: 78, flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
  actionIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", marginRight: 12 },
  actionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  actionDetail: { color: "#64748B", fontSize: 11, fontWeight: "600", marginTop: 4 },
  badge: { borderRadius: 999, backgroundColor: "#FEF3C7", paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { color: "#92400E", fontSize: 9, fontWeight: "900" },
  formCard: { padding: 18, borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  field: { marginBottom: 15 },
  label: { color: "#334155", fontSize: 12, fontWeight: "900", marginBottom: 8 },
  inputWrap: { height: 56, borderRadius: 17, borderWidth: 1, borderColor: "#DCE4EF", backgroundColor: "#F8FAFC", flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  input: { flex: 1, height: "100%", color: "#0F172A", fontSize: 14, fontWeight: "700", marginLeft: 10 },
  readOnlyField: { marginBottom: 4 },
  readOnly: { height: 54, borderRadius: 17, backgroundColor: "#F1F5F9", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9 },
  readOnlyText: { color: "#64748B", fontWeight: "700", flexShrink: 1 },
  save: { height: 56, borderRadius: 18, backgroundColor: "#0A46E4", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 17 },
  saveText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.6 },
  securityCard: { marginTop: 16, padding: 16, borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  securityHeader: { flexDirection: "row", alignItems: "center" },
  securityIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginRight: 12 },
  securityTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  securityText: { color: "#64748B", fontSize: 11, marginTop: 3 },
  securityForm: { paddingTop: 18, marginTop: 14, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  passwordButton: { height: 52, borderRadius: 17, backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center" },
  passwordButtonText: { color: "#FFFFFF", fontWeight: "900" },
  logout: { height: 56, borderRadius: 18, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 16 },
  logoutText: { color: "#DC2626", fontWeight: "900" },
  note: { textAlign: "center", color: "#94A3B8", fontSize: 11, lineHeight: 17, marginTop: 15, paddingHorizontal: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.58)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 27, padding: 24, alignItems: "center" },
  modalIcon: { width: 60, height: 60, borderRadius: 21, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 23, fontWeight: "900", color: "#0F172A", marginTop: 16 },
  modalText: { color: "#64748B", textAlign: "center", lineHeight: 20, marginTop: 8 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24, width: "100%" },
  cancelButton: { flex: 1, height: 52, borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  cancelText: { fontWeight: "900", color: "#334155" },
  confirmButton: { flex: 1, height: 52, borderRadius: 16, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  confirmText: { fontWeight: "900", color: "#FFFFFF" },
});
