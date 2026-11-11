import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ComponentProps } from "react";
import { type ColorValue, type StyleProp, type TextStyle } from "react-native";

/**
 * Noms d'icônes utilisés dans l'appli -> icône Material correspondante.
 * Liste des icônes disponibles : https://icons.expo.fyi (filtre "MaterialIcons").
 * Les noms de gauche sont ceux des SF Symbols d'Apple, gardés pour un éventuel portage iOS.
 */
const MAPPING = {
  "house.fill": "home",
  "speaker.wave.2.fill": "volume-up",
  "speaker.slash.fill": "volume-off",
  "arrow.up": "arrow-upward",
  "arrow.down": "arrow-downward",
  timer: "timer",
} satisfies Record<string, ComponentProps<typeof MaterialIcons>["name"]>;

type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <MaterialIcons
      // ColorValue peut aussi être un nombre ou null (cas rares que
      // MaterialIcons n'accepte pas) : on ne transmet que les vraies couleurs
      color={typeof color === "number" ? undefined : (color ?? undefined)}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
