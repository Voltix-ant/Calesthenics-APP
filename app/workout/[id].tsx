import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Pause,
  Play,
  Trash2,
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FireButton } from "@/components/ui/fire-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Neu } from "@/components/ui/neu";
import { ScreenHeader } from "@/components/ui/screen-header";
import { body, colors, display, em } from "@/constants/theme";

type WorkoutRow = {
  id: number;
  name: string;
  description: string | null;
};

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

type SessionRow = {
  id: number;
  performed_at: string;
};

type PerformanceRow = {
  session_id: number;
  exercise_id: number;
  exercise_name: string;
  exercise_type: "reps" | "time";
  set_number: number;
  actual_value: number;
};

// Format d'affichage d'une session : "10 septembre 2026, 14:32"
// SQLite stocke les dates en UTC sans suffixe -> on l'ajoute nous-mêmes
// pour que le JS interprète correctement le fuseau avant de reformater en local.
const formatSessionDate = (performedAt: string) => {
  const date = new Date(performedAt.replace(" ", "T") + "Z");
  const datePart = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart}, ${timePart}`;
};

// ---- Sous-composant : un menu déroulant représentant une séance ----

type ExerciseEntry = {
  exerciseId: number;
  exerciseName: string;
  exerciseType: "reps" | "time";
  sets: { setNumber: number; value: number }[];
};

const unitLabel = (type: "reps" | "time" | null) =>
  type === "reps" ? "reps" : "sec";

// Replié : carte en relief. Déplié : creusé, avec le détail des séries.
function SessionAccordionItem({
  session,
  exerciseEntries,
  expanded,
  onToggle,
}: {
  session: SessionRow;
  exerciseEntries: ExerciseEntry[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <Neu
      variant={expanded ? "in" : "up-sm"}
      surface={expanded ? undefined : "card"}
      style={[styles.accordion, expanded && styles.accordionExpanded]}
    >
      <Pressable
        style={styles.accordionHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.accordionTitle}>
          {formatSessionDate(session.performed_at)}
        </Text>
        <Chevron
          size={20}
          strokeWidth={2}
          color={expanded ? colors.fireMid : colors.textTertiary}
        />
      </Pressable>

      {expanded && (
        <View style={styles.accordionBody}>
          {exerciseEntries.map((entry) => (
            <View key={entry.exerciseId} style={styles.historyRow}>
              <Text style={styles.historyName}>{entry.exerciseName}</Text>
              <Text style={styles.historyValues}>
                {entry.sets.map((s) => s.value).join(" - ")}{" "}
                {unitLabel(entry.exerciseType)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Neu>
  );
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = parseInt(id, 10);

  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [setsByBlock, setSetsByBlock] = useState<Record<number, SetRow[]>>({});

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [orderedExerciseIds, setOrderedExerciseIds] = useState<number[]>([]);
  const [performancesBySession, setPerformancesBySession] = useState<
    Record<number, Record<number, ExerciseEntry>>
  >({});
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<number>>(
    new Set(),
  );

  const loadWorkout = async () => {
    const workoutRow = await db.getFirstAsync<WorkoutRow>(
      "SELECT id, name, description FROM workouts WHERE id = ?",
      workoutId,
    );
    setWorkout(workoutRow);

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
    setBlocks(blockRows);

    const setRows = await db.getAllAsync<SetRow>(
      `SELECT ws.id, ws.block_id, ws.set_number, ws.target_value
       FROM workout_sets ws
       JOIN workout_blocks wb ON ws.block_id = wb.id
       WHERE wb.workout_id = ?
       ORDER BY ws.block_id, ws.set_number`,
      workoutId,
    );
    const grouped: Record<number, SetRow[]> = {};
    for (const set of setRows) {
      if (!grouped[set.block_id]) grouped[set.block_id] = [];
      grouped[set.block_id].push(set);
    }
    setSetsByBlock(grouped);

    // Ordre des exercices tel que défini dans l'entrainement (1re apparition), pour l'historique
    const exerciseOrder: number[] = [];
    for (const block of blockRows) {
      if (block.type === "exercise" && block.exercise_id !== null) {
        if (!exerciseOrder.includes(block.exercise_id)) {
          exerciseOrder.push(block.exercise_id);
        }
      }
    }
    setOrderedExerciseIds(exerciseOrder);

    // Historique des séances
    const sessionRows = await db.getAllAsync<SessionRow>(
      "SELECT id, performed_at FROM sessions WHERE workout_id = ? ORDER BY performed_at DESC",
      workoutId,
    );
    setSessions(sessionRows);

    const perfRows = await db.getAllAsync<PerformanceRow>(
      `SELECT sp.session_id, sp.exercise_id, e.name AS exercise_name, e.type AS exercise_type,
              sp.set_number, sp.actual_value
       FROM session_performances sp
       JOIN sessions s ON sp.session_id = s.id
       JOIN exercises e ON sp.exercise_id = e.id
       WHERE s.workout_id = ?
       ORDER BY sp.session_id, sp.set_number`,
      workoutId,
    );

    const bySession: Record<number, Record<number, ExerciseEntry>> = {};
    for (const row of perfRows) {
      if (!bySession[row.session_id]) bySession[row.session_id] = {};
      if (!bySession[row.session_id][row.exercise_id]) {
        bySession[row.session_id][row.exercise_id] = {
          exerciseId: row.exercise_id,
          exerciseName: row.exercise_name,
          exerciseType: row.exercise_type,
          sets: [],
        };
      }
      bySession[row.session_id][row.exercise_id].sets.push({
        setNumber: row.set_number,
        value: row.actual_value,
      });
    }
    setPerformancesBySession(bySession);
  };

  // Pas de useCallback : le React Compiler mémoïse déjà cette fonction
  useFocusEffect(() => {
    loadWorkout();
  });

  const toggleSession = (sessionId: number) => {
    setExpandedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer cet entrainement ?",
      "Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await db.runAsync("DELETE FROM workouts WHERE id = ?", workoutId);
            router.back();
          },
        },
      ],
    );
  };

  if (!workout) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="" />
        <Text style={styles.loading}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={workout.name} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 40 + insets.bottom },
        ]}
      >
        <View style={styles.intro}>
          <Text style={styles.title}>{workout.name}</Text>
          {workout.description ? (
            <Text style={styles.description}>{workout.description}</Text>
          ) : null}
        </View>

        <FireButton
          label="Lancer l'entrainement"
          icon={
            <Play
              size={20}
              strokeWidth={2}
              color={colors.onFire}
              fill={colors.onFire}
            />
          }
          style={styles.launchButton}
          labelStyle={styles.launchLabel}
          onPress={() =>
            router.push({
              pathname: "/session/[id]",
              params: { id: workoutId.toString() },
            })
          }
        />

        <View style={styles.blocks}>
          {blocks.map((block) =>
            block.type === "exercise" ? (
              <Neu
                key={block.block_id}
                variant="up-sm"
                surface="card"
                style={styles.exerciseCard}
              >
                <View style={styles.exerciseTop}>
                  <Text style={styles.exerciseName}>{block.exercise_name}</Text>
                  <GradientText style={styles.exerciseTargets}>
                    {`${(setsByBlock[block.block_id] ?? [])
                      .map((s) => s.target_value)
                      .join(" - ")} ${unitLabel(block.exercise_type)}`}
                  </GradientText>
                </View>
                <Text style={styles.exerciseMeta}>
                  Repos entre séries : {block.rest_between_sets} sec
                </Text>
              </Neu>
            ) : (
              <Neu key={block.block_id} variant="in-sm" style={styles.restCard}>
                <Pause size={16} strokeWidth={2} color={colors.textSecondary} />
                <Text style={styles.restText}>
                  Repos : {block.rest_seconds} sec
                </Text>
              </Neu>
            ),
          )}
        </View>

        <View style={styles.history}>
          <Text style={styles.sectionTitle} role="heading">
            Historique
          </Text>
          {sessions.length === 0 ? (
            <Text style={styles.emptyHistory}>
              Aucune séance enregistrée pour l'instant.
            </Text>
          ) : (
            sessions.map((session) => {
              const performancesForSession =
                performancesBySession[session.id] ?? {};
              const exerciseEntries = orderedExerciseIds
                .map((exId) => performancesForSession[exId])
                .filter((entry): entry is ExerciseEntry => entry !== undefined);

              return (
                <SessionAccordionItem
                  key={session.id}
                  session={session}
                  exerciseEntries={exerciseEntries}
                  expanded={expandedSessionIds.has(session.id)}
                  onToggle={() => toggleSession(session.id)}
                />
              );
            })
          )}
        </View>

        <View style={styles.actions}>
          <Neu
            variant="up-sm"
            surface="flat"
            style={styles.actionButton}
            onPress={() =>
              router.push({
                pathname: "/workout/edit/[id]",
                params: { id: workoutId.toString() },
              })
            }
          >
            <Copy size={18} strokeWidth={2} color={colors.fireMid} />
            <Text style={styles.actionLabel}>Dupliquer</Text>
          </Neu>
          <Neu
            variant="up-sm"
            surface="flat"
            style={styles.actionButton}
            onPress={handleDelete}
          >
            <Trash2 size={18} strokeWidth={2} color={colors.destructive} />
            <Text style={[styles.actionLabel, styles.destructive]}>
              Supprimer
            </Text>
          </Neu>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: {
    ...body(400),
    fontSize: 16,
    color: colors.textSecondary,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  content: {
    paddingTop: 20,
    paddingHorizontal: 24,
    gap: 26,
  },
  intro: { gap: 10 },
  title: {
    ...display(700),
    fontSize: 38,
    lineHeight: 38 * 1.05,
    letterSpacing: em(-0.015, 38),
  },
  description: {
    ...body(400),
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  launchButton: { height: 66, borderRadius: 22, gap: 12 },
  launchLabel: { fontSize: 18 },
  blocks: { gap: 14 },
  exerciseCard: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 4,
  },
  exerciseTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  exerciseName: { ...display(700), fontSize: 17, flexShrink: 1 },
  exerciseTargets: { ...display(700), fontSize: 15 },
  exerciseMeta: { ...body(400), fontSize: 14, color: colors.textTertiary },
  restCard: {
    borderRadius: 20,
    paddingHorizontal: 18,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  restText: { ...body(600), fontSize: 15, color: colors.textSecondary },
  history: { gap: 14, paddingTop: 6 },
  sectionTitle: { ...display(700), fontSize: 22 },
  emptyHistory: {
    ...body(400),
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  accordion: {
    borderRadius: 20,
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  accordionExpanded: { paddingBottom: 14 },
  accordionHeader: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  accordionTitle: { ...body(600), fontSize: 16, flexShrink: 1 },
  accordionBody: { gap: 10 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  historyName: {
    ...body(400),
    fontSize: 15,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  historyValues: {
    ...body(600),
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  actions: { flexDirection: "row", gap: 16, paddingTop: 8 },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionLabel: { ...body(600), fontSize: 16 },
  destructive: { color: colors.destructive },
});
