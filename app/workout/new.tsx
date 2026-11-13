import { WorkoutForm } from "@/components/workout-form";
import { Stack } from "expo-router";

export default function NewWorkoutScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WorkoutForm title="Nouvel entrainement" />
    </>
  );
}
