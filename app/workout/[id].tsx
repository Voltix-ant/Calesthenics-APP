import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
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

export default function WorkoutDetailScreen() {
  // useLocalSearchParams() retourne toujours des chaînes de texte (les URL sont du texte),
  // donc il faut convertir en nombre pour l'utiliser dans les requêtes SQL
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = parseInt(id, 10);

  const router = useRouter();
  const db = useSQLiteContext();

  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [setsByBlock, setSetsByBlock] = useState<Record<number, SetRow[]>>({});

  const loadWorkout = useCallback(async () => {
    const workoutRow = await db.getFirstAsync<WorkoutRow>(
      "SELECT id, name, description FROM workouts WHERE id = ?",
      workoutId,
    );
    setWorkout(workoutRow);

    const blockRows = await db.getAllAsync<BlockRow>(
      `SELECT
         wb.id AS block_id,
         wb.order_index,
         wb.type,
         wb.rest_between_sets,
         wb.rest_seconds,
         e.id AS exercise_id,
         e.name AS exercise_name,
         e.type AS exercise_type
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

    // Regroupe les séries par block_id, pour un accès facile pendant le rendu
    const grouped: Record<number, SetRow[]> = {};
    for (const set of setRows) {
      if (!grouped[set.block_id]) grouped[set.block_id] = [];
      grouped[set.block_id].push(set);
    }
    setSetsByBlock(grouped);
  }, [db, workoutId]);

  useFocusEffect(
    useCallback(() => {
      loadWorkout();
    }, [loadWorkout]),
  );

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

        <TouchableOpacity style={styles.launchButton}>
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
            <Text style={styles.editButtonText}>Modifier</Text>
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
