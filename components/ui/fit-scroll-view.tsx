import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

// Page qui ne défile que si son contenu dépasse de l'écran.
//
// Le contenu d'un ScrollView est placé dans une vue intérieure
// (contentContainerStyle). Avec `flexGrow: 1`, cette vue fait au moins la
// hauteur de l'écran : la mise en page normale (space-between, etc.) reste
// donc la même, et il n'y a rien à faire défiler. Si le contenu est plus
// grand, la vue grandit au-delà et le défilement devient possible.
//
// Attention : ne pas mettre `flex: 1` dans `contentContainerStyle`, sinon la
// vue intérieure serait bloquée à la hauteur de l'écran et le contenu en
// trop serait juste coupé, sans pouvoir défiler.
export function FitScrollView({
  contentContainerStyle,
  children,
}: {
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      // Un appui sur un bouton marche même si le clavier est ouvert
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
});
