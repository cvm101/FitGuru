import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/context/AuthContext';
import { getWorkoutSessions } from '@/lib/queries/exercise';
import { getWeeklyCalories } from '@/lib/queries/calories';
import { getBodyWeightLogs, upsertBodyWeight } from '@/lib/queries/bodyweight';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import AnimatedProgressBar from '@/components/ui/AnimatedProgressBar';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Eyebrow from '@/components/ui/Eyebrow';
import BodyWeightChart from '@/components/profile/BodyWeightChart';
import ActivityHeatmap from '@/components/profile/ActivityHeatmap';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function usePressScale(to = 0.94) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => { scale.value = withSpring(to, { damping: 15, stiffness: 300 }); },
    onPressOut: () => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); },
  };
}

function AvatarEditButton({ onPress }: { onPress: () => void }) {
  const press = usePressScale();
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        { position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 9, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
        press.style,
      ]}
    >
      <Ionicons name="pencil" size={12} color="white" />
    </AnimatedTouchable>
  );
}

function EditPill({ label, icon, color, bg, onPress }: { label: string; icon: string; color: string; bg: string; onPress: () => void }) {
  const press = usePressScale();
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }, press.style]}
    >
      <Ionicons name={icon as any} size={12} color={color} />
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </AnimatedTouchable>
  );
}

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export default function ProfileScreen() {
  const { session, profile, signOut, saveProfile } = useAuth();
  const userId = session?.user.id ?? '';
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState('');

  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(profile?.age?.toString() ?? '');
  const [height, setHeight] = useState(profile?.height_cm?.toString() ?? '');
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() ?? '');
  const [goalCalories, setGoalCalories] = useState(profile?.goal_calories?.toString() ?? '2000');
  const [goalProtein, setGoalProtein] = useState(profile?.goal_protein?.toString() ?? '150');
  const [goalCarbs, setGoalCarbs] = useState(profile?.goal_carbs?.toString() ?? '250');
  const [goalFat, setGoalFat] = useState(profile?.goal_fat?.toString() ?? '65');

  const { data: sessions = [] } = useQuery({
    queryKey: ['workout-sessions', userId],
    queryFn: () => getWorkoutSessions(userId),
    enabled: !!userId,
  });

  const { data: weeklyCalories = [] } = useQuery({
    queryKey: ['weekly-calories', userId],
    queryFn: () => getWeeklyCalories(userId),
    enabled: !!userId,
  });

  const { data: weightLogs = [] } = useQuery({
    queryKey: ['body-weight-logs', userId],
    queryFn: () => getBodyWeightLogs(userId),
    enabled: !!userId,
  });

  const weightMutation = useMutation({
    mutationFn: (weight_kg: number) =>
      upsertBodyWeight({ user_id: userId, date: todayDate(), weight_kg, notes: null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-weight-logs', userId] }),
  });

  const totalWorkouts = sessions.length;
  const activeDays = weeklyCalories.filter((d) => d.calories > 0).length;
  const avgCalories = activeDays > 0
    ? Math.round(weeklyCalories.filter((d) => d.calories > 0).reduce((s, d) => s + d.calories, 0) / activeDays)
    : 0;

  // Streak
  let streak = 0;
  let checkDate = todayDate();
  while (true) {
    if (sessions.some((s) => s.date === checkDate)) {
      streak++;
      const d = new Date(checkDate + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().split('T')[0];
    } else break;
  }

  const BMI = profile?.height_cm && profile?.weight_kg
    ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
    : null;

  const bmiInfo = BMI
    ? parseFloat(BMI) < 18.5 ? { label: 'Underweight', color: '#3B82F6' }
    : parseFloat(BMI) < 25 ? { label: 'Normal weight', color: '#10B981' }
    : parseFloat(BMI) < 30 ? { label: 'Overweight', color: '#F59E0B' }
    : { label: 'Obese', color: '#EF4444' }
    : null;

  function startEditing() {
    setName(profile?.name ?? ''); setAge(profile?.age?.toString() ?? ''); setHeight(profile?.height_cm?.toString() ?? '');
    setWeight(profile?.weight_kg?.toString() ?? ''); setGoalCalories(profile?.goal_calories?.toString() ?? '2000');
    setGoalProtein(profile?.goal_protein?.toString() ?? '150'); setGoalCarbs(profile?.goal_carbs?.toString() ?? '250');
    setGoalFat(profile?.goal_fat?.toString() ?? '65');
    setEditing(true);
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setSaving(true);
    try {
      await saveProfile({
        name: name.trim(), age: age ? parseInt(age, 10) : null,
        height_cm: height ? parseFloat(height) : null, weight_kg: weight ? parseFloat(weight) : null,
        goal_calories: parseInt(goalCalories, 10) || 2000, goal_protein: parseInt(goalProtein, 10) || 150,
        goal_carbs: parseInt(goalCarbs, 10) || 250, goal_fat: parseInt(goalFat, 10) || 65,
      });
      setEditing(false);
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const initial = (profile?.name ?? session?.user?.email ?? 'U')[0].toUpperCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F1F5F9' }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <ScreenHeader colors={['#0F172A', '#1E293B']} paddingBottom={32} style={{ alignItems: 'center' }}>
        {/* Avatar */}
        <View style={{ marginBottom: 14 }}>
          <LinearGradient colors={['#059669', '#10B981']} style={{ width: 80, height: 80, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 32 }}>{initial}</Text>
          </LinearGradient>
          {!editing && (
            <AvatarEditButton onPress={startEditing} />
          )}
        </View>

        <Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>{profile?.name ?? 'Athlete'}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 3 }}>{session?.user?.email}</Text>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 20 }}>
          {[
            { val: totalWorkouts, label: 'Workouts', icon: 'barbell-outline' },
            { val: streak, label: 'Day Streak', icon: 'flame-outline' },
            { val: avgCalories, label: 'Avg kcal', icon: 'nutrition-outline' },
          ].map((s, i) => (
            <Animated.View key={s.label} entering={FadeInDown.delay(i * 80).springify().damping(16)} style={{ alignItems: 'center', gap: 4 }}>
              {s.val > 0 ? (
                <AnimatedNumber value={s.val} style={{ color: 'white', fontWeight: '800', fontSize: 20 }} />
              ) : (
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 20 }}>—</Text>
              )}
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{s.label}</Text>
            </Animated.View>
          ))}
        </View>
      </ScreenHeader>

      <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 14 }}>
        {/* Body weight chart */}
        <Card>
          <Eyebrow label="Progress" />
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 14 }}>Body Weight</Text>
          <BodyWeightChart
            logs={weightLogs}
            goalWeight={profile?.weight_kg ?? null}
            onAdd={() => { setNewWeight(''); setWeightModalVisible(true); }}
          />
        </Card>

        {/* Activity heatmap */}
        <Card>
          <ActivityHeatmap activeDates={sessions.map((s) => s.date)} weeks={26} />
        </Card>

        {/* Body Stats */}
        <Card>
          <Eyebrow label="Profile" color="#059669" bg="#ECFDF5" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Body Stats</Text>
            {!editing && (
              <EditPill label="Edit" icon="pencil" color="#059669" bg="#ECFDF5" onPress={startEditing} />
            )}
          </View>

          {!editing ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { label: 'Age', val: profile?.age ? `${profile.age} yrs` : '—', icon: 'calendar', color: '#059669' },
                  { label: 'Height', val: profile?.height_cm ? `${profile.height_cm} cm` : '—', icon: 'resize', color: '#3B82F6' },
                  { label: 'Weight', val: profile?.weight_kg ? `${profile.weight_kg} kg` : '—', icon: 'barbell', color: '#10B981' },
                  { label: 'BMI', val: BMI ?? '—', icon: 'analytics', color: bmiInfo?.color ?? '#94A3B8' },
                ].map((stat) => (
                  <View key={stat.label} style={{ width: '47%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: stat.color + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <Ionicons name={stat.icon as any} size={16} color={stat.color} />
                    </View>
                    <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 17 }}>{stat.val}</Text>
                    <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>{stat.label}</Text>
                  </View>
                ))}
              </View>
              {bmiInfo && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: bmiInfo.color + '12', padding: 10, borderRadius: 12 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: bmiInfo.color }} />
                  <Text style={{ color: bmiInfo.color, fontWeight: '600', fontSize: 13 }}>BMI {BMI} — {bmiInfo.label}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={{ gap: 12 }}>
              <Input label="Name *" value={name} onChangeText={setName} placeholder="Your name" leftIcon={<Ionicons name="person-outline" size={16} color="#94A3B8" />} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Input label="Age" value={age} onChangeText={setAge} placeholder="25" keyboardType="number-pad" /></View>
                <View style={{ flex: 1 }}><Input label="Weight (kg)" value={weight} onChangeText={setWeight} placeholder="70" keyboardType="decimal-pad" /></View>
              </View>
              <Input label="Height (cm)" value={height} onChangeText={setHeight} placeholder="175" keyboardType="decimal-pad" leftIcon={<Ionicons name="resize-outline" size={16} color="#94A3B8" />} />
            </View>
          )}
        </Card>

        {/* Daily Goals */}
        <Card>
          <Eyebrow label="Targets" color="#D97706" bg="#FFFBEB" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Daily Goals</Text>
            {!editing && (
              <EditPill label="Adjust" icon="pencil" color="#059669" bg="#ECFDF5" onPress={startEditing} />
            )}
          </View>

          {!editing ? (
            <View style={{ gap: 10 }}>
              {[
                { label: 'Calories', val: `${profile?.goal_calories ?? 2000}`, unit: 'kcal', color: '#059669', pct: 1 },
                { label: 'Protein', val: `${profile?.goal_protein ?? 150}`, unit: 'g', color: '#3B82F6', pct: ((profile?.goal_protein ?? 150) * 4) / (profile?.goal_calories ?? 2000) },
                { label: 'Carbohydrates', val: `${profile?.goal_carbs ?? 250}`, unit: 'g', color: '#F59E0B', pct: ((profile?.goal_carbs ?? 250) * 4) / (profile?.goal_calories ?? 2000) },
                { label: 'Fat', val: `${profile?.goal_fat ?? 65}`, unit: 'g', color: '#EF4444', pct: ((profile?.goal_fat ?? 65) * 9) / (profile?.goal_calories ?? 2000) },
              ].map((g, i) => (
                <Animated.View key={g.label} entering={FadeInDown.delay(i * 70).springify().damping(16)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: g.color }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: '#475569', fontSize: 13 }}>{g.label}</Text>
                      <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 13 }}>{g.val} <Text style={{ color: '#94A3B8', fontWeight: '400' }}>{g.unit}</Text></Text>
                    </View>
                    <AnimatedProgressBar percent={g.pct * 100} color={g.color} height={5} delay={i * 70} style={{ opacity: 0.7 }} />
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Input label="Calorie Goal (kcal)" value={goalCalories} onChangeText={setGoalCalories} keyboardType="number-pad" leftIcon={<Ionicons name="flame-outline" size={16} color="#94A3B8" />} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Input label="Protein (g)" value={goalProtein} onChangeText={setGoalProtein} keyboardType="number-pad" /></View>
                <View style={{ flex: 1 }}><Input label="Carbs (g)" value={goalCarbs} onChangeText={setGoalCarbs} keyboardType="number-pad" /></View>
                <View style={{ flex: 1 }}><Input label="Fat (g)" value={goalFat} onChangeText={setGoalFat} keyboardType="number-pad" /></View>
              </View>
            </View>
          )}
        </Card>

        {/* Save / Cancel */}
        {editing && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button title="Cancel" onPress={() => setEditing(false)} variant="ghost" /></View>
            <View style={{ flex: 1 }}><Button title="Save" onPress={handleSave} loading={saving} /></View>
          </View>
        )}

        {/* About */}
        <Card>
          <Eyebrow label="Credits" color="#64748B" bg="#F1F5F9" />
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>Data Sources</Text>
          {[
            { icon: 'nutrition', color: '#10B981', title: 'Open Food Facts', desc: '3M+ products · Free & open source' },
            { icon: 'barbell', color: '#059669', title: 'free-exercise-db', desc: '55 exercises · MIT license' },
            { icon: 'server', color: '#3B82F6', title: 'Supabase', desc: 'PostgreSQL · Row Level Security' },
          ].map((info, i) => (
            <View key={info.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#F8FAFC' }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: info.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={info.icon as any} size={18} color={info.color} />
              </View>
              <View>
                <Text style={{ color: '#1E293B', fontWeight: '600', fontSize: 13 }}>{info.title}</Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 1 }}>{info.desc}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Sign out */}
        <Button
          title="Sign Out"
          onPress={() => {
            if (Platform.OS === 'web') {
              // Alert.alert is no-op on web — use native confirm instead
              if (window.confirm('Are you sure you want to sign out?')) signOut();
            } else {
              Alert.alert('Sign Out', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
              ]);
            }
          }}
          variant="danger"
        />
      </View>
      
      {/* Log weight modal */}
      <Modal visible={weightModalVisible} transparent animationType="fade" onRequestClose={() => setWeightModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24 }}>
            <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 20, marginBottom: 6 }}>Log Weight</Text>
            <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 20 }}>
              {new Date().toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 56, marginBottom: 20 }}>
              <TextInput
                value={newWeight}
                onChangeText={setNewWeight}
                placeholder="e.g. 75.5"
                keyboardType="decimal-pad"
                autoFocus
                style={{ flex: 1, fontSize: 24, fontWeight: '700', color: '#0F172A' }}
              />
              <Text style={{ color: '#94A3B8', fontSize: 16, fontWeight: '600' }}>kg</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" onPress={() => setWeightModalVisible(false)} variant="ghost" />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Save"
                  onPress={async () => {
                    const w = parseFloat(newWeight);
                    if (!w || w < 20 || w > 300) { Alert.alert('Invalid weight', 'Enter a value between 20 and 300 kg.'); return; }
                    await weightMutation.mutateAsync(w);
                    setWeightModalVisible(false);
                  }}
                  loading={weightMutation.isPending}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}
