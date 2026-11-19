import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from "@expo-google-fonts/barlow";
import {
  ChakraPetch_500Medium,
  ChakraPetch_600SemiBold,
  ChakraPetch_700Bold,
} from "@expo-google-fonts/chakra-petch";
import { useFonts } from "expo-font";
import { NavigationBar } from "expo-navigation-bar";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors, fonts } from "@/constants/theme";
import { initializeDatabase } from "../db/schema";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Garde l'écran de démarrage tant que les polices ne sont pas chargées,
// pour éviter un premier affichage avec la police système.
SplashScreen.preventAutoHideAsync();

// Couleur de la fenêtre native, visible derrière les barres système
// (l'appli s'affiche bord à bord : les barres sont transparentes).
SystemUI.setBackgroundColorAsync(colors.background);

// Thème de navigation : fond des écrans et de l'en-tête natif (encore utilisé
// par les écrans pas encore refaits).
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ChakraPetch_500Medium,
    ChakraPetch_600SemiBold,
    ChakraPetch_700Bold,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    [fonts.segment]: require("../assets/fonts/DSEG7Modern-Bold.ttf"),
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName="callisthenie.db"
        onInit={initializeDatabase}
      >
        <ThemeProvider value={navigationTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          {/* Icônes claires sur les barres système. Pour NavigationBar aussi,
              "light" = contenu clair (vérifié dans le code natif ; la doc
              TypeScript du module dit l'inverse). */}
          <StatusBar style="light" />
          <NavigationBar style="light" />
        </ThemeProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
