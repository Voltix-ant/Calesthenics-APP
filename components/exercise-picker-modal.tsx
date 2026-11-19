import { KeyboardAvoidingContainer } from "@/components/keyboard-avoiding-container";
import { Chip } from "@/components/ui/chip";
import { FireButton } from "@/components/ui/fire-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Neu } from "@/components/ui/neu";
import { NeuTextInput } from "@/components/ui/neu-text-input";
import { body, colors, screenTop, shadows } from "@/constants/theme";
import { useSQLiteContext } from "expo-sqlite";
import { Search } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ExerciseRow = {
  id: number;
  name: string;
  type: "reps" | "time";
};

type PickerProps = {
  onClose: () => void;
  onSelectExercise: (exercise: ExerciseRow) => void;
};

// La modale elle-même : n'affiche son contenu que lorsqu'elle est visible.
// Quand elle se ferme, <ExercisePickerContent> est démonté et son state est
// détruit : à la prochaine ouverture, la recherche repart donc de zéro,
// sans avoir besoin d'un effet pour la "réinitialiser".
export function ExercisePickerModal({
  visible,
  onClose,
  onSelectExercise,
}: PickerProps & { visible: boolean }) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      backdropColor="#121010"
      // Le fond de la modale passe aussi sous les barres système
      statusBarTranslucent
      navigationBarTranslucent
    >
      {visible && (
        <ExercisePickerContent
          onClose={onClose}
          onSelectExercise={onSelectExercise}
        />
      )}
    </Modal>
  );
}

function ExercisePickerContent({ onClose, onSelectExercise }: PickerProps) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<ExerciseRow[]>([]);
  const [newExerciseType, setNewExerciseType] = useState<"reps" | "time">(
    "reps",
  );
  // Le champ de recherche a un liseré orange quand il est actif
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const search = async () => {
      const results = await db.getAllAsync<ExerciseRow>(
        "SELECT id, name, type FROM exercises WHERE name LIKE ? ORDER BY name LIMIT 20",
        `%${searchText}%`,
      );
      setSearchResults(results);
    };
    search();
  }, [searchText, db]);

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

  const trimmed = searchText.trim();

  return (
    <KeyboardAvoidingContainer
      style={[
        styles.backdrop,
        {
          paddingTop: screenTop(40, insets.top),
          paddingBottom: insets.bottom + 14,
        },
      ]}
    >
      <View
        style={styles.dialog}
        role="dialog"
        accessibilityLabel="Sélection d'exercice"
      >
        <NeuTextInput
          containerStyle={[
            styles.searchField,
            searchFocused && styles.searchFieldFocused,
          ]}
          style={styles.searchInput}
          placeholder="Rechercher un exercice..."
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          autoFocus
          accessibilityLabel="Rechercher un exercice"
          leading={<Search size={20} strokeWidth={2} color={colors.fireMid} />}
        />

        {searchResults.length > 0 && (
          <ScrollView
            style={styles.results}
            contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled"
          >
            {searchResults.map((exercise) => (
              <Neu
                key={exercise.id}
                variant="up-sm"
                surface="card"
                style={styles.resultItem}
                onPress={() => onSelectExercise(exercise)}
              >
                <Text style={styles.resultName}>{exercise.name}</Text>
                <Chip style={styles.typeChip}>
                  <Text
                    style={[
                      styles.typeChipText,
                      exercise.type === "time" && styles.typeChipTime,
                    ]}
                  >
                    {exercise.type === "reps" ? "Répétitions" : "Temps"}
                  </Text>
                </Chip>
              </Neu>
            ))}
          </ScrollView>
        )}

        {trimmed !== "" && (
          <Neu variant="in" style={styles.createSection}>
            <Text style={styles.createText}>
              Aucun résultat ? Créer{" "}
              <Text style={styles.createName}>“{trimmed}”</Text>
            </Text>
            <View
              style={styles.typeToggleRow}
              role="radiogroup"
              accessibilityLabel="Type d'exercice"
            >
              <TypeOption
                label="Répétitions"
                selected={newExerciseType === "reps"}
                onPress={() => setNewExerciseType("reps")}
              />
              <TypeOption
                label="Temps"
                selected={newExerciseType === "time"}
                onPress={() => setNewExerciseType("time")}
              />
            </View>
            <FireButton
              label="Créer et ajouter"
              onPress={handleCreateExercise}
              style={styles.createButton}
            />
          </Neu>
        )}

        <Pressable
          style={styles.cancel}
          onPress={onClose}
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Annuler</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingContainer>
  );
}

// Option du choix de type : l'option choisie est en relief, texte en dégradé.
function TypeOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.typeOption, selected && styles.typeOptionSelected]}
    >
      {selected ? (
        <GradientText style={styles.typeOptionTextSelected}>
          {label}
        </GradientText>
      ) : (
        <Text style={styles.typeOptionText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { paddingHorizontal: 14 },
  dialog: {
    // La boîte prend la hauteur de son contenu, sans dépasser l'espace
    // disponible (la liste défile alors).
    flexShrink: 1,
    borderRadius: 30,
    backgroundColor: colors.background,
    boxShadow:
      "0 24px 60px rgba(0,0,0,0.7), inset 1px 1px 0 rgba(255,236,220,0.05)",
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 10,
    gap: 16,
  },
  searchField: {
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchFieldFocused: {
    boxShadow: `${shadows.in}, 0 0 0 1.5px rgba(255,150,50,0.55)`,
  },
  searchInput: { ...body(600), fontSize: 17 },
  // Une liste qui défile coupe ce qui dépasse de ses bords : on l'élargit
  // (marges négatives) et on compense par un padding, pour laisser la place
  // aux ombres des lignes. L'espacement visible reste celui de la maquette.
  results: {
    flexGrow: 0,
    flexShrink: 1,
    marginHorizontal: -18,
    marginVertical: -12,
  },
  resultsContent: { gap: 10, paddingHorizontal: 18, paddingVertical: 12 },
  resultItem: {
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resultName: { ...body(600), fontSize: 16, flexShrink: 1 },
  typeChip: { height: 28, paddingHorizontal: 10 },
  typeChipText: { ...body(600), fontSize: 13, color: colors.textSecondary },
  typeChipTime: { color: colors.tabActive },
  createSection: { borderRadius: 22, padding: 16, gap: 14 },
  createText: { ...body(400), fontSize: 15, color: colors.textSecondary },
  createName: { ...body(600), color: colors.text },
  typeToggleRow: { flexDirection: "row", gap: 10 },
  typeOption: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  typeOptionSelected: {
    backgroundImage: "linear-gradient(145deg, #2A2624, #211E1C)",
    boxShadow: shadows.upSm,
  },
  typeOptionText: { ...body(600), fontSize: 15, color: colors.textTertiary },
  typeOptionTextSelected: { ...body(700), fontSize: 15 },
  createButton: { height: 54, borderRadius: 17, boxShadow: shadows.glow },
  cancel: {
    alignSelf: "center",
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  cancelText: { ...body(600), fontSize: 15, color: colors.textSecondary },
});
