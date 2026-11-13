import {
  Easing,
  withDelay,
  withSequence,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
  type LayoutAnimation,
} from "react-native-reanimated";

/** cubic-bezier(.2,.7,.2,1) des maquettes */
export const RISE_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

/** Courbe CSS « ease-out » */
export const EASE_OUT = Easing.bezier(0, 0, 0.58, 1);

type RiseOptions = {
  /** Distance parcourue en montant (dp) */
  distance?: number;
  duration?: number;
  easing?: typeof RISE_EASING;
};

/**
 * Animation d'entrée « rise » des maquettes : monte de 18 dp en apparaissant,
 * en 600 ms (valeurs par défaut). À passer à la prop `entering` d'un
 * `Animated.View`.
 * `withTiming` respecte déjà le réglage « Réduire les animations » du système,
 * mais les écrans coupent aussi `entering` dans ce cas (voir useReducedMotion).
 */
export function rise(
  delayMs = 0,
  { distance = 18, duration = 600, easing = RISE_EASING }: RiseOptions = {},
) {
  return (_values: EntryAnimationsValues): LayoutAnimation => {
    "worklet";
    const config = { duration, easing };
    return {
      initialValues: { opacity: 0, transform: [{ translateY: distance }] },
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

/** cubic-bezier(.3,1.4,.5,1) des maquettes : dépasse un peu avant de se poser */
const POP_EASING = Easing.bezier(0.3, 1.4, 0.5, 1);

/**
 * Animation d'entrée « pop » : apparaît en grossissant de `from` (0,7× par
 * défaut) à 1,06× (60 % du temps) puis se pose à 1×, en `duration` ms.
 */
export function pop({ from = 0.7, duration = 500 } = {}) {
  return (_values: EntryAnimationsValues): LayoutAnimation => {
    "worklet";
    return {
      initialValues: { opacity: 0, transform: [{ scale: from }] },
      animations: {
        opacity: withTiming(1, { duration, easing: POP_EASING }),
        transform: [
          {
            scale: withSequence(
              withTiming(1.06, {
                duration: duration * 0.6,
                easing: POP_EASING,
              }),
              withTiming(1, { duration: duration * 0.4, easing: POP_EASING }),
            ),
          },
        ],
      },
    };
  };
}

/**
 * Animation de sortie : grossit jusqu'à `scale` en s'effaçant. Sert au chiffre
 * saisi de l'onglet Chrono, qui grossit vers la taille du chiffre du décompte
 * pendant que celui-ci apparaît en fondu.
 */
export function growOut({ scale = 1.5, duration = 250 } = {}) {
  return (_values: ExitAnimationsValues): LayoutAnimation => {
    "worklet";
    const config = { duration, easing: EASE_OUT };
    return {
      initialValues: { opacity: 1, transform: [{ scale: 1 }] },
      animations: {
        opacity: withTiming(0, config),
        transform: [{ scale: withTiming(scale, config) }],
      },
    };
  };
}

/**
 * Animation d'entrée douce : apparaît en fondu en grossissant légèrement
 * (de `from` à 1×). Sert au chrono qui prend le relais du décompte.
 */
export function appear({ from = 0.9, duration = 350 } = {}) {
  return (_values: EntryAnimationsValues): LayoutAnimation => {
    "worklet";
    const config = { duration, easing: EASE_OUT };
    return {
      initialValues: { opacity: 0, transform: [{ scale: from }] },
      animations: {
        opacity: withTiming(1, config),
        transform: [{ scale: withTiming(1, config) }],
      },
    };
  };
}

/**
 * Remplissage d'une barre : s'étire depuis la gauche (scaleX 0 → 1). La vue
 * doit avoir `transformOrigin: "left"`.
 */
export function growX({ duration = 1100, delay = 0 } = {}) {
  return (_values: EntryAnimationsValues): LayoutAnimation => {
    "worklet";
    return {
      initialValues: { transform: [{ scaleX: 0 }] },
      animations: {
        transform: [
          {
            scaleX: withDelay(
              delay,
              withTiming(1, { duration, easing: RISE_EASING }),
            ),
          },
        ],
      },
    };
  };
}

/** cubic-bezier(.3,1.6,.5,1) des maquettes : rebond plus marqué */
const SPRING_EASING = Easing.bezier(0.3, 1.6, 0.5, 1);

/**
 * Apparition « à ressort » des pastilles du récap : de 0,5× à 1× en 500 ms,
 * avec un léger dépassement.
 */
export function springPop({ delay = 0 } = {}) {
  return (_values: EntryAnimationsValues): LayoutAnimation => {
    "worklet";
    const config = { duration: 500, easing: SPRING_EASING };
    return {
      initialValues: { opacity: 0, transform: [{ scale: 0.5 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, config)),
        transform: [{ scale: withDelay(delay, withTiming(1, config)) }],
      },
    };
  };
}
