import { IconSymbol } from "@/components/ui/icon-symbol";
import type { SessionStep } from "@/types/session";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const GREEN = "#1a8f3c";
const RED = "#c62828";
const GREY = "#888";

// ---- Écart avec la dernière séance : ▲ +2 / ▼ −1 / = / 1ʳᵉ fois ----

function ProgressBadge({
  value,
  previousValue,
}: {
  value: number;
  previousValue: number | null;
}) {
  if (previousValue === null) {
    return <Text style={[styles.badgeText, { color: GREY }]}>1ʳᵉ fois</Text>;
  }

  const diff = value - previousValue;
  if (diff === 0) {
    return <Text style={[styles.badgeText, { color: GREY }]}>=</Text>;
  }

  const color = diff > 0 ? GREEN : RED;
  return (
    <View style={styles.badge}>
      <IconSymbol
        name={diff > 0 ? "arrow.up" : "arrow.down"}
        size={18}
        color={color}
      />
      <Text style={[styles.badgeText, { color }]}>
        {diff > 0 ? `+${diff}` : `−${Math.abs(diff)}`}
      </Text>
    </View>
  );
}

// ---- Une ligne = une série ----

function RecapSetRow({
  step,
  value,
  isEditing,
  onChangeValue,
}: {
  step: SessionStep;
  value: number;
  isEditing: boolean;
  onChangeValue: (value: number) => void;
}) {
  const unit = step.exerciseType === "reps" ? "reps" : "sec";

  return (
    <View style={styles.setRow}>
      <Text style={styles.setLabel}>Série {step.setNumber}</Text>
      {isEditing ? (
        <TextInput
          style={styles.setInput}
          keyboardType="number-pad"
          value={value.toString()}
          onChangeText={(text) => onChangeValue(parseInt(text) || 0)}
          selectTextOnFocus
        />
      ) : (
        <Text style={styles.setValue}>{value}</Text>
      )}
      <Text style={styles.setUnit}>{unit}</Text>
      <View style={styles.badgeSlot}>
        {!isEditing && (
          <ProgressBadge value={value} previousValue={step.previousValue} />
        )}
      </View>
    </View>
  );
}

// ---- L'écran de récap ----

export function SessionRecap({
  steps,
  values,
  onChangeValue,
  onSave,
  isSaving,
}: {
  steps: SessionStep[];
  values: Record<number, number>; // index de la série dans `steps` -> valeur réalisée
  onChangeValue: (stepIndex: number, value: number) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  // Regroupe les séries par bloc d'exercice : un nouveau bloc commence à chaque "série 1".
  // On garde l'index d'origine de chaque série pour pouvoir modifier `values`.
  const groups: { step: SessionStep; index: number }[][] = [];
  steps.forEach((step, index) => {
    if (step.setNumber === 1) groups.push([]);
    groups[groups.length - 1].push({ step, index });
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Récap de la séance</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing((v) => !v)}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? "Valider" : "Modifier"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {groups.map((group) => (
          <View key={group[0].index} style={styles.card}>
            <Text style={styles.cardTitle}>{group[0].step.exerciseName}</Text>
            {group.map(({ step, index }) => (
              <RecapSetRow
                key={index}
                step={step}
                value={values[index] ?? 0}
                isEditing={isEditing}
                onChangeValue={(value) => onChangeValue(index, value)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.saveButton, isSaving && { opacity: 0.5 }]}
        onPress={onSave}
        disabled={isSaving}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? "Enregistrement..." : "Enregistrer et terminer"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#000" },
  editButton: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  editButtonText: { fontWeight: "600", color: "#000" },
  list: { flex: 1 },
  listContent: { paddingBottom: 16 },
  card: {
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 6,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    gap: 8,
  },
  setLabel: { flex: 1, fontSize: 14, color: "#333" },
  setValue: {
    width: 60,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  setInput: {
    width: 60,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 6,
    textAlign: "center",
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  setUnit: { width: 32, fontSize: 13, color: "#666" },
  badgeSlot: { width: 70, alignItems: "flex-end" },
  badge: { flexDirection: "row", alignItems: "center", gap: 2 },
  badgeText: { fontSize: 14, fontWeight: "600" },
  saveButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
