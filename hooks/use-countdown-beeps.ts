import { useAudioPlayer } from "expo-audio";
import { useEffect } from "react";

// Nombre de secondes avant la fin du décompte à partir duquel on bipe :
// un bip "start" à 5, 4, 3, 2, 1, puis un bip "end" à 0.
// Si le décompte est plus court (ex. 3 s), on bipe à 3, 2, 1 puis 0.
const BEEP_FROM_SECONDS = 5;

// Un bip qui arrive avec plus de retard que ça est ignoré. Cas typique :
// l'appli était en arrière-plan (JavaScript en pause), et tous les bips
// en attente sonneraient d'un coup au retour.
const MAX_LATENESS_MS = 500;

// Bips du décompte avant un chrono.
//
// Plutôt que de déclencher les bips depuis le tic de l'horloge (250 ms de
// retard possible, donc un rythme irrégulier), on programme chaque bip à son
// heure exacte avec setTimeout dès que le décompte démarre. La fonction de
// nettoyage de l'effet annule les bips restants si le décompte est interrompu
// (séance abandonnée, écran quitté, son coupé).
export function useCountdownBeeps({
  countdownStartedAt,
  countdownMs,
  enabled,
}: {
  countdownStartedAt: number | null; // null = pas de décompte en cours
  countdownMs: number;
  enabled: boolean;
}) {
  const startPlayer = useAudioPlayer(
    require("../assets/sounds/countdown-start.wav"),
  );
  const endPlayer = useAudioPlayer(
    require("../assets/sounds/countdown-end.wav"),
  );

  useEffect(() => {
    if (countdownStartedAt === null || !enabled) return;

    const countdownEndsAt = countdownStartedAt + countdownMs;
    const firstBeep = Math.min(
      BEEP_FROM_SECONDS,
      Math.floor(countdownMs / 1000),
    );
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    for (let secondsLeft = firstBeep; secondsLeft >= 0; secondsLeft--) {
      const beepAt = countdownEndsAt - secondsLeft * 1000;
      const delay = beepAt - Date.now();
      // Déjà passé (ex. son réactivé en plein décompte) : on ne le rattrape pas
      if (delay < -MAX_LATENESS_MS) continue;

      timeouts.push(
        setTimeout(
          () => {
            if (Date.now() - beepAt > MAX_LATENESS_MS) return;
            const player = secondsLeft === 0 ? endPlayer : startPlayer;
            player.seekTo(0);
            player.play();
          },
          Math.max(0, delay),
        ),
      );
    }

    return () => timeouts.forEach(clearTimeout);
  }, [countdownStartedAt, countdownMs, enabled, startPlayer, endPlayer]);
}
