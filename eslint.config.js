import js from "@eslint/js";
import tsPlugin from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsPlugin.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin.plugin,
    },
  },
  { ignores: ["node_modules/", "**/dist/"] },
];
