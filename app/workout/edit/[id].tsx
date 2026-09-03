import { BlockDraft, WorkoutForm } from "@/components/workout-form";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type WorkoutRow = { id: number; name: string; description: string | null };

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

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = parseInt(id, 10);
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [initialBlocks, setInitialBlocks] = useState<BlockDraft[]>([]);

  useEffect(() => {
    const load = async () => {
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

      // Convertit les lignes de la BDD vers le format BlockDraft attendu par WorkoutForm
      const drafts: BlockDraft[] = blockRows.map((block) => {
        if (block.type === "exercise") {
          return {
            id: `existing-${block.block_id}`,
            type: "exercise",
            exerciseId: block.exercise_id!,
            exerciseName: block.exercise_name!,
            exerciseType: block.exercise_type!,
            restBetweenSets: block.rest_between_sets ?? 0,
            sets: (setsByBlock[block.block_id] ?? []).map((s) => ({
              id: `existing-set-${s.id}`,
              targetValue: s.target_value,
            })),
          };
        }
        return {
          id: `existing-${block.block_id}`,
          type: "rest",
          restSeconds: block.rest_seconds ?? 0,
        };
      });

      setInitialBlocks(drafts);
      setLoading(false);
    };

    load();
  }, [db, workoutId]);

  if (loading || !workout) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Modifier "${workout.name}"` }} />
      <WorkoutForm
        mode="edit"
        workoutId={workoutId}
        initialName={workout.name}
        initialDescription={workout.description ?? ""}
        initialBlocks={initialBlocks}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
