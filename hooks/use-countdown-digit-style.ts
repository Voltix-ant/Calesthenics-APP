import {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

/**
 * Style animé du chiffre d'un décompte, rejoué à chaque seconde : arrive en
 * 1,45× → 1× (0–0,2 s), rétrécit à 0,94× (jusqu'à 0,8 s), puis s'efface en
 * rétrécissant à 0,7× (jusqu'à 1 s).
 *
 * `smoothStart` : pendant la première seconde, le chiffre apparaît en fondu
 * à sa taille normale, sans l'effet « grossi puis posé » (onglet Chrono, où il
 * prend le relais du chiffre saisi qui grossit).
 */
export function useCountdownDigitStyle(
  cycle: SharedValue<number>,
  elapsed: SharedValue<number>,
  smoothStart = false,
) {
  return useAnimatedStyle(() => {
    const t = cycle.value;
    const firstSecond = smoothStart && elapsed.value < 1000;
    return {
      opacity: interpolate(t, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        {
          scale: interpolate(
            t,
            [0, 0.2, 0.8, 1],
            [firstSecond ? 1 : 1.45, 1, 0.94, 0.7],
          ),
        },
      ],
    };
  });
}
