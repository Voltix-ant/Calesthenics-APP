import { WorkoutForm } from "@/components/workout-form";
import { Stack } from "expo-router";

export default function NewWorkoutScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Nouvel entrainement" }} />
      <WorkoutForm mode="create" />
    </>
  );
}
