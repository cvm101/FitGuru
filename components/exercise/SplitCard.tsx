import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { WorkoutSplit } from '@/lib/types';

interface SplitCardProps {
  split: WorkoutSplit;
  onStartWorkout?: (split: WorkoutSplit, dayIndex: number) => void;
}

export default function SplitCard({ split, onStartWorkout }: SplitCardProps) {
  const [expanded, setExpanded] = useState(false);

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
        colors={[split.color + 'EE', split.color + '99']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 18 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            {/* Short name badge */}
            <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 8 }}>
              <Text style={{ color: 'white', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{split.shortName}</Text>
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
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Best for */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Ionicons name="trophy-outline" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{split.bestFor}</Text>
        </View>
      </LinearGradient>

      {/* Description + days */}
      <View style={{ backgroundColor: 'white' }}>
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ paddingHorizontal: 18, paddingVertical: 12 }}>
          <Text style={{ color: '#64748B', fontSize: 13, lineHeight: 19 }} numberOfLines={expanded ? undefined : 2}>
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
          <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
            {split.days.map((day, idx) => (
              <View
                key={idx}
                style={{
                  paddingHorizontal: 18, paddingVertical: 12,
                  borderBottomWidth: idx < split.days.length - 1 ? 1 : 0,
                  borderBottomColor: '#F8FAFC',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: split.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: split.color, fontSize: 12, fontWeight: '800' }}>{idx + 1}</Text>
                    </View>
                    <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 13 }}>{day.name}</Text>
                  </View>
                  {onStartWorkout && (
                    <TouchableOpacity
                      onPress={() => onStartWorkout(split, idx)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: split.color + '18', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                    >
                      <Ionicons name="play" size={11} color={split.color} />
                      <Text style={{ color: split.color, fontSize: 12, fontWeight: '700' }}>Start</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                  {day.muscles.map((m) => (
                    <View key={m} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '500' }}>{m}</Text>
                    </View>
                  ))}
                </View>
                <Text style={{ color: '#94A3B8', fontSize: 12, lineHeight: 17 }}>
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
