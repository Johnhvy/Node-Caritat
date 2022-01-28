import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const virtualModuleId = "caritat-webcrypto";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/caritat/",
  plugins: [
    {
      name: "test",
      enforce: "pre",
      resolveId(source) {
        if (source === "./webcrypto.js") return virtualModuleId;
        // console.error({ source, importer });
        // // if (importer.endsWith("crypto/dist/webcrypto.js")) {
        // //   return true;
        // }
      },
      load(id) {
        if (id === virtualModuleId)
          return "export default crypto;export const{subtle}=crypto";
      },
    },
    svelte(),
  ],
});
