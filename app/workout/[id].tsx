import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  return (
    <View style={styles.accordionItem}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onToggle}>
        <Text style={styles.accordionTitle}>
          {formatSessionDate(session.performed_at)}
        </Text>
        <Text style={styles.accordionChevron}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.accordionBody}>
          {exerciseEntries.map((entry) => (
            <View key={entry.exerciseId} style={styles.historyExerciseRow}>
              <Text style={styles.historyExerciseName}>
                {entry.exerciseName}
              </Text>
              <Text style={styles.historyExerciseValues}>
                {entry.sets.map((s) => s.value).join(" - ")}{" "}
                {entry.exerciseType === "reps" ? "reps" : "sec"}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
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

  const loadWorkout = useCallback(async () => {
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
  }, [db, workoutId]);

  useFocusEffect(
    useCallback(() => {
      loadWorkout();
    }, [loadWorkout]),
  );

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
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: workout.name }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <Text style={styles.title}>{workout.name}</Text>
        {workout.description && (
          <Text style={styles.description}>{workout.description}</Text>
        )}

        <TouchableOpacity
          style={styles.launchButton}
          onPress={() =>
            router.push({
              pathname: "/session/[id]",
              params: { id: workoutId.toString() },
            })
          }
        >
          <Text style={styles.launchButtonText}>Lancer l'entrainement</Text>
        </TouchableOpacity>

        <View style={styles.blocksSection}>
          {blocks.map((block) => (
            <View
              key={block.block_id}
              style={[styles.card, block.type === "rest" && styles.restCard]}
            >
              {block.type === "exercise" ? (
                <>
                  <Text style={styles.cardTitle}>{block.exercise_name}</Text>
                  <Text style={styles.cardSubtitle}>
                    {(setsByBlock[block.block_id] ?? [])
                      .map((s) => s.target_value)
                      .join(" - ")}{" "}
                    {block.exercise_type === "reps" ? "reps" : "sec"}
                  </Text>
                  <Text style={styles.cardMeta}>
                    Repos entre séries : {block.rest_between_sets} sec
                  </Text>
                </>
              ) : (
                <Text style={styles.cardTitle}>
                  Repos : {block.rest_seconds} sec
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Historique</Text>
          {sessions.length === 0 ? (
            <Text style={styles.emptyHistoryText}>
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

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              router.push({
                pathname: "/workout/edit/[id]",
                params: { id: workoutId.toString() },
              })
            }
          >
            <Text style={styles.editButtonText}>Dupliquer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "bold", color: "#000" },
  description: { fontSize: 15, color: "#555", marginTop: 8 },
  launchButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  launchButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  blocksSection: { marginBottom: 24 },
  card: {
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  restCard: { backgroundColor: "#e8e8f5" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#000" },
  cardSubtitle: { fontSize: 14, color: "#333", marginTop: 4 },
  cardMeta: { fontSize: 13, color: "#777", marginTop: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 10,
  },
  historySection: { marginBottom: 24 },
  emptyHistoryText: { color: "#888", fontStyle: "italic" },
  accordionItem: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fafafa",
  },
  accordionTitle: { fontSize: 15, fontWeight: "600", color: "#000" },
  accordionChevron: { fontSize: 12, color: "#888" },
  accordionBody: { padding: 14, paddingTop: 0 },
  historyExerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  historyExerciseName: { fontSize: 14, color: "#000", flex: 1 },
  historyExerciseValues: { fontSize: 14, color: "#555" },
  actionsSection: { flexDirection: "row", gap: 12, marginBottom: 32 },
  editButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#000",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  editButtonText: { fontWeight: "600", color: "#000" },
  deleteButton: {
    flex: 1,
    backgroundColor: "#c00",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: { color: "#fff", fontWeight: "600" },
});
