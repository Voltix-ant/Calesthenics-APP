import { useState, type ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
} from "react-native-reanimated";

import { FireButton } from "@/components/ui/fire-button";
import { shadows } from "@/constants/theme";
import { usePulse } from "@/hooks/use-pulse";
import { SHEEN_GRADIENT, useSheen } from "@/hooks/use-sheen";

type LiveFireButtonProps = ComponentProps<typeof FireButton> & {
  /** Rayon du bouton (repris par la lueur et le reflet) */
  borderRadius: number;
};

/**
 * Bouton feu « vivant » (« Série terminée ») : sa lueur respire (2,8 s) et un
 * reflet blanc le traverse en biais régulièrement.
 */
export function LiveFireButton({
  borderRadius,
  style,
  ...buttonProps
}: LiveFireButtonProps) {
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);

  // Lueur : une ombre ne s'anime pas directement, on superpose une lueur
  // douce et une lueur forte dont les opacités varient en sens inverse.
  const pulse = usePulse(!reducedMotion, 1400);
  const softStyle = useAnimatedStyle(() => ({ opacity: 1 - pulse.value }));
  const strongStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  // Reflet : 0 = à gauche, hors du bouton ; 1 = à droite, hors du bouton
  const sheen = useSheen(!reducedMotion);
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(sheen.value, [0, 1], [-1.2, 1.2]) * width },
    ],
  }));

  const radius = { borderRadius };

  return (
    <View style={styles.wrapper}>
      {!reducedMotion && (
        <>
          <Animated.View
            style={[styles.glow, radius, styles.glowSoft, softStyle]}
          />
          <Animated.View
            style={[styles.glow, radius, styles.glowStrong, strongStyle]}
          />
        </>
      )}
      <FireButton
        {...buttonProps}
        // Le relief reste sur le bouton ; la lueur est portée par les calques
        // ci-dessus (avec « Réduire les animations » : lueur douce, fixe).
        style={[
          style,
          radius,
          {
            boxShadow: reducedMotion
              ? `${shadows.upSm}, 0 12px 26px -12px rgba(255,105,35,0.45)`
              : shadows.upSm,
          },
        ]}
        overlay={
          reducedMotion ? undefined : (
            // Le reflet est découpé aux bords du bouton par ce calque
            <View
              pointerEvents="none"
              style={[styles.sheenClip, radius]}
              onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            >
              <Animated.View style={[styles.sheen, sheenStyle]} />
            </View>
          )
        }
      />
    </View>
  );
}

const fill = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

const styles = StyleSheet.create({
  wrapper: { alignSelf: "stretch" },
  glow: fill,
  // Lueurs de début/milieu de l'animation « breathe » des maquettes
  glowSoft: { boxShadow: "0 12px 26px -12px rgba(255,105,35,0.45)" },
  glowStrong: { boxShadow: "0 20px 46px -8px rgba(255,105,35,0.85)" },
  sheenClip: { ...fill, overflow: "hidden" },
  sheen: {
    ...fill,
    backgroundImage: SHEEN_GRADIENT,
  },
});
