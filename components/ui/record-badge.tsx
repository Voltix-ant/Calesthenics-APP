import { Trophy } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { FireGradientDef } from "@/components/ui/fire-gradient-def";
import { Neu } from "@/components/ui/neu";
import { body, colors, display } from "@/constants/theme";

// Les trois tailles des maquettes : exercice en attente (lg), chrono (md),
// décompte (sm).
const SIZES = {
  lg: {
    height: 52,
    padLeft: 7,
    padRight: 20,
    gap: 12,
    circle: 38,
    icon: 20,
    value: 22,
    unit: 15,
    unitGap: 6,
  },
  md: {
    height: 48,
    padLeft: 6,
    padRight: 18,
    gap: 10,
    circle: 36,
    icon: 18,
    value: 20,
    unit: 14,
    unitGap: 5,
  },
  sm: {
    height: 44,
    padLeft: 5,
    padRight: 16,
    gap: 10,
    circle: 34,
    icon: 18,
    value: 18,
    unit: 14,
    unitGap: 5,
  },
} as const;

/**
 * Pastille « record sur cette série » : trophée au trait en dégradé dans un
 * creux, puis la valeur. Le libellé n'est pas affiché (lu par le lecteur
 * d'écran). `value` à null : pas encore de record, affiche « — ».
 */
export function RecordBadge({
  value,
  unit,
  size,
}: {
  value: number | null;
  unit: string;
  size: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  const gradientId = `trophy-${size}`;

  return (
    <Neu
      variant="up-sm"
      style={[
        styles.badge,
        {
          height: s.height,
          paddingLeft: s.padLeft,
          paddingRight: s.padRight,
          gap: s.gap,
        },
      ]}
    >
      <View
        accessible
        accessibilityLabel={`Record sur cette série : ${value === null ? "aucun" : `${value} ${unit}`}`}
        style={[styles.row, { gap: s.gap }]}
      >
        <Neu
          variant="in-sm"
          style={[
            styles.circle,
            { width: s.circle, height: s.circle, borderRadius: s.circle / 2 },
          ]}
        >
          <Trophy size={s.icon} strokeWidth={2} color={`url(#${gradientId})`}>
            <FireGradientDef id={gradientId} />
          </Trophy>
        </Neu>
        <View style={[styles.value, { gap: s.unitGap }]}>
          <Text style={[styles.valueText, { fontSize: s.value }]}>
            {value ?? "—"}
          </Text>
          {value !== null && (
            <Text style={[styles.unitText, { fontSize: s.unit }]}>{unit}</Text>
          )}
        </View>
      </View>
    </Neu>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
  row: { flexDirection: "row", alignItems: "center" },
  circle: { alignItems: "center", justifyContent: "center" },
  value: { flexDirection: "row", alignItems: "baseline" },
  valueText: { ...display(700) },
  unitText: { ...body(600), color: colors.textSecondary },
});
