const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const dns = require("node:dns");
const { pathToFileURL } = require("node:url");
require("dotenv").config({path:path.resolve(__dirname,"../.env"),quiet:true});
const mongoose = require("mongoose");
mongoose.set("autoCreate",false); mongoose.set("autoIndex",false);
const Product = require("../src/models/Product");
const {parseInventoryFile,matchCandidates}=require("../src/services/inventoryImportService");
const controller=require("../src/controllers/inventoryImportController");
const cases=require("../tests/fixtures/inventory/expectations.json");
const useDatabase=process.argv.includes("--database");
const databaseName="sb_ocr_test_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);
let ownDatabase=false;
const close=(actual,expected,label)=>assert.ok(Math.abs(Number(actual)-expected)<0.011,label+": expected "+expected+", received "+actual);
async function apply(items,userId) {
 let status=200,body;
 await controller.applyInventoryImport({userId,body:{items}}, {status(code){status=code;return this;},json(value){body=value;return this;}});
 return {status,body};
}
async function main(){
 if(!process.env.GEMINI_API_KEY)throw new Error("GEMINI_API_KEY is required for the live OCR test.");
 if(useDatabase){
   const servers=String(process.env.MONGO_DNS_SERVERS||"").split(",").filter(Boolean);if(servers.length)dns.setServers(servers);
   const uri=new URL(process.env.MONGODB_URI);uri.pathname="/"+databaseName;
   await mongoose.connect(uri.toString(),{serverSelectionTimeoutMS:30000});
   if((await mongoose.connection.db.listCollections().toArray()).length)throw new Error("Refusing to modify a non-empty test database.");
   ownDatabase=true;await Product.createCollection();await Product.syncIndexes();
 }
 const {inventoryReviewRow}=await import(pathToFileURL(path.resolve(__dirname,"../../src/utils/inventoryImport.js")).href);
 const report={generatedAt:new Date().toISOString(),model:process.env.GEMINI_OCR_MODEL,databaseTest:useDatabase,cases:[]};
 for(const fixture of cases){
   console.log("Reading "+fixture.name+"...");
   const filePath=path.resolve(__dirname,fixture.file);
   const parsed=await parseInventoryFile({buffer:fs.readFileSync(filePath),mimetype:"image/png",originalname:fixture.name+".png"},"en");
   assert.equal(parsed.candidates.length,fixture.quantities.length,fixture.name+" row count");
   parsed.candidates.forEach((row,index)=>{close(row.quantity,fixture.quantities[index],fixture.name+" row "+(index+1)+" quantity");close(row.price,fixture.prices[index],fixture.name+" row "+(index+1)+" unit rate");});
   let stockVerified=false;
   if(useDatabase){
     const owner=new mongoose.Types.ObjectId();let seeded=[];
     if(fixture.seed)seeded=await Product.create(parsed.candidates.map((row,index)=>({owner,name:fixture.names[index],barcode:"MANUAL-OCR-"+fixture.name+"-"+index,stock:10,price:999,unit:row.quantityUnit==="pcs"?row.unit:row.quantityUnit==="kg"?"1 kg":"1 L",category:"Grocery"})));
     const candidates=matchCandidates(parsed.candidates,seeded);
     const rows=candidates.map(inventoryReviewRow);
     assert.ok(rows.every(row=>row.include),fixture.name+" must not need manual activation or price entry");
     const items=rows.map(row=>({include:row.include,productId:row.productId,name:row.productName,barcode:row.productBarcode,quantity:Number(row.quantity),price:Number(row.price),unit:row.unit,category:row.category,updatePrice:row.updatePrice}));
     const result=await apply(items,owner);assert.equal(result.status,200,JSON.stringify(result.body));
     const stored=await Product.find({owner}).lean();assert.equal(stored.length,fixture.quantities.length);
     rows.forEach((row,index)=>{const product=stored.find(p=>p.name===row.productName);assert.ok(product,"Stored product "+row.productName);close(product.stock,(fixture.seed?10:0)+fixture.quantities[index],"Stored additive stock");close(product.price,fixture.prices[index],"Stored bill rate");});
     if(fixture.seed){const bad=await apply([{...items[0],price:-10}],owner);assert.equal(bad.status,400);const unchanged=await Product.findById(seeded[0]._id);close(unchanged.stock,10+fixture.quantities[0],"Rejected invalid import must not change stock");}
     stockVerified=true;
   }
   report.cases.push({name:fixture.name,engine:parsed.extractionEngine,rowCount:parsed.candidates.length,stockVerified,rows:parsed.candidates.map(row=>({name:row.name,quantity:row.quantity,unit:row.unit,unitPrice:row.price,lineTotal:row.lineTotal,warning:row.warning}))});
   console.log("PASS "+fixture.name+": "+parsed.candidates.length+" rows, quantities and unit rates"+(stockVerified?", actual additive stock / saved prices":""));
 }
 fs.writeFileSync(path.resolve(__dirname,"../tests/fixtures/inventory/validation-report.json"),JSON.stringify(report,null,2)+"\n");
}
main().catch(error=>{console.error("OCR validation failed: "+error.message);process.exitCode=1;}).finally(async()=>{
 if(ownDatabase&&mongoose.connection.name===databaseName&&databaseName.startsWith("sb_ocr_test_")){await mongoose.connection.dropDatabase();console.log("Removed isolated OCR validation database.");}
 await mongoose.disconnect();
});
