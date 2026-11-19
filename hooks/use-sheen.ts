import { useEffect } from "react";
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// Courbe CSS « ease-in-out »
const EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1);

// Reflet des maquettes : traverse pendant 45 % d'un cycle de 3,6 s, puis
// attend la fin du cycle hors de vue. Premier passage après 1,2 s.
const CYCLE_MS = 3600;
const SWEEP_MS = CYCLE_MS * 0.45;
const DELAY_MS = 1200;

/**
 * Position d'un reflet qui balaie un élément : 0 = hors de vue à gauche,
 * 1 = hors de vue à droite. Deux éléments montés en même temps ont leurs
 * reflets synchronisés.
 */
export function useSheen(active: boolean) {
  const sheen = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    sheen.value = 0;
    sheen.value = withDelay(
      DELAY_MS,
      withRepeat(
        withSequence(
          withTiming(1, { duration: SWEEP_MS, easing: EASE_IN_OUT }),
          // reste hors de vue jusqu'à la fin du cycle
          withTiming(1, { duration: CYCLE_MS - SWEEP_MS }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(sheen);
  }, [active, sheen]);

  return sheen;
}

/** Dégradé du reflet : bande blanche en biais, transparente sur les bords */
export const SHEEN_GRADIENT =
  "linear-gradient(105deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 70%)";
