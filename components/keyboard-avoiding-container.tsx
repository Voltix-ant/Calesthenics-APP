import { useRef, useState, type ComponentRef, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

// Conteneur qui laisse de la place en bas quand le clavier est ouvert.
//
// Sur Android, l'appli est "edge-to-edge" : la fenêtre ne rétrécit plus quand
// le clavier s'ouvre, il passe donc par-dessus le contenu. KeyboardAvoidingView
// ajoute en bas un padding égal à la partie du clavier qui recouvre la vue.
//
// Piège : il calcule sa position par rapport à son parent, alors que le clavier
// est positionné par rapport à l'écran. Sous un header, il se trompe donc de la
// hauteur du header. On mesure ici la vraie position à l'écran (measureInWindow)
// et on la lui donne comme décalage (keyboardVerticalOffset).
export function KeyboardAvoidingContainer({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const wrapperRef = useRef<ComponentRef<typeof View>>(null);
  const [offsetFromTop, setOffsetFromTop] = useState(0);

  return (
    <View
      ref={wrapperRef}
      style={styles.flex}
      onLayout={() =>
        wrapperRef.current?.measureInWindow((_x, y) => setOffsetFromTop(y))
      }
    >
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={offsetFromTop}
        style={styles.flex}
      >
        {/* Le style va sur une vue intérieure : KeyboardAvoidingView impose
            son propre paddingBottom et écraserait celui qu'on lui donnerait */}
        <View style={[styles.flex, style]}>{children}</View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
