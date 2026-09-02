import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const TABLES = [
  "exercises",
  "workouts",
  "workout_blocks",
  "workout_sets",
  "sessions",
  "session_performances",
];

export default function DebugScreen() {
  const db = useSQLiteContext();
  const [data, setData] = useState<Record<string, any[]>>({});

  const loadAll = useCallback(async () => {
    const result: Record<string, any[]> = {};
    for (const table of TABLES) {
      result[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
    }
    setData(result);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  return (
    <ScrollView style={styles.container}>
      {TABLES.map((table) => (
        <View key={table} style={styles.section}>
          <Text style={styles.tableName}>
            {table} ({data[table]?.length ?? 0})
          </Text>
          <Text style={styles.json}>
            {JSON.stringify(data[table], null, 2)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  section: { marginBottom: 20 },
  tableName: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  json: { fontFamily: "monospace", fontSize: 12, color: "#333" },
});
