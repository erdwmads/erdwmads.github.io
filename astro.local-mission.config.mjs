import { defineConfig } from "astro/config";

export default defineConfig({
  site: "http://127.0.0.1",
  output: "static",
  srcDir: "./src-local",
  outDir: "./_local/mission-log",
  build: {
    format: "file"
  }
});
