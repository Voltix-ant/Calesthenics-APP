import { KeyboardAvoidingContainer } from "@/components/keyboard-avoiding-container";
import { FireButton } from "@/components/ui/fire-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Neu } from "@/components/ui/neu";
import {
  body,
  colors,
  display,
  em,
  fireStops,
  fonts,
  gradients,
  screenTop,
  shadows,
} from "@/constants/theme";
import { useCountdownBeeps } from "@/hooks/use-countdown-beeps";
import { formatDurationWithHundredths } from "@/utils/format-duration";
import { setAudioModeAsync } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useFocusEffect } from "expo-router";
import { useBottomTabBarHeight } from "expo-router/js-tabs";
import {
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  AppState,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  FeDropShadow,
  Filter,
  LinearGradient,
  Stop,
} from "react-native-svg";

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

// ---- Affichage 7 segments (police DSEG) ----

const pad2 = (n: number) => n.toString().padStart(2, "0");

// Découpe une durée pour l'affichage 7 segments : partie principale « m:ss. »
// (ou « h:mm:ss. » au-delà d'une heure) et centièmes à part. La taille baisse
// quand le texte s'allonge, pour tenir dans le cadran.
function segmentParts(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor(ms / 60_000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  const cs = Math.floor(ms / 10) % 100;
  const main = `${h > 0 ? `${h}:${pad2(m)}` : m}:${pad2(s)}.`;
  const size = h >= 10 ? 30 : h > 0 ? 36 : 46;
  return {
    main,
    // Segments éteints : même texte avec des 8 (tous les segments)
    ghostMain: main.replace(/\d/g, "8"),
    cs: pad2(cs),
    size,
    csSize: Math.round(size * 0.5),
  };
}

// Un texte 7 segments posé sur ses segments éteints (« 88:88. » très pâle).
// Le « . » de DSEG ne prend pas de place : il se superpose au chiffre d'avant.
function SegmentText({
  text,
  ghost,
  size,
  gradient,
  color,
}: {
  text: string;
  ghost: string;
  size: number;
  gradient?: string;
  color?: string;
}) {
  const style = [styles.segment, { fontSize: size, lineHeight: size }];
  return (
    <View>
      <Text style={[style, styles.segmentGhost]} importantForAccessibility="no">
        {ghost}
      </Text>
      <View style={styles.segmentOverlay}>
        {gradient ? (
          <GradientText style={style} gradient={gradient}>
            {text}
          </GradientText>
        ) : (
          <Text style={[style, { color }]}>{text}</Text>
        )}
      </View>
    </View>
  );
}

function SegmentDuration({ ms, gradient }: { ms: number; gradient: string }) {
  const parts = segmentParts(ms);
  return (
    <View
      style={styles.segmentRow}
      accessible
      accessibilityLabel={formatDurationWithHundredths(ms)}
    >
      <SegmentText
        text={parts.main}
        ghost={parts.ghostMain}
        size={parts.size}
        gradient={gradient}
      />
      <SegmentText
        text={parts.cs}
        ghost="88"
        size={parts.csSize}
        color={colors.textSecondary}
      />
    </View>
  );
}

// Arc lumineux qui tourne autour du cadran pendant le chrono (pour l'instant
// fixe : les animations viendront plus tard).
function RunningArc() {
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  return (
    <Svg
      width={280}
      height={280}
      viewBox="0 0 280 280"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="run-fire" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={fireStops[0]} />
          <Stop offset="1" stopColor={fireStops[2]} />
        </LinearGradient>
        {/* drop-shadow(0 0 6px …) en CSS = flou d'écart-type 3 en SVG */}
        <Filter id="run-glow" x="-20%" y="-20%" width="140%" height="140%">
          <FeDropShadow
            dx={0}
            dy={0}
            stdDeviation={3}
            floodColor="rgb(255,130,40)"
            floodOpacity={0.7}
          />
        </Filter>
      </Defs>
      <Circle
        cx={140}
        cy={140}
        r={radius}
        fill="none"
        stroke="url(#run-fire)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`110 ${circumference - 110}`}
        filter="url(#run-glow)"
      />
    </Svg>
  );
}

// ---- Sous-composant : menu déroulant de l'historique ----

function TimerHistory({ entries }: { entries: ChronoEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <Neu
      variant="in"
      style={[styles.history, expanded && styles.historyExpanded]}
    >
      <Pressable
        style={styles.historyHeader}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.historyTitle}>
          Historique <Text style={styles.historyCount}>({entries.length})</Text>
        </Text>
        <Chevron
          size={20}
          strokeWidth={2}
          color={expanded ? colors.fireMid : colors.textTertiary}
        />
      </Pressable>

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
    </Neu>
  );
}

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
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

  const running = phase === "timing";

  return (
    <KeyboardAvoidingContainer
      style={[styles.container, { paddingBottom: tabBarHeight + 8 }]}
    >
      <View style={[styles.header, { paddingTop: screenTop(48, insets.top) }]}>
        <Text style={styles.title} role="heading">
          Chrono
        </Text>
        <Neu
          variant="up-sm"
          style={styles.soundButton}
          pressedStyle={styles.pressed}
          onPress={() => setSoundEnabled((v) => !v)}
          accessibilityLabel={
            soundEnabled ? "Couper les bips" : "Activer les bips"
          }
        >
          {soundEnabled ? (
            <Volume2 size={22} strokeWidth={2} color={colors.tabActive} />
          ) : (
            <VolumeX size={22} strokeWidth={2} color={colors.textTertiary} />
          )}
        </Neu>
      </View>

      <View style={styles.main}>
        <View style={[styles.dial, running && styles.dialRunning]}>
          {running && <RunningArc />}
          <View style={[styles.dialInner, running && styles.dialInnerRunning]}>
            {phase === "idle" && (
              <>
                <Text style={styles.dialLabel}>Décompte</Text>
                {/* Le chiffre en dégradé est dessiné sous un champ au texte
                    transparent : on voit le dégradé, on tape dans le champ. */}
                <View style={styles.countdownField}>
                  <GradientText style={styles.countdownInputText}>
                    {countdownInput}
                  </GradientText>
                  <TextInput
                    style={[styles.countdownInputText, styles.countdownInput]}
                    keyboardType="number-pad"
                    value={countdownInput}
                    onChangeText={(text) =>
                      setCountdownInput(text.replace(/\D/g, "").slice(0, 3))
                    }
                    selectTextOnFocus
                    cursorColor={colors.fireMid}
                    selectionColor="rgba(255,138,31,0.35)"
                    accessibilityLabel="Décompte en secondes"
                  />
                </View>
                <Text style={styles.dialUnit}>sec</Text>
              </>
            )}

            {phase === "countdown" && (
              <GradientText style={styles.countdownDigit}>
                {countdownValue.toString()}
              </GradientText>
            )}

            {phase === "timing" && (
              <>
                <View style={styles.liveLabel}>
                  <View style={styles.liveDot} />
                  <Text style={styles.dialLabel}>En cours</Text>
                </View>
                <SegmentDuration ms={elapsedMs} gradient={gradients.fireLive} />
              </>
            )}

            {phase === "done" && finalMs !== null && (
              <>
                <Text style={styles.dialLabel}>Temps</Text>
                <SegmentDuration ms={finalMs} gradient={gradients.fireText} />
              </>
            )}
          </View>
        </View>

        <View style={styles.actionSlot}>
          {phase === "idle" && (
            <FireButton
              label="Lancer le chrono"
              onPress={handleStart}
              icon={
                <Play
                  size={18}
                  strokeWidth={2}
                  color={colors.onFire}
                  fill={colors.onFire}
                />
              }
              style={styles.actionButton}
              labelStyle={styles.actionLabel}
            />
          )}
          {phase === "timing" && (
            <FireButton
              label="Terminé"
              onPress={handleStop}
              icon={
                <Square
                  size={18}
                  strokeWidth={2}
                  color={colors.onFire}
                  fill={colors.onFire}
                />
              }
              style={styles.actionButton}
              labelStyle={styles.actionLabel}
            />
          )}
          {phase === "done" && (
            <Neu
              variant="up-sm"
              surface="flat"
              style={[styles.actionButton, styles.restartButton]}
              pressedStyle={styles.pressed}
              onPress={handleReset}
            >
              <RotateCcw size={18} strokeWidth={2} color={colors.fireMid} />
              <Text style={styles.restartLabel}>Recommencer</Text>
            </Neu>
          )}
        </View>

        <TimerHistory entries={history} />
      </View>
    </KeyboardAvoidingContainer>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background },
  header: {
    paddingLeft: 24,
    paddingRight: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { ...display(700), fontSize: 30, lineHeight: 33 },
  soundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { transform: [{ scale: 0.97 }] },
  main: {
    flex: 1,
    minHeight: 0,
    alignItems: "center",
    paddingTop: 22,
    paddingHorizontal: 24,
    gap: 24,
  },

  // Cadran
  dial: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundImage: "linear-gradient(145deg, #282422, #1E1B19)",
    boxShadow: shadows.up,
    alignItems: "center",
    justifyContent: "center",
  },
  dialRunning: {
    // Valeur de départ de l'animation « breathe » (chrono en cours)
    boxShadow: `${shadows.up}, 0 0 40px -10px rgba(255,110,30,0.25)`,
  },
  dialInner: {
    width: 232,
    height: 232,
    borderRadius: 116,
    backgroundColor: colors.background,
    boxShadow: shadows.in,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dialInnerRunning: { gap: 14 },
  dialLabel: {
    ...body(600),
    fontSize: 12,
    letterSpacing: em(0.14, 12),
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  dialUnit: { ...body(500), fontSize: 15, color: colors.textSecondary },
  countdownField: { width: 140, alignItems: "center" },
  countdownInputText: {
    ...display(700),
    fontSize: 80,
    lineHeight: 84,
    textAlign: "center",
  },
  countdownInput: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Texte invisible mais pas "transparent" : Android traite cette valeur
    // comme « pas de couleur » et dessine alors le texte en noir.
    color: "#FFFFFF01",
    padding: 0,
  },
  countdownDigit: { ...display(700), fontSize: 120, lineHeight: 120 },
  liveLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.fireMid,
    boxShadow: `0 0 8px ${colors.fireMid}`,
  },

  // Affichage 7 segments
  segmentRow: { flexDirection: "row", alignItems: "flex-end", gap: 5 },
  segment: {
    fontFamily: fonts.segment,
    includeFontPadding: false,
    color: colors.text,
  },
  segmentGhost: { color: "rgba(255,236,220,0.055)" },
  segmentOverlay: { position: "absolute", top: 0, left: 0 },

  // Bouton d'action
  actionSlot: { alignSelf: "stretch", height: 62 },
  actionButton: { height: 62, borderRadius: 20, gap: 10 },
  actionLabel: { fontSize: 17 },
  restartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  restartLabel: { ...body(600), fontSize: 17 },

  // Historique
  history: {
    alignSelf: "stretch",
    borderRadius: 22,
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  historyExpanded: { paddingBottom: 10 },
  historyHeader: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  historyTitle: { ...body(600), fontSize: 16 },
  historyCount: { color: colors.textSecondary },
  historyEmpty: {
    ...body(400),
    paddingTop: 10,
    paddingBottom: 6,
    fontSize: 15,
    color: colors.textTertiary,
  },
  historyList: { maxHeight: 132 },
  historyRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,236,220,0.06)",
  },
  historyNumber: {
    ...body(600),
    width: 44,
    fontSize: 14,
    color: colors.textTertiary,
  },
  historyValue: { ...display(700), flex: 1, fontSize: 18 },
  historyTime: {
    ...body(400),
    fontSize: 14,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
});
