import {
  ExercisePickerModal,
  ExerciseRow,
} from "@/components/exercise-picker-modal";
import { KeyboardAvoidingContainer } from "@/components/keyboard-avoiding-container";
import { FireButton } from "@/components/ui/fire-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Neu } from "@/components/ui/neu";
import { NeuTextInput } from "@/components/ui/neu-text-input";
import { ScreenHeader } from "@/components/ui/screen-header";
import { body, colors, display, em } from "@/constants/theme";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ArrowDown, ArrowUp, Pause, Plus, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ---- Types (exportés pour que l'écran d'édition puisse construire des BlockDraft) ----

export type SetDraft = {
  id: string;
  targetValue: number;
};

export type BlockDraft =
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

// ---- Sous-composants communs aux deux types de bloc ----

// Boutons ↑ ↓ ✕ de l'en-tête d'un bloc. Une flèche sans effet (1er bloc pour
// ↑, dernier pour ↓) est grisée, comme dans la maquette.
function BlockActions({
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      <Neu
        variant="up-sm"
        style={styles.blockAction}
        onPress={onMoveUp}
        disabled={isFirst}
        accessibilityLabel="Monter le bloc"
        accessibilityState={{ disabled: isFirst }}
      >
        <ArrowUp
          size={18}
          strokeWidth={2}
          color={isFirst ? colors.textTertiary : colors.textSecondary}
        />
      </Neu>
      <Neu
        variant="up-sm"
        style={styles.blockAction}
        onPress={onMoveDown}
        disabled={isLast}
        accessibilityLabel="Descendre le bloc"
        accessibilityState={{ disabled: isLast }}
      >
        <ArrowDown
          size={18}
          strokeWidth={2}
          color={isLast ? colors.textTertiary : colors.textSecondary}
        />
      </Neu>
      <Neu
        variant="up-sm"
        style={styles.blockAction}
        onPress={onRemove}
        accessibilityLabel="Supprimer le bloc"
      >
        <X size={16} strokeWidth={2} color={colors.destructive} />
      </Neu>
    </>
  );
}

// Champ numérique 76×46 des séries et des repos.
function NumberField({
  value,
  onChange,
  raised = false,
  accessibilityLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  /** En relief (durée d'un bloc repos, posé sur un fond creusé) */
  raised?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <NeuTextInput
      variant={raised ? "up-sm" : "in-sm"}
      surface={raised ? "flat" : undefined}
      containerStyle={styles.numberField}
      style={styles.numberInput}
      keyboardType="number-pad"
      value={value.toString()}
      onChangeText={(text) => onChange(parseInt(text) || 0)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

// ---- Sous-composant : carte d'un bloc "exercice" ----

function ExerciseBlockCard({
  block,
  index,
  isLast,
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
  isLast: boolean;
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
    <Neu variant="up" surface="card" style={styles.exerciseCard}>
      <View style={styles.blockHeader}>
        <View style={styles.blockNumber}>
          <GradientText
            style={styles.blockNumberText}
          >{`${index + 1}.`}</GradientText>
        </View>
        <Text style={styles.blockTitle} numberOfLines={2}>
          {block.exerciseName}
        </Text>
        <BlockActions
          isFirst={index === 0}
          isLast={isLast}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
        />
      </View>

      <View style={styles.sets}>
        {block.sets.map((set, setIndex) => (
          <View key={set.id} style={styles.setRow}>
            <Text style={styles.setLabel}>Série {setIndex + 1}</Text>
            <NumberField
              value={set.targetValue}
              onChange={(value) => onUpdateSetTarget(set.id, value)}
              accessibilityLabel={`Objectif série ${setIndex + 1}`}
            />
            <Text style={styles.setUnit}>{unit}</Text>
            {block.sets.length > 1 && (
              <Pressable
                style={styles.removeSet}
                onPress={() => onRemoveSet(set.id)}
                accessibilityRole="button"
                accessibilityLabel={`Supprimer la série ${setIndex + 1}`}
              >
                <X size={16} strokeWidth={2} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <Pressable
        style={styles.addSet}
        onPress={onAddSet}
        accessibilityRole="button"
      >
        <Plus size={16} strokeWidth={2} color={colors.tabActive} />
        <Text style={styles.addSetText}>Ajouter une série</Text>
      </Pressable>

      <Neu variant="in-sm" style={styles.divider} />

      <View style={styles.restRow}>
        <Text style={styles.restLabel}>Repos entre séries</Text>
        <NumberField
          value={block.restBetweenSets}
          onChange={onUpdateRest}
          accessibilityLabel="Repos entre séries"
        />
        <Text style={styles.restUnit}>sec</Text>
      </View>
    </Neu>
  );
}

// ---- Sous-composant : carte d'un bloc "repos" ----

function RestBlockCard({
  block,
  index,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateDuration,
}: {
  block: Extract<BlockDraft, { type: "rest" }>;
  index: number;
  isLast: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateDuration: (value: number) => void;
}) {
  return (
    <Neu variant="in" style={styles.restCard}>
      <View style={styles.blockHeader}>
        <Text
          style={[styles.blockNumber, styles.blockNumberText, styles.muted]}
        >
          {index + 1}.
        </Text>
        <Pause size={18} strokeWidth={2} color={colors.textSecondary} />
        <Text style={[styles.blockTitle, styles.restTitle]}>Repos</Text>
        <BlockActions
          isFirst={index === 0}
          isLast={isLast}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
        />
      </View>
      <View style={styles.restRow}>
        <Text style={styles.restLabel}>Durée</Text>
        <NumberField
          value={block.restSeconds}
          onChange={onUpdateDuration}
          raised
          accessibilityLabel="Durée du repos"
        />
        <Text style={styles.restUnit}>sec</Text>
      </View>
    </Neu>
  );
}

// ---- Le formulaire partagé création / édition ----

type WorkoutFormProps = {
  /** Titre de l'en-tête de l'écran */
  title: string;
  initialName?: string;
  initialDescription?: string;
  initialBlocks?: BlockDraft[];
  submitLabel?: string;
};

export function WorkoutForm({
  title,
  initialName = "",
  initialDescription = "",
  initialBlocks = [],
  submitLabel = "Enregistrer l'entrainement",
}: WorkoutFormProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useSQLiteContext();

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [blocks, setBlocks] = useState<BlockDraft[]>(initialBlocks);

  const [pickerVisible, setPickerVisible] = useState(false);

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
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
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

  // Insère la séquence actuelle de blocs/séries pour un workout donné.
  // Utilisée à la fois en création (juste après l'INSERT du workout)
  // et en édition (après avoir vidé les anciens blocs).
  const persistBlocks = async (targetWorkoutId: number) => {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockResult = await db.runAsync(
        `INSERT INTO workout_blocks (workout_id, order_index, type, exercise_id, rest_between_sets, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`,
        targetWorkoutId,
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
  };

  const handleSave = async () => {
    if (name.trim() === "" || blocks.length === 0) return;

    await db.withTransactionAsync(async () => {
      const workoutResult = await db.runAsync(
        "INSERT INTO workouts (name, description) VALUES (?, ?)",
        name.trim(),
        description.trim() || null,
      );
      await persistBlocks(workoutResult.lastInsertRowId);
    });

    router.back();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} />
      <KeyboardAvoidingContainer>
        <ScrollView
          // Sans ça, quand le clavier est ouvert, le 1er appui sur un bouton
          // ne fait que fermer le clavier au lieu d'activer le bouton
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 36 + insets.bottom },
          ]}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Nom de l'entrainement</Text>
            <NeuTextInput
              containerStyle={styles.nameField}
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Push day"
              accessibilityLabel="Nom de l'entrainement"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description (optionnel)</Text>
            <NeuTextInput
              containerStyle={styles.descriptionField}
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Notes, objectifs, contexte..."
              multiline
              accessibilityLabel="Description"
            />
          </View>

          {blocks.length > 0 && (
            <View style={styles.blocks}>
              {blocks.map((block, index) =>
                block.type === "exercise" ? (
                  <ExerciseBlockCard
                    key={block.id}
                    block={block}
                    index={index}
                    isLast={index === blocks.length - 1}
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
                    isLast={index === blocks.length - 1}
                    onRemove={() => removeBlock(block.id)}
                    onMoveUp={() => moveBlock(block.id, -1)}
                    onMoveDown={() => moveBlock(block.id, 1)}
                    onUpdateDuration={(value) =>
                      updateBlock(block.id, { restSeconds: value })
                    }
                  />
                ),
              )}
            </View>
          )}

          <View style={styles.addBlockRow}>
            <Neu
              variant="up-sm"
              surface="flat"
              style={styles.addBlockButton}
              onPress={openExercisePicker}
            >
              <Plus size={18} strokeWidth={2} color={colors.fireMid} />
              <Text style={styles.addBlockLabel}>Exercice</Text>
            </Neu>
            <Neu
              variant="up-sm"
              surface="flat"
              style={styles.addBlockButton}
              onPress={addRestBlock}
            >
              <Plus size={18} strokeWidth={2} color={colors.fireMid} />
              <Text style={styles.addBlockLabel}>Repos</Text>
            </Neu>
          </View>

          <FireButton
            label={submitLabel}
            onPress={handleSave}
            style={styles.saveButton}
            labelStyle={styles.saveLabel}
          />
        </ScrollView>
      </KeyboardAvoidingContainer>

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectExercise={addExerciseBlock}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 22,
  },

  // Champs généraux
  field: { gap: 10 },
  label: {
    ...body(600),
    fontSize: 12,
    letterSpacing: em(0.12, 12),
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  nameField: { height: 56, paddingHorizontal: 18, borderRadius: 18 },
  nameInput: { ...body(600), fontSize: 17 },
  descriptionField: {
    minHeight: 96,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  descriptionInput: { fontSize: 16, textAlignVertical: "top" },

  // Blocs
  blocks: { gap: 20, paddingTop: 6 },
  exerciseCard: {
    borderRadius: 24,
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 18,
    paddingLeft: 18,
    gap: 14,
  },
  restCard: {
    borderRadius: 24,
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 16,
    paddingLeft: 18,
    gap: 12,
  },
  blockHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  blockNumber: { minWidth: 30 },
  blockNumberText: { ...display(700), fontSize: 22 },
  muted: { color: colors.textTertiary },
  blockTitle: { ...display(700), fontSize: 18, flex: 1 },
  restTitle: { color: colors.textSecondary },
  blockAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  // Séries
  sets: { gap: 10 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  setLabel: {
    ...body(600),
    width: 64,
    fontSize: 15,
    color: colors.textSecondary,
  },
  setUnit: { ...body(400), flex: 1, fontSize: 15, color: colors.textSecondary },
  removeSet: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  numberField: { width: 76, height: 46, borderRadius: 14 },
  numberInput: { ...display(700), fontSize: 18, textAlign: "center" },
  addSet: {
    height: 46,
    marginRight: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,170,70,0.38)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addSetText: { ...body(600), fontSize: 15, color: colors.tabActive },
  divider: { height: 3, marginRight: 4, borderRadius: 3 },
  restRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 48,
  },
  restLabel: {
    ...body(600),
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
  },
  restUnit: {
    ...body(400),
    width: 32,
    fontSize: 15,
    color: colors.textSecondary,
  },

  // Actions
  addBlockRow: { flexDirection: "row", gap: 16, paddingTop: 4 },
  addBlockButton: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addBlockLabel: { ...body(600), fontSize: 16 },
  saveButton: { height: 62, borderRadius: 20 },
  saveLabel: { fontSize: 17 },
});
