import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from "expo-router/js-tabs";
import { House, Timer, type LucideIcon } from "lucide-react-native";
import { use } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FireGradientDef } from "@/components/ui/fire-gradient-def";
import { body, colors, shadows } from "@/constants/theme";

const ICONS: Record<string, LucideIcon> = {
  index: House,
  timer: Timer,
};

/**
 * Barre d'onglets « Feu & relief » : une plaque en relief qui contient les
 * onglets ; l'onglet actif est creusé, avec l'icône en dégradé feu.
 * Un `Pressable` sans `android_ripple` : pas d'effet d'onde à l'appui.
 *
 * La barre flotte par-dessus l'écran (position absolue) : sinon l'écran
 * s'arrête au-dessus d'elle et coupe net ce qui déborde vers le bas, comme la
 * lueur du bouton « Nouvel entrainement ». Sa hauteur est transmise aux
 * écrans, qui la récupèrent avec `useBottomTabBarHeight()` pour se décaler.
 */
export function TabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const setTabBarHeight = use(BottomTabBarHeightCallbackContext);

  return (
    <View
      // "box-none" : les marges autour de la plaque laissent passer les
      // appuis vers l'écran en dessous.
      pointerEvents="box-none"
      onLayout={(e) => setTabBarHeight?.(e.nativeEvent.layout.height)}
      style={[
        styles.wrapper,
        // 18 dp sous la barre dans la maquette, sans passer sous la barre
        // de navigation d'Android.
        { paddingBottom: Math.max(18, insets.bottom) },
      ]}
    >
      <View role="tablist" style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const Icon = ICONS[route.name];
          const gradientId = `tab-fire-${route.name}`;

          const onPress = () => {
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          return (
            <Pressable
              key={route.key}
              role="tab"
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              style={[styles.tab, focused && styles.tabActive]}
            >
              {Icon &&
                (focused ? (
                  <Icon size={22} strokeWidth={2} color={`url(#${gradientId})`}>
                    <FireGradientDef id={gradientId} />
                  </Icon>
                ) : (
                  <Icon size={22} strokeWidth={2} color={colors.textTertiary} />
                ))}
              <Text style={[styles.label, focused && styles.labelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  bar: {
    padding: 8,
    borderRadius: 26,
    backgroundColor: colors.background,
    boxShadow: shadows.up,
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flex: 1,
    height: 56,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  tabActive: {
    boxShadow: shadows.in,
  },
  label: {
    ...body(600),
    fontSize: 15,
    color: colors.textTertiary,
  },
  labelActive: {
    color: colors.tabActive,
  },
});
