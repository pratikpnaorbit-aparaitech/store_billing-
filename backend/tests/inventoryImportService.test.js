const test = require("node:test");
const assert = require("node:assert/strict");
const {
  asciiDigits,
  freeTextRow,
  matchCandidates,
  tableRows,
} = require("../src/services/inventoryImportService");

test("converts Marathi and Hindi numerals before reading quantity", () => {
  assert.equal(asciiDigits("प्रमाण १२"), "प्रमाण 12");
  const row = freeTextRow("तूर डाळ प्रमाण १२");
  assert.equal(row.name, "तूर डाळ");
  assert.equal(row.quantity, 12);
});

test("reads English, Hindi and Marathi stock table headers", () => {
  const english = tableRows([
    ["Barcode", "Product Name", "Quantity", "Price"],
    ["8901234567890", "Test Tea", "20", "120"],
  ]);
  const hindi = tableRows([
    ["बारकोड", "उत्पाद नाम", "मात्रा", "कीमत"],
    ["8901234567891", "चाय", "१०", "८०"],
  ]);
  const marathi = tableRows([
    ["बारकोड", "उत्पादन नाव", "प्रमाण", "किंमत"],
    ["8901234567892", "चहा", "२५", "९०"],
  ]);
  assert.deepEqual(
    [english[0].quantity, hindi[0].quantity, marathi[0].quantity],
    [20, 10, 25],
  );
  assert.equal(marathi[0].price, 90);
});

test("matches reviewed rows by barcode first and product name second", () => {
  const products = [
    { id: "catalog:8901234567890", name: "Parle G Original Biscuits", barcode: "8901234567890", stock: 0 },
    { id: "p2", name: "Tata Salt", barcode: "8904043901017", stock: 3 },
  ];
  const matched = matchCandidates([
    { name: "Wrong OCR name", barcode: "8901234567890", quantity: 2 },
    { name: "Tata Salt 1kg", barcode: "", quantity: 5 },
  ], products);
  assert.equal(matched[0].product.id, "catalog:8901234567890");
  assert.equal(matched[0].matchScore, 1);
  assert.equal(matched[1].product.id, "p2");
  assert.equal(matched[1].matched, true);
});
