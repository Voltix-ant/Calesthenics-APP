import { useNavigation } from "expo-router";
import { useCallback, useEffect, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { RISE_EASING } from "@/constants/animations";

/**
 * Bloc qui apparaît en montant de 18 dp (600 ms, après `delay` ms), à sa
 * première apparition puis à chaque fois qu'on revient sur son onglet.
 *
 * Pourquoi pas `entering` : cette animation ne joue qu'à la création du
 * composant, or les onglets restent montés quand on en change. On écoute
 * plutôt l'appui sur l'onglet (« tabPress ») et on relance l'animation
 * nous-mêmes, sans recréer l'écran (son état, comme un chrono en cours, est
 * conservé). Le retour depuis un écran empilé (ex. Détail) ne la rejoue pas.
 */
export function RiseOnTab({
  delay = 0,
  enabled = true,
  style,
  children,
}: {
  delay?: number;
  /** false : bloc affiché tout de suite, sans animation */
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const navigation = useNavigation();
  const reducedMotion = useReducedMotion();
  const active = enabled && !reducedMotion;
  const progress = useSharedValue(active ? 0 : 1);

  // `.set()` plutôt que `.value =` : même effet, mais compatible avec les
  // règles du React Compiler (pas de modification d'une valeur de hook).
  const play = useCallback(() => {
    if (!active) {
      progress.set(1);
      return;
    }
    progress.set(0);
    progress.set(
      withDelay(delay, withTiming(1, { duration: 600, easing: RISE_EASING })),
    );
  }, [active, delay, progress]);

  // Première apparition
  useEffect(() => {
    play();
  }, [play]);

  // Retour sur l'onglet depuis un autre onglet (un appui sur l'onglet déjà
  // affiché ne rejoue rien). L'événement arrive juste avant le changement
  // d'onglet : l'écran n'est donc pas encore « actif » à ce moment-là.
  useEffect(() => {
    // @ts-expect-error « tabPress » n'existe que dans les navigateurs à
    // onglets, que le type générique de useNavigation ne connaît pas.
    return navigation.addListener("tabPress", () => {
      if (!navigation.isFocused()) play();
    });
  }, [navigation, play]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 18 }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}
