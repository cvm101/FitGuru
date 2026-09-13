@AGENTS.md

---

## Workout Save / Close Confirmation Flow

### Context
When a user is logging a workout and switches tabs or tries to close the session, they should be asked whether to save their progress to avoid losing data.

### How it works

**`lib/workoutSaveContext.ts`** — React context (`WorkoutSaveContext`) shared at the root level:
- `hasChanges` — boolean; true when the workout modal has been opened AND has exercises/reps entered
- `setHasChanges(v)` — called by `WorkoutSession` to set/unset the flag
- `saveProgress` — the currently registered save function (points to `WorkoutSession`'s `handleFinish`)
- `registerSaveProgress(fn)` — called by `WorkoutSession` (inside `useEffect`) to register its `handleFinish`
- `closeWorkout` — the currently registered close function
- `registerCloseWorkout(fn)` — called by `WorkoutSession` (inside `useEffect`) to register a direct close (clears state without showing a second alert)

### Flows

1. **User closes workout modal via X button** → `WorkoutSession.handleClose` is called → shows alert "Save / Discard / Cancel"

2. **User switches tabs while workout modal is open** → `app/(tabs)/_layout.tsx` detects the tab index change → checks `hasChanges` → shows Alert: "Save / Discard / Cancel"
   - **Save**: calls `saveProgress()` (→ `handleFinish`, saves to DB) then `closeWorkout()` (→ direct clear, no second alert) then `setHasChanges(false)`
   - **Discard**: calls `closeWorkout()` then `setHasChanges(false)`
   - **Cancel**: does nothing (user stays)

### Important rules
- Always call `registerSaveProgress` / `registerCloseWorkout` **inside a `useEffect`** to avoid stale closures
- `handleFinish` and `handleClose` in `WorkoutSession` are wrapped in `useCallback` — update their deps if you add more state dependencies
- `closeWorkout` registered for tab-switch is a **direct close** (skips the alert) to avoid double-prompting after the user already chose in the tab-switch alert
