import type { ReactNode } from "react";
import {
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, gradients, shadows } from "@/constants/theme";

export type NeuVariant = "up" | "up-sm" | "in" | "in-sm";

const shadowByVariant: Record<NeuVariant, string> = {
  up: shadows.up,
  "up-sm": shadows.upSm,
  in: shadows.in,
  "in-sm": shadows.inSm,
};

type NeuProps = {
  variant: NeuVariant;
  /**
   * Fond de la surface :
   * - "card" : léger dégradé des cartes en relief ;
   * - "flat" : couleur du fond de l'appli ;
   * - absent : transparent (seules les ombres dessinent la forme).
   */
  surface?: "card" | "flat";
  style?: StyleProp<ViewStyle>;
  /** Style ajouté pendant l'appui (boutons seulement). */
  pressedStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
} & Pick<
  PressableProps,
  | "onPress"
  | "onPressIn"
  | "onPressOut"
  | "onLongPress"
  | "disabled"
  | "accessibilityLabel"
  | "accessibilityRole"
  | "accessibilityState"
  | "accessibilityValue"
  | "accessible"
  | "hitSlop"
>;

/**
 * Surface neumorphique : en relief (`up`) ou en creux (`in`).
 * Utilise la prop de style `boxShadow`, qui accepte la même syntaxe que le CSS
 * (plusieurs ombres, `inset`), contrairement à `elevation` sur Android.
 * Si `onPress` est fourni, la surface devient un bouton (sans effet d'onde).
 */
export function Neu({
  variant,
  surface,
  style,
  pressedStyle,
  children,
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  disabled,
  ...a11yProps
}: NeuProps) {
  const surfaceStyle: ViewStyle = {
    boxShadow: shadowByVariant[variant],
    ...(surface === "card" && { backgroundImage: gradients.card }),
    ...(surface === "flat" && { backgroundColor: colors.background }),
  };

  if (onPress || onLongPress || onPressIn) {
    return (
      <Pressable
        accessibilityRole="button"
        {...a11yProps}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLongPress={onLongPress}
        disabled={disabled}
        style={({ pressed }) => [surfaceStyle, style, pressed && pressedStyle]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View {...a11yProps} style={[surfaceStyle, style]}>
      {children}
    </View>
  );
}
