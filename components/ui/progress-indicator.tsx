import { ArrowDown, ArrowUp } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Neu } from "@/components/ui/neu";
import { body, colors, gradients } from "@/constants/theme";

/**
 * Écart avec la dernière séance, en pastille :
 * - mieux : ↑ +n sur fond feu ;
 * - moins bien : ↓ −n en creux bleu-gris (jamais en rouge : le rouge fait
 *   partie du feu) ;
 * - pareil : « = » en creux ;
 * - première fois : « 1ʳᵉ fois » en relief jaune.
 */
export function ProgressIndicator({
  value,
  previousValue,
}: {
  value: number;
  previousValue: number | null;
}) {
  if (previousValue === null) {
    return (
      <Neu variant="up-sm" style={[styles.chip, styles.padFirst]}>
        <Text style={[styles.text, styles.firstText]}>1ʳᵉ fois</Text>
      </Neu>
    );
  }

  const diff = value - previousValue;

  if (diff === 0) {
    return (
      <Neu
        variant="in-sm"
        style={[styles.chip, styles.padEqual]}
        accessibilityLabel="Pareil que la dernière fois"
      >
        <Text style={[styles.text, styles.equalText]}>=</Text>
      </Neu>
    );
  }

  if (diff > 0) {
    return (
      <View style={[styles.chip, styles.pad, styles.up]}>
        <ArrowUp size={13} strokeWidth={2.5} color={colors.onFire} />
        <Text style={[styles.text, styles.upText]}>+{diff}</Text>
      </View>
    );
  }

  return (
    <Neu variant="in-sm" style={[styles.chip, styles.pad]}>
      <ArrowDown size={13} strokeWidth={2.5} color={colors.decrease} />
      <Text style={[styles.text, styles.downText]}>−{Math.abs(diff)}</Text>
    </Neu>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 30,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pad: { paddingHorizontal: 11 },
  padEqual: { paddingHorizontal: 13 },
  padFirst: { paddingHorizontal: 12 },
  up: { backgroundImage: gradients.fire },
  text: { ...body(700), fontSize: 14 },
  upText: { color: colors.onFire },
  downText: { color: colors.decrease },
  equalText: { fontSize: 15, color: colors.textSecondary },
  firstText: { fontSize: 13, color: colors.firstTime },
});
