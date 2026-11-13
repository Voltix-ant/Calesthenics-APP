import { Volume2, VolumeX, X } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GradientText } from "@/components/ui/gradient-text";
import { Neu } from "@/components/ui/neu";
import { ProgressBar } from "@/components/ui/progress-bar";
import { colors, display, screenTop } from "@/constants/theme";
import { useSecondsSince } from "@/hooks/use-second-cycle";
import { formatDuration } from "@/utils/format-duration";

// Barre du haut de la séance : durée totale (avec le point « en direct »),
// boutons son et abandon, puis la progression.
export function SessionTopBar({
  startedAt,
  progressPercent,
  soundEnabled,
  onToggleSound,
  onAbort,
}: {
  /** Heure de lancement de la séance */
  startedAt: number;
  progressPercent: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onAbort: () => void;
}) {
  const insets = useSafeAreaInsets();
  const elapsedSeconds = useSecondsSince(startedAt);
  const percentLabel = `${progressPercent}%`;

  return (
    <View style={[styles.bar, { paddingTop: screenTop(44, insets.top) }]}>
      <View style={styles.row}>
        <View style={styles.clock}>
          <View style={styles.liveDot} />
          <Text style={styles.clockText}>{formatDuration(elapsedSeconds)}</Text>
        </View>
        <Neu
          variant="up-sm"
          style={styles.roundButton}
          onPress={onToggleSound}
          accessibilityLabel={soundEnabled ? "Couper le son" : "Activer le son"}
        >
          {soundEnabled ? (
            <Volume2 size={20} strokeWidth={2} color={colors.tabActive} />
          ) : (
            <VolumeX size={20} strokeWidth={2} color={colors.textTertiary} />
          )}
        </Neu>
        <Neu
          variant="up-sm"
          style={styles.roundButton}
          onPress={onAbort}
          accessibilityLabel="Abandonner l'entrainement"
        >
          <X size={18} strokeWidth={2} color={colors.textSecondary} />
        </Neu>
      </View>

      <View style={styles.row}>
        <ProgressBar percent={progressPercent} />
        <View style={styles.percent}>
          {progressPercent >= 100 ? (
            <GradientText style={styles.percentText}>
              {percentLabel}
            </GradientText>
          ) : (
            <Text style={[styles.percentText, styles.percentMuted]}>
              {percentLabel}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 20, gap: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  clock: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.fireMid,
    boxShadow: `0 0 10px ${colors.fireMid}`,
  },
  clockText: { ...display(700), fontSize: 22 },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  percent: { minWidth: 44, alignItems: "flex-end" },
  percentText: { ...display(700), fontSize: 15 },
  percentMuted: { color: colors.textSecondary },
});
