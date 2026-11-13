import { StyleSheet } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { Neu } from "@/components/ui/neu";
import { growX } from "@/constants/animations";
import { gradients } from "@/constants/theme";

/**
 * Barre de progression : piste en creux, remplissage feu lumineux.
 * `percent` de 0 à 100. À 100 %, la lueur est un peu plus forte (récap).
 * `fill` : le remplissage s'étire depuis la gauche à l'apparition de la barre.
 */
export function ProgressBar({
  percent,
  fill,
}: {
  percent: number;
  fill?: { duration: number; delay: number };
}) {
  const reducedMotion = useReducedMotion();
  const complete = percent >= 100;

  return (
    <Neu
      variant="in-sm"
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Animated.View
        entering={fill && !reducedMotion ? growX(fill) : undefined}
        style={[
          styles.fill,
          complete && styles.fillComplete,
          { width: `${Math.min(100, percent)}%` },
        ]}
      />
    </Neu>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    height: 14,
    borderRadius: 999,
    padding: 3,
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundImage: gradients.fire,
    boxShadow: "0 0 12px rgba(255,120,40,0.6)",
    transformOrigin: "left",
  },
  fillComplete: {
    boxShadow: "0 0 14px rgba(255,120,40,0.7)",
  },
});
