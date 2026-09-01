import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function NewWorkoutScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (name.trim() === "") return; // on évite de créer un entrainement sans nom

    await db.runAsync("INSERT INTO workouts (name) VALUES (?)", name.trim());

    router.back(); // revient à l'écran précédent (la liste)
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nom de l'entrainement</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ex: Push day"
        placeholderTextColor="#999"
        autoFocus
      />

      <TouchableOpacity style={styles.button} onPress={handleCreate}>
        <Text style={styles.buttonText}>Créer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: "#fff",
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
