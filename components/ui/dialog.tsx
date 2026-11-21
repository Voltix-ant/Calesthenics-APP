import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { FireButton } from "@/components/ui/fire-button";
import { Neu } from "@/components/ui/neu";
import { appear } from "@/constants/animations";
import { body, colors, display, pressed, shadows } from "@/constants/theme";

// Boîte de dialogue aux couleurs de l'appli, qui remplace Alert.alert.
//
// Utilisation (même forme que Alert.alert) :
//   const showDialog = useDialog();
//   showDialog({
//     title: "Supprimer ?",
//     message: "Cette action est irréversible.",
//     buttons: [
//       { text: "Annuler", style: "cancel" },
//       { text: "Supprimer", style: "destructive", onPress: () => ... },
//     ],
//   });
//
// Une seule boîte est montée, tout en haut de l'appli (<DialogProvider>).
// Les écrans y accèdent par un « contexte » React : une valeur fournie par un
// composant parent et lisible par tous ses descendants avec useContext, sans
// la passer de props en props.

export type DialogButton = {
  text: string;
  /**
   * - "default" : bouton feu (action principale) ;
   * - "destructive" : bouton en relief, texte rouge-orangé ;
   * - "cancel" : simple lien en bas. C'est aussi ce que fait le bouton
   *   « retour » d'Android.
   */
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
};

export type DialogOptions = {
  title: string;
  message?: string;
  /** Par défaut : un seul bouton « OK » */
  buttons?: DialogButton[];
};

type DialogState = {
  /** Change à chaque nouvelle boîte, pour rejouer l'animation d'entrée */
  id: number;
  options: DialogOptions;
  visible: boolean;
};

const DialogContext = createContext<((options: DialogOptions) => void) | null>(
  null,
);

export function useDialog() {
  const showDialog = useContext(DialogContext);
  if (!showDialog) {
    throw new Error("useDialog doit être utilisé sous <DialogProvider>");
  }
  return showDialog;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  // On garde le contenu de la dernière boîte même une fois fermée : il reste
  // affiché pendant le fondu de sortie de la Modal.
  const [state, setState] = useState<DialogState | null>(null);

  const showDialog = (options: DialogOptions) =>
    setState((prev) => ({
      id: (prev?.id ?? 0) + 1,
      options,
      visible: true,
    }));

  const hide = () =>
    setState((prev) => (prev ? { ...prev, visible: false } : prev));

  // Comme Alert.alert : la boîte se ferme, puis l'action du bouton s'exécute.
  // Si cette action ouvre elle-même une boîte (ex. message d'erreur), celle-ci
  // prend la place de la précédente.
  const press = (button: DialogButton) => {
    hide();
    button.onPress?.();
  };

  const buttons = state?.options.buttons ?? [{ text: "OK" }];
  const cancelButtons = buttons.filter((b) => b.style === "cancel");
  const actionButtons = buttons.filter((b) => b.style !== "cancel");

  // Bouton « retour » d'Android : bouton d'annulation, ou le bouton unique
  // (« OK »). Sinon la boîte reste ouverte : il faut choisir.
  const backButton =
    cancelButtons[0] ?? (buttons.length === 1 ? buttons[0] : undefined);

  return (
    <DialogContext.Provider value={showDialog}>
      {children}
      <Modal
        visible={state?.visible ?? false}
        transparent
        animationType="fade"
        onRequestClose={() => backButton && press(backButton)}
        // Le voile passe aussi sous les barres système
        statusBarTranslucent
        navigationBarTranslucent
      >
        {state && (
          <View style={styles.backdrop}>
            <DialogCard
              key={state.id}
              options={state.options}
              actionButtons={actionButtons}
              cancelButtons={cancelButtons}
              onPress={press}
            />
          </View>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}

function DialogCard({
  options,
  actionButtons,
  cancelButtons,
  onPress,
}: {
  options: DialogOptions;
  actionButtons: DialogButton[];
  cancelButtons: DialogButton[];
  onPress: (button: DialogButton) => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      style={styles.card}
      role="alertdialog"
      accessibilityLabel={options.title}
      entering={reducedMotion ? undefined : appear({ from: 0.92 })}
    >
      <View style={styles.texts}>
        <Text style={styles.title} role="heading">
          {options.title}
        </Text>
        {options.message && (
          <Text style={styles.message}>{options.message}</Text>
        )}
      </View>

      <View style={styles.buttons}>
        {actionButtons.map((button) =>
          button.style === "destructive" ? (
            <Neu
              key={button.text}
              variant="up-sm"
              surface="flat"
              style={styles.button}
              pressedStyle={pressed}
              onPress={() => onPress(button)}
            >
              <Text style={styles.destructiveLabel}>{button.text}</Text>
            </Neu>
          ) : (
            <FireButton
              key={button.text}
              label={button.text}
              onPress={() => onPress(button)}
              style={[styles.button, styles.fireButton]}
            />
          ),
        )}
        {cancelButtons.map((button) => (
          <Pressable
            key={button.text}
            accessibilityRole="button"
            onPress={() => onPress(button)}
            style={({ pressed }) => [styles.cancel, pressed && styles.dimmed]}
          >
            <Text style={styles.cancelLabel}>{button.text}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,8,7,0.72)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  // Même boîte que la modale de sélection d'exercice
  card: {
    borderRadius: 30,
    backgroundColor: colors.background,
    boxShadow:
      "0 24px 60px rgba(0,0,0,0.7), inset 1px 1px 0 rgba(255,236,220,0.05)",
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 12,
    gap: 24,
  },
  texts: { gap: 10 },
  title: { ...display(700), fontSize: 22, lineHeight: 27, textAlign: "center" },
  message: {
    ...body(400),
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
  buttons: { gap: 12 },
  button: {
    height: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  fireButton: { boxShadow: shadows.glow },
  destructiveLabel: { ...body(600), fontSize: 16, color: colors.destructive },
  cancel: {
    alignSelf: "center",
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  dimmed: { opacity: 0.6 },
  cancelLabel: { ...body(600), fontSize: 15, color: colors.textSecondary },
});
