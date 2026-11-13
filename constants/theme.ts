/**
 * Thème « Feu & relief » (voir docs/design/README.md).
 * Les valeurs sont recopiées telles quelles des maquettes : ne pas arrondir.
 */
import type { TextStyle } from "react-native";

export const colors = {
  background: "#23201E",
  text: "#F4EEE8",
  textSecondary: "#ABA39B",
  textTertiary: "#968E86",
  decrease: "#9DB3CC",
  destructive: "#FF7A5C",
  onFire: "#1A0F0A",
  // Teintes ponctuelles des maquettes
  fireMid: "#FF8A1F", // chevrons, icônes d'accent
  tabActive: "#FFB23F", // libellé de l'onglet actif, icône son active
  firstTime: "#FFC24A", // pastille « 1ʳᵉ fois »
} as const;

/** Les trois couleurs du feu, utilisées aussi dans les dégradés SVG. */
export const fireStops = ["#FFD23F", "#FF8A1F", "#EE4A2B"] as const;

/**
 * Dégradés en syntaxe CSS, appliqués via la prop de style `backgroundImage`
 * (native depuis React Native 0.76, même rendu que dans le navigateur).
 */
export const gradients = {
  /** Fond des boutons principaux (--fire) */
  fire: "linear-gradient(135deg, #FFD23F 0%, #FF8A1F 50%, #EE4A2B 100%)",
  /** Texte en dégradé (.fire-text) */
  fireText: "linear-gradient(135deg, #FFD23F 0%, #FF8A1F 55%, #EE4A2B 100%)",
  /** Cartes en relief */
  card: "linear-gradient(145deg, #282422, #1F1C1A)",
  /** Gros chiffres de la séance (.fire-live). L'original fait 200 % de large
   *  pour défiler ; à l'arrêt, seule sa première moitié est visible. */
  fireLive: "linear-gradient(110deg, #FFD23F 0%, #FF8A1F 50%, #EE4A2B 100%)",
  /** Disque des chronos de séance (décompte et chrono) */
  dial: "linear-gradient(145deg, #292523, #1D1A18)",
  /** Lueur au bas de l'écran : exercice en attente et chrono */
  sessionGlow:
    "radial-gradient(120% 55% at 50% 118%, rgba(255,100,30,0.16), rgba(255,100,30,0) 62%)",
  /** Lueur derrière le décompte */
  countdownGlow:
    "radial-gradient(90% 45% at 50% 62%, rgba(255,110,30,0.14), rgba(255,110,30,0) 70%)",
} as const;

/** Ombres neumorphiques, mêmes chaînes que les variables CSS des maquettes. */
export const shadows = {
  up: "7px 7px 16px rgba(0,0,0,0.6), -6px -6px 14px rgba(255,236,220,0.05)",
  upSm: "4px 4px 9px rgba(0,0,0,0.55), -3px -3px 8px rgba(255,236,220,0.045)",
  in: "inset 5px 5px 11px rgba(0,0,0,0.6), inset -4px -4px 10px rgba(255,236,220,0.045)",
  inSm: "inset 3px 3px 6px rgba(0,0,0,0.55), inset -2px -2px 5px rgba(255,236,220,0.04)",
  glow: "0 12px 28px -8px rgba(255,105,35,0.6)",
} as const;

/**
 * Polices. Sur Android, une graisse = une famille : on n'utilise jamais
 * `fontWeight`. Chakra Petch s'arrête à 700 (les 800 des maquettes → 700).
 */
export const fonts = {
  display500: "ChakraPetch_500Medium",
  display600: "ChakraPetch_600SemiBold",
  display700: "ChakraPetch_700Bold",
  body400: "Barlow_400Regular",
  body500: "Barlow_500Medium",
  body600: "Barlow_600SemiBold",
  body700: "Barlow_700Bold",
  segment: "DSEG7Modern-Bold",
} as const;

/**
 * Base commune à tous les textes. `includeFontPadding: false` retire la marge
 * qu'Android ajoute au-dessus et en dessous du texte, pour coller au CSS.
 */
const textBase: TextStyle = { color: colors.text, includeFontPadding: false };

/** Équivalent de la classe `.d` des maquettes (Chakra Petch, chiffres tabulaires). */
export function display(weight: 500 | 600 | 700 = 700): TextStyle {
  return {
    ...textBase,
    fontFamily: fonts[`display${weight}`],
    fontVariant: ["tabular-nums"],
  };
}

/** Texte courant (Barlow). */
export function body(weight: 400 | 500 | 600 | 700 = 400): TextStyle {
  return { ...textBase, fontFamily: fonts[`body${weight}`] };
}

/**
 * Marge du haut d'un écran. Les maquettes (390×844) incluent la zone de la
 * barre d'état : on garde leur valeur, sauf si la barre d'état est plus haute,
 * auquel cas on se place 8 dp sous elle.
 */
export function screenTop(mockValue: number, insetTop: number) {
  return Math.max(mockValue, insetTop + 8);
}

/**
 * Marge du bas d'un écran (même logique que `screenTop`, avec la barre de
 * navigation d'Android).
 */
export function screenBottom(mockValue: number, insetBottom: number) {
  return Math.max(mockValue, insetBottom + 8);
}

/** Style d'appui des boutons en relief (classe `.press` des maquettes). */
export const pressed = {
  boxShadow: shadows.inSm,
  transform: [{ scale: 0.97 }],
} as const;

/** Convertit un letter-spacing CSS en `em` vers des dp. */
export function em(value: number, fontSize: number) {
  return value * fontSize;
}
