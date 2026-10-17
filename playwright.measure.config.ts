import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** INP measurements (tests/e2e/inp.spec.ts): one at a time, so tests do not slow each other down. */
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: "**/inp.spec.ts",
  fullyParallel: false,
  workers: 1,
});
