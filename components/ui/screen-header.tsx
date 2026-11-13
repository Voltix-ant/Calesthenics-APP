import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Neu } from "@/components/ui/neu";
import { colors, display, screenTop } from "@/constants/theme";

/**
 * En-tête des écrans empilés (Détail, Création, Duplication) : bouton retour
 * en relief + titre. Remplace l'en-tête natif, à masquer avec
 * `<Stack.Screen options={{ headerShown: false }} />`.
 */
export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: screenTop(40, insets.top) }]}>
      <Neu
        variant="up-sm"
        style={styles.back}
        onPress={() => router.back()}
        accessibilityLabel="Retour"
      >
        <ArrowLeft size={22} strokeWidth={2} color={colors.text} />
      </Neu>
      <Text style={styles.title} numberOfLines={1} role="heading">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  back: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...display(700),
    fontSize: 20,
    flexShrink: 1,
  },
});
