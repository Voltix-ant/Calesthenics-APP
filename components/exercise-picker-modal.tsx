import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export type ExerciseRow = {
  id: number;
  name: string;
  type: "reps" | "time";
};

export function ExercisePickerModal({
  visible,
  onClose,
  onSelectExercise,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: ExerciseRow) => void;
}) {
  const db = useSQLiteContext();
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<ExerciseRow[]>([]);
  const [newExerciseType, setNewExerciseType] = useState<"reps" | "time">(
    "reps",
  );

  // Réinitialise la recherche à chaque ouverture de la modal
  useEffect(() => {
    if (visible) {
      setSearchText("");
      setNewExerciseType("reps");
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const search = async () => {
      const results = await db.getAllAsync<ExerciseRow>(
        "SELECT id, name, type FROM exercises WHERE name LIKE ? ORDER BY name LIMIT 20",
        `%${searchText}%`,
      );
      setSearchResults(results);
    };
    search();
  }, [searchText, visible, db]);

  const handleCreateExercise = async () => {
    const trimmed = searchText.trim();
    if (trimmed === "") return;

    const result = await db.runAsync(
      "INSERT INTO exercises (name, type) VALUES (?, ?)",
      trimmed,
      newExerciseType,
    );

    onSelectExercise({
      id: result.lastInsertRowId,
      name: trimmed,
      type: newExerciseType,
    });
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <TextInput
          style={styles.input}
          placeholder="Rechercher un exercice..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
          autoFocus
        />

        <ScrollView style={styles.flex}>
          {searchResults.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              style={styles.resultItem}
              onPress={() => onSelectExercise(exercise)}
            >
              <Text style={styles.resultText}>{exercise.name}</Text>
              <Text style={styles.resultType}>
                {exercise.type === "reps" ? "Répétitions" : "Temps"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {searchText.trim() !== "" && (
          <View style={styles.createSection}>
            <Text style={styles.label}>
              Aucun résultat ? Créer "{searchText.trim()}"
            </Text>
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.typeToggle,
                  newExerciseType === "reps" && styles.typeToggleActive,
                ]}
                onPress={() => setNewExerciseType("reps")}
              >
                <Text>Répétitions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeToggle,
                  newExerciseType === "time" && styles.typeToggleActive,
                ]}
                onPress={() => setNewExerciseType("time")}
              >
                <Text>Temps</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleCreateExercise}
            >
              <Text style={styles.saveButtonText}>Créer et ajouter</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modalContainer: { flex: 1, padding: 16, paddingTop: 60 },
  label: { fontSize: 14, color: "#555", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: "#000",
  },
  resultItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resultText: { fontSize: 16, color: "#000" },
  resultType: { fontSize: 13, color: "#888" },
  createSection: { marginTop: 12, marginBottom: 12 },
  typeToggleRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  typeToggle: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  typeToggleActive: { borderColor: "#000", backgroundColor: "#eee" },
  saveButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "600" },
  cancelText: { textAlign: "center", color: "#888", marginTop: 12 },
});
