import type { BottomTabBarButtonProps } from "expo-router/js-tabs";
import { Pressable } from "react-native";

// Bouton d'onglet sans l'effet "ripple" d'Android (le cercle qui grandit à
// l'appui). La barre d'onglets passe au bouton des réglages d'effets visuels
// (ripple, opacité, survol, lien web) et un ref : on les retire et on transmet tout le
// reste (onPress, style, accessibilité...) à un Pressable classique.
export function TabBarButton({
  android_ripple: _androidRipple,
  pressColor: _pressColor,
  pressOpacity: _pressOpacity,
  hoverEffect: _hoverEffect,
  href: _href,
  ref: _ref, // type de ref incompatible avec Pressable, et inutile ici
  ...props
}: BottomTabBarButtonProps) {
  return <Pressable {...props} />;
}
