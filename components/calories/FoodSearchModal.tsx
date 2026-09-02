import { useState, useRef, useEffect, useCallback } from 'react';
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

const DEBOUNCE_MS = 400; // wait this long after last keystroke before firing

interface Props {
  visible: boolean;
  mealType: MealType;
  onSelect: (food: OpenFoodFactsProduct, grams: number) => void;
  onClose: () => void;
}

// ─── Individual food result card ─────────────────────────────────────────────
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

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function FoodSearchModal({ visible, mealType, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenFoodFactsProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Debounce timer ref — cleared on every keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // AbortController for the current fetch — cancelled when a new search starts
  const abortRef = useRef<AbortController | null>(null);

  const accentColor = MEAL_COLORS[mealType];
  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  // ── Live search triggered by text change ──────────────────────────────────
  const handleTextChange = useCallback((text: string) => {
    setQuery(text);
    setTimedOut(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      // Also set a 5s UI timeout
      const uiTimeout = setTimeout(() => {
        if (!signal.aborted) {
          abortRef.current?.abort();
          setLoading(false);
          setTimedOut(true);
        }
      }, 5000);

      try {
        const data = await searchOpenFoodFacts(text.trim(), signal);
        clearTimeout(uiTimeout);
        setResults(data);
        setHasSearched(true);
        setTimedOut(false);
      } catch (err: any) {
        clearTimeout(uiTimeout);
        if (err?.name !== 'AbortError') setResults([]);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  // ── Manual retry ─────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setTimedOut(false);
    handleTextChange(query);
  }, [query, handleTextChange]);

  // ── Clear everything on close ────────────────────────────────────────────
  function handleClose() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setLoading(false);
    setTimedOut(false);
    onClose();
  }

  // ── Clean up on unmount ──────────────────────────────────────────────────
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const showEmpty = !loading && !timedOut && hasSearched && results.length === 0;
  const showPrompt = !loading && !timedOut && !hasSearched && query.length < 2;
  const showResults = !loading && results.length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F1F5F9' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar barStyle="light-content" />

        {/* ── Header ── */}
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

          {/* ── Live search input ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 14, height: 50 }}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={{ flex: 1, color: '#0F172A', fontSize: 15, paddingHorizontal: 10, height: '100%' }}
              placeholder="Type to search 3M+ foods…"
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={handleTextChange}
              returnKeyType="search"
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
            />
            {/* Right side: spinner while fetching, or clear button when there's text */}
            {loading ? (
              <ActivityIndicator size="small" color={accentColor} style={{ marginLeft: 6 }} />
            ) : query.length > 0 ? (
              <TouchableOpacity onPress={() => handleTextChange('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* ── Subtle hint ── */}
          {query.length > 0 && query.length < 2 && (
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 6, marginLeft: 4 }}>
              Type at least 2 characters…
            </Text>
          )}
          {query.length >= 2 && !loading && (
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 6, marginLeft: 4 }}>
              {results.length > 0 ? `${results.length} results` : hasSearched ? 'No results' : 'Searching…'}
            </Text>
          )}
        </LinearGradient>

        {/* ── Body ── */}
        {showPrompt && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="nutrition" size={28} color="#10B981" />
            </View>
            <Text style={{ color: '#475569', fontWeight: '700', fontSize: 16 }}>Start typing to search</Text>
            <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
              Results appear automatically as you type
            </Text>
            <Text style={{ color: '#CBD5E1', fontSize: 11, marginTop: 4 }}>Powered by Open Food Facts · 3M+ products</Text>
          </View>
        )}

        {loading && results.length === 0 && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={{ color: '#64748B', fontSize: 14 }}>Searching…</Text>
            <Text style={{ color: '#CBD5E1', fontSize: 11 }}>Open Food Facts · may take a few seconds</Text>
          </View>
        )}

        {timedOut && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cloud-offline-outline" size={28} color="#D97706" />
            </View>
            <Text style={{ color: '#475569', fontWeight: '700', fontSize: 16 }}>Taking too long</Text>
            <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
              The food database is slow right now. Try again or search with a shorter term.
            </Text>
            <TouchableOpacity
              onPress={handleRetry}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 }}
            >
              <Ionicons name="refresh" size={16} color="white" />
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {showEmpty && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="search-outline" size={28} color="#CBD5E1" />
            </View>
            <Text style={{ color: '#475569', fontWeight: '700', fontSize: 16 }}>No results found</Text>
            <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
              Try a different spelling or a more general term
            </Text>
          </View>
        )}

        {showResults && (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <FoodItem item={item} onSelect={onSelect} />}
            contentContainerStyle={{ padding: 14 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            // Show spinner at the top of the list while a new search runs on existing results
            ListHeaderComponent={loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 2 }}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>Updating results…</Text>
              </View>
            ) : null}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
