import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/context/AuthContext';
import { getDailyMacros, getWeeklyCalories } from '@/lib/queries/calories';
import { getTodayWorkout } from '@/lib/queries/exercise';
import MacroDonut from '@/components/calories/MacroDonut';
import Card from '@/components/ui/Card';

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDay(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 2);
}

export default function DashboardScreen() {
  const { profile, session } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const userId = session?.user.id ?? '';
  const today = todayDate();

  const { data: macros, refetch: refetchMacros } = useQuery({
    queryKey: ['daily-macros', userId, today],
    queryFn: () => getDailyMacros(userId, today),
    enabled: !!userId,
  });

  const { data: weeklyData, refetch: refetchWeekly } = useQuery({
    queryKey: ['weekly-calories', userId],
    queryFn: () => getWeeklyCalories(userId),
    enabled: !!userId,
  });

  const { data: todayWorkout } = useQuery({
    queryKey: ['today-workout', userId, today],
    queryFn: () => getTodayWorkout(userId, today),
    enabled: !!userId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMacros(), refetchWeekly()]);
    setRefreshing(false);
  }, [refetchMacros, refetchWeekly]);

  const goalCalories = profile?.goal_calories ?? 2000;
  const goalProtein = profile?.goal_protein ?? 150;
  const goalCarbs = profile?.goal_carbs ?? 250;
  const goalFat = profile?.goal_fat ?? 65;
  const consumed = macros?.calories ?? 0;
  const protein = macros?.protein ?? 0;
  const carbs = macros?.carbs ?? 0;
  const fat = macros?.fat ?? 0;
  const pct = Math.min(consumed / goalCalories, 1);
  const remaining = Math.max(goalCalories - consumed, 0);

  const maxWeekly = Math.max(...(weeklyData ?? []).map((d) => d.calories), goalCalories, 1);
  const chartH = 56;

  const macroItems = [
    { label: 'Protein', current: protein, goal: goalProtein, unit: 'g', color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Carbs', current: carbs, goal: goalCarbs, unit: 'g', color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Fat', current: fat, goal: goalFat, unit: 'g', color: '#EF4444', bg: '#FEF2F2' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Dark header */}
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          style={{ paddingTop: 56, paddingBottom: 88, paddingHorizontal: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '500' }}>
                {getGreeting()} 👋
              </Text>
              <Text style={{ color: 'white', fontSize: 24, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 }}>
                {profile?.name ?? 'Athlete'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: '#10B981',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
              }}>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 17 }}>
                  {(profile?.name ?? session?.user?.email ?? 'U')[0].toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Date + status pill */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' }}>
                {new Date().toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            {consumed > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <Ionicons name="flame" size={12} color="#34D399" />
                <Text style={{ color: '#34D399', fontSize: 12, fontWeight: '600' }}>{Math.round(consumed)} kcal logged</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Floating hero card */}
        <View style={{ marginHorizontal: 16, marginTop: -64 }}>
          <Card variant="elevated" style={{ padding: 20 }}>
            {/* Calorie ring */}
            <View style={{ alignItems: 'center' }}>
              <MacroDonut
                calories={consumed}
                goalCalories={goalCalories}
                protein={protein}
                carbs={carbs}
                fat={fat}
                size={180}
              />
            </View>

            {/* Calorie progress bar */}
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '500' }}>Daily Progress</Text>
                <Text style={{ color: '#64748B', fontSize: 12 }}>
                  {consumed > goalCalories
                    ? <Text style={{ color: '#EF4444', fontWeight: '700' }}>+{Math.round(consumed - goalCalories)} over</Text>
                    : <Text style={{ color: '#059669', fontWeight: '700' }}>{Math.round(remaining)} kcal left</Text>
                  }
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                <LinearGradient
                  colors={consumed > goalCalories ? ['#EF4444', '#F87171'] : ['#059669', '#34D399']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 4 }}
                />
              </View>
            </View>

            {/* Macro boxes */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              {macroItems.map((m) => (
                <View key={m.label} style={{ flex: 1, backgroundColor: m.bg, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: m.color }}>{Math.round(m.current)}</Text>
                  <Text style={{ fontSize: 11, color: m.color, fontWeight: '600', opacity: 0.8 }}>{m.unit}</Text>
                  <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{m.label}</Text>
                  <View style={{ width: '100%', height: 3, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <View style={{ height: '100%', backgroundColor: m.color, borderRadius: 2, width: `${Math.min((m.current / m.goal) * 100, 100)}%` }} />
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 12 }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/calories')} activeOpacity={0.85}>
            <LinearGradient
              colors={['#059669', '#10B981']}
              style={{ borderRadius: 22, padding: 18 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Ionicons name="add-circle" size={24} color="white" />
              </View>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Log Food</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>Track your meals</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/exercise')} activeOpacity={0.85}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={{ borderRadius: 22, padding: 18 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Ionicons name="barbell" size={22} color="white" />
              </View>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Workout</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>Start training</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Today's workout */}
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          {todayWorkout ? (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Today's Workout</Text>
                <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700' }}>✓ Done</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, backgroundColor: '#F5F3FF', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="barbell" size={22} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{todayWorkout.split_name}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                    {todayWorkout.workout_sets?.length ?? 0} sets · {todayWorkout.duration_minutes ?? 0} min
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <TouchableOpacity onPress={() => router.push('/(tabs)/exercise')} activeOpacity={0.8}>
              <Card style={{ borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: '#F8FAFC', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="barbell-outline" size={22} color="#94A3B8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#475569', fontWeight: '600', fontSize: 14 }}>No workout today yet</Text>
                    <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>Tap to start a session →</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        </View>

        {/* Weekly chart */}
        {weeklyData && weeklyData.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 12 }}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Weekly Calories</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <Ionicons name="bar-chart-outline" size={13} color="#64748B" />
                  <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600' }}>7 days</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: chartH + 24 }}>
                {weeklyData.map((day) => {
                  const barH = Math.max((day.calories / maxWeekly) * chartH, day.calories > 0 ? 6 : 3);
                  const isToday = day.date === today;
                  const overGoal = day.calories > goalCalories;
                  return (
                    <View key={day.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      {isToday && day.calories > 0 && (
                        <Text style={{ fontSize: 9, color: '#059669', fontWeight: '700', marginBottom: 2 }}>
                          {Math.round(day.calories)}
                        </Text>
                      )}
                      <View style={{ width: 28, maxWidth: 28, borderRadius: 8, overflow: 'hidden', height: barH }}>
                        {day.calories > 0 ? (
                          <LinearGradient
                            colors={overGoal ? ['#EF4444', '#F87171'] : isToday ? ['#059669', '#34D399'] : ['#CBD5E1', '#E2E8F0']}
                            style={{ flex: 1 }}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 0, y: 0 }}
                          />
                        ) : (
                          <View style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8 }} />
                        )}
                      </View>
                      <Text style={{ fontSize: 10, color: isToday ? '#059669' : '#94A3B8', fontWeight: isToday ? '700' : '500' }}>
                        {formatDay(day.date)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {/* Goal line label */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                {[
                  { color: '#34D399', label: 'Today' },
                  { color: '#CBD5E1', label: 'Other days' },
                  { color: '#F87171', label: 'Over goal' },
                ].map((l) => (
                  <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: l.color }} />
                    <Text style={{ color: '#94A3B8', fontSize: 11 }}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* Targets card */}
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>Today's Targets</Text>
            <View style={{ gap: 12 }}>
              {[
                { label: 'Calories', current: consumed, goal: goalCalories, unit: 'kcal', color: '#059669', icon: 'flame' },
                { label: 'Protein', current: protein, goal: goalProtein, unit: 'g', color: '#3B82F6', icon: 'barbell-outline' },
                { label: 'Carbs', current: carbs, goal: goalCarbs, unit: 'g', color: '#F59E0B', icon: 'nutrition-outline' },
                { label: 'Fat', current: fat, goal: goalFat, unit: 'g', color: '#EF4444', icon: 'water-outline' },
              ].map((n) => {
                const p = Math.min(n.current / n.goal, 1);
                return (
                  <View key={n.label}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: n.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={n.icon as any} size={13} color={n.color} />
                        </View>
                        <Text style={{ color: '#475569', fontSize: 13, fontWeight: '500' }}>{n.label}</Text>
                      </View>
                      <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                        <Text style={{ color: '#0F172A', fontWeight: '700' }}>{Math.round(n.current)}</Text>/{n.goal} {n.unit}
                      </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', backgroundColor: n.color, borderRadius: 3, width: `${p * 100}%` }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
