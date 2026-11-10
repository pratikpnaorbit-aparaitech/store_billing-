require("dotenv").config({ quiet: true });
async function main() {
  const key = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const secret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!key || !secret) throw new Error("Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env");
  const response = await fetch("https://api.razorpay.com/v1/plans?count=1", {
    headers: { Authorization: "Basic " + Buffer.from(key + ":" + secret).toString("base64") },
    signal: AbortSignal.timeout(30000),
  });
  if (response.status === 401) throw new Error("Razorpay rejected the API key pair (401). Set a matching, active Key ID and Key Secret from the same Razorpay account and mode, including in the deployed backend environment.");
  if (!response.ok) throw new Error("Razorpay configuration check failed: HTTP " + response.status);
  console.log("Razorpay authentication passed (read-only check; no payment or subscription created).");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
