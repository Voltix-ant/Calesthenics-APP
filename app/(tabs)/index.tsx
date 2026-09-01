import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Workout = {
  id: number;
  name: string;
  created_at: string;
};

export default function WorkoutsScreen() {
  const db = useSQLiteContext();
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  const loadWorkouts = useCallback(async () => {
    const result = await db.getAllAsync<Workout>(
      "SELECT id, name, created_at FROM workouts ORDER BY created_at DESC",
    );
    setWorkouts(result);
  }, [db]);

  // Recharge la liste à chaque fois que cet écran redevient actif
  // (utile après avoir créé un entrainement puis être revenu ici)
  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts]),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes entrainements</Text>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.workoutItem}>
            <Text style={styles.workoutName}>{item.name}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Aucun entrainement pour l'instant.
          </Text>
        }
      />

      <TouchableOpacity style={styles.addButton}>
        <Text style={styles.addButtonText}>+ Nouvel entrainement</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  workoutItem: {
    padding: 16,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 32,
  },
  addButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
