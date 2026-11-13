import RNMaskedView from "@react-native-masked-view/masked-view";
import {
  useEffect,
  useState,
  type ComponentType,
  type ReactElement,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewProps,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { gradients } from "@/constants/theme";

// Les types fournis par la librairie s'appuient sur un type de React Native
// qui n'existe plus (NativeMethods) : on redonne à TypeScript la forme réelle
// du composant.
const MaskedView = RNMaskedView as unknown as ComponentType<
  ViewProps & { maskElement: ReactElement }
>;

const FLOW_DURATION_MS = 5000;

type GradientTextProps = {
  children: string;
  style?: StyleProp<TextStyle>;
  /** Dégradé CSS (`backgroundImage`). Par défaut : le feu du texte. */
  gradient?: string;
  /**
   * Dégradé qui défile en boucle (classe `.fire-live` des maquettes, 5 s).
   * Remplace `gradient`.
   */
  flow?: boolean;
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
  flow = false,
}: GradientTextProps) {
  const reducedMotion = useReducedMotion();
  const animate = flow && !reducedMotion;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const measured = size.width > 0;

  // Position du défilement, de 0 à 1, qui repart de 0 à chaque tour
  const shift = useSharedValue(0);
  useEffect(() => {
    if (!animate || !measured) return;
    shift.value = 0;
    shift.value = withRepeat(
      withTiming(1, { duration: FLOW_DURATION_MS, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(shift);
  }, [animate, measured, shift]);

  // Dans la maquette, le motif fait deux fois la largeur du texte et se
  // répète ; il glisse d'un motif entier (2 largeurs) en 5 s. Ici : deux
  // motifs côte à côte, qu'on décale ; à la fin du tour l'image est
  // identique à celle du début, la boucle ne se voit pas.
  const tileWidth = size.width * 2;
  const flowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value * tileWidth }],
  }));

  return (
    <MaskedView
      accessible
      accessibilityLabel={children}
      maskElement={<Text style={style}>{children}</Text>}
    >
      <Text
        style={[style, styles.hidden]}
        importantForAccessibility="no"
        onLayout={
          flow
            ? (e) =>
                setSize({
                  width: e.nativeEvent.layout.width,
                  height: e.nativeEvent.layout.height,
                })
            : undefined
        }
      >
        {children}
      </Text>
      {animate && measured ? (
        <Animated.View
          style={[
            styles.flowStrip,
            { left: -tileWidth, width: tileWidth * 2, height: size.height },
            flowStyle,
          ]}
        >
          <View style={[styles.flowTile, { width: tileWidth }]} />
          <View style={[styles.flowTile, { width: tileWidth }]} />
        </Animated.View>
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundImage: flow ? gradients.fireLive : gradient },
          ]}
        />
      )}
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  flowStrip: { position: "absolute", top: 0, flexDirection: "row" },
  flowTile: { height: "100%", backgroundImage: gradients.fireLiveTile },
});
