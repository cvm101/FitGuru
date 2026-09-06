import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { WorkoutSplit } from '@/lib/types';
import { useTheme } from '@/lib/context/ThemeContext';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function usePressScale(to = 0.92) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => { scale.value = withSpring(to, { damping: 15, stiffness: 300 }); },
    onPressOut: () => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); },
  };
}

function StartDayButton({ color, onPress }: { color: string; onPress: () => void }) {
  const press = usePressScale();
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: color + '18', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }, press.style]}
    >
      <Ionicons name="play" size={11} color={color} />
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>Start</Text>
    </AnimatedTouchable>
  );
}

interface SplitCardProps {
  split: WorkoutSplit;
  onStartWorkout?: (split: WorkoutSplit, dayIndex: number) => void;
  isActive?: boolean;
  onFollow?: (split: WorkoutSplit) => void;
}

export default function SplitCard({ split, onStartWorkout, isActive = false, onFollow }: SplitCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const chevronPress = usePressScale();
  const followPress = usePressScale(0.95);

  const levelConfig = {
    Beginner: { color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
    Intermediate: { color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
    Advanced: { color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
  };
  const lvl = levelConfig[split.level];

  return (
    <View style={{
      borderRadius: 22,
      overflow: 'hidden',
      marginBottom: 14,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    }}>
      {/* Gradient header */}
      <LinearGradient
        colors={['#1E293B', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 18 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            {/* Short name badge + Active badge row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{split.shortName}</Text>
              </View>
              {isActive && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B981', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 }}>
                  <Ionicons name="checkmark-circle" size={11} color="white" />
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>Active</Text>
                </View>
              )}
            </View>

            <Text style={{ color: 'white', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>{split.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 }}>
                <Ionicons name="calendar-outline" size={11} color="white" />
                <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>{split.frequency}</Text>
              </View>
              <View style={{ backgroundColor: lvl.bg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ color: lvl.color, fontSize: 11, fontWeight: '700' }}>{split.level}</Text>
              </View>
            </View>
          </View>
          <AnimatedTouchable
            onPress={() => setExpanded(!expanded)}
            onPressIn={chevronPress.onPressIn}
            onPressOut={chevronPress.onPressOut}
            style={[{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }, chevronPress.style]}
          >
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="white" />
          </AnimatedTouchable>
        </View>

        {/* Best for */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Ionicons name="trophy-outline" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{split.bestFor}</Text>
        </View>

        {/* Follow / Active button */}
        {onFollow && (
          <AnimatedTouchable
            onPress={() => !isActive && onFollow(split)}
            onPressIn={followPress.onPressIn}
            onPressOut={followPress.onPressOut}
            style={[
              {
                marginTop: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 13,
                backgroundColor: isActive ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.15)',
                borderWidth: 1,
                borderColor: isActive ? '#10B981' : 'rgba(255,255,255,0.25)',
              },
              followPress.style,
            ]}
          >
            <Ionicons
              name={isActive ? 'checkmark-circle' : 'flag-outline'}
              size={14}
              color={isActive ? '#10B981' : 'white'}
            />
            <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#10B981' : 'white' }}>
              {isActive ? 'Currently Following' : 'Follow This Program'}
            </Text>
          </AnimatedTouchable>
        )}
      </LinearGradient>

      {/* Description + days */}
      <View style={{ backgroundColor: colors.card }}>
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ paddingHorizontal: 18, paddingVertical: 12 }}>
          <Text style={{ color: colors.textSub, fontSize: 13, lineHeight: 19 }} numberOfLines={expanded ? undefined : 2}>
            {split.description}
          </Text>
          {/* Day count bubbles */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            {split.days.map((_, i) => (
              <View key={i} style={{
                width: 28, height: 28, borderRadius: 10,
                backgroundColor: split.color + '18',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: split.color, fontSize: 12, fontWeight: '700' }}>D{i + 1}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Expanded days */}
        {expanded && (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.separator }}>
            {split.days.map((day, idx) => (
              <View
                key={idx}
                style={{
                  paddingHorizontal: 18, paddingVertical: 12,
                  borderBottomWidth: idx < split.days.length - 1 ? 1 : 0,
                  borderBottomColor: colors.separator,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: split.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: split.color, fontSize: 12, fontWeight: '800' }}>{idx + 1}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{day.name}</Text>
                  </View>
                  {onStartWorkout && (
                    <StartDayButton color={split.color} onPress={() => onStartWorkout(split, idx)} />
                  )}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                  {day.muscles.map((m) => (
                    <View key={m} style={{ backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '500' }}>{m}</Text>
                    </View>
                  ))}
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>
                  {day.exercises.slice(0, 5).join(' · ')}{day.exercises.length > 5 ? ` +${day.exercises.length - 5} more` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
