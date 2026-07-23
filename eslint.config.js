import expoConfig from "eslint-config-expo/flat.js";
import { defineConfig } from "eslint/config";

export default defineConfig([
  expoConfig,
  {
    ignores: ["backend/**", "node_modules/**", ".expo/**", "web-dist/**", "native-dist/**"],
  },
]);
