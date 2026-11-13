import { StyleSheet, View } from "react-native";

import { Neu } from "@/components/ui/neu";
import { gradients } from "@/constants/theme";

/**
 * Barre de progression : piste en creux, remplissage feu lumineux.
 * `percent` de 0 à 100. À 100 %, la lueur est un peu plus forte (récap).
 */
export function ProgressBar({ percent }: { percent: number }) {
  const complete = percent >= 100;

  return (
    <Neu
      variant="in-sm"
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View
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
  },
  fillComplete: {
    boxShadow: "0 0 14px rgba(255,120,40,0.7)",
  },
});
