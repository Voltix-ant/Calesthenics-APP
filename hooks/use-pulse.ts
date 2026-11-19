import { useEffect } from "react";
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// Courbe CSS « ease-in-out »
const EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1);

/**
 * Valeur animée qui va et vient entre 0 et 1 tant que `active` est vrai
 * (aller puis retour, `halfPeriodMs` chacun). Sert aux halos qui pulsent.
 * Reste à 0 si `active` est faux.
 */
export function usePulse(active: boolean, halfPeriodMs = 700) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withTiming(1, { duration: halfPeriodMs, easing: EASE_IN_OUT }),
        -1, // à l'infini
        true, // en aller-retour
      );
    }
    return () => {
      cancelAnimation(pulse);
      pulse.value = 0;
    };
  }, [active, halfPeriodMs, pulse]);

  return pulse;
}
