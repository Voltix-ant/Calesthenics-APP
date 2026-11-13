import { useFocusEffect, useRouter } from "expo-router";
import { useBottomTabBarHeight } from "expo-router/js-tabs";
import { useSQLiteContext } from "expo-sqlite";
import { ChevronRight, Plus } from "lucide-react-native";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FireButton } from "@/components/ui/fire-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Neu } from "@/components/ui/neu";
import { rise, STAGGER_COUNT, STAGGER_MS } from "@/constants/animations";
import { body, colors, display, em, screenTop } from "@/constants/theme";

type Workout = {
  id: number;
  name: string;
  created_at: string;
};

export default function WorkoutsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useSQLiteContext();
  const reducedMotion = useReducedMotion();
  const tabBarHeight = useBottomTabBarHeight();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  // Évite d'afficher « Aucun entrainement » le temps de la première lecture.
  const [loaded, setLoaded] = useState(false);

  const loadWorkouts = async () => {
    const result = await db.getAllAsync<Workout>(
      "SELECT id, name, created_at FROM workouts ORDER BY created_at DESC",
    );
    setWorkouts(result);
    setLoaded(true);
  };

  // Recharge la liste à chaque fois que cet écran redevient actif
  // (utile après avoir créé un entrainement puis être revenu ici).
  // Pas de useCallback : le React Compiler mémoïse déjà cette fonction.
  useFocusEffect(() => {
    loadWorkouts();
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: screenTop(56, insets.top) }]}>
        <Text style={styles.title} role="heading">
          Mes{" "}
        </Text>
        <GradientText style={styles.title}>entrainements</GradientText>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={workouts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={
              reducedMotion || index >= STAGGER_COUNT
                ? undefined
                : rise(index * STAGGER_MS)
            }
          >
            <Neu
              variant="up"
              surface="card"
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/workout/[id]",
                  params: { id: item.id.toString() },
                })
              }
            >
              <Text style={styles.cardName}>{item.name}</Text>
              <Neu variant="in-sm" style={styles.chevron}>
                <ChevronRight
                  size={18}
                  strokeWidth={2}
                  color={colors.fireMid}
                />
              </Neu>
            </Neu>
          </Animated.View>
        )}
        ListEmptyComponent={
          loaded ? (
            <Text style={styles.emptyText}>
              Aucun entrainement pour l'instant.
            </Text>
          ) : undefined
        }
      />

      <Animated.View
        // La barre d'onglets flotte par-dessus l'écran : on laisse sa place.
        style={[styles.footer, { paddingBottom: 10 + tabBarHeight }]}
        entering={reducedMotion ? undefined : rise(400)}
      >
        <FireButton
          label="Nouvel entrainement"
          icon={<Plus size={20} strokeWidth={2} color={colors.onFire} />}
          onPress={() => router.push("/workout/new")}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 4,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  title: {
    ...display(700),
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: em(-0.01, 30),
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 18,
  },
  card: {
    minHeight: 70,
    paddingLeft: 22,
    paddingRight: 14,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardName: {
    ...display(700),
    fontSize: 18,
    flexShrink: 1,
  },
  chevron: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...body(400),
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: "center",
  },
  footer: {
    paddingTop: 8,
    paddingHorizontal: 24,
  },
});
