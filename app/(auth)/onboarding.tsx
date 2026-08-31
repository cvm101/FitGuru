import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

const GOALS = [
  { id: 'lose', label: 'Lose Weight', icon: 'trending-down', calories: 1700, color: '#EF4444' },
  { id: 'maintain', label: 'Maintain', icon: 'remove', calories: 2000, color: '#F59E0B' },
  { id: 'gain', label: 'Build Muscle', icon: 'trending-up', calories: 2500, color: '#10B981' },
];

export default function OnboardingScreen() {
  const { saveProfile, session } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('maintain');
  const [goalCalories, setGoalCalories] = useState('2000');

  async function handleFinish() {
    if (!name.trim()) {
      Alert.alert('Please enter your name');
      return;
    }
    setLoading(true);
    try {
      const goal = GOALS.find((g) => g.id === selectedGoal)!;
      await saveProfile({
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        goal_calories: parseInt(goalCalories, 10) || goal.calories,
        goal_protein: Math.round((parseInt(goalCalories, 10) || goal.calories) * 0.3 / 4),
        goal_carbs: Math.round((parseInt(goalCalories, 10) || goal.calories) * 0.4 / 4),
        goal_fat: Math.round((parseInt(goalCalories, 10) || goal.calories) * 0.3 / 9),
      });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Progress bar */}
      <View className="bg-primary pt-14 pb-6 px-6">
        <Text className="text-white text-xl font-bold mb-4">Set Up Your Profile</Text>
        <View className="flex-row gap-2">
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-white' : 'bg-white/30'}`}
            />
          ))}
        </View>
        <Text className="text-white/70 text-xs mt-2">Step {step} of 3</Text>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View className="gap-5">
            <View>
              <Text className="text-slate-900 text-xl font-bold">About You</Text>
              <Text className="text-slate-500 text-sm mt-1">Tell us a little about yourself</Text>
            </View>
            <Input
              label="Your Name *"
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              autoCapitalize="words"
              leftIcon={<Ionicons name="person-outline" size={18} color="#94A3B8" />}
            />
            <Input
              label="Age"
              value={age}
              onChangeText={setAge}
              placeholder="25"
              keyboardType="number-pad"
              leftIcon={<Ionicons name="calendar-outline" size={18} color="#94A3B8" />}
            />
            <Input
              label="Height (cm)"
              value={height}
              onChangeText={setHeight}
              placeholder="175"
              keyboardType="decimal-pad"
              leftIcon={<Ionicons name="resize-outline" size={18} color="#94A3B8" />}
            />
            <Input
              label="Weight (kg)"
              value={weight}
              onChangeText={setWeight}
              placeholder="70"
              keyboardType="decimal-pad"
              leftIcon={<Ionicons name="barbell-outline" size={18} color="#94A3B8" />}
            />
            <Button title="Next" onPress={() => setStep(2)} />
          </View>
        )}

        {step === 2 && (
          <View className="gap-5">
            <View>
              <Text className="text-slate-900 text-xl font-bold">Your Goal</Text>
              <Text className="text-slate-500 text-sm mt-1">What are you aiming for?</Text>
            </View>
            {GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                onPress={() => {
                  setSelectedGoal(goal.id);
                  setGoalCalories(goal.calories.toString());
                }}
              >
                <Card className={`flex-row items-center gap-4 ${selectedGoal === goal.id ? 'border-2 border-primary' : ''}`}>
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center"
                    style={{ backgroundColor: goal.color + '20' }}
                  >
                    <Ionicons name={goal.icon as any} size={24} color={goal.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-900 font-semibold">{goal.label}</Text>
                    <Text className="text-slate-500 text-sm">{goal.calories} kcal/day recommended</Text>
                  </View>
                  {selectedGoal === goal.id && (
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  )}
                </Card>
              </TouchableOpacity>
            ))}
            <View className="flex-row gap-3 mt-2">
              <View className="flex-1">
                <Button title="Back" onPress={() => setStep(1)} variant="ghost" />
              </View>
              <View className="flex-1">
                <Button title="Next" onPress={() => setStep(3)} />
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="gap-5">
            <View>
              <Text className="text-slate-900 text-xl font-bold">Daily Calorie Goal</Text>
              <Text className="text-slate-500 text-sm mt-1">We've suggested a goal based on your aim. Feel free to adjust.</Text>
            </View>
            <Card>
              <Text className="text-slate-500 text-sm mb-1">Daily calorie target</Text>
              <Input
                value={goalCalories}
                onChangeText={setGoalCalories}
                keyboardType="number-pad"
                leftIcon={<Ionicons name="flame-outline" size={18} color="#94A3B8" />}
              />
              <View className="flex-row justify-between mt-3">
                {[1500, 1700, 2000, 2200, 2500].map((cal) => (
                  <TouchableOpacity
                    key={cal}
                    onPress={() => setGoalCalories(cal.toString())}
                    className={`px-3 py-1.5 rounded-lg ${goalCalories === cal.toString() ? 'bg-primary' : 'bg-slate-100'}`}
                  >
                    <Text className={`text-xs font-medium ${goalCalories === cal.toString() ? 'text-white' : 'text-slate-600'}`}>
                      {cal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            <Card>
              <Text className="text-slate-700 font-semibold mb-3">Estimated Macros</Text>
              {[
                { label: 'Protein', pct: '30%', color: '#3B82F6', g: Math.round((parseInt(goalCalories) || 2000) * 0.3 / 4) },
                { label: 'Carbs', pct: '40%', color: '#F59E0B', g: Math.round((parseInt(goalCalories) || 2000) * 0.4 / 4) },
                { label: 'Fat', pct: '30%', color: '#EF4444', g: Math.round((parseInt(goalCalories) || 2000) * 0.3 / 9) },
              ].map((macro) => (
                <View key={macro.label} className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className="w-3 h-3 rounded-full" style={{ backgroundColor: macro.color }} />
                    <Text className="text-slate-600 text-sm">{macro.label}</Text>
                  </View>
                  <Text className="text-slate-800 font-semibold text-sm">{macro.g}g <Text className="text-slate-400 font-normal">({macro.pct})</Text></Text>
                </View>
              ))}
            </Card>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button title="Back" onPress={() => setStep(2)} variant="ghost" />
              </View>
              <View className="flex-1">
                <Button title="Get Started!" onPress={handleFinish} loading={loading} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
