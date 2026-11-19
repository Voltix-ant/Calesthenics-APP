import { Defs, LinearGradient, Stop } from "react-native-svg";

import { fireStops } from "@/constants/theme";

/**
 * Dégradé feu à glisser comme enfant d'une icône Lucide, pour un trait en
 * dégradé : `<House color="url(#fire)"><FireGradientDef id="fire" /></House>`.
 * Mêmes valeurs que dans les maquettes (diagonale, arrêt du milieu à 55 %).
 * L'`id` doit être unique à l'écran.
 */
export function FireGradientDef({ id }: { id: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={fireStops[0]} />
        <Stop offset="0.55" stopColor={fireStops[1]} />
        <Stop offset="1" stopColor={fireStops[2]} />
      </LinearGradient>
    </Defs>
  );
}
