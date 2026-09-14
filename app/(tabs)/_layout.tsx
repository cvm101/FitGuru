import { Tabs } from 'expo-router';
import { View, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutSave } from '@/lib/workoutSaveContext';
import { useRef } from 'react';

function TabIcon({ name, focused }: { name: any; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 2 }}>
      <View style={{
        width: 44, height: 28, borderRadius: 14,
        backgroundColor: focused ? '#ECFDF5' : 'transparent',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 2,
      }}>
        <Ionicons
          name={focused ? name : `${name}-outline` as any}
          size={22}
          color={focused ? '#059669' : '#94A3B8'}
        />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { hasChanges, saveProgress, setHasChanges, closeWorkout } = useWorkoutSave();
  const hasChangesRef = useRef(hasChanges);
  const saveProgressRef = useRef(saveProgress);
  const closeWorkoutRef = useRef(closeWorkout);
  const setHasChangesRef = useRef(setHasChanges);
  hasChangesRef.current = hasChanges;
  saveProgressRef.current = saveProgress;
  closeWorkoutRef.current = closeWorkout;
  setHasChangesRef.current = setHasChanges;

  return (
    <Tabs
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          if (!hasChangesRef.current) return;
          const state = navigation.getState();
          const currentName = state.routes[state.index]?.name;
          if (route.name === currentName) return;

          e.preventDefault();
          const target = route.name;
          Alert.alert(
            'Unsaved Workout Changes',
            'You have unsaved workout changes. Would you like to save them before leaving?',
            [
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                  closeWorkoutRef.current();
                  setHasChangesRef.current(false);
                  navigation.navigate(target as never);
                },
              },
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Save',
                onPress: async () => {
                  const saved = await saveProgressRef.current();
                  if (!saved) return;
                  closeWorkoutRef.current();
                  setHasChangesRef.current(false);
                  navigation.navigate(target as never);
                },
              },
            ]
          );
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 84 : 66,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 16,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calories"
        options={{
          title: 'Calories',
          tabBarIcon: ({ focused }) => <TabIcon name="nutrition" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="exercise"
        options={{
          title: 'Exercise',
          tabBarIcon: ({ focused }) => <TabIcon name="barbell" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="person-circle" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
