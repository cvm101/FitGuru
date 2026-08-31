import { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { searchOpenFoodFacts } from '@/lib/queries/calories';
import type { OpenFoodFactsProduct, MealType } from '@/lib/types';

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: '#F59E0B',
  lunch: '#3B82F6',
  dinner: '#6366F1',
  snack: '#10B981',
};

interface Props {
  visible: boolean;
  mealType: MealType;
  onSelect: (food: OpenFoodFactsProduct, grams: number) => void;
  onClose: () => void;
}

function FoodItem({ item, onSelect }: { item: OpenFoodFactsProduct; onSelect: (food: OpenFoodFactsProduct, grams: number) => void }) {
  const [grams, setGrams] = useState('100');

  const g = parseFloat(grams) || 100;
  const factor = g / 100;

  return (
    <View style={{
      backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 8,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {item.image_small_url ? (
          <Image source={{ uri: item.image_small_url }} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9' }} resizeMode="cover" />
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="nutrition" size={20} color="#CBD5E1" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{item.product_name}</Text>
          {item.brands ? <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 1 }} numberOfLines={1}>{item.brands}</Text> : null}
          {/* Macro pills */}
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 5 }}>
            {[
              { label: `${Math.round(item.energy_kcal_100g * factor)} kcal`, color: '#059669' },
              { label: `P ${Math.round(item.proteins_100g * factor)}g`, color: '#3B82F6' },
              { label: `C ${Math.round(item.carbohydrates_100g * factor)}g`, color: '#F59E0B' },
              { label: `F ${Math.round(item.fat_100g * factor)}g`, color: '#EF4444' },
            ].map((p) => (
              <View key={p.label} style={{ backgroundColor: p.color + '14', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: p.color, fontSize: 10, fontWeight: '700' }}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Quantity + add */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 10, height: 40 }}>
          <TextInput
            value={grams}
            onChangeText={setGrams}
            keyboardType="decimal-pad"
            style={{ flex: 1, color: '#0F172A', fontSize: 15, fontWeight: '600' }}
            selectTextOnFocus
          />
          <Text style={{ color: '#94A3B8', fontSize: 13 }}>g</Text>
        </View>
        <TouchableOpacity
          onPress={() => onSelect(item, g)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#059669', paddingHorizontal: 16, height: 40, borderRadius: 12 }}
        >
          <Ionicons name="add" size={16} color="white" />
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FoodSearchModal({ visible, mealType, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const queryRef = useRef('');
  const [results, setResults] = useState<OpenFoodFactsProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const accentColor = MEAL_COLORS[mealType];

  async function handleSearch() {
    const q = (queryRef.current || query).trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchOpenFoodFacts(q);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setQuery('');
    queryRef.current = '';
    setResults([]);
    setSearched(false);
    onClose();
  }

  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F1F5F9' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar barStyle="light-content" />
        {/* Header */}
        <LinearGradient colors={['#064E3B', '#059669']} style={{ paddingTop: Platform.OS === 'ios' ? 16 : 40, paddingBottom: 20, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Add to</Text>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '800' }}>{mealLabel}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 14, height: 50 }}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={{ flex: 1, color: '#0F172A', fontSize: 15, paddingHorizontal: 10, height: '100%' }}
              placeholder="Search 3M+ foods..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={(t) => { setQuery(t); queryRef.current = t; }}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); queryRef.current = ''; setResults([]); setSearched(false); }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleSearch}
              style={{ marginLeft: 8, backgroundColor: '#059669', paddingHorizontal: 14, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Search</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Results */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={{ color: '#64748B', fontSize: 14 }}>Searching Open Food Facts...</Text>
          </View>
        ) : searched && results.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="search-outline" size={28} color="#CBD5E1" />
            </View>
            <Text style={{ color: '#475569', fontWeight: '700', fontSize: 16 }}>No results found</Text>
            <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
              Try a different search term or check the spelling
            </Text>
          </View>
        ) : !searched ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="nutrition" size={28} color="#10B981" />
            </View>
            <Text style={{ color: '#475569', fontWeight: '700', fontSize: 16 }}>Search for food</Text>
            <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
              Powered by Open Food Facts — 3M+ products from around the world
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <FoodItem item={item} onSelect={onSelect} />}
            contentContainerStyle={{ padding: 14 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
