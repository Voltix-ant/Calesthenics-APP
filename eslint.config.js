// https://docs.expo.dev/guides/using-eslint/
// Depuis le SDK 55, eslint-config-expo inclut les règles du React Compiler.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // Règle pensée pour le HTML : en React Native, ' et " s'affichent
      // normalement dans <Text>. Avec une interface en français pleine
      // d'apostrophes, elle ne fait que du bruit.
      "react/no-unescaped-entities": "off",
    },
  },
]);
