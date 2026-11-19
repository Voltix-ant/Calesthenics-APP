import type { ReactNode } from "react";
import {
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { Neu, type NeuVariant } from "@/components/ui/neu";
import { body, colors } from "@/constants/theme";

type NeuTextInputProps = TextInputProps & {
  /** Champ en creux par défaut ; `up-sm` + `surface="flat"` pour un champ en relief. */
  variant?: NeuVariant;
  surface?: "card" | "flat";
  /** Dimensions, rayon et marges intérieures du champ. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Élément affiché avant le texte (ex. icône loupe). Le conteneur doit
   *  alors être en `flexDirection: "row"`. */
  leading?: ReactNode;
};

/**
 * Champ de saisie neumorphique. L'ombre est portée par une `View` qui
 * enveloppe le `TextInput` (transparent) : les ombres internes sont ainsi
 * garanties, quel que soit le support de `boxShadow` par le champ natif.
 */
export function NeuTextInput({
  variant = "in",
  surface,
  containerStyle,
  leading,
  style,
  ...inputProps
}: NeuTextInputProps) {
  return (
    <Neu variant={variant} surface={surface} style={containerStyle}>
      {leading}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.fireMid}
        cursorColor={colors.fireMid}
        {...inputProps}
        style={[styles.input, style]}
      />
    </Neu>
  );
}

const styles = StyleSheet.create({
  input: {
    ...body(400),
    flex: 1,
    // Android ajoute par défaut une marge intérieure aux champs
    padding: 0,
  },
});
