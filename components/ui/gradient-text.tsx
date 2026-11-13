import RNMaskedView from "@react-native-masked-view/masked-view";
import type { ComponentType, ReactElement } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewProps,
} from "react-native";

import { gradients } from "@/constants/theme";

// Les types fournis par la librairie s'appuient sur un type de React Native
// qui n'existe plus (NativeMethods) : on redonne à TypeScript la forme réelle
// du composant.
const MaskedView = RNMaskedView as unknown as ComponentType<
  ViewProps & { maskElement: ReactElement }
>;

type GradientTextProps = {
  children: string;
  style?: StyleProp<TextStyle>;
  /** Dégradé CSS (`backgroundImage`). Par défaut : le feu du texte. */
  gradient?: string;
};

/**
 * Texte rempli par un dégradé (équivalent de `background-clip: text`).
 * Le texte sert de masque : seuls ses pixels laissent voir le dégradé placé
 * dessous. Un exemplaire invisible du texte donne sa taille à l'ensemble.
 */
export function GradientText({
  children,
  style,
  gradient = gradients.fireText,
}: GradientTextProps) {
  return (
    <MaskedView
      accessible
      accessibilityLabel={children}
      maskElement={<Text style={style}>{children}</Text>}
    >
      <Text style={[style, styles.hidden]} importantForAccessibility="no">
        {children}
      </Text>
      <View style={[StyleSheet.absoluteFill, { backgroundImage: gradient }]} />
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
});
