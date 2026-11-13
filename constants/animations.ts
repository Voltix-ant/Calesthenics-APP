import {
  Easing,
  withDelay,
  withTiming,
  type EntryAnimationsValues,
  type LayoutAnimation,
} from "react-native-reanimated";

/** cubic-bezier(.2,.7,.2,1) des maquettes */
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

/**
 * Animation d'entrée « rise » des maquettes : monte de 18 dp en apparaissant,
 * en 600 ms. À passer à la prop `entering` d'un `Animated.View`.
 * `withTiming` respecte déjà le réglage « Réduire les animations » du système,
 * mais les écrans coupent aussi `entering` dans ce cas (voir useReducedMotion).
 */
export function rise(delayMs = 0) {
  return (_values: EntryAnimationsValues): LayoutAnimation => {
    "worklet";
    const config = { duration: 600, easing: RISE_EASING };
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 18 }] },
      animations: {
        opacity: withDelay(delayMs, withTiming(1, config)),
        transform: [{ translateY: withDelay(delayMs, withTiming(0, config)) }],
      },
    };
  };
}

/**
 * Décalage des listes en cascade : 70 ms par élément. Les maquettes ne
 * définissent des délais que pour les 6 premiers éléments (0 à 350 ms).
 */
export const STAGGER_MS = 70;
export const STAGGER_COUNT = 6;
