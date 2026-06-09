import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://erdwmads.github.io",
  output: "static",
  build: {
    format: "file"
  }
});
