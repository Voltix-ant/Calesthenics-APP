import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useKeepAwake } from "expo-keep-awake";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

// ---- Le format "aplati" utilisé pendant toute la séance ----

type SessionStep = {
  exerciseId: number;
  exerciseName: string;
  exerciseType: "reps" | "time";
  setNumber: number;
  totalSets: number;
  targetValue: number;
  isFirstTime: boolean;
  record: number | null;
  restAfterSeconds: number;
};

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// ---- Sous-composant : écran "exercice en cours" ----

function ExercisePhaseView({
  step,
  exercisePhase,
  countdownValue,
  elapsedSeconds,
  onStartTimer,
  onFinishReps,
  onFinishTimer,
}: {
  step: SessionStep;
  exercisePhase: "idle" | "countdown" | "timing";
  countdownValue: number;
  elapsedSeconds: number;
  onStartTimer: () => void;
  onFinishReps: () => void;
  onFinishTimer: () => void;
}) {
  return (
    <View style={styles.centerContent}>
      <Text style={styles.stepIndicator}>
        Série {step.setNumber} / {step.totalSets}
      </Text>
      <Text style={styles.exerciseName}>{step.exerciseName}</Text>

      <Text style={styles.objective}>
        Objectif : {step.targetValue}{" "}
        {step.exerciseType === "reps" ? "reps" : "sec"}
      </Text>
      {step.isFirstTime && (
        <Text style={styles.hint}>(première fois sur cette série)</Text>
      )}

      <Text style={styles.record}>
        Record sur cette série :{" "}
        {step.record !== null
          ? `${step.record} ${step.exerciseType === "reps" ? "reps" : "sec"}`
          : "—"}
      </Text>

      {step.exerciseType === "reps" ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onFinishReps}>
          <Text style={styles.primaryButtonText}>Série terminée</Text>
        </TouchableOpacity>
      ) : (
        <>
          {exercisePhase === "idle" && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onStartTimer}
            >
              <Text style={styles.primaryButtonText}>Lancer le chrono</Text>
            </TouchableOpacity>
          )}
          {exercisePhase === "countdown" && (
            <Text style={styles.countdown}>{countdownValue}</Text>
          )}
          {exercisePhase === "timing" && (
            <>
              <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onFinishTimer}
              >
                <Text style={styles.primaryButtonText}>Terminé</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  );
}

// ---- Sous-composant : bouton +/− qui s'auto-répète quand on le maintient ----

const HOLD_DELAY_MS = 400; // délai avant le début de la répétition
const HOLD_INTERVAL_MS = 100; // vitesse de la répétition (plus petit = plus rapide)

function HoldableStepperButton({
  label,
  delta,
  onAdjust,
}: {
  label: string;
  delta: number;
  onAdjust: (delta: number) => void;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    stop(); // sécurité : on repart toujours de zéro
    onAdjust(delta); // 1er appui : on change tout de suite de 1
    timeoutRef.current = setTimeout(() => {
      // si le doigt reste appuyé, on répète
      intervalRef.current = setInterval(
        () => onAdjust(delta),
        HOLD_INTERVAL_MS,
      );
    }, HOLD_DELAY_MS);
  };

  // Nettoyage si l'écran disparaît pendant qu'on appuie
  useEffect(() => stop, []);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.stepperButton,
        pressed && { opacity: 0.5 },
      ]}
      onPressIn={start}
      onPressOut={stop}
    >
      <Text style={styles.stepperButtonText}>{label}</Text>
    </Pressable>
  );
}

// ---- Sous-composant : écran "revue du résultat + repos" (ou fin de séance) ----

function ReviewPhaseView({
  step,
  reviewValue,
  onChangeReviewValue,
  onAdjustReviewValue,
  restRemaining,
  isLastStep,
  nextStep,
  onContinue,
  onFinishSession,
}: {
  step: SessionStep;
  reviewValue: number;
  onChangeReviewValue: (value: number) => void;
  onAdjustReviewValue: (delta: number) => void;
  restRemaining: number;
  isLastStep: boolean;
  nextStep: SessionStep | null;
  onContinue: () => void;
  onFinishSession: () => void;
}) {
  const unit = step.exerciseType === "reps" ? "reps" : "sec";

  return (
    <View style={styles.centerContent}>
      <Text style={styles.stepIndicator}>
        Résultat — {step.exerciseName}, série {step.setNumber}
      </Text>

      <View style={styles.stepperRow}>
        <HoldableStepperButton
          label="-"
          delta={-1}
          onAdjust={onAdjustReviewValue}
        />
        <TextInput
          style={styles.stepperInput}
          keyboardType="number-pad"
          value={reviewValue.toString()}
          onChangeText={(text) => onChangeReviewValue(parseInt(text) || 0)}
        />
        <HoldableStepperButton
          label="+"
          delta={1}
          onAdjust={onAdjustReviewValue}
        />
        <Text style={styles.stepperUnit}>{unit}</Text>
      </View>

      {isLastStep ? (
        <>
          <Text style={styles.doneText}>Séance terminée !</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onFinishSession}
          >
            <Text style={styles.primaryButtonText}>
              Enregistrer et terminer
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.restLabel}>Repos</Text>
          <Text style={styles.timer}>{formatDuration(restRemaining)}</Text>

          {nextStep && (
            <Text style={styles.nextUp}>
              À suivre : {nextStep.exerciseName} — série {nextStep.setNumber}/
              {nextStep.totalSets} ({nextStep.targetValue}{" "}
              {nextStep.exerciseType === "reps" ? "reps" : "sec"})
            </Text>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
            <Text style={styles.primaryButtonText}>
              {restRemaining > 0 ? "Passer" : "Continuer"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ---- Sous-composant : barre du haut (chrono global, son, progression, croix) ----

function SessionTopBar({
  elapsedSeconds,
  progressPercent,
  soundEnabled,
  onToggleSound,
  onAbort,
  topInset,
}: {
  elapsedSeconds: number;
  progressPercent: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onAbort: () => void;
  topInset: number;
}) {
  return (
    <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
      <View style={styles.topBarRow}>
        <Text style={styles.topBarTimer}>{formatDuration(elapsedSeconds)}</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={onToggleSound} hitSlop={12}>
            <IconSymbol
              size={22}
              name={soundEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill"}
              color="#000"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onAbort} hitSlop={12}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>
        <Text style={styles.progressLabel}>{progressPercent}%</Text>
      </View>
    </View>
  );
}

// ---- Écran principal ----

export default function SessionScreen() {
  // Garde l'écran allumé pendant toute la séance
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = parseInt(id, 10);
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  // ---- State de la séance ----
  const [loading, setLoading] = useState(true);
  const [workoutName, setWorkoutName] = useState("");
  const [steps, setSteps] = useState<SessionStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [screenPhase, setScreenPhase] = useState<"exercise" | "review">(
    "exercise",
  );
  const [performedValues, setPerformedValues] = useState<
    Record<number, number>
  >({});
  const [exercisePhase, setExercisePhase] = useState<
    "idle" | "countdown" | "timing"
  >("idle");
  const [reviewValue, setReviewValue] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ---- Chronos : basés sur l'horloge du téléphone ----
  // Au lieu de compter les secondes qui passent (ce qui s'arrête quand l'appli
  // est en arrière-plan), on mémorise l'heure de début de chaque chrono et on
  // calcule le temps écoulé à partir de l'heure actuelle ("now").
  const [now, setNow] = useState(Date.now());
  const sessionStartRef = useRef(Date.now());
  const [countdownStartedAt, setCountdownStartedAt] = useState<number | null>(
    null,
  );
  const [timingStartedAt, setTimingStartedAt] = useState<number | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);

  // Valeurs dérivées : recalculées à chaque rendu, pas stockées dans le state
  const sessionElapsedSeconds = Math.floor(
    (now - sessionStartRef.current) / 1000,
  );
  const countdownValue =
    countdownStartedAt === null
      ? 5
      : Math.max(0, 5 - Math.floor((now - countdownStartedAt) / 1000));
  const elapsedSeconds =
    timingStartedAt === null ? 0 : Math.floor((now - timingStartedAt) / 1000);
  const restRemaining =
    restEndsAt === null ? 0 : Math.max(0, Math.ceil((restEndsAt - now) / 1000));

  // ---- Étape courante (undefined tant que le chargement n'est pas fini) ----
  const step = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;

  // ---- Sons ----
  const countdownPlayer = useAudioPlayer(
    require("../../assets/sounds/countdown-start.mp3"),
  );
  const countdownPlayerStatus = useAudioPlayerStatus(countdownPlayer);
  const targetReachedPlayer = useAudioPlayer(
    require("../../assets/sounds/target-reached.mp3"),
  );
  const restEndPlayer = useAudioPlayer(
    require("../../assets/sounds/rest-end.mp3"),
  );

  const playCountdownStart = () => {
    if (!soundEnabled) return;
    if (!countdownPlayerStatus.isLoaded) return;
    countdownPlayer.seekTo(0);
    countdownPlayer.play();
  };

  const playTargetReached = () => {
    if (!soundEnabled) return;
    targetReachedPlayer.seekTo(0);
    targetReachedPlayer.play();
  };

  const playRestEnd = () => {
    if (!soundEnabled) return;
    restEndPlayer.seekTo(0);
    restEndPlayer.play();
  };

  // ---- Chargement + aplatissement de l'entrainement ----
  useEffect(() => {
    const load = async () => {
      const workoutRow = await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM workouts WHERE id = ?",
        workoutId,
      );
      if (workoutRow) setWorkoutName(workoutRow.name);

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
            isFirstTime: !lastValueMap.has(key),
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

  // ---- Passage automatique du décompte de 5s au vrai chrono ----
  useEffect(() => {
    if (
      exercisePhase === "countdown" &&
      countdownStartedAt !== null &&
      now - countdownStartedAt >= 5000
    ) {
      // Le chrono démarre exactement 5s après le début du décompte,
      // même si l'écran a mis du temps à se mettre à jour
      setTimingStartedAt(countdownStartedAt + 5000);
      setExercisePhase("timing");
    }
  }, [now, exercisePhase, countdownStartedAt]);

  // ---- Son : objectif atteint pendant un exercice "temps" ----
  useEffect(() => {
    if (exercisePhase !== "timing" || !step) return;
    if (elapsedSeconds === step.targetValue) {
      playTargetReached();
    }
  }, [elapsedSeconds]);

  // ---- Son : fin du repos ----
  useEffect(() => {
    if (screenPhase !== "review" || isLastStep || !step) return;
    if (step.restAfterSeconds > 0 && restRemaining === 0) {
      playRestEnd();
    }
  }, [restRemaining]);

  // ---- Actions ----

  const handleStartTimer = () => {
    playCountdownStart();
    const t = Date.now();
    setNow(t);
    setCountdownStartedAt(t);
    setTimingStartedAt(null);
    setExercisePhase("countdown");
  };

  const enterReview = (achievedValue: number) => {
    const t = Date.now();
    setNow(t);
    setPerformedValues((prev) => ({ ...prev, [currentIndex]: achievedValue }));
    setReviewValue(achievedValue);
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
    setExercisePhase("idle");
    setCountdownStartedAt(null);
    setTimingStartedAt(null);
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

  const handleFinishSession = async () => {
    const finalValues = { ...performedValues, [currentIndex]: reviewValue };
    await saveSession(finalValues);
    Alert.alert("Séance enregistrée !", "Bien joué 💪", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  const handleAbort = () => {
    const hasAnyProgress = currentIndex > 0 || screenPhase === "review";

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

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (steps.length === 0) {
    return (
      <View style={styles.centerContent}>
        <Text>Aucun exercice dans cet entrainement.</Text>
      </View>
    );
  }

  const completedSteps =
    screenPhase === "review" ? currentIndex + 1 : currentIndex;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <SessionTopBar
          elapsedSeconds={sessionElapsedSeconds}
          progressPercent={progressPercent}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((v) => !v)}
          onAbort={handleAbort}
          topInset={insets.top}
        />

        <View
          style={[styles.phaseContainer, { paddingBottom: insets.bottom + 24 }]}
        >
          {screenPhase === "exercise" ? (
            <ExercisePhaseView
              step={step}
              exercisePhase={exercisePhase}
              countdownValue={countdownValue}
              elapsedSeconds={elapsedSeconds}
              onStartTimer={handleStartTimer}
              onFinishReps={handleFinishReps}
              onFinishTimer={handleFinishTimer}
            />
          ) : (
            <ReviewPhaseView
              step={step}
              reviewValue={reviewValue}
              onChangeReviewValue={setReviewValue}
              onAdjustReviewValue={adjustReviewValue}
              restRemaining={restRemaining}
              isLastStep={isLastStep}
              nextStep={isLastStep ? null : steps[currentIndex + 1]}
              onContinue={proceedToNext}
              onFinishSession={handleFinishSession}
            />
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  phaseContainer: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  topBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  topBarTimer: { fontSize: 16, fontWeight: "600", color: "#000" },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  closeButton: { fontSize: 22, color: "#000" },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#eee",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#000",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 13,
    color: "#666",
    width: 36,
    textAlign: "right",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  stepIndicator: { fontSize: 14, color: "#888", marginBottom: 8 },
  exerciseName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 16,
    textAlign: "center",
  },
  objective: { fontSize: 20, color: "#000", marginBottom: 4 },
  hint: { fontSize: 13, color: "#888", marginBottom: 12 },
  record: { fontSize: 15, color: "#555", marginBottom: 32 },
  countdown: { fontSize: 64, fontWeight: "bold", color: "#000" },
  timer: { fontSize: 48, fontWeight: "bold", color: "#000", marginBottom: 24 },
  primaryButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  stepperButtonText: { fontSize: 22, color: "#000" },
  stepperInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    width: 80,
    textAlign: "center",
    fontSize: 20,
    color: "#000",
  },
  stepperUnit: { fontSize: 15, color: "#666" },
  restLabel: { fontSize: 16, color: "#888", marginTop: 8 },
  nextUp: {
    fontSize: 15,
    color: "#555",
    marginVertical: 20,
    textAlign: "center",
  },
  doneText: { fontSize: 22, fontWeight: "700", marginBottom: 24 },
});
