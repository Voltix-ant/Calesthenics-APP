import { Minus, Plus } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { Neu } from "@/components/ui/neu";
import { NeuTextInput } from "@/components/ui/neu-text-input";
import { colors, display, pressed } from "@/constants/theme";

const HOLD_DELAY_MS = 400; // délai avant le début de la répétition
const HOLD_INTERVAL_MS = 100; // vitesse de la répétition (plus petit = plus rapide)

// Bouton rond −/+ qui répète son action tant qu'on le maintient appuyé.
function HoldButton({
  delta,
  onAdjust,
  accessibilityLabel,
}: {
  delta: number;
  onAdjust: (delta: number) => void;
  accessibilityLabel: string;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    stop(); // sécurité : on repart toujours de zéro
    onAdjust(delta); // 1er appui : on change tout de suite de 1
    timeoutRef.current = setTimeout(() => {
      // si le doigt reste appuyé, on répète
      intervalRef.current = setInterval(
        () => onAdjust(delta),
        HOLD_INTERVAL_MS,
      );
    }, HOLD_DELAY_MS);
  };

  // Nettoyage si l'écran disparaît pendant qu'on appuie
  useEffect(() => stop, []);

  const Icon = delta > 0 ? Plus : Minus;

  return (
    <Neu
      variant="up-sm"
      style={styles.button}
      pressedStyle={pressed}
      onPressIn={start}
      onPressOut={stop}
      accessibilityLabel={accessibilityLabel}
    >
      <Icon size={22} strokeWidth={2} color={colors.text} />
    </Neu>
  );
}

/**
 * Réglage d'une valeur : − / champ / +. Un appui change la valeur de 1, un
 * appui maintenu répète. Le champ se modifie aussi au clavier.
 * `onAdjust` reçoit l'écart (+1 / −1) : le parent applique la limite à 0.
 */
export function Stepper({
  value,
  onChange,
  onAdjust,
}: {
  value: number;
  onChange: (value: number) => void;
  onAdjust: (delta: number) => void;
}) {
  return (
    <View style={styles.row}>
      <HoldButton
        delta={-1}
        onAdjust={onAdjust}
        accessibilityLabel="Retirer 1"
      />
      <NeuTextInput
        containerStyle={styles.field}
        style={styles.input}
        keyboardType="number-pad"
        value={value.toString()}
        onChangeText={(text) => onChange(parseInt(text) || 0)}
        accessibilityLabel="Valeur réalisée"
      />
      <HoldButton
        delta={1}
        onAdjust={onAdjust}
        accessibilityLabel="Ajouter 1"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  field: { width: 104, height: 68, borderRadius: 20 },
  input: { ...display(700), fontSize: 40, textAlign: "center" },
});
