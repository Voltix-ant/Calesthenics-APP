import { useEffect, useState } from "react";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";

/**
 * Horloge des animations qui battent à la seconde (décompte), calée sur
 * l'heure de départ `startedAt` (et non sur un minuteur) : elle reste donc
 * synchrone avec les bips, même si l'appli a ralenti.
 *
 * - `cycle` (valeur partagée Reanimated) : position dans la seconde en cours,
 *   de 0 à 1, mise à jour à chaque image sur le thread de l'interface ;
 * - `second` (state React) : nombre de secondes entières écoulées, pour
 *   changer le chiffre affiché pile au bon moment.
 */
export function useSecondCycle(startedAt: number, enabled = true) {
  const cycle = useSharedValue(0);
  const [second, setSecond] = useState(() =>
    Math.floor((Date.now() - startedAt) / 1000),
  );

  // Côté interface : appelé avant chaque image affichée.
  useFrameCallback(() => {
    "worklet";
    cycle.value = ((Date.now() - startedAt) % 1000) / 1000;
  }, enabled);

  // Côté JS : même calcul à chaque image, mais React ne refait un rendu que
  // quand la valeur change (une fois par seconde).
  useEffect(() => {
    let frameId = 0;
    const loop = () => {
      setSecond(Math.floor((Date.now() - startedAt) / 1000));
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [startedAt]);

  return { cycle, second };
}
