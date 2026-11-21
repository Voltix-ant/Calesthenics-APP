import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useFocusEffect } from "expo-router";
import { useEffect, useRef } from "react";

/**
 * Garde l'écran allumé tant que l'écran (l'onglet) est affiché, mais le
 * relâche après `idleMs` sans activité, pour que le téléphone puisse se
 * verrouiller tout seul. Avec `alwaysOn` (ex. chrono en cours), l'écran
 * reste allumé sans limite de temps.
 *
 * Renvoie `registerActivity`, à appeler à chaque interaction (toucher,
 * saisie) : il rallume le maintien et relance le délai.
 *
 * Tout passe par des refs (valeurs qui survivent aux rendus sans en
 * provoquer) : un toucher ne redessine pas l'écran.
 */
export function useIdleKeepAwake(
  tag: string,
  { alwaysOn, idleMs }: { alwaysOn: boolean; idleMs: number },
) {
  const focused = useRef(false);
  const active = useRef(false);
  const alwaysOnRef = useRef(alwaysOn);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimeout = () => {
    if (timeoutId.current !== null) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
  };

  const release = () => {
    clearIdleTimeout();
    if (!active.current) return; // déjà relâché
    active.current = false;
    deactivateKeepAwake(tag).catch(() => {});
  };

  const registerActivity = () => {
    if (!focused.current) return;
    clearIdleTimeout();
    if (!active.current) {
      active.current = true;
      activateKeepAwakeAsync(tag).catch(() => {});
    }
    if (!alwaysOnRef.current) {
      timeoutId.current = setTimeout(release, idleMs);
    }
  };

  // Les onglets restent montés quand on en change : on active à l'arrivée sur
  // l'onglet et on relâche quand on le quitte (fonction de nettoyage).
  useFocusEffect(() => {
    focused.current = true;
    registerActivity();
    return () => {
      focused.current = false;
      release();
    };
  });

  // Chrono lancé : plus de délai. Chrono arrêté : le délai repart de zéro.
  useEffect(() => {
    alwaysOnRef.current = alwaysOn;
    registerActivity();
  }, [alwaysOn, registerActivity]);

  return registerActivity;
}
