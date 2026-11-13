import { Check, Pencil } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FireButton } from "@/components/ui/fire-button";
import { Neu } from "@/components/ui/neu";
import { NeuTextInput } from "@/components/ui/neu-text-input";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { body, colors, display } from "@/constants/theme";
import type { SessionStep } from "@/types/session";

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
      {/* Alignés sur la ligne de base du texte ; centrés quand la valeur
          devient un champ */}
      <View style={[styles.valueGroup, isEditing && styles.valueGroupEditing]}>
        {isEditing ? (
          <NeuTextInput
            variant="in-sm"
            containerStyle={styles.valueField}
            style={styles.valueInput}
            keyboardType="number-pad"
            value={value.toString()}
            onChangeText={(text) => onChangeValue(parseInt(text) || 0)}
            selectTextOnFocus
            accessibilityLabel={`Valeur série ${step.setNumber}`}
          />
        ) : (
          <Text style={styles.value}>{value}</Text>
        )}
        <Text style={styles.unit}>{unit}</Text>
      </View>
      {!isEditing && (
        <ProgressIndicator value={value} previousValue={step.previousValue} />
      )}
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
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);

  // Regroupe les séries par bloc d'exercice : un nouveau bloc commence à chaque "série 1".
  // On garde l'index d'origine de chaque série pour pouvoir modifier `values`.
  const groups: { step: SessionStep; index: number }[][] = [];
  steps.forEach((step, index) => {
    if (step.setNumber === 1) groups.push([]);
    groups[groups.length - 1].push({ step, index });
  });

  const EditIcon = isEditing ? Check : Pencil;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { paddingBottom: 36 + insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title} role="heading">
          Récap de la séance
        </Text>
        <Neu
          variant="up-sm"
          style={styles.editButton}
          onPress={() => setIsEditing((v) => !v)}
        >
          <EditIcon size={16} strokeWidth={2} color={colors.fireMid} />
          <Text style={styles.editLabel}>
            {isEditing ? "Valider" : "Modifier"}
          </Text>
        </Neu>
      </View>

      {groups.map((group) => (
        <Neu
          key={group[0].index}
          variant="up"
          surface="card"
          style={styles.card}
        >
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
        </Neu>
      ))}

      <FireButton
        label={isSaving ? "Enregistrement..." : "Enregistrer et terminer"}
        onPress={onSave}
        disabled={isSaving}
        style={[styles.saveButton, isSaving && styles.saving]}
        labelStyle={styles.saveLabel}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    // Permet au bouton (marginTop: "auto") de se caler en bas de l'écran
    // quand le récap est court
    flexGrow: 1,
    paddingTop: 28,
    paddingHorizontal: 24,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { ...display(700), fontSize: 26, lineHeight: 26 * 1.1, flexShrink: 1 },
  editButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editLabel: { ...body(600), fontSize: 15 },
  card: {
    borderRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  cardTitle: { ...display(700), fontSize: 18, marginBottom: 6 },
  setRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,236,220,0.06)",
  },
  setLabel: {
    ...body(600),
    width: 60,
    fontSize: 14,
    color: colors.textTertiary,
  },
  valueGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  valueGroupEditing: { alignItems: "center" },
  value: { ...display(700), fontSize: 20 },
  valueField: { width: 76, height: 40, borderRadius: 14 },
  valueInput: { ...display(700), fontSize: 20, textAlign: "center" },
  unit: { ...body(400), fontSize: 14, color: colors.textSecondary },
  saveButton: { marginTop: "auto", height: 64, borderRadius: 22 },
  saveLabel: { fontSize: 18 },
  saving: { opacity: 0.6 },
});
