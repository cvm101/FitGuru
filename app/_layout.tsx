import '../global.css';
import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments, useNavigationContainerRef } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/context/AuthContext';
import { ThemeProvider } from '@/lib/context/ThemeContext';
import { WorkoutSaveContext, WorkoutSaveState } from '@/lib/workoutSaveContext';
import { Alert } from 'react-native';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AuthGate() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = (segments as string[])[0] === '(auth)';
    const inOnboarding = (segments as string[])[1] === 'onboarding';

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && !profile && !inOnboarding) {
      router.replace('/(auth)/onboarding');
    } else if (session && profile && inAuth) {
      router.replace('/(tabs)');
    }

    SplashScreen.hideAsync();
  }, [session, profile, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function SaveProvider({ children }: { children: React.ReactNode }) {
  const [hasChanges, setHasChanges] = useState(false);
  const [saveProgressFn, setSaveProgressFn] = useState<() => Promise<void>>(async () => {});
  const [closeWorkoutFn, setCloseWorkoutFn] = useState<() => void>(() => {});

  const registerSaveProgress = (fn: () => Promise<void>) => {
    setSaveProgressFn(() => fn);
  };

  const registerCloseWorkout = (fn: () => void) => {
    setCloseWorkoutFn(() => fn);
  };

  const state = {
    hasChanges,
    setHasChanges,
    saveProgress: saveProgressFn,
    registerSaveProgress,
    closeWorkout: closeWorkoutFn,
    registerCloseWorkout,
  };

  return (
    <WorkoutSaveContext.Provider value={state}>
      {children}
    </WorkoutSaveContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SaveProvider>
            <AuthGate />
          </SaveProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
