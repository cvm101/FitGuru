import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { FoodLog, MealType } from '@/lib/types';
import { useTheme } from '@/lib/context/ThemeContext';

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

interface MealSectionProps {
  title: string;
  mealType: MealType;
  logs: FoodLog[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, quantity: number, calories: number, protein_g: number, carbs_g: number, fat_g: number) => void;
}

const MEAL_ICON: Record<MealType, string> = {
  breakfast: 'sunny',
  lunch: 'partly-sunny',
  dinner: 'moon',
  snack: 'cafe',
};
const ACCENT: [string, string] = ['#059669', '#10B981'];
const ACCENT_LIGHT_BG = '#ECFDF5';

export default function MealSection({ title, mealType, logs, onAdd, onDelete, onUpdate }: MealSectionProps) {
  const { colors } = useTheme();
  const icon = MEAL_ICON[mealType];
  const totalCalories = logs.reduce((sum, l) => sum + l.calories, 0);
  const totalProtein = logs.reduce((sum, l) => sum + l.protein_g, 0);
  const addButtonPress = usePressScale();
  const emptyStatePress = usePressScale();

  // ── Edit state ───────────────────────────────────────────────
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [editQuantity, setEditQuantity] = useState('');

  function openEdit(log: FoodLog) {
    setEditingLog(log);
    setEditQuantity(String(log.quantity));
  }

  function closeEdit() {
    setEditingLog(null);
    setEditQuantity('');
  }

  function handleSave() {
    if (!editingLog) return;
    const newQty = parseFloat(editQuantity);
    if (!newQty || newQty <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a number greater than 0.');
      return;
    }
    // Back-calculate per-100g values from the original log, then scale to new qty
    const per100Cal  = editingLog.calories  / editingLog.quantity * 100;
    const per100Prot = editingLog.protein_g / editingLog.quantity * 100;
    const per100Carb = editingLog.carbs_g   / editingLog.quantity * 100;
    const per100Fat  = editingLog.fat_g     / editingLog.quantity * 100;

    const newCalories  = Math.round(per100Cal  * newQty / 100);
    const newProtein   = Math.round(per100Prot * newQty / 100 * 10) / 10;
    const newCarbs     = Math.round(per100Carb * newQty / 100 * 10) / 10;
    const newFat       = Math.round(per100Fat  * newQty / 100 * 10) / 10;

    onUpdate(editingLog.id, newQty, newCalories, newProtein, newCarbs, newFat);
    closeEdit();
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert('Remove Food', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDelete(id) },
    ]);
  }

  return (
    <>
      <View style={{
        backgroundColor: colors.card,
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
            <View style={{ width: 38, height: 38, borderRadius: 13, overflow: 'hidden' }}>
              <LinearGradient colors={ACCENT} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon as any} size={18} color="white" />
              </LinearGradient>
            </View>
            <View>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{title}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>
                {totalCalories > 0 ? `${Math.round(totalCalories)} kcal · ${Math.round(totalProtein)}g protein` : 'Nothing logged yet'}
              </Text>
            </View>
          </View>
          <AnimatedTouchable
            onPress={onAdd}
            onPressIn={addButtonPress.onPressIn}
            onPressOut={addButtonPress.onPressOut}
            style={[{ width: 32, height: 32, borderRadius: 11, backgroundColor: ACCENT_LIGHT_BG, alignItems: 'center', justifyContent: 'center' }, addButtonPress.style]}
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
            <View style={{ width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={15} color={colors.borderStrong} />
            </View>
            <Text style={{ color: colors.borderStrong, fontSize: 13 }}>Add {title.toLowerCase()} items</Text>
          </AnimatedTouchable>
        ) : (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.separator }}>
            {logs.map((log, idx) => (
              <View
                key={log.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderBottomWidth: idx < logs.length - 1 ? 1 : 0,
                  borderBottomColor: colors.separator,
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT[0], marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{log.food_name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>
                    {log.quantity}{log.unit}  ·  P:{Math.round(log.protein_g)}g  C:{Math.round(log.carbs_g)}g  F:{Math.round(log.fat_g)}g
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginRight: 10 }}>{Math.round(log.calories)}</Text>

                {/* Edit button */}
                <TouchableOpacity
                  onPress={() => openEdit(log)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginRight: 8 }}
                >
                  <Ionicons name="pencil-outline" size={16} color="#94A3B8" />
                </TouchableOpacity>

                {/* Delete button */}
                <TouchableOpacity
                  onPress={() => confirmDelete(log.id, log.food_name)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color="#E2E8F0" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Meal total */}
            {logs.length > 1 && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.textSub, fontSize: 12 }}>
                  Total: <Text style={{ fontWeight: '700', color: ACCENT[0] }}>{Math.round(totalCalories)} kcal</Text>
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Edit Quantity Modal ────────────────────────────────── */}
      <Modal
        visible={!!editingLog}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeEdit} />

          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 36,
          }}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />

            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 4 }} numberOfLines={1}>
              {editingLog?.food_name}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 20 }}>
              Update the quantity to recalculate macros automatically.
            </Text>

            {/* Quantity input */}
            <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>Quantity (g)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <TextInput
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  backgroundColor: colors.inputBg,
                  borderWidth: 2,
                  borderColor: colors.inputBorder,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 22,
                  fontWeight: '700',
                  color: colors.text,
                  textAlign: 'center',
                }}
              />
              <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600' }}>g</Text>
            </View>

            {/* Live macro preview */}
            {editingLog && parseFloat(editQuantity) > 0 && (() => {
              const qty = parseFloat(editQuantity);
              const per100Cal  = editingLog.calories  / editingLog.quantity * 100;
              const per100Prot = editingLog.protein_g / editingLog.quantity * 100;
              const per100Carb = editingLog.carbs_g   / editingLog.quantity * 100;
              const per100Fat  = editingLog.fat_g     / editingLog.quantity * 100;
              const cal  = Math.round(per100Cal  * qty / 100);
              const prot = Math.round(per100Prot * qty / 100 * 10) / 10;
              const carb = Math.round(per100Carb * qty / 100 * 10) / 10;
              const fat  = Math.round(per100Fat  * qty / 100 * 10) / 10;
              return (
                <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 20, gap: 0 }}>
                  {[
                    { label: 'Calories', val: `${cal}`, color: '#059669' },
                    { label: 'Protein', val: `${prot}g`, color: '#3B82F6' },
                    { label: 'Carbs', val: `${carb}g`, color: '#F59E0B' },
                    { label: 'Fat', val: `${fat}g`, color: '#EF4444' },
                  ].map((m, i) => (
                    <View key={m.label} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: colors.border }}>
                      <Text style={{ color: m.color, fontWeight: '800', fontSize: 15 }}>{m.val}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{m.label}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={closeEdit}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textSub, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={{ flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#059669', alignItems: 'center' }}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
