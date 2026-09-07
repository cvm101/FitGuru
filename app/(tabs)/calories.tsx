import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/lib/context/AuthContext';
import { useTheme } from '@/lib/context/ThemeContext';
import {
  getFoodLogs,
  deleteFoodLog,
  updateFoodLog,
  getDailyMacros,
  addFoodLog,
} from '@/lib/queries/calories';
import MealSection from '@/components/calories/MealSection';
import FoodSearchModal from '@/components/calories/FoodSearchModal';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import AnimatedProgressBar from '@/components/ui/AnimatedProgressBar';
import GlassPill from '@/components/ui/GlassPill';
import ScreenHeader from '@/components/ui/ScreenHeader';
import type { MealType, OpenFoodFactsProduct } from '@/lib/types';
import { toLocalISODate } from '@/lib/date';

function dateKey(d: Date) {
  return toLocalISODate(d);
}

function formatHeader(d: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cmp = new Date(d); cmp.setHours(0, 0, 0, 0);
  const diff = (cmp.getTime() - today.getTime()) / 86400000;
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks',
};

export default function CaloriesScreen() {
  const { session, profile } = useAuth();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const userId = session?.user.id ?? '';

  const [date, setDate] = useState(new Date());
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const dk = dateKey(date);

  const { data: logs = [], refetch } = useQuery({
    queryKey: ['food-logs', userId, dk],
    queryFn: () => getFoodLogs(userId, dk),
    enabled: !!userId,
  });

  const { data: macros } = useQuery({
    queryKey: ['daily-macros', userId, dk],
    queryFn: () => getDailyMacros(userId, dk),
    enabled: !!userId,
  });

  const addMutation = useMutation({
    mutationFn: (item: {
      food: OpenFoodFactsProduct;
      grams: number;
      mealType: MealType;
    }) => addFoodLog({
      user_id: userId, date: dk, meal_type: item.mealType, food_name: item.food.product_name,
      quantity: item.grams, unit: 'g',
      calories: Math.round((item.food.energy_kcal_100g * item.grams) / 100),
      protein_g: Math.round((item.food.proteins_100g * item.grams) / 100 * 10) / 10,
      carbs_g: Math.round((item.food.carbohydrates_100g * item.grams) / 100 * 10) / 10,
      fat_g: Math.round((item.food.fat_100g * item.grams) / 100 * 10) / 10,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food-logs', userId, dk] });
      qc.invalidateQueries({ queryKey: ['daily-macros', userId, dk] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFoodLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food-logs', userId, dk] });
      qc.invalidateQueries({ queryKey: ['daily-macros', userId, dk] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity, calories, protein_g, carbs_g, fat_g }: {
      id: string; quantity: number; calories: number;
      protein_g: number; carbs_g: number; fat_g: number;
    }) => updateFoodLog(id, quantity, calories, protein_g, carbs_g, fat_g),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food-logs', userId, dk] });
      qc.invalidateQueries({ queryKey: ['daily-macros', userId, dk] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function changeDate(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  }

  function openAddFood(meal: MealType) {
    setSelectedMeal(meal);
    setSearchVisible(true);
  }

  async function handleSelectFood(food: OpenFoodFactsProduct, grams: number) {
    if (!selectedMeal) return;
    await addMutation.mutateAsync({ food, grams, mealType: selectedMeal });
    setSearchVisible(false);
  }

  const goalCalories = profile?.goal_calories ?? 2000;
  const goalProtein = profile?.goal_protein ?? 150;
  const goalCarbs = profile?.goal_carbs ?? 250;
  const goalFat = profile?.goal_fat ?? 65;
  const consumed = macros?.calories ?? 0;
  const protein = macros?.protein ?? 0;
  const carbs = macros?.carbs ?? 0;
  const fat = macros?.fat ?? 0;
  const remaining = Math.max(goalCalories - consumed, 0);
  const pct = Math.min(consumed / goalCalories, 1);
  const over = consumed > goalCalories;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* Header */}
        <ScreenHeader colors={['#064E3B', '#065F46', '#047857']} paddingBottom={28}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Track nutrition,</Text>
              <Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Food Diary</Text>
            </View>
            {/* Date navigation */}
            <GlassPill radius={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 5 }}>
                <TouchableOpacity onPress={() => changeDate(-1)} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chevron-back" size={16} color="white" />
                </TouchableOpacity>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13, paddingHorizontal: 4 }}>{formatHeader(date)}</Text>
                <TouchableOpacity onPress={() => changeDate(1)} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chevron-forward" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </GlassPill>
          </View>

          {/* Calorie overview card */}
          <GlassPill radius={20} style={{ padding: 16 }}>
            {/* Big numbers */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 10 }}>
              <AnimatedNumber value={Math.round(consumed)} style={{ color: 'white', fontSize: 44, fontWeight: '900', letterSpacing: -1 }} />
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>/ {goalCalories} kcal</Text>
            </View>

            {/* Progress bar */}
            <AnimatedProgressBar
              percent={pct * 100}
              height={10}
              trackColor="rgba(255,255,255,0.2)"
              gradientColors={over ? ['#EF4444', '#F87171'] : ['#ffffff', 'rgba(255,255,255,0.7)']}
              style={{ marginBottom: 12 }}
            />

            {/* Remaining / over */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Eaten</Text>
                <AnimatedNumber value={Math.round(consumed)} style={{ color: 'white', fontWeight: '700', fontSize: 14 }} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{over ? 'Over goal' : 'Remaining'}</Text>
                <AnimatedNumber
                  value={Math.abs(Math.round(consumed - goalCalories))}
                  prefix={over ? '+' : ''}
                  style={{ color: over ? '#FCA5A5' : 'white', fontWeight: '700', fontSize: 14 }}
                />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Goal</Text>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{goalCalories}</Text>
              </View>
            </View>
          </GlassPill>
        </ScreenHeader>

        {/* Macro summary row */}
        <View style={{ flexDirection: 'row', gap: 0, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
          {[
            { label: 'Protein', cur: protein, goal: goalProtein, unit: 'g', color: '#3B82F6' },
            { label: 'Carbs', cur: carbs, goal: goalCarbs, unit: 'g', color: '#F59E0B' },
            { label: 'Fat', cur: fat, goal: goalFat, unit: 'g', color: '#EF4444' },
          ].map((m, i) => (
            <Animated.View key={m.label} entering={FadeInDown.delay(i * 80).springify().damping(16)} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: colors.separator }}>
              <AnimatedNumber value={Math.round(m.cur)} style={{ color: m.color, fontWeight: '800', fontSize: 16 }} />
              <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>{m.unit} {m.label}</Text>
              <AnimatedProgressBar
                percent={(m.cur / m.goal) * 100}
                color={m.color}
                height={3}
                style={{ width: 44, marginTop: 6 }}
                delay={i * 80}
              />
            </Animated.View>
          ))}
        </View>

        {/* Meal sections */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
          {MEAL_TYPES.map((mt, i) => (
            <Animated.View key={mt} entering={FadeInDown.delay(i * 70).springify().damping(16)}>
              <MealSection
                title={MEAL_LABELS[mt]}
                mealType={mt}
                logs={logs.filter((l) => l.meal_type === mt)}
                onAdd={() => openAddFood(mt)}
                onDelete={(id) => deleteMutation.mutate(id)}
                onUpdate={(id, quantity, calories, protein_g, carbs_g, fat_g) =>
                  updateMutation.mutate({ id, quantity, calories, protein_g, carbs_g, fat_g })
                }
              />
            </Animated.View>
          ))}
        </View>

        {/* Nutrition tip */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#ECFDF5', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="bulb" size={18} color="white" />
          </View>
          <Text style={{ flex: 1, color: '#064E3B', fontSize: 12, lineHeight: 18 }}>
            <Text style={{ fontWeight: '700' }}>Tip: </Text>
            Eating enough protein ({goalProtein}g/day) helps preserve muscle while losing fat.
          </Text>
        </View>
        <View style={{ height: 1 }} />
      </ScrollView>

      <FoodSearchModal
        visible={searchVisible}
        mealType={selectedMeal ?? 'breakfast'}
        onSelect={handleSelectFood}
        onClose={() => setSearchVisible(false)}
      />
    </View>
  );
}
