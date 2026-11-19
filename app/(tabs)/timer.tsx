import { KeyboardAvoidingContainer } from "@/components/keyboard-avoiding-container";
import { FireButton } from "@/components/ui/fire-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Neu } from "@/components/ui/neu";
import { RiseOnTab } from "@/components/ui/rise-on-tab";
import { Ring } from "@/components/ui/ring";
import { appear, EASE_OUT, growOut, pop, rise } from "@/constants/animations";
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
import { useCountdownDigitStyle } from "@/hooks/use-countdown-digit-style";
import { usePulse } from "@/hooks/use-pulse";
import { useSecondCycle, useSecondsUntil } from "@/hooks/use-second-cycle";
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
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

const DEFAULT_COUNTDOWN_SECONDS = 5;
const KEEP_AWAKE_TAG = "timer-screen";

// Courbe CSS « ease-out » de l'onde du décompte
const BEAT_EASING = Easing.bezierFn(0, 0, 0.58, 1);

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
  flow,
  color,
}: {
  text: string;
  ghost: string;
  size: number;
  gradient?: string;
  flow?: boolean;
  color?: string;
}) {
  const style = [styles.segment, { fontSize: size, lineHeight: size }];
  return (
    <View>
      <Text style={[style, styles.segmentGhost]} importantForAccessibility="no">
        {ghost}
      </Text>
      <View style={styles.segmentOverlay}>
        {gradient || flow ? (
          <GradientText style={style} gradient={gradient} flow={flow}>
            {text}
          </GradientText>
        ) : (
          <Text style={[style, { color }]}>{text}</Text>
        )}
      </View>
    </View>
  );
}

function SegmentDuration({
  ms,
  gradient,
  flow,
}: {
  ms: number;
  gradient?: string;
  flow?: boolean;
}) {
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
        flow={flow}
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

// Temps qui défile au centième. Ce composant a sa propre boucle d'affichage
// (une mise à jour par image) : lui seul est redessiné 60 fois par seconde,
// pas tout l'écran, ce qui laisse les animations fluides.
function RunningDuration({ startedAt }: { startedAt: number }) {
  const [elapsedMs, setElapsedMs] = useState(() =>
    Math.max(0, Date.now() - startedAt),
  );

  useEffect(() => {
    let frameId = 0;
    const loop = () => {
      setElapsedMs(Math.max(0, Date.now() - startedAt));
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [startedAt]);

  return <SegmentDuration ms={elapsedMs} flow />;
}

// ---- Cadran : décompte ----

// Chiffre du décompte, changé pile à chaque seconde, avec la même animation
// que dans la séance (grossi → posé → s'efface). Première seconde : simple
// fondu, pour prendre le relais du chiffre saisi qui grossit (voir growOut).
function CountdownDisplay({
  startedAt,
  endsAt,
}: {
  startedAt: number;
  endsAt: number;
}) {
  const reducedMotion = useReducedMotion();
  const digit = useSecondsUntil(endsAt);
  const { cycle, elapsed } = useSecondCycle(startedAt, !reducedMotion);
  const digitStyle = useCountdownDigitStyle(cycle, elapsed, true);

  return (
    <Animated.View style={reducedMotion ? undefined : digitStyle}>
      <GradientText style={styles.countdownDigit}>
        {digit.toString()}
      </GradientText>
    </Animated.View>
  );
}

// Anneau de feu du décompte : se vide entièrement à chaque seconde.
function CountdownRing({ startedAt }: { startedAt: number }) {
  const reducedMotion = useReducedMotion();
  const { cycle } = useSecondCycle(startedAt, !reducedMotion);
  const progress = useDerivedValue(() => 1 - cycle.value);
  return (
    <Ring
      id="chrono-countdown"
      size={280}
      radius={128}
      strokeWidth={6}
      trackColor="#191716"
      progress={reducedMotion ? 1 : progress}
    />
  );
}

// Onde du décompte : un anneau orange qui s'élargit de 0 à 34 dp autour du
// cadran en s'effaçant, une fois par seconde. Dans la maquette c'est une
// ombre CSS avec « spread » ; ici un disque orange derrière le cadran, qu'on
// agrandit (même rendu).
function CountdownBeat({ startedAt }: { startedAt: number }) {
  const { cycle } = useSecondCycle(startedAt);
  const beatStyle = useAnimatedStyle(() => {
    const t = BEAT_EASING(cycle.value);
    return {
      opacity: 1 - t,
      transform: [{ scale: 1 + (t * 34) / 140 }],
    };
  });
  return <Animated.View style={[styles.beat, beatStyle]} />;
}

// ---- Cadran : chrono en cours ----

// Arc lumineux qui fait le tour du cadran en une seconde, calé sur les
// secondes du chrono.
function RunningArc({ startedAt }: { startedAt: number }) {
  const reducedMotion = useReducedMotion();
  const { cycle } = useSecondCycle(startedAt, !reducedMotion);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${cycle.value * 360}deg` }],
  }));

  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const dash = `110 ${circumference - 110}`;
  // Lueur : traits plus larges et transparents sous l'arc (un flou SVG serait
  // recalculé à chaque image)
  const glowLayers = [
    { extraWidth: 12, opacity: 0.08 },
    { extraWidth: 7, opacity: 0.16 },
    { extraWidth: 3, opacity: 0.28 },
  ];

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, spinStyle]}
      pointerEvents="none"
    >
      <Svg width={280} height={280} viewBox="0 0 280 280">
        <Defs>
          <LinearGradient id="run-fire" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={fireStops[0]} />
            <Stop offset="1" stopColor={fireStops[2]} />
          </LinearGradient>
        </Defs>
        {glowLayers.map((layer) => (
          <Circle
            key={layer.extraWidth}
            cx={140}
            cy={140}
            r={radius}
            fill="none"
            stroke="rgb(255,130,40)"
            strokeWidth={5 + layer.extraWidth}
            strokeLinecap="round"
            strokeDasharray={dash}
            opacity={layer.opacity}
          />
        ))}
        <Circle
          cx={140}
          cy={140}
          r={radius}
          fill="none"
          stroke="url(#run-fire)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={dash}
        />
      </Svg>
    </Animated.View>
  );
}

// Lueur du cadran qui respire (2 s) pendant le chrono. Une ombre ne s'anime
// pas directement : deux lueurs superposées dont les opacités varient en sens
// inverse.
function DialBreath() {
  const reducedMotion = useReducedMotion();
  const pulse = usePulse(!reducedMotion, 1000);
  const softStyle = useAnimatedStyle(() => ({ opacity: 1 - pulse.value }));
  const strongStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <>
      <Animated.View
        style={[styles.dialGlow, styles.dialGlowSoft, softStyle]}
      />
      <Animated.View
        style={[styles.dialGlow, styles.dialGlowStrong, strongStyle]}
      />
    </>
  );
}

// Point « en direct » qui pulse (1 s)
function LiveDot() {
  const reducedMotion = useReducedMotion();
  const pulse = usePulse(!reducedMotion, 500);
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 1 - 0.7 * pulse.value,
    transform: [{ scale: 1 - 0.4 * pulse.value }],
  }));
  return <Animated.View style={[styles.liveDot, dotStyle]} />;
}

// ---- Sous-composant : menu déroulant de l'historique ----

function TimerHistory({ entries }: { entries: ChronoEntry[] }) {
  const reducedMotion = useReducedMotion();
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
              <Animated.View
                key={entry.finishedAt}
                style={styles.historyRow}
                entering={
                  reducedMotion
                    ? undefined
                    : rise(0, { distance: 10, duration: 400, easing: EASE_OUT })
                }
              >
                <Text style={styles.historyNumber}>
                  #{entries.length - index}
                </Text>
                <Text style={styles.historyValue}>
                  {formatDurationWithHundredths(entry.ms)}
                </Text>
                <Text style={styles.historyTime}>
                  {formatClockTime(entry.finishedAt)}
                </Text>
              </Animated.View>
            ))}
          </ScrollView>
        ))}
    </Neu>
  );
}

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const reducedMotion = useReducedMotion();
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
  // On mémorise l'heure de lancement et la durée du décompte choisie ; la
  // phase se déduit de "now". Les chiffres qui défilent ont leur propre
  // horloge (RunningDuration, CountdownDisplay) : l'écran entier n'est
  // redessiné qu'aux changements de phase.
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
  const timingStartedAt = startedAt === null ? 0 : startedAt + countdownMs;

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

  // ---- Passage du décompte au chrono : un minuteur réveille l'écran pile à
  // la fin du décompte ; resynchronisation au retour sur l'appli ----
  useEffect(() => {
    if (phase !== "countdown") return;
    const timeoutId = setTimeout(
      () => setNow(Date.now()),
      timingStartedAt - Date.now() + 5,
    );
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => {
      clearTimeout(timeoutId);
      subscription.remove();
    };
  }, [phase, timingStartedAt]);

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
    // Heure exacte au moment de l'appui
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
  // Animation d'entrée/sortie, sauf si « Réduire les animations » est activé
  function motion<T>(animation: T) {
    return reducedMotion ? undefined : animation;
  }

  return (
    <KeyboardAvoidingContainer
      style={[styles.container, { paddingBottom: tabBarHeight + 8 }]}
    >
      {/* Lueur orangée derrière le cadran pendant le chrono, en fondu */}
      {running && (
        <Animated.View
          pointerEvents="none"
          style={styles.backgroundGlow}
          entering={motion(FadeIn.duration(600))}
          exiting={motion(FadeOut.duration(400))}
        />
      )}
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
        {/* Les blocs apparaissent en cascade, rejouée à chaque retour sur
            l'onglet */}
        <RiseOnTab style={styles.dialWrapper}>
          {phase === "countdown" && !reducedMotion && startedAt !== null && (
            <CountdownBeat startedAt={startedAt} />
          )}
          <View style={styles.dial}>
            {/* Passage décompte → chrono : l'anneau du décompte s'efface,
                l'arc et la lueur du chrono arrivent en fondu */}
            {phase === "countdown" && startedAt !== null && (
              <Animated.View
                style={StyleSheet.absoluteFill}
                exiting={motion(FadeOut.duration(250))}
              >
                <CountdownRing startedAt={startedAt} />
              </Animated.View>
            )}
            {running && (
              <Animated.View
                style={StyleSheet.absoluteFill}
                entering={motion(FadeIn.duration(500))}
                exiting={motion(FadeOut.duration(300))}
              >
                <DialBreath />
                <RunningArc startedAt={timingStartedAt} />
              </Animated.View>
            )}
            <View
              style={[styles.dialInner, running && styles.dialInnerRunning]}
            >
              {/* Au lancement, « Décompte » et « sec » s'effacent et le
                  chiffre grossit en s'effaçant, pendant que le chiffre du
                  décompte apparaît à sa place */}
              {phase === "idle" && (
                <>
                  <Animated.Text
                    style={styles.dialLabel}
                    exiting={reducedMotion ? undefined : FadeOut.duration(200)}
                  >
                    Décompte
                  </Animated.Text>
                  {/* Le chiffre en dégradé est dessiné sous un champ au texte
                      transparent : on voit le dégradé, on tape dans le champ. */}
                  <Animated.View
                    style={styles.countdownField}
                    exiting={reducedMotion ? undefined : growOut()}
                  >
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
                  </Animated.View>
                  <Animated.Text
                    style={styles.dialUnit}
                    exiting={reducedMotion ? undefined : FadeOut.duration(200)}
                  >
                    sec
                  </Animated.Text>
                </>
              )}

              {phase === "countdown" && startedAt !== null && (
                <CountdownDisplay
                  startedAt={startedAt}
                  endsAt={timingStartedAt}
                />
              )}

              {running && (
                <Animated.View
                  style={styles.runningContent}
                  entering={motion(appear())}
                >
                  <View style={styles.liveLabel}>
                    <LiveDot />
                    <Text style={styles.dialLabel}>En cours</Text>
                  </View>
                  <RunningDuration startedAt={timingStartedAt} />
                </Animated.View>
              )}

              {phase === "done" && finalMs !== null && (
                <>
                  <Text style={styles.dialLabel}>Temps</Text>
                  <Animated.View
                    entering={motion(pop({ from: 0.6, duration: 450 }))}
                  >
                    <SegmentDuration
                      ms={finalMs}
                      gradient={gradients.fireText}
                    />
                  </Animated.View>
                </>
              )}
            </View>
          </View>
        </RiseOnTab>

        <RiseOnTab delay={70} style={styles.actionSlot}>
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
          {running && (
            <Animated.View entering={motion(pop({ from: 0.6, duration: 450 }))}>
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
            </Animated.View>
          )}
          {phase === "done" && (
            <Animated.View entering={motion(pop({ from: 0.6, duration: 450 }))}>
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
            </Animated.View>
          )}
        </RiseOnTab>

        <RiseOnTab delay={140} style={styles.historyWrapper}>
          <TimerHistory entries={history} />
        </RiseOnTab>
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
  backgroundGlow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundImage: gradients.chronoGlow,
  },
  runningContent: { alignItems: "center", gap: 14 },
  dialWrapper: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  beat: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,120,40,0.55)",
  },
  dialGlow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 140,
  },
  // Lueurs de début/milieu de l'animation « breathe » (chrono en cours)
  dialGlowSoft: { boxShadow: "0 0 40px -10px rgba(255,110,30,0.25)" },
  dialGlowStrong: { boxShadow: "0 0 70px -6px rgba(255,110,30,0.5)" },
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
  historyWrapper: { alignSelf: "stretch" },
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
