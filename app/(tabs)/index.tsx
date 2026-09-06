import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAuth } from '@/lib/context/AuthContext';
import { useTheme } from '@/lib/context/ThemeContext';
import { getDailyMacros, getWeeklyCalories } from '@/lib/queries/calories';
import { getTodayWorkout } from '@/lib/queries/exercise';
import MacroDonut from '@/components/calories/MacroDonut';
import Card from '@/components/ui/Card';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import AnimatedProgressBar from '@/components/ui/AnimatedProgressBar';
import GlassPill from '@/components/ui/GlassPill';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Eyebrow from '@/components/ui/Eyebrow';
import WeeklyCalorieChart from '@/components/calories/WeeklyCalorieChart';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function PressableTile({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style?: any }) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedTouchable
      style={[style, pressStyle]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
    >
      {children}
    </AnimatedTouchable>
  );
}

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const { profile, session } = useAuth();
  const { colors, isDark } = useTheme();
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
  const remaining = Math.max(goalCalories - consumed, 0);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const headerStretchStyle = useAnimatedStyle(() => {
    const pull = Math.max(-scrollY.value, 0);
    return { transform: [{ translateY: -pull / 2 }, { scale: 1 + pull / 300 }] };
  });

  const macroItems = [
    { label: 'Protein', current: protein, goal: goalProtein, unit: 'g', color: '#3B82F6', bg: isDark ? '#1E3A5F' : '#EFF6FF' },
    { label: 'Carbs', current: carbs, goal: goalCarbs, unit: 'g', color: '#F59E0B', bg: isDark ? '#3D2E0A' : '#FFFBEB' },
    { label: 'Fat', current: fat, goal: goalFat, unit: 'g', color: '#EF4444', bg: isDark ? '#3D1515' : '#FEF2F2' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Dark header */}
        <Animated.View style={headerStretchStyle}>
          <ScreenHeader colors={colors.headerGradient} paddingBottom={88}>
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
              <GlassPill>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' }}>
                    {new Date().toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </GlassPill>
              {consumed > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                  <Ionicons name="flame" size={12} color="#34D399" />
                  <Text style={{ color: '#34D399', fontSize: 12, fontWeight: '600' }}><AnimatedNumber value={Math.round(consumed)} /> kcal logged</Text>
                </View>
              )}
            </View>
          </ScreenHeader>
        </Animated.View>

        {/* Floating hero card */}
        <Animated.View entering={FadeInDown.duration(500).springify().damping(18)} style={{ marginHorizontal: 16, marginTop: -64 }}>
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

            {/* Remaining / over — a caption, not a second progress bar (the ring above already shows %) */}
              <Text style={{ textAlign: 'center', fontSize: 12, marginTop: 14 }}>
              {consumed > goalCalories
                ? <Text style={{ color: '#EF4444', fontWeight: '700' }}><AnimatedNumber value={Math.round(consumed - goalCalories)} prefix="+" /> kcal over goal</Text>
                : <Text style={{ color: colors.textMuted }}><Text style={{ color: '#059669', fontWeight: '700' }}><AnimatedNumber value={Math.round(remaining)} /></Text> kcal left today</Text>
              }
            </Text>

            {/* Macro boxes — the single source of macro progress + targets (no separate targets list below) */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {macroItems.map((m, i) => (
                <Animated.View key={m.label} entering={FadeInDown.delay(i * 80).springify().damping(16)} style={{ flex: 1, backgroundColor: m.bg, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                    <AnimatedNumber value={Math.round(m.current)} style={{ fontSize: 20, fontWeight: '800', color: m.color }} />
                    <Text style={{ fontSize: 11, color: m.color, fontWeight: '600', opacity: 0.8 }}>{m.unit}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' }}>{m.label}{'\n'}of {m.goal}{m.unit}</Text>
                  <AnimatedProgressBar
                    percent={(m.current / m.goal) * 100}
                    color={m.color}
                    height={3}
                    trackColor="rgba(0,0,0,0.07)"
                    style={{ width: '100%', marginTop: 6 }}
                    delay={i * 80}
                  />
                </Animated.View>
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 12 }}>
          <Animated.View entering={FadeInDown.delay(80).springify().damping(16)} style={{ flex: 1 }}>
            <PressableTile onPress={() => router.push('/(tabs)/calories')}>
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
            </PressableTile>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).springify().damping(16)} style={{ flex: 1 }}>
            <PressableTile onPress={() => router.push('/(tabs)/exercise')}>
              <LinearGradient
                colors={['#1E293B', '#334155']}
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
            </PressableTile>
          </Animated.View>
        </View>

        {/* Today's workout */}
        <Animated.View entering={FadeInDown.delay(240).duration(500).springify().damping(18)} style={{ marginHorizontal: 16, marginTop: 12 }}>
          {todayWorkout ? (
            <Card>
              <Eyebrow label="Training" color="#059669" bg="#ECFDF5" />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Today's Workout</Text>
                <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700' }}>✓ Done</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, backgroundColor: '#ECFDF5', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="barbell" size={22} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{todayWorkout.split_name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    {todayWorkout.workout_sets?.length ?? 0} sets · {todayWorkout.duration_minutes ?? 0} min
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <TouchableOpacity onPress={() => router.push('/(tabs)/exercise')} activeOpacity={0.8}>
              <Card style={{ borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: colors.surface, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="barbell-outline" size={22} color={colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textSub, fontWeight: '600', fontSize: 14 }}>No workout today yet</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>Tap to start a session →</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Weekly chart */}
        {weeklyData && weeklyData.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(500).springify().damping(18)} style={{ marginHorizontal: 16, marginTop: 12 }}>
            <Card>
              <Eyebrow label="Nutrition" />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Weekly Calories</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <Ionicons name="bar-chart-outline" size={13} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>7 days</Text>
                </View>
              </View>
              <WeeklyCalorieChart data={weeklyData} goalCalories={goalCalories} today={today} />
              {/* Goal line label */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.separator }}>
                {[
                  { color: '#059669', label: 'Today' },
                  { color: '#94A3B8', label: 'Other days' },
                  { color: '#EF4444', label: 'Over goal' },
                ].map((l) => (
                  <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: l.color }} />
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </Animated.View>
        )}
      </Animated.ScrollView>
    </View>
  );
}
