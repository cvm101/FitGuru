import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { FoodLog, MealType } from '@/lib/types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function usePressScale() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => { scale.value = withSpring(0.94, { damping: 15, stiffness: 300 }); },
    onPressOut: () => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); },
  };
}

interface MealSectionProps {
  title: string;
  mealType: MealType;
  logs: FoodLog[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}

// One accent color for every meal — the icon glyph (sun/cloud/moon/cup) already
// tells them apart, so color doesn't need to do that job too.
const MEAL_ICON: Record<MealType, string> = {
  breakfast: 'sunny',
  lunch: 'partly-sunny',
  dinner: 'moon',
  snack: 'cafe',
};
const ACCENT: [string, string] = ['#059669', '#10B981'];
const ACCENT_LIGHT_BG = '#ECFDF5';

export default function MealSection({ title, mealType, logs, onAdd, onDelete }: MealSectionProps) {
  const icon = MEAL_ICON[mealType];
  const totalCalories = logs.reduce((sum, l) => sum + l.calories, 0);
  const totalProtein = logs.reduce((sum, l) => sum + l.protein_g, 0);
  const addButtonPress = usePressScale();
  const emptyStatePress = usePressScale();

  function confirmDelete(id: string, name: string) {
    Alert.alert('Remove Food', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDelete(id) },
    ]);
  }

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Gradient icon */}
          <View style={{ width: 38, height: 38, borderRadius: 13, overflow: 'hidden' }}>
            <LinearGradient
              colors={ACCENT}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name={icon as any} size={18} color="white" />
            </LinearGradient>
          </View>
          <View>
            <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14 }}>{title}</Text>
            <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 1 }}>
              {totalCalories > 0 ? `${Math.round(totalCalories)} kcal · ${Math.round(totalProtein)}g protein` : 'Nothing logged yet'}
            </Text>
          </View>
        </View>
        <AnimatedTouchable
          onPress={onAdd}
          onPressIn={addButtonPress.onPressIn}
          onPressOut={addButtonPress.onPressOut}
          style={[
            {
              width: 32, height: 32, borderRadius: 11,
              backgroundColor: ACCENT_LIGHT_BG,
              alignItems: 'center', justifyContent: 'center',
            },
            addButtonPress.style,
          ]}
        >
          <Ionicons name="add" size={20} color={ACCENT[0]} />
        </AnimatedTouchable>
      </View>

      {/* Food items */}
      {logs.length === 0 ? (
        <AnimatedTouchable
          onPress={onAdd}
          onPressIn={emptyStatePress.onPressIn}
          onPressOut={emptyStatePress.onPressOut}
          style={[{ paddingHorizontal: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, emptyStatePress.style]}
        >
          <View style={{ width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={15} color="#CBD5E1" />
          </View>
          <Text style={{ color: '#CBD5E1', fontSize: 13 }}>Add {title.toLowerCase()} items</Text>
        </AnimatedTouchable>
      ) : (
        <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC' }}>
          {logs.map((log, idx) => (
            <View
              key={log.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderBottomWidth: idx < logs.length - 1 ? 1 : 0,
                borderBottomColor: '#F8FAFC',
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT[0], marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{log.food_name}</Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 1 }}>
                  {log.quantity}{log.unit}  ·  P:{Math.round(log.protein_g)}g  C:{Math.round(log.carbs_g)}g  F:{Math.round(log.fat_g)}g
                </Text>
              </View>
              <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 13, marginRight: 12 }}>{Math.round(log.calories)}</Text>
              <TouchableOpacity onPress={() => confirmDelete(log.id, log.food_name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#E2E8F0" />
              </TouchableOpacity>
            </View>
          ))}
          {/* Meal total */}
          {logs.length > 1 && (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FAFAFA' }}>
              <Text style={{ color: '#64748B', fontSize: 12 }}>
                Total: <Text style={{ fontWeight: '700', color: ACCENT[0] }}>{Math.round(totalCalories)} kcal</Text>
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
