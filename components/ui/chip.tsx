import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { Neu, type NeuVariant } from "@/components/ui/neu";

/**
 * Pastille (rayon 999) : creusée par défaut. Hauteur et marges intérieures
 * propres à chaque usage, à passer dans `style`.
 */
export function Chip({
  variant = "in-sm",
  style,
  children,
}: {
  variant?: NeuVariant;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Neu variant={variant} style={[styles.chip, style]}>
      {children}
    </Neu>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
});
