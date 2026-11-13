import { ArrowRight, ChevronsRight } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FireButton } from "@/components/ui/fire-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Neu } from "@/components/ui/neu";
import { Ring } from "@/components/ui/ring";
import { Stepper } from "@/components/ui/stepper";
import { pop, rise } from "@/constants/animations";
import {
  body,
  colors,
  display,
  em,
  pressed,
  screenBottom,
} from "@/constants/theme";
import { usePulse } from "@/hooks/use-pulse";
import { useSecondsUntil } from "@/hooks/use-second-cycle";
import type { SessionStep } from "@/types/session";
import { formatDuration } from "@/utils/format-duration";

const unitOf = (step: SessionStep) =>
  step.exerciseType === "reps" ? "reps" : "sec";

// Phase entre deux séries : réglage de la valeur réalisée, puis repos (ou fin
// de séance après la dernière série).
export function ReviewPhaseView({
  step,
  reviewValue,
  onChangeReviewValue,
  onAdjustReviewValue,
  restEndsAt,
  isLastStep,
  nextStep,
  onContinue,
  onGoToRecap,
}: {
  step: SessionStep;
  reviewValue: number;
  onChangeReviewValue: (value: number) => void;
  onAdjustReviewValue: (delta: number) => void;
  /** Heure de fin du repos (null : pas de repos) */
  restEndsAt: number | null;
  isLastStep: boolean;
  nextStep: SessionStep | null;
  onContinue: () => void;
  onGoToRecap: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const restTotalMs = step.restAfterSeconds * 1000;
  const endsAt = restEndsAt ?? 0;

  // Compte à rebours affiché, calé sur les images (secondes régulières)
  const restRemaining = useSecondsUntil(endsAt);
  const resting = restRemaining > 0;

  // Anneau : se vide en continu, recalculé à chaque image
  const ringProgress = useSharedValue(1);
  useFrameCallback(() => {
    "worklet";
    ringProgress.value =
      restTotalMs > 0 ? (endsAt - Date.now()) / restTotalMs : 0;
  }, resting && !reducedMotion);

  // Halo de fin de repos : pulse entre une lueur douce et une lueur forte
  const pulse = usePulse(!resting && !isLastStep && !reducedMotion);
  const softHaloStyle = useAnimatedStyle(() => ({ opacity: 1 - pulse.value }));
  const strongHaloStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const enter = (animation: ReturnType<typeof rise>) =>
    reducedMotion ? undefined : animation;

  return (
    <View
      style={[styles.main, { paddingBottom: screenBottom(44, insets.bottom) }]}
    >
      <Animated.View entering={enter(rise(0))}>
        <Neu variant="up" surface="card" style={styles.resultCard}>
          <Text style={styles.resultTitle}>
            Résultat —{" "}
            <Text style={styles.strong}>
              {step.exerciseName}, série {step.setNumber}
            </Text>
          </Text>
          <Stepper
            value={reviewValue}
            onChange={onChangeReviewValue}
            onAdjust={onAdjustReviewValue}
          />
          <Text style={styles.resultUnit}>{unitOf(step)}</Text>
        </Neu>
      </Animated.View>

      <Animated.View style={styles.restArea} entering={enter(rise(120))}>
        {isLastStep ? (
          <GradientText style={styles.doneText}>Séance terminée !</GradientText>
        ) : (
          <>
            <Text style={styles.restLabel}>Repos</Text>
            {resting ? (
              <Neu variant="in" style={styles.restDial}>
                <Ring
                  id="rest"
                  size={224}
                  radius={96}
                  strokeWidth={8}
                  progress={
                    reducedMotion
                      ? restRemaining / Math.max(1, step.restAfterSeconds)
                      : ringProgress
                  }
                  opacity={0.9}
                />
                <Text style={styles.restTime}>
                  {formatDuration(restRemaining)}
                </Text>
              </Neu>
            ) : (
              <Neu variant="in" style={styles.restDial}>
                {/* Une ombre ne s'anime pas directement : deux lueurs
                    superposées dont les opacités varient en sens inverse */}
                <Animated.View
                  style={[styles.halo, styles.haloSoft, softHaloStyle]}
                />
                <Animated.View
                  style={[styles.halo, styles.haloStrong, strongHaloStyle]}
                />
                <Animated.View entering={enter(pop())}>
                  <GradientText style={styles.restTime}>0:00</GradientText>
                </Animated.View>
              </Neu>
            )}
            {nextStep && (
              <Text style={styles.nextUp}>
                À suivre :{" "}
                <Text style={styles.strong}>
                  {nextStep.exerciseName} — série {nextStep.setNumber}/
                  {nextStep.totalSets} ({nextStep.targetValue}{" "}
                  {unitOf(nextStep)})
                </Text>
              </Text>
            )}
          </>
        )}
      </Animated.View>

      {isLastStep ? (
        <FireButton
          label="Passer au récap"
          onPress={onGoToRecap}
          iconAfter={
            <ArrowRight size={18} strokeWidth={2} color={colors.onFire} />
          }
          style={styles.bottomButton}
          labelStyle={styles.bottomLabel}
        />
      ) : resting ? (
        <Neu
          variant="up-sm"
          surface="flat"
          style={[styles.bottomButton, styles.skipButton]}
          pressedStyle={pressed}
          onPress={onContinue}
        >
          <Text style={styles.skipLabel}>Passer</Text>
          <ChevronsRight size={18} strokeWidth={2} color={colors.fireMid} />
        </Neu>
      ) : (
        <Animated.View entering={enter(pop())}>
          <FireButton
            label="Continuer"
            onPress={onContinue}
            iconAfter={
              <ArrowRight size={18} strokeWidth={2} color={colors.onFire} />
            }
            style={styles.bottomButton}
            labelStyle={styles.bottomLabel}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    paddingTop: 28,
    paddingHorizontal: 24,
    gap: 26,
  },
  resultCard: {
    borderRadius: 26,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 20,
    alignItems: "center",
    gap: 16,
  },
  resultTitle: {
    ...body(400),
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
  },
  strong: { ...body(600), color: colors.text },
  resultUnit: { ...body(600), fontSize: 15, color: colors.textSecondary },
  restArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  restLabel: {
    ...body(600),
    fontSize: 13,
    letterSpacing: em(0.14, 13),
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  restDial: {
    width: 224,
    height: 224,
    borderRadius: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 112,
  },
  // Lueurs de début/milieu de l'animation « halo » (repos terminé)
  haloSoft: { boxShadow: "0 0 20px 0 rgba(255,140,40,0.25)" },
  haloStrong: { boxShadow: "0 0 56px 8px rgba(255,140,40,0.6)" },
  restTime: { ...display(700), fontSize: 60, lineHeight: 60 },
  nextUp: {
    ...body(400),
    marginTop: 6,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
  },
  doneText: { ...display(700), fontSize: 34, textAlign: "center" },
  bottomButton: { height: 60, borderRadius: 20, gap: 10 },
  bottomLabel: { fontSize: 17 },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  skipLabel: { ...body(600), fontSize: 17 },
});
