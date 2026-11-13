import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { colors, display, gradients, shadows } from "@/constants/theme";

type FireButtonProps = {
  label: string;
  onPress?: () => void;
  /** Icône placée avant le libellé (couleur à fournir : `colors.onFire`). */
  icon?: ReactNode;
  disabled?: boolean;
  /** Dimensions propres à chaque écran (hauteur, rayon, écart). */
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

/**
 * Bouton d'action principale : fond en dégradé feu, relief léger et lueur.
 * Valeurs par défaut = bouton « Nouvel entrainement » de l'Accueil.
 */
export function FireButton({
  label,
  onPress,
  icon,
  disabled,
  style,
  labelStyle,
}: FireButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, style]}
    >
      {icon}
      <Text style={[styles.label, labelStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 60,
    borderRadius: 20,
    backgroundImage: gradients.fire,
    boxShadow: `${shadows.upSm}, ${shadows.glow}`,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    ...display(700),
    fontSize: 16,
    color: colors.onFire,
  },
});
