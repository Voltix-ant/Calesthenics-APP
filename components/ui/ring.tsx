import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { fireStops } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Lueur autour de l'arc. La maquette utilise un flou (drop-shadow 8 px), mais
// un flou SVG est recalculé à chaque image quand l'arc avance, ce qui fait
// sauter des images. On l'imite avec des traits orange plus larges et très
// transparents, empilés sous l'arc : rendu proche, coût négligeable.
const GLOW_COLOR = "rgb(255,120,40)";
const GLOW_LAYERS = [
  { extraWidth: 16, opacity: 0.06 },
  { extraWidth: 10, opacity: 0.12 },
  { extraWidth: 4, opacity: 0.22 },
];

type ArcProps = {
  center: number;
  radius: number;
  strokeWidth: number;
  circumference: number;
  stroke: string;
  opacity?: number;
  progress: number | SharedValue<number>;
};

const clamp01 = (value: number) => {
  "worklet";
  return Math.max(0, Math.min(1, value));
};

// Arc piloté par une valeur animée : seul le décalage du trait
// (strokeDashoffset) change, sur le thread de l'interface, sans rendu React.
function AnimatedArc({
  progress,
  circumference,
  ...circle
}: Omit<ArcProps, "progress"> & { progress: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - clamp01(progress.value)) * circumference,
  }));

  return (
    <AnimatedCircle
      animatedProps={animatedProps}
      cx={circle.center}
      cy={circle.center}
      r={circle.radius}
      fill="none"
      stroke={circle.stroke}
      strokeWidth={circle.strokeWidth}
      strokeLinecap="round"
      strokeDasharray={`${circumference} ${circumference}`}
      opacity={circle.opacity}
    />
  );
}

// Un arc : un trait pointillé dont le premier tiret fait
// `progress × circonférence`.
function Arc(props: ArcProps) {
  const { progress, circumference } = props;
  if (typeof progress !== "number") {
    return <AnimatedArc {...props} progress={progress} />;
  }
  return (
    <Circle
      cx={props.center}
      cy={props.center}
      r={props.radius}
      fill="none"
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
      strokeLinecap="round"
      strokeDasharray={`${circumference} ${circumference}`}
      strokeDashoffset={(1 - clamp01(progress)) * circumference}
      opacity={props.opacity}
    />
  );
}

type RingProps = {
  /** Côté du carré SVG (dp) */
  size: number;
  radius: number;
  strokeWidth: number;
  /** Part de l'anneau remplie, de 0 à 1 (valeur fixe ou animée) */
  progress: number | SharedValue<number>;
  /** Couleur de la piste sous l'anneau (absente : pas de piste) */
  trackColor?: string;
  opacity?: number;
  /** Lueur orange autour de l'anneau */
  glow?: boolean;
  /** Préfixe des id SVG, unique à l'écran */
  id: string;
};

/**
 * Anneau de progression en dégradé feu, posé en absolu sur son parent.
 * Comme dans les maquettes, tout le SVG est tourné de −90° pour que l'anneau
 * parte du haut.
 */
export function Ring({
  size,
  radius,
  strokeWidth,
  progress,
  trackColor,
  opacity,
  glow = false,
  id,
}: RingProps) {
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const common = { center, radius, circumference, progress };

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={[StyleSheet.absoluteFill, styles.rotated]}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id={`${id}-fire`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={fireStops[0]} />
          <Stop offset="0.5" stopColor={fireStops[1]} />
          <Stop offset="1" stopColor={fireStops[2]} />
        </LinearGradient>
      </Defs>
      {trackColor && (
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
      )}
      {glow &&
        GLOW_LAYERS.map((layer) => (
          <Arc
            key={layer.extraWidth}
            {...common}
            strokeWidth={strokeWidth + layer.extraWidth}
            stroke={GLOW_COLOR}
            opacity={layer.opacity}
          />
        ))}
      <Arc
        {...common}
        strokeWidth={strokeWidth}
        stroke={`url(#${id}-fire)`}
        opacity={opacity}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  rotated: { transform: [{ rotate: "-90deg" }] },
});
