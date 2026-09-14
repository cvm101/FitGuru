import { createContext, useContext } from 'react';

export type WorkoutSaveState = {
  hasChanges: boolean;
  setHasChanges: (v: boolean) => void;
  saveProgress: () => Promise<boolean>;
  /** Called by WorkoutSession to register its save function */
  registerSaveProgress: (fn: () => Promise<boolean>) => void;
  /** Called to close the workout modal from outside WorkoutSession */
  closeWorkout: () => void;
  /** Register a function to close the workout modal */
  registerCloseWorkout: (fn: () => void) => void;
};

export const WorkoutSaveContext = createContext<WorkoutSaveState>({
  hasChanges: false,
  setHasChanges: () => {},
  saveProgress: async () => false,
  registerSaveProgress: () => {},
  closeWorkout: () => {},
  registerCloseWorkout: () => {},
});

/** Note for consumers: call registerSaveProgress / registerCloseWorkout inside useEffect
 *  so the registered functions don't become stale when the context updates. */
export function useWorkoutSave() {
  return useContext(WorkoutSaveContext);
}
