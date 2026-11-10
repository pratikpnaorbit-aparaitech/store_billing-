import test from "node:test";
import assert from "node:assert/strict";
import { normalizePrinter } from "../src/utils/printer/printerConfig.js";
import { thermalReceiptText, thermalReceiptHtml, thermalReceiptPayload } from "../src/utils/printer/receiptLayout.js";

const receipt = { storeName: "My Store", invoiceNo: "INV-1", cart: [{name:"A product name longer than thirty two characters to retain",quantity:2,price:12.5}], subtotal:25,gstRate:5,gst:1.25,discount:1,total:25.25 };
test("printer validation rejects invalid destinations and preserves selected paper size", () => {
  assert.throws(() => normalizePrinter({name:"LAN",type:"network",address:"999.1.1.1",paperWidth:58}));
  assert.throws(() => normalizePrinter({name:"LAN",type:"network",address:"192.168.1.50",port:0,paperWidth:58}));
  assert.throws(() => normalizePrinter({name:"BT",type:"bluetooth",address:"not a MAC",paperWidth:80}));
  const printer=normalizePrinter({name:"BT",type:"bluetooth",address:"aa:bb:cc:dd:ee:ff",paperWidth:80});
  assert.equal(printer.address,"AA:BB:CC:DD:EE:FF");
  assert.equal(printer.paperWidth,80);
});
test("both paper widths retain product names, quantity and authoritative totals", () => {
  for (const [width,columns] of [[58,32],[80,48]]) {
    const text=thermalReceiptText(receipt,width);
    assert.ok(text.split("\n").every((line) => line.length<=columns));
    assert.match(text,/TOTAL Rs: 25.25/);
    assert.match(text,/2 x 12.50 = Rs 25.00/);
    assert.ok(text.replaceAll("\n","").includes(receipt.cart[0].name));
  }
});
test("receipt data cannot inject HTML, ESC/POS commands or formatter tags", () => {
  const data={...receipt,storeName:'<script>alert(1)</script> [C]\x1b@'};
  const html=thermalReceiptHtml(data,58);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  const payload=thermalReceiptPayload(data,58);
  assert.ok(!payload.includes('[C]'));
  assert.ok(!payload.includes('\x1b'));
  assert.ok(!payload.includes('<script>'));
});
