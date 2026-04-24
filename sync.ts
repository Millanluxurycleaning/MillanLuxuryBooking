import { importSquareCatalog } from "./server/services/catalogSync.js";
const result = await importSquareCatalog();
console.log("Sync complete:", JSON.stringify(result, null, 2));
process.exit(0);
