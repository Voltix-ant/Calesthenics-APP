import { ArrowRight, ChevronsRight } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FireButton } from "@/components/ui/fire-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Neu } from "@/components/ui/neu";
import { Ring } from "@/components/ui/ring";
import { Stepper } from "@/components/ui/stepper";
import {
  body,
  colors,
  display,
  em,
  pressed,
  screenBottom,
  shadows,
} from "@/constants/theme";
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
  restRemaining,
  isLastStep,
  nextStep,
  onContinue,
  onGoToRecap,
}: {
  step: SessionStep;
  reviewValue: number;
  onChangeReviewValue: (value: number) => void;
  onAdjustReviewValue: (delta: number) => void;
  restRemaining: number;
  isLastStep: boolean;
  nextStep: SessionStep | null;
  onContinue: () => void;
  onGoToRecap: () => void;
}) {
  const insets = useSafeAreaInsets();
  const restTotal = step.restAfterSeconds;
  const resting = restRemaining > 0;

  return (
    <View
      style={[styles.main, { paddingBottom: screenBottom(44, insets.bottom) }]}
    >
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

      <View style={styles.restArea}>
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
                  progress={restTotal > 0 ? restRemaining / restTotal : 0}
                  opacity={0.9}
                />
                <Text style={styles.restTime}>
                  {formatDuration(restRemaining)}
                </Text>
              </Neu>
            ) : (
              <View style={[styles.restDial, styles.restDialDone]}>
                <GradientText style={styles.restTime}>0:00</GradientText>
              </View>
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
      </View>

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
        <FireButton
          label="Continuer"
          onPress={onContinue}
          iconAfter={
            <ArrowRight size={18} strokeWidth={2} color={colors.onFire} />
          }
          style={styles.bottomButton}
          labelStyle={styles.bottomLabel}
        />
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
  restDialDone: {
    // Valeur de départ de l'animation « halo » (repos terminé)
    boxShadow: `${shadows.in}, 0 0 20px 0 rgba(255,140,40,0.25)`,
  },
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
