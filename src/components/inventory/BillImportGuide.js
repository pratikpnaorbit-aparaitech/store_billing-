import React, { useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../../i18n";
const copy = {
  en: {
    title: "Bill format & sample", steps: ["1. Take a clear photo", "2. Check the bill columns", "3. Review, then add stock"],
    intro: "Printed or handwritten, Marathi, Hindi or English: keep the whole bill in view. Use good light and avoid blur, glare or folded rows. This exact template is not required.",
    columns: "A product name, quantity and unit rate (or row amount) should be readable on each line. Pack size, such as 100g, belongs to the product name; it is not the stock count.",
    example: "In this sample, 100 packs cost ₹8,500 in total. The rate is ₹85 per pack. A row amount is divided by quantity when no separate unit rate is shown.",
    review: "Names, quantities and available bill rates are filled in for you. Check the matches, price and unit before applying. Reviewed bill rates update product prices; you can edit them here.",
    stock: "Existing stock 10 + bill quantity 20 = new stock 30", units: "Loose goods: 500g = 0.5kg. Packets: 20 packets of 100g = 20 stock units. Weight and pack count are kept separate.",
    footer: "For CSV/Excel: Product, Quantity, Unit, Rate, Amount. Missing or unclear values are marked for review, never silently invented.",
    next: "Next", back: "Back", done: "Got it", camera: "Take bill photo", image: "Choose bill image", document: "Choose a file", full: "Tap the bill to enlarge", close: "Close sample", preview: "Check before applying. Nothing is added until you tap Apply stock.",
  },
  mr: {
    title: "बिलचा नमुना व मार्गदर्शन", steps: ["१. स्पष्ट फोटो घ्या", "२. बिलमधील कॉलम तपासा", "३. तपासून स्टॉक जोडा"],
    intro: "छापील किंवा हस्तलिखित बिल मराठी, हिंदी किंवा इंग्रजीत चालेल. पूर्ण बिल फोटोमध्ये येऊ द्या. चांगला प्रकाश ठेवा; धूसरपणा, चमक आणि दुमडलेल्या ओळी टाळा. हाच नमुना असणे बंधनकारक नाही.",
    columns: "प्रत्येक ओळीत वस्तूचे नाव, प्रमाण आणि प्रति नग/किलो दर (किंवा ओळीची रक्कम) स्पष्ट असावी. नावातील 100g हा पॅकचा आकार आहे; स्टॉकची संख्या नाही.",
    example: "या नमुन्यात १०० पॅकची एकूण किंमत ₹८,५०० आहे. प्रति पॅक दर ₹८५ होतो. वेगळा दर नसल्यास ओळीच्या रकमेला प्रमाणाने भाग देऊन दर भरला जातो.",
    review: "नाव, प्रमाण आणि बिलवरील उपलब्ध दर आपोआप भरले जातील. उत्पादनाची जुळणी, दर व एकक तपासा. तपासलेला बिलचा दर उत्पादनाच्या किमतीत सेव्ह होईल; इथे बदलही करता येतो.",
    stock: "आधीचा स्टॉक १० + बिलमधील प्रमाण २० = नवीन स्टॉक ३०", units: "सुटा माल: ५०० ग्रॅम = ०.५ किलो. पॅकेट: १०० ग्रॅमची २० पॅकेट = २० नग स्टॉक. वजन व पॅकेटची संख्या वेगळी ठेवली जाते.",
    footer: "CSV/Excel कॉलम: वस्तू, प्रमाण, एकक, दर, रक्कम. अस्पष्ट किंवा नसलेली माहिती तपासण्यासाठी दाखवली जाईल; अंदाजाने भरली जाणार नाही.",
    next: "पुढे", back: "मागे", done: "समजलं", camera: "बिलचा फोटो घ्या", image: "बिलचा फोटो निवडा", document: "फाइल निवडा", full: "मोठे पाहण्यासाठी बिलवर टॅप करा", close: "नमुना बंद करा", preview: "Apply stock करण्यापूर्वी तपासा. तोपर्यंत स्टॉक बदलत नाही.",
  },
  hi: {
    title: "बिल का नमूना और तरीका", steps: ["१. साफ फोटो लें", "२. बिल के कॉलम देखें", "३. जाँचकर स्टॉक जोड़ें"],
    intro: "छपा या हाथ से लिखा बिल मराठी, हिंदी या अंग्रेजी में हो सकता है। पूरे बिल की फोटो लें। अच्छी रोशनी रखें; धुंधलापन, चमक और मुड़ी हुई पंक्तियाँ न हों। यही नमूना होना जरूरी नहीं है।",
    columns: "हर पंक्ति में उत्पाद का नाम, मात्रा और प्रति नग/किलो दर (या पंक्ति की रकम) साफ दिखनी चाहिए। नाम में 100g पैक का आकार है, स्टॉक की संख्या नहीं।",
    example: "इस नमूने में १०० पैक की कुल रकम ₹८,५०० है। प्रति पैक दर ₹८५ है। अलग दर न होने पर पंक्ति की रकम को मात्रा से भाग देकर दर भरी जाती है।",
    review: "नाम, मात्रा और बिल की उपलब्ध दर अपने आप भरेंगे। उत्पाद मिलान, दर और इकाई जाँचें। जाँची गई बिल की दर उत्पाद की कीमत में सेव होगी; आप यहाँ बदल सकते हैं।",
    stock: "पहले का स्टॉक १० + बिल की मात्रा २० = नया स्टॉक ३०", units: "खुला माल: ५०० ग्राम = ०.५ किलो। पैकेट: १०० ग्राम के २० पैकेट = स्टॉक में २० नग। वजन और पैक की गिनती अलग रखी जाती है।",
    footer: "CSV/Excel कॉलम: उत्पाद, मात्रा, इकाई, दर, रकम। गायब या अस्पष्ट जानकारी जाँच के लिए दिखाई जाएगी, अनुमान से नहीं भरी जाएगी।",
    next: "आगे", back: "पीछे", done: "समझ गया", camera: "बिल की फोटो लें", image: "बिल की फोटो चुनें", document: "फाइल चुनें", full: "बड़ा देखने के लिए बिल पर टैप करें", close: "नमूना बंद करें", preview: "Apply stock से पहले जाँचें। तब तक स्टॉक नहीं बदलता।",
  },
};
export default function BillImportGuide({ visible, source, onClose, onContinue, onDismiss }) {
  const { language } = useTranslation();
  const c = copy[language] || copy.en;
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const closeGuide = () => { setStep(0); setExpanded(false); onClose(); };
  const finishGuide = () => { setStep(0); setExpanded(false); onContinue(); };
  const image = step === 1 ? require("../../assets/import/sample-printed-bill.png") : require("../../assets/import/sample-handwritten-bill.png");
  return <Modal visible={visible} animationType="slide" onRequestClose={closeGuide} onDismiss={onDismiss}>
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}><Text style={styles.title}>{c.title}</Text><TouchableOpacity accessibilityLabel={c.close} onPress={closeGuide} style={styles.close}><Ionicons name="close" size={24} color="#0F172A" /></TouchableOpacity></View>
      <View style={styles.dots}>{[0,1,2].map(i=><View key={i} style={[styles.dot,step===i && styles.active]} />)}</View>
      <ScrollView key={step} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{c.steps[step]}</Text>
        <Text style={styles.text}>{step === 0 ? c.intro : step === 1 ? c.columns : c.review}</Text>
        {step < 2 ? <TouchableOpacity onPress={() => setExpanded(true)} accessibilityLabel={c.full}><Image source={image} style={[styles.image, step === 1 && styles.tableImage]} resizeMode="contain" /><Text style={styles.caption}>{c.full}</Text></TouchableOpacity> : <View style={styles.sum}><Text style={styles.sumNumbers}>10 + 20 = 30</Text><Text style={styles.sumText}>{c.stock}</Text></View>}
        <View style={styles.note}><Ionicons name={step === 2 ? "checkmark-circle-outline" : "information-circle-outline"} size={23} color="#0A46E4" /><Text style={styles.noteText}>{step === 0 ? c.units : step === 1 ? c.example : c.preview}</Text></View>
        {step === 2 ? <Text style={styles.text}>{c.footer}</Text> : null}
      </ScrollView>
      <View style={styles.actions}>{step > 0 ? <TouchableOpacity style={styles.back} onPress={() => setStep(step - 1)}><Text style={styles.backText}>{c.back}</Text></TouchableOpacity> : null}<TouchableOpacity style={styles.button} onPress={() => step < 2 ? setStep(step + 1) : finishGuide()}><Text style={styles.buttonText}>{step < 2 ? c.next : c[source] || c.done}</Text><Ionicons name="arrow-forward" size={20} color="#FFF" /></TouchableOpacity></View>
      <Modal visible={expanded} animationType="fade" onRequestClose={() => setExpanded(false)}><View style={[styles.full, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}><TouchableOpacity style={styles.fullClose} onPress={() => setExpanded(false)}><Ionicons name="close" size={24} color="#FFF" /><Text style={styles.buttonText}>{c.close}</Text></TouchableOpacity><Image source={image} style={styles.fullImage} resizeMode="contain" /></View></Modal>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F8FC" }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }, title: { fontSize: 21, fontWeight: "900", color: "#0F172A", flex: 1 }, close: { padding: 12 }, dots: { flexDirection: "row", gap: 7, justifyContent: "center", marginVertical: 15 }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#CBD5E1" }, active: { width: 27, backgroundColor: "#0A46E4" }, content: { padding: 20, paddingTop: 4 }, heading: { fontSize: 23, fontWeight: "900", color: "#0F172A", marginBottom: 12 }, text: { color: "#475569", fontSize: 14, lineHeight: 23, marginBottom: 16 }, image: { width: "100%", aspectRatio: 0.7, backgroundColor: "#FFF", borderRadius: 16 }, tableImage: { aspectRatio: 1.9 }, caption: { color: "#64748B", fontSize: 12, textAlign: "center", marginTop: 8 }, note: { padding: 16, borderRadius: 18, backgroundColor: "#EAF1FF", flexDirection: "row", gap: 10, marginVertical: 18 }, noteText: { color: "#1E40AF", lineHeight: 22, flex: 1 }, sum: { padding: 28, backgroundColor: "#DCFCE7", borderRadius: 24, marginVertical: 16 }, sumNumbers: { textAlign: "center", fontSize: 38, fontWeight: "900", color: "#166534" }, sumText: { color: "#166534", fontWeight: "800", textAlign: "center", marginTop: 12, lineHeight: 23 }, actions: { paddingHorizontal: 20, paddingTop: 12, flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0" }, button: { flex: 1, minHeight: 54, borderRadius: 17, backgroundColor: "#0A46E4", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, padding: 10 }, buttonText: { color: "#FFF", fontWeight: "900", textAlign: "center" }, back: { justifyContent: "center", padding: 15 }, backText: { color: "#334155", fontWeight: "800" }, full: { flex: 1, backgroundColor: "#0F172A" }, fullClose: { padding: 18, flexDirection: "row", alignItems: "center", gap: 10 }, fullImage: { flex: 1, width: "100%" },
});
