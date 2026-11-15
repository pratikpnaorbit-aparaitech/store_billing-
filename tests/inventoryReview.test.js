import test from "node:test";
import assert from "node:assert/strict";
import { inventoryReviewRow, selectInventoryProduct, createInventoryProduct, inventoryStockAfter } from "../src/utils/inventoryImport.js";
test("bill rate overrides catalogue zero and an existing price without manual input", () => {
  for(const price of [0,999]) {
    const row=inventoryReviewRow({name:"Sugar",quantity:20,price:45,quantityUnit:"kg",unit:"1 kg",include:true,product:{id:"sugar",name:"Sugar",price,stock:10,unit:"1 kg"}});
    assert.equal(row.price,"45");assert.equal(row.updatePrice,true);assert.equal(inventoryStockAfter(row),30);
  }
});
test("manual product matching preserves bill price and converts measured stock to packet count", () => {
  const row=inventoryReviewRow({name:"Coffee",quantity:.5,price:650,quantityUnit:"kg",unit:"1 kg",original:{quantity:.5,price:650,quantityUnit:"kg",unit:"1 kg"}});
  const chosen=selectInventoryProduct(row,{id:"coffee",name:"Coffee 500g",price:999,stock:10,unit:"500g"});
  assert.equal(chosen.quantity,"1");assert.equal(chosen.price,"325");assert.equal(inventoryStockAfter(chosen),11);
  const newProduct=createInventoryProduct(chosen);
  assert.equal(newProduct.quantity,"0.5");assert.equal(newProduct.price,"650");assert.equal(newProduct.unit,"1 kg");
});
test("an unreadable bill price preserves the current rate and new products require review", () => {
  const owned=inventoryReviewRow({name:"Tea",quantity:2,price:null,product:{id:"tea",price:80,stock:10,unit:"1 pc"}});
  assert.equal(owned.price,"80");assert.equal(owned.updatePrice,false);
  const fresh=inventoryReviewRow({name:"Tea",quantity:2,price:null});assert.equal(fresh.price,"");
  const free=inventoryReviewRow({name:"Sample",quantity:1,price:0});assert.equal(free.price,"0");assert.equal(free.updatePrice,true);
});
