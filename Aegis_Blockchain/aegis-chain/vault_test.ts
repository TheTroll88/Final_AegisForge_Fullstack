import { getVeniceInferenceKey, getOpenAIKey, getAlchemyKey, getAegisRpc, vaultStatus } from "./src/vault_reader.js";
const k = getVeniceInferenceKey();
console.log("Venice:", k ? k.slice(0, 24) + "..." : "NOT FOUND");
console.log("OpenAI:", getOpenAIKey() ? "FOUND" : "NOT FOUND");
console.log("Alchemy:", getAlchemyKey() ? "FOUND" : "NOT FOUND");
console.log("AegisRpc:", getAegisRpc());
console.log("Status:", JSON.stringify(vaultStatus(), null, 2));
