import { KeyboardAvoidingContainer } from "@/components/keyboard-avoiding-container";
import { ExercisePhaseView } from "@/components/session/exercise-phase";
import { ReviewPhaseView } from "@/components/session/review-phase";
import { SessionRecap } from "@/components/session/session-recap";
import { SessionTopBar } from "@/components/session/session-top-bar";
import { body, colors, gradients } from "@/constants/theme";
import { useCountdownBeeps } from "@/hooks/use-countdown-beeps";
import type { SessionStep } from "@/types/session";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useKeepAwake } from "expo-keep-awake";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import { Alert, AppState, StyleSheet, Text, View } from "react-native";

// ---- Types bruts issus de la BDD ----

type BlockRow = {
  block_id: number;
  order_index: number;
  type: "exercise" | "rest";
  rest_between_sets: number | null;
  rest_seconds: number | null;
  exercise_id: number | null;
  exercise_name: string | null;
  exercise_type: "reps" | "time" | null;
};

type SetRow = {
  id: number;
  block_id: number;
  set_number: number;
  target_value: number;
};

type PerfRow = {
  exercise_id: number;
  set_number: number;
  actual_value: number;
};

const COUNTDOWN_MS = 5000; // décompte avant le chrono d'un exercice "temps"

// ---- Écran principal : charge l'entrainement, puis lance la séance ----
// Découpé en deux composants pour que <SessionRunner> ne soit affiché qu'une
// fois les séries chargées : à l'intérieur, l'étape courante existe toujours.
// (Le React Compiler lit les valeurs utilisées par les fonctions pendant le
// rendu pour les mémoïser : un `step` undefined pendant le chargement plantait.)

export default function SessionScreen() {
  // Garde l'écran allumé pendant toute la séance
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = parseInt(id, 10);
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<SessionStep[]>([]);

  // ---- Chargement + aplatissement de l'entrainement ----
  useEffect(() => {
    const load = async () => {
      const blockRows = await db.getAllAsync<BlockRow>(
        `SELECT
           wb.id AS block_id, wb.order_index, wb.type,
           wb.rest_between_sets, wb.rest_seconds,
           e.id AS exercise_id, e.name AS exercise_name, e.type AS exercise_type
         FROM workout_blocks wb
         LEFT JOIN exercises e ON wb.exercise_id = e.id
         WHERE wb.workout_id = ?
         ORDER BY wb.order_index`,
        workoutId,
      );

      const setRows = await db.getAllAsync<SetRow>(
        `SELECT ws.id, ws.block_id, ws.set_number, ws.target_value
         FROM workout_sets ws
         JOIN workout_blocks wb ON ws.block_id = wb.id
         WHERE wb.workout_id = ?
         ORDER BY ws.block_id, ws.set_number`,
        workoutId,
      );
      const setsByBlock: Record<number, SetRow[]> = {};
      for (const set of setRows) {
        if (!setsByBlock[set.block_id]) setsByBlock[set.block_id] = [];
        setsByBlock[set.block_id].push(set);
      }

      // Historique : dernière valeur connue + record, par exercice+numéro de série
      const perfRows = await db.getAllAsync<PerfRow>(
        `SELECT sp.exercise_id, sp.set_number, sp.actual_value
         FROM session_performances sp
         JOIN sessions s ON sp.session_id = s.id
         WHERE s.workout_id = ?
         ORDER BY s.performed_at DESC`,
        workoutId,
      );
      const lastValueMap = new Map<string, number>();
      const recordMap = new Map<string, number>();
      for (const row of perfRows) {
        const key = `${row.exercise_id}-${row.set_number}`;
        if (!lastValueMap.has(key)) lastValueMap.set(key, row.actual_value); // premier vu = plus récent (tri DESC)
        const currentRecord = recordMap.get(key);
        if (currentRecord === undefined || row.actual_value > currentRecord) {
          recordMap.set(key, row.actual_value);
        }
      }

      // Aplatissement : on ne garde que les blocs "exercice", chacun avec son repos-après calculé
      const flatSteps: SessionStep[] = [];
      for (let b = 0; b < blockRows.length; b++) {
        const block = blockRows[b];
        if (block.type !== "exercise") continue;

        const sets = setsByBlock[block.block_id] ?? [];
        for (let i = 0; i < sets.length; i++) {
          const isLastSetOfBlock = i === sets.length - 1;
          let restAfter = 0;
          if (!isLastSetOfBlock) {
            restAfter = block.rest_between_sets ?? 0;
          } else {
            const nextBlock = blockRows[b + 1];
            if (nextBlock && nextBlock.type === "rest") {
              restAfter = nextBlock.rest_seconds ?? 0;
            }
          }

          const key = `${block.exercise_id}-${i + 1}`;
          flatSteps.push({
            exerciseId: block.exercise_id!,
            exerciseName: block.exercise_name!,
            exerciseType: block.exercise_type!,
            setNumber: i + 1,
            totalSets: sets.length,
            targetValue: lastValueMap.get(key) ?? sets[i].target_value,
            previousValue: lastValueMap.get(key) ?? null,
            record: recordMap.get(key) ?? null,
            restAfterSeconds: restAfter,
          });
        }
      }

      setSteps(flatSteps);
      setLoading(false);
    };

    load();
  }, [db, workoutId]);

  if (loading || steps.length === 0) {
    return (
      <View style={styles.centerContent}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.message}>
          {loading ? "Chargement..." : "Aucun exercice dans cet entrainement."}
        </Text>
      </View>
    );
  }

  return <SessionRunner workoutId={workoutId} steps={steps} />;
}

// ---- La séance elle-même (steps est garanti non vide) ----

function SessionRunner({
  workoutId,
  steps,
}: {
  workoutId: number;
  steps: SessionStep[];
}) {
  const router = useRouter();
  const db = useSQLiteContext();

  // ---- State de la séance ----
  const [currentIndex, setCurrentIndex] = useState(0);
  const [screenPhase, setScreenPhase] = useState<
    "exercise" | "review" | "recap"
  >("exercise");
  const [isSaving, setIsSaving] = useState(false);
  const [performedValues, setPerformedValues] = useState<
    Record<number, number>
  >({});
  const [reviewValue, setReviewValue] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ---- Chronos : basés sur l'horloge du téléphone ----
  // Au lieu de compter les secondes qui passent (ce qui s'arrête quand l'appli
  // est en arrière-plan), on mémorise l'heure de début de chaque chrono et on
  // calcule le temps écoulé à partir de l'heure actuelle ("now").
  //
  // `useState(() => Date.now())` : la fonction n'est appelée qu'au tout premier
  // rendu (initialisation "paresseuse"). Écrire `useState(Date.now())` appellerait
  // Date.now() à chaque rendu pour rien, ce que le React Compiler refuse.
  const [now, setNow] = useState(() => Date.now());
  const [sessionStartedAt] = useState(() => Date.now());
  const [countdownStartedAt, setCountdownStartedAt] = useState<number | null>(
    null,
  );
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);

  // Valeurs dérivées : recalculées à chaque rendu, pas stockées dans le state.
  // La phase de l'exercice "temps" se déduit de l'heure de début du décompte :
  // rien lancé -> "idle", moins de 5 s écoulées -> "countdown", sinon -> "timing".
  // Le chrono démarre donc exactement 5 s après le début du décompte.
  const sessionElapsedSeconds = Math.floor((now - sessionStartedAt) / 1000);
  const exercisePhase: "idle" | "countdown" | "timing" =
    countdownStartedAt === null
      ? "idle"
      : now - countdownStartedAt < COUNTDOWN_MS
        ? "countdown"
        : "timing";
  const timingStartedAt =
    countdownStartedAt === null ? null : countdownStartedAt + COUNTDOWN_MS;
  const countdownValue =
    countdownStartedAt === null
      ? 5
      : Math.max(0, 5 - Math.floor((now - countdownStartedAt) / 1000));
  const elapsedSeconds =
    exercisePhase === "timing" && timingStartedAt !== null
      ? Math.floor((now - timingStartedAt) / 1000)
      : 0;
  const restRemaining =
    restEndsAt === null ? 0 : Math.max(0, Math.ceil((restEndsAt - now) / 1000));

  // ---- Étape courante (toujours définie : steps est non vide et on ne
  // dépasse jamais la dernière étape) ----
  const step = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;

  // ---- Sons ----
  // Bips du décompte : un par seconde à partir de 5, puis un bip différent à 0
  useCountdownBeeps({
    countdownStartedAt,
    countdownMs: COUNTDOWN_MS,
    enabled: soundEnabled,
  });
  const targetReachedPlayer = useAudioPlayer(
    require("../../assets/sounds/target-reached.mp3"),
  );
  const restEndPlayer = useAudioPlayer(
    require("../../assets/sounds/rest-end.wav"),
  );

  // ---- Mode audio : les bips se superposent à la musique sans la couper ----
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    });
  }, []);

  // ---- Horloge commune : met à jour "now" 4 fois par seconde ----
  // + resynchronisation immédiate quand on revient sur l'appli
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  // ---- Bips : chacun ne doit sonner qu'une fois par série ----
  // Un ref (contrairement au state) garde une valeur entre les rendus sans en
  // provoquer de nouveau : parfait pour un simple drapeau "déjà joué".
  // Grâce à lui, les effets ci-dessous peuvent lister toutes leurs dépendances
  // sans risquer de rejouer le son (ex. si on coupe/remet le son au mauvais moment).
  const targetBeepPlayedRef = useRef(false);
  const restBeepPlayedRef = useRef(false);

  // ---- Son : objectif atteint pendant un exercice "temps" ----
  // ">=" plutôt que "===" : si l'appli était en arrière-plan au moment exact
  // où l'objectif a été atteint, le bip sonne au retour au lieu d'être perdu.
  useEffect(() => {
    if (exercisePhase !== "timing") return;
    if (targetBeepPlayedRef.current) return;
    if (elapsedSeconds >= step.targetValue) {
      targetBeepPlayedRef.current = true;
      if (soundEnabled) {
        targetReachedPlayer.seekTo(0);
        targetReachedPlayer.play();
      }
    }
  }, [elapsedSeconds, exercisePhase, step, soundEnabled, targetReachedPlayer]);

  // ---- Son : fin du repos ----
  useEffect(() => {
    if (screenPhase !== "review" || isLastStep) return;
    if (restBeepPlayedRef.current) return;
    if (step.restAfterSeconds > 0 && restRemaining === 0) {
      restBeepPlayedRef.current = true;
      if (soundEnabled) {
        restEndPlayer.seekTo(0);
        restEndPlayer.play();
      }
    }
  }, [
    restRemaining,
    screenPhase,
    isLastStep,
    step,
    soundEnabled,
    restEndPlayer,
  ]);

  // ---- Actions ----

  const handleStartTimer = () => {
    targetBeepPlayedRef.current = false;
    const t = Date.now();
    setNow(t);
    setCountdownStartedAt(t);
  };

  const enterReview = (achievedValue: number) => {
    const t = Date.now();
    setNow(t);
    restBeepPlayedRef.current = false;
    setPerformedValues((prev) => ({ ...prev, [currentIndex]: achievedValue }));
    setReviewValue(achievedValue);
    // Arrête le chrono : sans heure de départ, la phase redevient "idle" et le
    // bip "objectif atteint" ne peut plus sonner pendant le repos
    setCountdownStartedAt(null);
    setRestEndsAt(t + step.restAfterSeconds * 1000);
    setScreenPhase("review");
  };

  const handleFinishReps = () => enterReview(step.targetValue);

  const handleFinishTimer = () => {
    // On recalcule avec l'heure exacte plutôt que d'utiliser "elapsedSeconds",
    // qui peut avoir jusqu'à 250 ms de retard
    const seconds =
      timingStartedAt !== null
        ? Math.floor((Date.now() - timingStartedAt) / 1000)
        : 0;
    enterReview(seconds);
  };

  const adjustReviewValue = (delta: number) => {
    setReviewValue((v) => Math.max(0, v + delta));
  };

  const proceedToNext = () => {
    setPerformedValues((prev) => ({ ...prev, [currentIndex]: reviewValue }));
    setCurrentIndex((i) => i + 1);
    setScreenPhase("exercise");
    setCountdownStartedAt(null);
    setRestEndsAt(null);
  };

  const saveSession = async (finalValues: Record<number, number>) => {
    await db.withTransactionAsync(async () => {
      const sessionResult = await db.runAsync(
        "INSERT INTO sessions (workout_id) VALUES (?)",
        workoutId,
      );
      const sessionId = sessionResult.lastInsertRowId;

      for (let i = 0; i < steps.length; i++) {
        const value = finalValues[i];
        if (value === undefined) continue;
        await db.runAsync(
          "INSERT INTO session_performances (session_id, exercise_id, set_number, actual_value) VALUES (?, ?, ?, ?)",
          sessionId,
          steps[i].exerciseId,
          steps[i].setNumber,
          value,
        );
      }
    });
  };

  // Après la dernière série : on valide sa valeur et on affiche le récap
  const goToRecap = () => {
    setPerformedValues((prev) => ({ ...prev, [currentIndex]: reviewValue }));
    setRestEndsAt(null);
    setScreenPhase("recap");
  };

  const changeRecapValue = (stepIndex: number, value: number) => {
    setPerformedValues((prev) => ({
      ...prev,
      [stepIndex]: Math.max(0, value),
    }));
  };

  const handleFinishSession = async () => {
    if (isSaving) return; // évite un double enregistrement si on appuie deux fois
    setIsSaving(true);
    try {
      await saveSession(performedValues);
    } catch {
      setIsSaving(false);
      Alert.alert("Erreur", "La séance n'a pas pu être enregistrée.");
      return;
    }
    Alert.alert("Séance enregistrée !", "Bien joué 💪", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  const handleAbort = () => {
    const hasAnyProgress = currentIndex > 0 || screenPhase !== "exercise";

    if (!hasAnyProgress) {
      router.back();
      return;
    }

    Alert.alert(
      "Arrêter l'entrainement ?",
      "Les séries restantes seront enregistrées avec les valeurs par défaut (dernière performance ou objectif si première fois).",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Arrêter et enregistrer",
          style: "destructive",
          onPress: async () => {
            const finalValues: Record<number, number> = {};
            for (let i = 0; i < steps.length; i++) {
              if (performedValues[i] !== undefined) {
                finalValues[i] = performedValues[i];
              } else if (i === currentIndex && screenPhase === "review") {
                finalValues[i] = reviewValue;
              } else {
                finalValues[i] = steps[i].targetValue;
              }
            }
            await saveSession(finalValues);
            router.back();
          },
        },
      ],
    );
  };

  // ---- Rendu ----

  const completedSteps =
    screenPhase === "exercise" ? currentIndex : currentIndex + 1;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  // Lueur orangée en bas de l'écran pendant l'exercice, recentrée derrière
  // le décompte ; aucun fond particulier pendant le repos et le récap.
  const backgroundGlow =
    screenPhase !== "exercise"
      ? undefined
      : exercisePhase === "countdown" && step.exerciseType === "time"
        ? gradients.countdownGlow
        : gradients.sessionGlow;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundImage: backgroundGlow }]}>
        <SessionTopBar
          elapsedSeconds={sessionElapsedSeconds}
          progressPercent={progressPercent}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((v) => !v)}
          onAbort={handleAbort}
        />

        <KeyboardAvoidingContainer>
          {screenPhase === "exercise" && (
            <ExercisePhaseView
              step={step}
              exercisePhase={exercisePhase}
              countdownValue={countdownValue}
              elapsedSeconds={elapsedSeconds}
              onStartTimer={handleStartTimer}
              onFinishReps={handleFinishReps}
              onFinishTimer={handleFinishTimer}
            />
          )}
          {screenPhase === "review" && (
            <ReviewPhaseView
              step={step}
              reviewValue={reviewValue}
              onChangeReviewValue={setReviewValue}
              onAdjustReviewValue={adjustReviewValue}
              restRemaining={restRemaining}
              isLastStep={isLastStep}
              nextStep={isLastStep ? null : steps[currentIndex + 1]}
              onContinue={proceedToNext}
              onGoToRecap={goToRecap}
            />
          )}
          {screenPhase === "recap" && (
            <SessionRecap
              steps={steps}
              values={performedValues}
              onChangeValue={changeRecapValue}
              onSave={handleFinishSession}
              isSaving={isSaving}
            />
          )}
        </KeyboardAvoidingContainer>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  message: {
    ...body(400),
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
