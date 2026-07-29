import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { applyInventoryRows, previewInventoryFile } from "../../services/inventoryImportApi";
import { useProductStore } from "../../store/productStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useTranslation } from "../../i18n";

const DOCUMENT_TYPES = [
  "application/pdf",
  "text/csv",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export default function StockImportScreen({ navigation }) {
  const { t } = useTranslation();
  const products = useProductStore((state) => state.products);
  const refreshProducts = useProductStore((state) => state.refreshProducts);
  const language = useSettingsStore((state) => state.settings.language || "en");
  const [phase, setPhase] = useState("idle");
  const [document, setDocument] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [result, setResult] = useState(null);
  const [matchingRowId, setMatchingRowId] = useState(null);

  const selectedCount = rows.filter((row) => row.include).length;
  const selectedUnits = rows
    .filter((row) => row.include)
    .reduce((total, row) => total + (Number(row.quantity) || 0), 0);

  const preview = async (asset) => {
    setPhase("reading");
    setResult(null);
    try {
      const data = await previewInventoryFile(asset, language);
      setDocument(data.document);
      setSummary(data.summary);
      setRows(data.candidates.map((candidate) => ({
        ...candidate,
        include: candidate.include,
        productId: candidate.product?.id || "",
        productName: candidate.product?.name || "",
        productBarcode: candidate.product?.barcode || candidate.barcode || "",
        quantity: String(candidate.quantity || 1),
        price: String(candidate.product?.price ?? candidate.price ?? 0),
        category: candidate.product?.category || "Grocery",
        unit: candidate.product?.unit || "1 pc",
      })));
      setPhase("review");
    } catch (error) {
      setPhase("idle");
      Alert.alert(t("Document could not be read"), error.message);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("Camera Permission Required"), t("Allow camera access to photograph the supplier bill."));
      return;
    }
    const response = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!response.canceled) preview(response.assets[0]);
  };

  const chooseImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("Permission needed"), t("Allow photo access to choose a bill image."));
      return;
    }
    const response = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!response.canceled) preview(response.assets[0]);
  };

  const chooseDocument = async () => {
    const response = await DocumentPicker.getDocumentAsync({
      type: DOCUMENT_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!response.canceled) preview(response.assets[0]);
  };

  const updateRow = (id, updates) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...updates } : row));
  };

  const apply = async () => {
    const invalid = rows.find((row) => row.include && (!Number.isInteger(Number(row.quantity)) || Number(row.quantity) <= 0));
    if (invalid) {
      Alert.alert(t("Check quantities"), t("Every selected row needs a whole quantity greater than zero."));
      return;
    }
    if (!selectedCount) {
      Alert.alert(t("Nothing selected"), t("Select at least one reviewed row."));
      return;
    }
    setPhase("applying");
    try {
      const data = await applyInventoryRows(rows.map((row) => ({
        include: row.include,
        productId: row.productId,
        quantity: Number(row.quantity),
        name: row.productName || row.name,
        barcode: row.productBarcode || row.barcode,
        price: Number(row.price || 0),
        category: row.category,
        unit: row.unit,
      })));
      await refreshProducts();
      setResult(data);
      setPhase("done");
    } catch (error) {
      setPhase("review");
      Alert.alert(t("Stock was not applied"), error.message);
    }
  };

  const startOver = () => {
    setDocument(null);
    setRows([]);
    setSummary(null);
    setResult(null);
    setPhase("idle");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t("Import stock")}</Text>
          <Text style={styles.subtitle}>{t("Scan supplier bills safely")}</Text>
        </View>
      </View>

      {phase === "idle" ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={31} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>{t("Turn a bill into stock")}</Text>
            <Text style={styles.heroText}>
              {t("Upload a photo, PDF, CSV or Excel file. Product names and quantities are detected and matched with your catalogue.")}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>{t("Choose a source")}</Text>
          <SourceCard icon="camera-outline" title={t("Take bill photo")} detail={t("Best with a clear, straight image")} color="#0A46E4" onPress={takePhoto} />
          <SourceCard icon="images-outline" title={t("Choose an image")} detail={t("Printed or handwritten bill")} color="#7C3AED" onPress={chooseImage} />
          <SourceCard icon="document-attach-outline" title={t("Choose PDF, CSV or Excel")} detail={t("Digital invoices and stock sheets")} color="#059669" onPress={chooseDocument} />

          <View style={styles.safety}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#15803D" />
            <View style={styles.safetyCopy}>
              <Text style={styles.safetyTitle}>{t("Nothing changes automatically")}</Text>
              <Text style={styles.safetyText}>{t("You review every match and quantity before stock is applied.")}</Text>
            </View>
          </View>
        </ScrollView>
      ) : null}

      {phase === "reading" ? (
        <View style={styles.center}>
          <View style={styles.progressIcon}><ActivityIndicator size="large" color="#FFFFFF" /></View>
          <Text style={styles.progressTitle}>{t("Reading your document…")}</Text>
          <Text style={styles.progressText}>{t("Detecting products and matching barcodes. Handwritten bills can take a little longer.")}</Text>
        </View>
      ) : null}

      {phase === "review" || phase === "applying" ? (
        <>
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.reviewContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                <View style={styles.documentCard}>
                  <View style={styles.documentIcon}><Ionicons name="document-text-outline" size={23} color="#0A46E4" /></View>
                  <View style={styles.documentCopy}>
                    <Text style={styles.documentName} numberOfLines={1}>{document?.name}</Text>
                    <Text style={styles.documentMeta}>
                      {summary?.rows || 0} {t("rows")} • {summary?.matched || 0} {t("matched")} • {summary?.needsReview || 0} {t("need review")}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={startOver}><Text style={styles.change}>{t("Change")}</Text></TouchableOpacity>
                </View>
                <View style={styles.reviewInfo}>
                  <Ionicons name="information-circle-outline" size={20} color="#1D4ED8" />
                  <Text style={styles.reviewInfoText}>{t("Check product matches and quantities. Unmatched rows are off until you review them.")}</Text>
                </View>
              </>
            }
            renderItem={({ item }) => (
              <ReviewRow
                row={item}
                disabled={phase === "applying"}
                onUpdate={(updates) => updateRow(item.id, updates)}
                onChooseProduct={() => setMatchingRowId(item.id)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.noRows}>
                <Ionicons name="alert-circle-outline" size={42} color="#D97706" />
                <Text style={styles.noRowsTitle}>{t("No product rows found")}</Text>
                <Text style={styles.noRowsText}>{t("Try a clearer photo or upload a CSV/Excel sheet with Product Name and Quantity columns.")}</Text>
                <TouchableOpacity style={styles.tryAgain} onPress={startOver}><Text style={styles.tryAgainText}>{t("Choose another file")}</Text></TouchableOpacity>
              </View>
            }
            ListFooterComponent={<View style={{ height: selectedCount ? 110 : 30 }} />}
          />
          {selectedCount ? (
            <View style={styles.applyBar}>
              <View>
                <Text style={styles.applyCount}>{selectedCount} {t("rows selected")}</Text>
                <Text style={styles.applyUnits}>{selectedUnits} {t("total units")}</Text>
              </View>
              <TouchableOpacity style={styles.applyButton} onPress={apply} disabled={phase === "applying"}>
                {phase === "applying"
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <><Text style={styles.applyButtonText}>{t("Apply stock")}</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></>}
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      ) : null}

      {phase === "done" ? (
        <View style={styles.center}>
          <View style={styles.doneIcon}><Ionicons name="checkmark" size={38} color="#FFFFFF" /></View>
          <Text style={styles.progressTitle}>{t("Stock updated")}</Text>
          <Text style={styles.progressText}>
            {result?.unitsAdded || 0} {t("units were added across")} {result?.productsUpdated || 0} {t("products")}.
          </Text>
          <TouchableOpacity style={styles.primaryWide} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryWideText}>{t("View products")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryWide} onPress={startOver}>
            <Text style={styles.secondaryWideText}>{t("Import another bill")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ProductMatchModal
        visible={Boolean(matchingRowId)}
        products={products}
        onClose={() => setMatchingRowId(null)}
        onSelect={(product) => {
          updateRow(matchingRowId, {
            include: true,
            productId: product.id,
            productName: product.name,
            productBarcode: product.barcode,
            price: String(product.price || 0),
            category: product.category,
            unit: product.unit,
          });
          setMatchingRowId(null);
        }}
        onCreateNew={() => {
          updateRow(matchingRowId, { include: true, productId: "", productName: "" });
          setMatchingRowId(null);
        }}
      />
    </View>
  );
}

function SourceCard({ icon, title, detail, color, onPress }) {
  return (
    <TouchableOpacity style={styles.sourceCard} onPress={onPress} activeOpacity={0.82}>
      <View style={[styles.sourceIcon, { backgroundColor: `${color}14` }]}><Ionicons name={icon} size={25} color={color} /></View>
      <View style={styles.sourceCopy}><Text style={styles.sourceTitle}>{title}</Text><Text style={styles.sourceDetail}>{detail}</Text></View>
      <Ionicons name="chevron-forward" size={21} color="#94A3B8" />
    </TouchableOpacity>
  );
}

function ReviewRow({ row, onUpdate, onChooseProduct, disabled }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.rowCard, !row.include && styles.rowCardOff]}>
      <View style={styles.rowTop}>
        <TouchableOpacity
          style={[styles.check, row.include && styles.checkActive]}
          onPress={() => onUpdate({ include: !row.include })}
          disabled={disabled}
        >
          {row.include ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : null}
        </TouchableOpacity>
        <View style={styles.rowCopy}>
          <Text style={styles.detectedLabel}>{t("DETECTED")}</Text>
          <Text style={styles.detectedName} numberOfLines={2}>{row.name}</Text>
          {row.warning ? <Text style={styles.warning}>{row.warning}</Text> : null}
        </View>
        <View style={[styles.matchPill, row.productId ? styles.matchedPill : styles.unmatchedPill]}>
          <Text style={[styles.matchText, !row.productId && styles.unmatchedText]}>{row.productId ? `${Math.round(row.matchScore * 100)}%` : t("REVIEW")}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.matchBox} onPress={onChooseProduct} disabled={disabled}>
        <View style={styles.matchIcon}><Ionicons name={row.productId ? "link-outline" : "search-outline"} size={19} color="#0A46E4" /></View>
        <View style={styles.matchCopy}>
          <Text style={styles.matchLabel}>{row.productId ? t("MATCHED PRODUCT") : t("PRODUCT MATCH NEEDED")}</Text>
          <Text style={styles.matchName} numberOfLines={2}>{row.productName || t("Tap to choose a product")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <View style={styles.quantityRow}>
        <Text style={styles.quantityLabel}>{t("Quantity to add")}</Text>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdate({ quantity: String(Math.max(1, Number(row.quantity || 1) - 1)) })}
            disabled={disabled}
          >
            <Ionicons name="remove" size={18} color="#0F172A" />
          </TouchableOpacity>
          <TextInput
            value={row.quantity}
            onChangeText={(value) => onUpdate({ quantity: value.replace(/[^\d]/g, "") })}
            keyboardType="number-pad"
            selectTextOnFocus
            style={styles.quantityInput}
            editable={!disabled}
          />
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdate({ quantity: String(Number(row.quantity || 0) + 1) })}
            disabled={disabled}
          >
            <Ionicons name="add" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ProductMatchModal({ visible, products, onClose, onSelect, onCreateNew }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products.slice(0, 100);
    return products
      .filter((item) => [item.name, item.brand, item.barcode].some((value) => String(value || "").toLowerCase().includes(query)))
      .slice(0, 100);
  }, [products, search]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View><Text style={styles.sheetTitle}>{t("Choose product")}</Text><Text style={styles.sheetSubtitle}>{t("Search catalogue or keep it as a new item")}</Text></View>
            <TouchableOpacity style={styles.close} onPress={onClose}><Ionicons name="close" size={21} color="#0F172A" /></TouchableOpacity>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color="#64748B" />
            <TextInput value={search} onChangeText={setSearch} placeholder={t("Name or barcode")} style={styles.searchInput} autoFocus />
          </View>
          <TouchableOpacity style={styles.newItem} onPress={onCreateNew}>
            <View style={styles.newItemIcon}><Ionicons name="add" size={21} color="#FFFFFF" /></View>
            <View style={styles.sourceCopy}><Text style={styles.newItemTitle}>{t("Create as new product")}</Text><Text style={styles.sourceDetail}>{t("Price can be completed from Products")}</Text></View>
            <Ionicons name="chevron-forward" size={19} color="#94A3B8" />
          </TouchableOpacity>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.productOption} onPress={() => onSelect(item)}>
                <View style={styles.productOptionIcon}><Ionicons name="cube-outline" size={20} color="#0A46E4" /></View>
                <View style={styles.sourceCopy}>
                  <Text style={styles.productOptionName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productOptionMeta}>{item.barcode} • {t("Stock")} {item.stock || 0}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F8FC" },
  header: { paddingTop: 44, paddingHorizontal: 20, paddingBottom: 14, flexDirection: "row", alignItems: "center", backgroundColor: "#F6F8FC" },
  back: { width: 44, height: 44, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center", marginRight: 13 },
  headerCopy: { flex: 1 },
  title: { color: "#0F172A", fontSize: 27, fontWeight: "900" },
  subtitle: { color: "#64748B", fontSize: 12, fontWeight: "600", marginTop: 2 },
  content: { padding: 20, paddingTop: 8, paddingBottom: 50 },
  hero: { borderRadius: 28, backgroundColor: "#0F172A", padding: 23, alignItems: "center" },
  heroIcon: { width: 62, height: 62, borderRadius: 21, backgroundColor: "#0A46E4", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#FFFFFF", fontSize: 23, fontWeight: "900", marginTop: 15 },
  heroText: { color: "#CBD5E1", textAlign: "center", fontSize: 13, lineHeight: 20, marginTop: 7 },
  sectionTitle: { color: "#0F172A", fontSize: 18, fontWeight: "900", marginTop: 24, marginBottom: 12 },
  sourceCard: { minHeight: 78, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", padding: 13, marginBottom: 10 },
  sourceIcon: { width: 50, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  sourceCopy: { flex: 1, paddingHorizontal: 12 },
  sourceTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  sourceDetail: { color: "#64748B", fontSize: 11, fontWeight: "600", marginTop: 4 },
  safety: { borderRadius: 20, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", flexDirection: "row", padding: 14, marginTop: 10 },
  safetyCopy: { flex: 1, paddingLeft: 10 },
  safetyTitle: { color: "#166534", fontSize: 13, fontWeight: "900" },
  safetyText: { color: "#15803D", fontSize: 11, lineHeight: 16, marginTop: 3 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  progressIcon: { width: 68, height: 68, borderRadius: 23, backgroundColor: "#0A46E4", alignItems: "center", justifyContent: "center" },
  progressTitle: { color: "#0F172A", fontSize: 24, fontWeight: "900", textAlign: "center", marginTop: 18 },
  progressText: { color: "#64748B", textAlign: "center", lineHeight: 20, marginTop: 8 },
  reviewContent: { padding: 20, paddingTop: 6 },
  documentCard: { minHeight: 70, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", padding: 12 },
  documentIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  documentCopy: { flex: 1, paddingHorizontal: 11 },
  documentName: { color: "#0F172A", fontSize: 13, fontWeight: "900" },
  documentMeta: { color: "#64748B", fontSize: 10, marginTop: 4 },
  change: { color: "#0A46E4", fontSize: 12, fontWeight: "900" },
  reviewInfo: { borderRadius: 17, backgroundColor: "#EFF6FF", flexDirection: "row", padding: 12, marginVertical: 12 },
  reviewInfoText: { flex: 1, color: "#1E40AF", fontSize: 11, lineHeight: 16, fontWeight: "700", paddingLeft: 8 },
  rowCard: { borderRadius: 23, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE4EF", padding: 14, marginBottom: 12 },
  rowCardOff: { opacity: 0.56 },
  rowTop: { flexDirection: "row", alignItems: "flex-start" },
  check: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkActive: { backgroundColor: "#0A46E4", borderColor: "#0A46E4" },
  rowCopy: { flex: 1 },
  detectedLabel: { color: "#94A3B8", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  detectedName: { color: "#0F172A", fontSize: 14, fontWeight: "900", marginTop: 3 },
  warning: { color: "#B45309", fontSize: 10, lineHeight: 14, marginTop: 4 },
  matchPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, marginLeft: 7 },
  matchedPill: { backgroundColor: "#DCFCE7" },
  unmatchedPill: { backgroundColor: "#FEF3C7" },
  matchText: { color: "#166534", fontSize: 9, fontWeight: "900" },
  unmatchedText: { color: "#92400E" },
  matchBox: { minHeight: 62, borderRadius: 17, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", padding: 10, marginTop: 13 },
  matchIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#EAF1FF", alignItems: "center", justifyContent: "center" },
  matchCopy: { flex: 1, paddingHorizontal: 9 },
  matchLabel: { color: "#64748B", fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  matchName: { color: "#0F172A", fontSize: 12, fontWeight: "900", marginTop: 3 },
  quantityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 },
  quantityLabel: { color: "#334155", fontSize: 12, fontWeight: "900" },
  quantityControl: { flexDirection: "row", alignItems: "center", gap: 6 },
  quantityButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  quantityInput: { width: 58, height: 40, borderRadius: 12, borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF", color: "#0F172A", textAlign: "center", fontWeight: "900" },
  noRows: { alignItems: "center", padding: 30 },
  noRowsTitle: { color: "#0F172A", fontSize: 18, fontWeight: "900", marginTop: 10 },
  noRowsText: { color: "#64748B", textAlign: "center", lineHeight: 19, marginTop: 6 },
  tryAgain: { borderRadius: 16, backgroundColor: "#0A46E4", paddingHorizontal: 17, paddingVertical: 12, marginTop: 16 },
  tryAgainText: { color: "#FFFFFF", fontWeight: "900" },
  applyBar: { position: "absolute", left: 18, right: 18, bottom: 18, minHeight: 72, borderRadius: 22, backgroundColor: "#0F172A", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 17, elevation: 10 },
  applyCount: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  applyUnits: { color: "#94A3B8", fontSize: 11, marginTop: 3 },
  applyButton: { height: 46, borderRadius: 15, backgroundColor: "#0A46E4", paddingHorizontal: 15, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  applyButtonText: { color: "#FFFFFF", fontWeight: "900" },
  doneIcon: { width: 72, height: 72, borderRadius: 25, backgroundColor: "#16A34A", alignItems: "center", justifyContent: "center" },
  primaryWide: { width: "100%", height: 56, borderRadius: 18, backgroundColor: "#0A46E4", alignItems: "center", justifyContent: "center", marginTop: 24 },
  primaryWideText: { color: "#FFFFFF", fontWeight: "900" },
  secondaryWide: { width: "100%", height: 54, borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginTop: 10 },
  secondaryWideText: { color: "#334155", fontWeight: "900" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.6)" },
  sheet: { height: "78%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#F8FAFC", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 20 },
  handle: { width: 44, height: 5, borderRadius: 99, backgroundColor: "#CBD5E1", alignSelf: "center" },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15 },
  sheetTitle: { color: "#0F172A", fontSize: 21, fontWeight: "900" },
  sheetSubtitle: { color: "#64748B", fontSize: 11, marginTop: 3 },
  close: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  searchBox: { height: 52, borderRadius: 17, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  searchInput: { flex: 1, height: "100%", marginLeft: 9, color: "#0F172A" },
  newItem: { minHeight: 66, borderRadius: 18, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", flexDirection: "row", alignItems: "center", padding: 10, marginVertical: 11 },
  newItemIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#0A46E4", alignItems: "center", justifyContent: "center" },
  newItemTitle: { color: "#0A46E4", fontSize: 13, fontWeight: "900" },
  productOption: { minHeight: 62, borderRadius: 17, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", padding: 10, marginBottom: 8 },
  productOptionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  productOptionName: { color: "#0F172A", fontSize: 13, fontWeight: "900" },
  productOptionMeta: { color: "#64748B", fontSize: 10, marginTop: 3 },
});
