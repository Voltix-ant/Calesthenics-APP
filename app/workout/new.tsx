import {
  ExercisePickerModal,
  ExerciseRow,
} from "@/components/exercise-picker-modal";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ---- Types ----

type SetDraft = {
  id: string;
  targetValue: number;
};

// Un "discriminated union" : selon la valeur de `type`, TypeScript sait
// automatiquement quels autres champs sont disponibles sur l'objet.
type BlockDraft =
  | {
      id: string;
      type: "exercise";
      exerciseId: number;
      exerciseName: string;
      exerciseType: "reps" | "time";
      restBetweenSets: number;
      sets: SetDraft[];
    }
  | {
      id: string;
      type: "rest";
      restSeconds: number;
    };

// ---- Sous-composant : carte d'un bloc "exercice" ----

function ExerciseBlockCard({
  block,
  index,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateRest,
  onAddSet,
  onRemoveSet,
  onUpdateSetTarget,
}: {
  block: Extract<BlockDraft, { type: "exercise" }>;
  index: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateRest: (value: number) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSetTarget: (setId: string, value: number) => void;
}) {
  const unit = block.exerciseType === "reps" ? "reps" : "sec";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {index + 1}. {block.exerciseName}
        </Text>
        <View style={styles.cardHeaderActions}>
          <TouchableOpacity onPress={onMoveUp}>
            <Text style={styles.smallButton}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onMoveDown}>
            <Text style={styles.smallButton}>↓</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove}>
            <Text style={[styles.smallButton, styles.deleteButton]}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {block.sets.map((set, setIndex) => (
        <View key={set.id} style={styles.setRow}>
          <Text style={styles.setLabel}>Série {setIndex + 1}</Text>
          <TextInput
            style={styles.setInput}
            keyboardType="number-pad"
            value={set.targetValue.toString()}
            onChangeText={(text) =>
              onUpdateSetTarget(set.id, parseInt(text) || 0)
            }
          />
          <Text style={styles.setUnit}>{unit}</Text>
          {block.sets.length > 1 && (
            <TouchableOpacity onPress={() => onRemoveSet(set.id)}>
              <Text style={styles.deleteButton}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity onPress={onAddSet}>
        <Text style={styles.addSetText}>+ Ajouter une série</Text>
      </TouchableOpacity>

      <View style={styles.setRow}>
        <Text style={styles.setLabel}>Repos entre séries</Text>
        <TextInput
          style={styles.setInput}
          keyboardType="number-pad"
          value={block.restBetweenSets.toString()}
          onChangeText={(text) => onUpdateRest(parseInt(text) || 0)}
        />
        <Text style={styles.setUnit}>sec</Text>
      </View>
    </View>
  );
}

// ---- Sous-composant : carte d'un bloc "repos" ----

function RestBlockCard({
  block,
  index,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateDuration,
}: {
  block: Extract<BlockDraft, { type: "rest" }>;
  index: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateDuration: (value: number) => void;
}) {
  return (
    <View style={[styles.card, styles.restCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{index + 1}. Repos</Text>
        <View style={styles.cardHeaderActions}>
          <TouchableOpacity onPress={onMoveUp}>
            <Text style={styles.smallButton}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onMoveDown}>
            <Text style={styles.smallButton}>↓</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove}>
            <Text style={[styles.smallButton, styles.deleteButton]}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.setRow}>
        <Text style={styles.setLabel}>Durée</Text>
        <TextInput
          style={styles.setInput}
          keyboardType="number-pad"
          value={block.restSeconds.toString()}
          onChangeText={(text) => onUpdateDuration(parseInt(text) || 0)}
        />
        <Text style={styles.setUnit}>sec</Text>
      </View>
    </View>
  );
}

// ---- Écran principal ----

export default function NewWorkoutScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<BlockDraft[]>([]);

  // Modal de recherche/création d'exercice
  const [pickerVisible, setPickerVisible] = useState(false);

  // Compteur pour générer des ids locaux uniques (temporaires, pas ceux de la BDD)
  const idCounter = useRef(0);
  const generateId = () => `local-${idCounter.current++}`;

  const openExercisePicker = () => setPickerVisible(true);

  const addExerciseBlock = (exercise: ExerciseRow) => {
    const newBlock: BlockDraft = {
      id: generateId(),
      type: "exercise",
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseType: exercise.type,
      restBetweenSets: 60,
      sets: [
        { id: generateId(), targetValue: exercise.type === "reps" ? 10 : 30 },
      ],
    };
    setBlocks((prev) => [...prev, newBlock]);
    setPickerVisible(false);
  };

  const addRestBlock = () => {
    const newBlock: BlockDraft = {
      id: generateId(),
      type: "rest",
      restSeconds: 90,
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev; // rien à faire

      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]]; // échange les 2 éléments
      return copy;
    });
  };

  const updateBlock = (id: string, updates: Partial<BlockDraft>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...updates } as BlockDraft) : b)),
    );
  };

  const addSet = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId || b.type !== "exercise") return b;
        const lastValue = b.sets[b.sets.length - 1]?.targetValue ?? 0;
        return {
          ...b,
          sets: [...b.sets, { id: generateId(), targetValue: lastValue }],
        };
      }),
    );
  };

  const removeSet = (blockId: string, setId: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId || b.type !== "exercise") return b;
        return { ...b, sets: b.sets.filter((s) => s.id !== setId) };
      }),
    );
  };

  const updateSetTarget = (blockId: string, setId: string, value: number) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId || b.type !== "exercise") return b;
        return {
          ...b,
          sets: b.sets.map((s) =>
            s.id === setId ? { ...s, targetValue: value } : s,
          ),
        };
      }),
    );
  };

  const handleSave = async () => {
    if (name.trim() === "" || blocks.length === 0) return;

    await db.withTransactionAsync(async () => {
      const workoutResult = await db.runAsync(
        "INSERT INTO workouts (name, description) VALUES (?, ?)",
        name.trim(),
        description.trim() || null,
      );
      const workoutId = workoutResult.lastInsertRowId;

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];

        const blockResult = await db.runAsync(
          `INSERT INTO workout_blocks (workout_id, order_index, type, exercise_id, rest_between_sets, rest_seconds)
           VALUES (?, ?, ?, ?, ?, ?)`,
          workoutId,
          i,
          block.type,
          block.type === "exercise" ? block.exerciseId : null,
          block.type === "exercise" ? block.restBetweenSets : null,
          block.type === "rest" ? block.restSeconds : null,
        );
        const blockId = blockResult.lastInsertRowId;

        if (block.type === "exercise") {
          for (let s = 0; s < block.sets.length; s++) {
            await db.runAsync(
              "INSERT INTO workout_sets (block_id, set_number, target_value) VALUES (?, ?, ?)",
              blockId,
              s + 1,
              block.sets[s].targetValue,
            );
          }
        }
      }
    });

    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.label}>Nom de l'entrainement</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Push day"
          placeholderTextColor="#999"
        />
        <Text style={styles.label}>Description (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Notes, objectifs, contexte..."
          placeholderTextColor="#999"
          multiline
        />

        {blocks.map((block, index) =>
          block.type === "exercise" ? (
            <ExerciseBlockCard
              key={block.id}
              block={block}
              index={index}
              onRemove={() => removeBlock(block.id)}
              onMoveUp={() => moveBlock(block.id, -1)}
              onMoveDown={() => moveBlock(block.id, 1)}
              onUpdateRest={(value) =>
                updateBlock(block.id, { restBetweenSets: value })
              }
              onAddSet={() => addSet(block.id)}
              onRemoveSet={(setId) => removeSet(block.id, setId)}
              onUpdateSetTarget={(setId, value) =>
                updateSetTarget(block.id, setId, value)
              }
            />
          ) : (
            <RestBlockCard
              key={block.id}
              block={block}
              index={index}
              onRemove={() => removeBlock(block.id)}
              onMoveUp={() => moveBlock(block.id, -1)}
              onMoveDown={() => moveBlock(block.id, 1)}
              onUpdateDuration={(value) =>
                updateBlock(block.id, { restSeconds: value })
              }
            />
          ),
        )}

        <View style={styles.addBlockRow}>
          <TouchableOpacity
            style={styles.addBlockButton}
            onPress={openExercisePicker}
          >
            <Text style={styles.addBlockButtonText}>+ Exercice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBlockButton}
            onPress={addRestBlock}
          >
            <Text style={styles.addBlockButtonText}>+ Repos</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Enregistrer l'entrainement</Text>
        </TouchableOpacity>
      </ScrollView>

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectExercise={addExerciseBlock}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: 16 },
  scrollContent: { paddingBottom: 32 },
  label: { fontSize: 14, color: "#555", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: "#fff",
  },
  card: {
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  restCard: { backgroundColor: "#e8e8f5" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", flex: 1 },
  cardHeaderActions: { flexDirection: "row", gap: 12 },
  smallButton: { fontSize: 18, paddingHorizontal: 4 },
  deleteButton: { color: "#c00" },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  setLabel: { flex: 1, fontSize: 14 },
  setInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 6,
    width: 60,
    textAlign: "center",
    backgroundColor: "#fff",
    color: "#000",
  },
  setUnit: { fontSize: 13, color: "#666", width: 36 },
  addSetText: { color: "#007aff", marginBottom: 8 },
  addBlockRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  addBlockButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  addBlockButtonText: { fontWeight: "600" },
  saveButton: {
    backgroundColor: "#222",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "600" },
  modalContainer: { flex: 1, padding: 16, paddingTop: 60 },
  resultItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resultText: { fontSize: 16 },
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
  cancelText: { textAlign: "center", color: "#888", marginTop: 12 },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});
