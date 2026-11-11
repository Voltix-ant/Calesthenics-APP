import { KeyboardAvoidingContainer } from "@/components/keyboard-avoiding-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useCountdownBeeps } from "@/hooks/use-countdown-beeps";
import { formatDurationWithHundredths } from "@/utils/format-duration";
import { setAudioModeAsync } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useFocusEffect } from "expo-router";
import { useEffect, useState } from "react";
import {
  AppState,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_COUNTDOWN_SECONDS = 5;
const KEEP_AWAKE_TAG = "timer-screen";

type ChronoEntry = {
  finishedAt: number; // horodatage (ms) de l'appui sur "Terminé"
  ms: number;
};

// "14:32"
const formatClockTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

// ---- Sous-composant : menu déroulant de l'historique ----

function TimerHistory({ entries }: { entries: ChronoEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.history}>
      <TouchableOpacity
        style={styles.historyHeader}
        onPress={() => setExpanded((v) => !v)}
      >
        <Text style={styles.historyTitle}>Historique ({entries.length})</Text>
        <Text style={styles.historyChevron}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {expanded &&
        (entries.length === 0 ? (
          <Text style={styles.historyEmpty}>Aucun chrono pour l'instant.</Text>
        ) : (
          <ScrollView style={styles.historyList}>
            {entries.map((entry, index) => (
              <View key={entry.finishedAt} style={styles.historyRow}>
                <Text style={styles.historyNumber}>
                  #{entries.length - index}
                </Text>
                <Text style={styles.historyValue}>
                  {formatDurationWithHundredths(entry.ms)}
                </Text>
                <Text style={styles.historyTime}>
                  {formatClockTime(entry.finishedAt)}
                </Text>
              </View>
            ))}
          </ScrollView>
        ))}
    </View>
  );
}

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Historique des chronos de cette ouverture de l'appli. Simple state, pas de
  // BDD : l'onglet reste monté tant que l'appli tourne, donc l'historique
  // survit aux changements d'onglet, mais disparaît quand on ferme l'appli.
  const [history, setHistory] = useState<ChronoEntry[]>([]);

  // ---- Écran toujours allumé tant qu'on est sur cet onglet ----
  // Les onglets restent montés quand on en change : un useKeepAwake() garderait
  // le téléphone allumé même sur les autres onglets. useFocusEffect active le
  // maintien à l'arrivée sur l'onglet, et sa fonction de nettoyage le coupe
  // quand on le quitte.
  useFocusEffect(() => {
    activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  });

  // Champ texte (et pas un nombre) pour pouvoir l'effacer pendant la saisie
  const [countdownInput, setCountdownInput] = useState(
    DEFAULT_COUNTDOWN_SECONDS.toString(),
  );

  // ---- Chrono basé sur l'horloge, comme dans l'écran de séance ----
  // On mémorise l'heure de lancement et la durée du décompte choisie ;
  // tout le reste (phase, valeur affichée) est calculé à partir de "now".
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [countdownMs, setCountdownMs] = useState(0);
  const [finalMs, setFinalMs] = useState<number | null>(null);

  const phase: "idle" | "countdown" | "timing" | "done" =
    finalMs !== null
      ? "done"
      : startedAt === null
        ? "idle"
        : now - startedAt < countdownMs
          ? "countdown"
          : "timing";
  const countdownValue =
    startedAt === null
      ? 0
      : Math.ceil((countdownMs - (now - startedAt)) / 1000);
  const elapsedMs =
    phase === "timing" && startedAt !== null
      ? now - startedAt - countdownMs
      : 0;

  // ---- Bips du décompte : un par seconde à partir de 5, puis un autre à 0 ----
  useCountdownBeeps({
    countdownStartedAt: startedAt,
    countdownMs,
    enabled: soundEnabled,
  });

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    });
  }, []);

  // ---- Horloge : "now" mis à jour à chaque image affichée (~60 fois/s) pour
  // que les centièmes défilent, seulement pendant que le chrono tourne ----
  // requestAnimationFrame appelle la fonction juste avant le prochain
  // rafraîchissement de l'écran ; en la rappelant à chaque fois, on obtient une
  // boucle calée sur l'écran (et mise en pause automatiquement en arrière-plan).
  const isRunning = phase === "countdown" || phase === "timing";
  useEffect(() => {
    if (!isRunning) return;
    let frameId = 0;
    const loop = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => {
      cancelAnimationFrame(frameId);
      subscription.remove();
    };
  }, [isRunning]);

  // ---- Actions ----

  const handleStart = () => {
    Keyboard.dismiss();
    const seconds = Math.max(0, parseInt(countdownInput) || 0);
    setCountdownInput(seconds.toString()); // remet un nombre propre dans le champ
    const t = Date.now();
    setNow(t);
    setCountdownMs(seconds * 1000);
    setStartedAt(t);
  };

  const handleStop = () => {
    // Heure exacte plutôt que "elapsedMs", qui date de la dernière image affichée
    if (startedAt === null) return;
    const t = Date.now();
    const ms = Math.max(0, t - startedAt - countdownMs);
    setFinalMs(ms);
    // Le plus récent en premier (nouveau tableau : on ne mute jamais le state)
    setHistory((prev) => [{ finishedAt: t, ms }, ...prev]);
  };

  const handleReset = () => {
    setStartedAt(null);
    setFinalMs(null);
  };

  return (
    <KeyboardAvoidingContainer
      style={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chrono</Text>
        <TouchableOpacity
          onPress={() => setSoundEnabled((v) => !v)}
          hitSlop={12}
        >
          <IconSymbol
            size={24}
            name={soundEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill"}
            color="#000"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.centerContent}>
        {phase === "idle" && (
          <>
            <View style={styles.countdownRow}>
              <Text style={styles.label}>Décompte</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={countdownInput}
                onChangeText={setCountdownInput}
                selectTextOnFocus
              />
              <Text style={styles.unit}>sec</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStart}
            >
              <Text style={styles.primaryButtonText}>Lancer le chrono</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === "countdown" && (
          <Text style={styles.countdown}>{countdownValue}</Text>
        )}

        {phase === "timing" && (
          <>
            <Text style={styles.timer}>
              {formatDurationWithHundredths(elapsedMs)}
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleStop}>
              <Text style={styles.primaryButtonText}>Terminé</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === "done" && finalMs !== null && (
          <>
            <Text style={styles.label}>Temps</Text>
            <Text style={styles.timer}>
              {formatDurationWithHundredths(finalMs)}
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleReset}
            >
              <Text style={styles.primaryButtonText}>Recommencer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <TimerHistory entries={history} />
    </KeyboardAvoidingContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#000" },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  label: { fontSize: 16, color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    width: 70,
    textAlign: "center",
    fontSize: 20,
    color: "#000",
  },
  unit: { fontSize: 15, color: "#666" },
  countdown: { fontSize: 64, fontWeight: "bold", color: "#000" },
  timer: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 24,
    fontVariant: ["tabular-nums"], // chiffres de même largeur : le texte ne tremble pas
  },
  primaryButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  history: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    overflow: "hidden",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fafafa",
  },
  historyTitle: { fontSize: 15, fontWeight: "600", color: "#000" },
  historyChevron: { fontSize: 12, color: "#888" },
  historyEmpty: { padding: 14, color: "#888", fontStyle: "italic" },
  historyList: { maxHeight: 220 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  historyNumber: { width: 44, fontSize: 14, color: "#888" },
  historyValue: { flex: 1, fontSize: 16, fontWeight: "600", color: "#000" },
  historyTime: { fontSize: 14, color: "#888" },
});
