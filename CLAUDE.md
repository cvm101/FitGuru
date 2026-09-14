@AGENTS.md

---

## Workout Save / Close Confirmation Flow

### Context
When a user is logging a workout and switches tabs or tries to close the session, they should be asked whether to save their progress to avoid losing data.

### How it works

**`lib/workoutSaveContext.ts`** — React context (`WorkoutSaveContext`) shared at the root level:
- `hasChanges` — boolean; true only after the user edits the open workout (sets, exercises), not merely because a split was preloaded
- `setHasChanges(v)` — called by `WorkoutSession` to set/unset the flag
- `saveProgress` — the currently registered save function (points to `WorkoutSession`'s `handleFinish`); returns `true` only if the workout was saved
- `registerSaveProgress(fn)` — called by `WorkoutSession` (inside `useEffect`) to register its `handleFinish`
- `closeWorkout` — the currently registered close function
- `registerCloseWorkout(fn)` — called by `WorkoutSession` (inside `useEffect`) to register a direct close (clears state without showing a second alert)

### Flows

1. **User closes workout modal via X button** → `WorkoutSession.handleClose` is called → shows alert "Save / Discard / Cancel"
   - **Save & Close**: saves first; the modal stays open if save validation fails
   - **Discard**: direct close
   - **Cancel**: stays in the session

2. **User switches tabs while workout modal is open** → `app/(tabs)/_layout.tsx` intercepts `tabPress` with `preventDefault()` so the tab does not change until they choose:
   - **Save**: calls `saveProgress()`; navigates only if save returns `true`, then `closeWorkout()`
   - **Discard**: calls `closeWorkout()` then navigates
   - **Cancel**: does nothing (user stays on Exercise with the modal open)

### Important rules
- Always call `registerSaveProgress` / `registerCloseWorkout` **inside a `useEffect` after `handleFinish` is defined** to avoid stale closures and TDZ errors
- `handleFinish` and `handleClose` in `WorkoutSession` are wrapped in `useCallback` — update their deps if you add more state dependencies
- `closeWorkout` registered for tab-switch is a **direct close** (skips the alert) to avoid double-prompting after the user already chose in the tab-switch alert
