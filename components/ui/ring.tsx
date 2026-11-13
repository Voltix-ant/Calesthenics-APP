import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  FeDropShadow,
  Filter,
  LinearGradient,
  Stop,
} from "react-native-svg";

import { fireStops } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ArcProps = {
  center: number;
  radius: number;
  strokeWidth: number;
  circumference: number;
  opacity?: number;
  gradientUrl: string;
  filterUrl?: string;
};

// Arc piloté par une valeur animée : seul le décalage du trait
// (strokeDashoffset) change, sur le thread de l'interface, sans rendu React.
function AnimatedArc({
  progress,
  circumference,
  center,
  radius,
  strokeWidth,
  opacity,
  gradientUrl,
  filterUrl,
}: ArcProps & { progress: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    const p = Math.max(0, Math.min(1, progress.value));
    return { strokeDashoffset: (1 - p) * circumference };
  });

  return (
    <AnimatedCircle
      animatedProps={animatedProps}
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke={gradientUrl}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={`${circumference} ${circumference}`}
      opacity={opacity}
      filter={filterUrl}
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
  /** Lueur orange autour de l'anneau (drop-shadow des maquettes) */
  glow?: boolean;
  /** Préfixe des id SVG, unique à l'écran */
  id: string;
};

/**
 * Anneau de progression en dégradé feu, posé en absolu sur son parent.
 * Le remplissage se fait avec un trait pointillé dont le premier tiret fait
 * `progress × circonférence`. Comme dans les maquettes, tout le
 * SVG est tourné de −90° pour que l'anneau parte du haut.
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
  const arc: ArcProps = {
    center,
    radius,
    strokeWidth,
    circumference,
    opacity,
    gradientUrl: `url(#${id}-fire)`,
    filterUrl: glow ? `url(#${id}-glow)` : undefined,
  };

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
        {glow && (
          // drop-shadow(0 0 8px …) en CSS = flou d'écart-type 4 en SVG
          <Filter
            id={`${id}-glow`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <FeDropShadow
              dx={0}
              dy={0}
              stdDeviation={4}
              floodColor="rgb(255,120,40)"
              floodOpacity={0.55}
            />
          </Filter>
        )}
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
      {typeof progress === "number" ? (
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={arc.gradientUrl}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0, Math.min(1, progress)) * circumference} ${circumference}`}
          opacity={opacity}
          filter={arc.filterUrl}
        />
      ) : (
        <AnimatedArc progress={progress} {...arc} />
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  rotated: { transform: [{ rotate: "-90deg" }] },
});
