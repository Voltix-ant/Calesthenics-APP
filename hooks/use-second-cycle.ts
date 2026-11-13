import { useEffect, useState } from "react";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";

// Secondes entières depuis (`since`) ou jusqu'à (`until`) une heure donnée.
const secondsAt = (time: number, mode: "since" | "until", now: number) =>
  mode === "since"
    ? Math.max(0, Math.floor((now - time) / 1000))
    : Math.max(0, Math.ceil((time - now) / 1000));

// Délai (ms) avant le prochain changement de la valeur ci-dessus.
const msUntilNextChange = (
  time: number,
  mode: "since" | "until",
  now: number,
) => {
  if (mode === "since") {
    const elapsed = now - time;
    return elapsed < 0 ? -elapsed : 1000 - (elapsed % 1000);
  }
  const remaining = time - now;
  if (remaining <= 0) return null; // compte à rebours terminé : plus rien à faire
  return remaining % 1000 || 1000;
};

// Valeur en secondes qui change pile à la seconde. Au lieu d'interroger
// l'horloge régulièrement (setInterval : le retard varie d'un tick à l'autre
// et rend les secondes affichées inégales), on programme un minuteur pour
// l'instant exact du prochain changement, recalculé à chaque fois depuis
// l'heure de référence : aucune dérive.
function useSecondsClock(time: number, mode: "since" | "until") {
  const [value, setValue] = useState(() => secondsAt(time, mode, Date.now()));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const now = Date.now();
      setValue(secondsAt(time, mode, now));
      const delay = msUntilNextChange(time, mode, now);
      // +5 ms : réveil juste après le changement, jamais juste avant
      if (delay !== null) timeoutId = setTimeout(tick, delay + 5);
    };
    tick();
    return () => clearTimeout(timeoutId);
  }, [time, mode]);

  return value;
}

/** Secondes entières écoulées depuis `startedAt`, changées pile à la seconde. */
export function useSecondsSince(startedAt: number) {
  return useSecondsClock(startedAt, "since");
}

/** Secondes restantes avant `endsAt` (arrondi au-dessus, 0 à la fin). */
export function useSecondsUntil(endsAt: number) {
  return useSecondsClock(endsAt, "until");
}

/**
 * Horloge des animations qui battent à la seconde, calée sur l'heure de
 * départ `startedAt` : elle reste synchrone avec les chiffres et les bips.
 *
 * - `cycle` (valeur partagée Reanimated) : position dans la seconde en cours,
 *   de 0 à 1, mise à jour à chaque image sur le thread de l'interface ;
 * - `elapsed` (valeur partagée) : temps écoulé en ms, au même rythme ;
 * - `second` (state React) : nombre de secondes entières écoulées.
 */
export function useSecondCycle(startedAt: number, enabled = true) {
  const cycle = useSharedValue(0);
  const elapsedMs = useSharedValue(0);
  // Repères pris à la première image : horodatage de l'image et temps déjà
  // écoulé depuis `startedAt` à ce moment-là.
  const firstFrameTime = useSharedValue(-1);
  const elapsedAtFirstFrame = useSharedValue(0);

  // On avance avec l'horodatage de chaque image (régulier, calé sur l'écran)
  // plutôt qu'avec l'heure lue pendant le calcul, qui varie de quelques ms
  // d'une image à l'autre : le mouvement est ainsi parfaitement fluide.
  useFrameCallback((frame) => {
    "worklet";
    if (firstFrameTime.value < 0) {
      firstFrameTime.value = frame.timestamp;
      elapsedAtFirstFrame.value = Date.now() - startedAt;
    }
    const elapsed =
      elapsedAtFirstFrame.value + (frame.timestamp - firstFrameTime.value);
    elapsedMs.value = elapsed;
    cycle.value = (elapsed % 1000) / 1000;
  }, enabled);

  const second = useSecondsSince(startedAt);
  return { cycle, elapsed: elapsedMs, second };
}
