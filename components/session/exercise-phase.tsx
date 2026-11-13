import { Check, Play, Square } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip } from "@/components/ui/chip";
import { FireButton } from "@/components/ui/fire-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Neu } from "@/components/ui/neu";
import { RecordBadge } from "@/components/ui/record-badge";
import { Ring } from "@/components/ui/ring";
import {
  body,
  colors,
  display,
  em,
  gradients,
  screenBottom,
  shadows,
} from "@/constants/theme";
import { usePulse } from "@/hooks/use-pulse";
import { useSecondCycle } from "@/hooks/use-second-cycle";
import type { SessionStep } from "@/types/session";
import { formatDuration } from "@/utils/format-duration";

const unitOf = (step: SessionStep) =>
  step.exerciseType === "reps" ? "reps" : "sec";

// ---- Éléments communs ----

function SetChip({ step }: { step: SessionStep }) {
  return (
    <Chip style={styles.setChip}>
      <Text style={styles.setChipText}>
        Série {step.setNumber} / {step.totalSets}
      </Text>
    </Chip>
  );
}

// « Objectif : 45 sec », valeur en gras
function ObjectiveLine({ step, size }: { step: SessionStep; size: number }) {
  return (
    <Text style={[styles.objectiveLine, { fontSize: size }]}>
      Objectif :{" "}
      <Text style={styles.objectiveStrong}>
        {step.targetValue} {unitOf(step)}
      </Text>
    </Text>
  );
}

// ---- État « prêt » : exercice en répétitions, ou en temps avant le chrono ----

function ReadyView({
  step,
  actionLabel,
  actionIcon,
  onAction,
}: {
  step: SessionStep;
  actionLabel: string;
  actionIcon: ReactNode;
  onAction: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.main,
        { paddingTop: 44, paddingBottom: screenBottom(48, insets.bottom) },
      ]}
    >
      <View style={[styles.titleGroup, { gap: 14 }]}>
        <SetChip step={step} />
        <Text style={[styles.name, styles.nameLarge]}>{step.exerciseName}</Text>
      </View>

      <View style={styles.objectiveGroup}>
        <Text style={styles.objectiveLabel}>Objectif :</Text>
        <View style={styles.bigValueRow}>
          <GradientText style={styles.bigValue} gradient={gradients.fireLive}>
            {step.targetValue.toString()}
          </GradientText>
          <Text style={styles.bigUnit}>{unitOf(step)}</Text>
        </View>
        <View style={styles.recordSpacer}>
          <RecordBadge value={step.record} unit={unitOf(step)} size="lg" />
        </View>
        {step.previousValue === null && (
          <Text style={styles.firstTime}>(première fois sur cette série)</Text>
        )}
      </View>

      <FireButton
        label={actionLabel}
        onPress={onAction}
        icon={<View style={styles.ctaIcon}>{actionIcon}</View>}
        style={styles.cta}
        labelStyle={styles.ctaLabel}
      />
    </View>
  );
}

// ---- Décompte 5 → 1 avant le chrono ----

const COUNTDOWN_SECONDS = 5;
// Courbe CSS « ease-out » de l'onde
const EASE_OUT = Easing.bezierFn(0, 0, 0.58, 1);

function CountdownView({
  step,
  startedAt,
}: {
  step: SessionStep;
  startedAt: number;
}) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { cycle, second } = useSecondCycle(startedAt, !reducedMotion);
  const digit = Math.max(1, COUNTDOWN_SECONDS - second);

  // Chiffre : arrive en 1,45× → 1× (0–0,2 s), rétrécit à 0,94× (jusqu'à
  // 0,8 s), puis s'efface en rétrécissant à 0,7× (jusqu'à 1 s).
  const digitStyle = useAnimatedStyle(() => {
    const t = cycle.value;
    return {
      opacity: interpolate(t, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { scale: interpolate(t, [0, 0.2, 0.8, 1], [1.45, 1, 0.94, 0.7]) },
      ],
    };
  });

  // Anneau : se vide entièrement en une seconde.
  const ringProgress = useDerivedValue(() => 1 - cycle.value);

  // Onde : un anneau orange qui s'élargit de 0 à 40 dp autour du disque en
  // s'effaçant. Dans la maquette c'est une ombre CSS avec « spread » ; ici,
  // un disque orange derrière le cadran, qu'on agrandit (même rendu).
  const beatStyle = useAnimatedStyle(() => {
    const t = EASE_OUT(cycle.value);
    return {
      opacity: 1 - t,
      transform: [{ scale: 1 + (t * 40) / 145 }],
    };
  });

  return (
    <View
      style={[
        styles.main,
        { paddingTop: 36, paddingBottom: screenBottom(72, insets.bottom) },
      ]}
    >
      <View style={[styles.titleGroup, { gap: 14 }]}>
        <SetChip step={step} />
        <Text style={[styles.name, styles.nameMedium]}>
          {step.exerciseName}
        </Text>
        <View style={styles.objectiveRow}>
          <ObjectiveLine step={step} size={15} />
          <RecordBadge value={step.record} unit={unitOf(step)} size="sm" />
        </View>
      </View>

      <View
        style={styles.countdownWrapper}
        accessibilityLiveRegion="assertive"
        accessibilityLabel={digit.toString()}
      >
        {!reducedMotion && (
          <Animated.View style={[styles.countdownBeat, beatStyle]} />
        )}
        <View style={styles.countdownDial}>
          <Ring
            id="countdown"
            size={290}
            radius={133}
            strokeWidth={6}
            trackColor="#191716"
            progress={reducedMotion ? 1 : ringProgress}
          />
          <Neu variant="in" style={styles.countdownInner}>
            <Animated.View style={reducedMotion ? undefined : digitStyle}>
              <GradientText style={styles.countdownDigit}>
                {digit.toString()}
              </GradientText>
            </Animated.View>
          </Neu>
        </View>
      </View>
    </View>
  );
}

// ---- Chrono qui monte (pas de limite) ----

function TimingView({
  step,
  startedAt,
  onFinish,
}: {
  step: SessionStep;
  /** Heure de départ du chrono (fin du décompte) */
  startedAt: number;
  onFinish: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  // Horloge de l'affichage, calée sur les images : les secondes affichées
  // durent toutes exactement une seconde. `cycle` fait tourner le point.
  const { cycle, second } = useSecondCycle(startedAt, !reducedMotion);
  const reached = second >= step.targetValue;
  const targetMs = step.targetValue * 1000;

  // Anneau : recalculé à chaque image à partir de l'heure de départ, il
  // avance donc en continu (et non par crans d'une seconde) vers l'objectif.
  const progress = useSharedValue(0);
  useFrameCallback(() => {
    "worklet";
    progress.value = targetMs > 0 ? (Date.now() - startedAt) / targetMs : 1;
  }, !reducedMotion);
  const staticProgress = step.targetValue > 0 ? second / step.targetValue : 1;

  // Point clair : un tour complet par seconde, en partant du haut à chaque
  // changement de chiffre.
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${cycle.value * 360}deg` }],
  }));

  // Halo une fois l'objectif atteint : pulse entre une lueur douce et une
  // lueur forte. Une ombre ne s'anime pas directement : on superpose les deux
  // lueurs et on fait varier leur opacité en sens inverse.
  const pulse = usePulse(reached && !reducedMotion);
  const softHaloStyle = useAnimatedStyle(() => ({ opacity: 1 - pulse.value }));
  const strongHaloStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      style={[
        styles.main,
        { paddingTop: 32, paddingBottom: screenBottom(48, insets.bottom) },
      ]}
    >
      <View style={[styles.titleGroup, { gap: 12 }]}>
        <SetChip step={step} />
        <Text style={[styles.name, styles.nameMedium]}>
          {step.exerciseName}
        </Text>
      </View>

      <View style={styles.timerDial}>
        {reached && (
          <>
            <Animated.View style={[styles.timerHalo, softHaloStyle]} />
            <Animated.View
              style={[
                styles.timerHalo,
                styles.timerHaloStrong,
                strongHaloStyle,
              ]}
            />
          </>
        )}
        <Ring
          id="timer"
          size={300}
          radius={128}
          strokeWidth={16}
          trackColor="#191716"
          progress={reducedMotion ? staticProgress : progress}
          glow
        />
        {!reducedMotion && (
          <Animated.View style={[styles.timerDotOrbit, dotStyle]}>
            <View style={styles.timerDot} />
          </Animated.View>
        )}
        <View style={styles.timerInner}>
          <GradientText style={styles.timerValue} gradient={gradients.fireLive}>
            {formatDuration(second)}
          </GradientText>
          <ObjectiveLine step={step} size={14} />
        </View>
      </View>

      <View style={styles.timerBottom}>
        <RecordBadge value={step.record} unit={unitOf(step)} size="md" />
        <FireButton
          label="Terminé"
          onPress={onFinish}
          icon={
            <Square
              size={18}
              strokeWidth={2}
              color={colors.onFire}
              fill={colors.onFire}
            />
          }
          style={styles.finishButton}
          labelStyle={styles.finishLabel}
        />
      </View>
    </View>
  );
}

// ---- Phase Exercice : choisit l'état à afficher ----

export function ExercisePhaseView({
  step,
  exercisePhase,
  countdownStartedAt,
  onStartTimer,
  onFinishReps,
  onFinishTimer,
}: {
  step: SessionStep;
  exercisePhase: "idle" | "countdown" | "timing";
  /** Heure de début du décompte (null tant qu'il n'est pas lancé) */
  countdownStartedAt: number | null;
  onStartTimer: () => void;
  onFinishReps: () => void;
  onFinishTimer: () => void;
}) {
  if (step.exerciseType === "reps") {
    return (
      <ReadyView
        step={step}
        actionLabel="Série terminée"
        actionIcon={<Check size={26} strokeWidth={2.5} color={colors.onFire} />}
        onAction={onFinishReps}
      />
    );
  }

  if (exercisePhase === "countdown" && countdownStartedAt !== null) {
    return <CountdownView step={step} startedAt={countdownStartedAt} />;
  }

  if (exercisePhase === "timing" && countdownStartedAt !== null) {
    return (
      <TimingView
        step={step}
        startedAt={countdownStartedAt + COUNTDOWN_SECONDS * 1000}
        onFinish={onFinishTimer}
      />
    );
  }

  return (
    <ReadyView
      step={step}
      actionLabel="Lancer le chrono"
      actionIcon={
        <Play
          size={24}
          strokeWidth={2}
          color={colors.onFire}
          fill={colors.onFire}
        />
      }
      onAction={onStartTimer}
    />
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  titleGroup: { alignItems: "center" },
  setChip: { height: 34, paddingHorizontal: 16 },
  setChipText: {
    ...display(700),
    fontSize: 14,
    letterSpacing: em(0.06, 14),
    color: colors.textSecondary,
  },
  name: { ...display(700), textAlign: "center" },
  nameLarge: { fontSize: 54, lineHeight: 54, letterSpacing: em(-0.02, 54) },
  nameMedium: { fontSize: 46, lineHeight: 46, letterSpacing: em(-0.02, 46) },

  // État « prêt »
  objectiveGroup: { alignItems: "center", gap: 10 },
  objectiveLabel: {
    ...body(600),
    fontSize: 13,
    letterSpacing: em(0.14, 13),
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  bigValueRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  bigValue: { ...display(700), fontSize: 104, lineHeight: 104 * 0.95 },
  bigUnit: { ...display(700), fontSize: 22, color: colors.textSecondary },
  recordSpacer: { marginTop: 14 },
  firstTime: { ...body(400), fontSize: 14, color: colors.textTertiary },
  cta: {
    alignSelf: "stretch",
    height: 92,
    borderRadius: 28,
    gap: 14,
    // Lueur au repos de l'animation « breathe » des maquettes
    boxShadow: `${shadows.upSm}, 0 12px 26px -12px rgba(255,105,35,0.45)`,
  },
  ctaIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(26,15,10,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: { fontSize: 21 },

  // Décompte
  objectiveRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  objectiveLine: { ...body(400), color: colors.textSecondary },
  objectiveStrong: { ...body(700), color: colors.text },
  countdownWrapper: {
    width: 290,
    height: 290,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownBeat: {
    position: "absolute",
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: "rgba(255,120,40,0.5)",
  },
  countdownDial: {
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundImage: gradients.dial,
    boxShadow: shadows.up,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownInner: {
    width: 236,
    height: 236,
    borderRadius: 118,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownDigit: { ...display(700), fontSize: 168, lineHeight: 168 },

  // Chrono
  timerDial: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundImage: gradients.dial,
    boxShadow: shadows.up,
    alignItems: "center",
    justifyContent: "center",
  },
  timerHalo: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 150,
    // Lueur douce de l'animation « halo » (objectif atteint)
    boxShadow: "0 0 30px 2px rgba(255,140,40,0.35)",
  },
  // Le point tourne avec une vue carrée de la taille du cadran, pivotée sur
  // son centre ; le point est posé en haut, sur l'anneau (rayon 128).
  timerDotOrbit: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 300,
    height: 300,
  },
  timerDot: {
    position: "absolute",
    top: 150 - 128 - 4,
    left: 150 - 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFE7A8",
  },
  timerHaloStrong: {
    // Lueur forte, au milieu de l'animation
    boxShadow: "0 0 60px 10px rgba(255,140,40,0.7)",
  },
  timerInner: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.background,
    boxShadow: shadows.in,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  timerValue: { ...display(700), fontSize: 72, lineHeight: 72 },
  timerBottom: { alignSelf: "stretch", alignItems: "center", gap: 22 },
  finishButton: {
    alignSelf: "stretch",
    height: 66,
    borderRadius: 22,
    gap: 10,
  },
  finishLabel: { fontSize: 18 },
});
