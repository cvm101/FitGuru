import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import exercisesData from '@/lib/data/exercises.json';
import type { Exercise } from '@/lib/types';

const EXERCISES: Exercise[] = exercisesData as Exercise[];
const MUSCLE_GROUPS = ['All', ...Array.from(new Set(EXERCISES.map((e) => e.muscleGroup))).sort()];

interface ExerciseSearchProps {
  onSelect: (exercise: Exercise) => void;
  selected?: string[];
}

export default function ExerciseSearch({ onSelect, selected = [] }: ExerciseSearchProps) {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState('All');

  const filtered = EXERCISES.filter((e) => {
    const matchesGroup = activeGroup === 'All' || e.muscleGroup === activeGroup;
    const matchesQuery = !query || e.name.toLowerCase().includes(query.toLowerCase());
    return matchesGroup && matchesQuery;
  });

  const difficultyColors = {
    Beginner: '#10B981',
    Intermediate: '#F59E0B',
    Advanced: '#EF4444',
  };

  return (
    <View className="flex-1">
      {/* Search */}
      <View className="flex-row items-center bg-slate-100 rounded-xl px-3 gap-2 mx-4 mb-3" style={{ height: 40 }}>
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          className="flex-1 text-slate-800 text-sm"
          placeholder="Search exercises..."
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Muscle group filter */}
      <FlatList
        data={MUSCLE_GROUPS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveGroup(item)}
            className={`px-3 py-1.5 rounded-full ${activeGroup === item ? 'bg-primary' : 'bg-slate-100'}`}
          >
            <Text className={`text-xs font-medium ${activeGroup === item ? 'text-white' : 'text-slate-600'}`}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Exercise list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 8 }}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.name);
          return (
            <TouchableOpacity
              onPress={() => !isSelected && onSelect(item)}
              className={`bg-white rounded-xl p-3 flex-row items-center gap-3 ${isSelected ? 'opacity-50' : ''}`}
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}
              disabled={isSelected}
            >
              {/* Thumbnail from dataset, falls back to icon */}
              {item.thumbnailUrl ? (
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9' }}
                  resizeMode="cover"
                />
              ) : (
                <View className="w-11 h-11 bg-primary-lighter rounded-xl items-center justify-center">
                  <Ionicons name="barbell-outline" size={20} color="#10B981" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-slate-800 font-semibold text-sm">{item.name}</Text>
                <Text className="text-slate-400 text-xs">{item.muscleGroup} · {item.equipment}</Text>
              </View>
              <View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                ) : (
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: (difficultyColors[item.difficulty] ?? '#10B981') + '20' }}
                  >
                    <Text className="text-xs" style={{ color: difficultyColors[item.difficulty] ?? '#10B981' }}>
                      {item.difficulty}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-8 gap-2">
            <Ionicons name="search-outline" size={32} color="#CBD5E1" />
            <Text className="text-slate-400 text-sm">No exercises found</Text>
          </View>
        }
      />
    </View>
  );
}
