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

const { cleanRows } = require("../src/services/geminiInventoryService");
const { numericValue, normalizeInventoryRow, alignInventoryRow } = require("../src/services/inventoryValues");

test("does not invent zero prices from missing cells and reads Indian currency", () => {
  assert.equal(numericValue(""), null);
  assert.equal(numericValue(null), null);
  assert.equal(numericValue("₹८,५००"), 8500);
  assert.equal(numericValue("free text"), null);
});
test("derives the per-pack price from row amount without treating pack size as quantity", () => {
  const rows = cleanRows([{ name:"Ponds Powder 100g", quantity:100, quantityUnit:"pcs", unit:"100g", price:null, lineTotal:8500 }]);
  assert.equal(rows[0].quantity,100); assert.equal(rows[0].price,85);
  assert.equal(rows[0].priceSource,"bill-total");
});
test("500g of loose goods at 420 per kg adds 0.5 kg, not 500 pieces", () => {
  const row=normalizeInventoryRow({name:"गरम मसाला",quantity:500,quantityUnit:"g",price:420,lineTotal:210});
  assert.equal(row.quantity,0.5); assert.equal(row.price,420); assert.equal(row.unit,"1 kg"); assert.equal(row.warning,"");
  const derived=normalizeInventoryRow({name:"Coffee",quantity:500,quantityUnit:"g",price:null,lineTotal:325});
  assert.equal(derived.price,650);
});
test("converts a measured quantity into existing packet units and retains the same row amount", () => {
  const row=normalizeInventoryRow({name:"Coffee",quantity:500,quantityUnit:"g",price:650,lineTotal:325});
  const aligned=alignInventoryRow(row,{name:"Coffee 500g",unit:"500g"});
  assert.equal(aligned.quantity,1); assert.equal(aligned.price,325);
});
test("reads explicit quantity, rate and amount columns in all supported scripts", () => {
  for(const headers of [["Product","Quantity","Rate","Amount"],["उत्पाद नाम","मात्रा","दर","राशि"],["वस्तूचे नाव","प्रमाण","दर","रक्कम"]]) {
    const rows=tableRows([headers,["शक्कर","२० KG","४५","९००"]]);
    assert.equal(rows.length,1);assert.equal(rows[0].quantity,20);assert.equal(rows[0].price,45);assert.equal(rows[0].unit,"1 kg");
  }
});
test("fallback OCR reads both rate and quantity instead of dropping price", () => {
  const row=freeTextRow("1. साखर २० kg ४५ ९००");
  assert.equal(row.name,"साखर");assert.equal(row.quantity,20);assert.equal(row.price,45);
});
test("matches Hindi translation and refuses conflicting packet sizes", () => {
  const products=[{id:"wrong",name:"Ponds Powder 200g",barcode:"200",unit:"200g"},{id:"correct",name:"Ponds Powder 100g",barcode:"100",unit:"100g"},{id:"tea",name:"Tea",barcode:"tea",unit:"1 kg"}];
  const rows=matchCandidates([{name:"पॉन्ड्स पावडर 100g",searchName:"Ponds Powder 100g",quantity:100,quantityUnit:"pcs",price:85,unit:"100g",confidence:.92},{name:"चाय",searchName:"Tea",quantity:2,quantityUnit:"kg",unit:"1 kg",price:300,confidence:.92}],products);
  assert.equal(rows[0].product.id,"correct");assert.equal(rows[0].price,85);assert.equal(rows[1].product.id,"tea");
});
test("clear new rows are ready to create, ambiguous matches still require a choice", () => {
  const candidate={name:"Sugar",quantity:20,quantityUnit:"kg",unit:"1 kg",price:45,confidence:.92};
  assert.equal(matchCandidates([candidate],[])[0].include,true);
  const ambiguous=matchCandidates([candidate],[{id:"a",name:"Sugar",barcode:"a"},{id:"b",name:"Sugar",barcode:"b"}])[0];
  assert.equal(ambiguous.matched,false);assert.equal(ambiguous.include,false);
});
test("missing price remains missing and inconsistent row arithmetic is flagged", () => {
  assert.equal(normalizeInventoryRow({name:"Tea",quantity:2,quantityUnit:"pcs",price:null,lineTotal:null}).price,null);
  assert.match(normalizeInventoryRow({name:"Tea",quantity:2,quantityUnit:"pcs",price:100,lineTotal:999}).warning,/differs/);
});
