import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Ellipse, Rect, Circle, G } from 'react-native-svg';
import { useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

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

function SideToggleButton({ side, active, onPress }: { side: 'front' | 'back'; active: boolean; onPress: () => void }) {
  const press = usePressScale();
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9, backgroundColor: active ? 'white' : 'transparent', shadowColor: active ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: active ? 1 : 0 },
        press.style,
      ]}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#0F172A' : '#94A3B8', textTransform: 'capitalize' }}>{side}</Text>
    </AnimatedTouchable>
  );
}

interface MuscleMapProps {
  muscleVolumes: Record<string, number>;
  period?: string;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────
function intensityColor(v: number) {
  if (v <= 0)    return '#DDE3EE';
  if (v < 0.25)  return '#A7F3D0';
  if (v < 0.5)   return '#34D399';
  if (v < 0.75)  return '#10B981';
  return '#059669';
}
function opacity(v: number) {
  return v <= 0 ? 1 : 0.85;
}

// ─── Body silhouette parts (shared front+back) ────────────────────────────────
// ViewBox 0 0 100 200  (human-proportioned)
const SILHOUETTE = [
  // head
  { type: 'circle', cx: 50, cy: 10, r: 10 },
  // neck
  { type: 'rect',   x: 44, y: 19,  w: 12, h:  8, rx: 3 },
  // torso
  { type: 'rect',   x: 22, y: 26,  w: 56, h: 72, rx: 10 },
  // left upper arm
  { type: 'rect',   x:  9, y: 26,  w: 14, h: 46, rx:  6 },
  // right upper arm
  { type: 'rect',   x: 77, y: 26,  w: 14, h: 46, rx:  6 },
  // left forearm
  { type: 'rect',   x:  7, y: 70,  w: 12, h: 38, rx:  5 },
  // right forearm
  { type: 'rect',   x: 81, y: 70,  w: 12, h: 38, rx:  5 },
  // left upper leg
  { type: 'rect',   x: 24, y: 95,  w: 22, h: 52, rx:  9 },
  // right upper leg
  { type: 'rect',   x: 54, y: 95,  w: 22, h: 52, rx:  9 },
  // left lower leg
  { type: 'rect',   x: 25, y: 144, w: 18, h: 50, rx:  8 },
  // right lower leg
  { type: 'rect',   x: 57, y: 144, w: 18, h: 50, rx:  8 },
];

// ─── Muscle regions ────────────────────────────────────────────────────────────
// Each region: { muscles[], cx, cy, rx, ry } — rendered as an Ellipse overlay
const FRONT_MUSCLES: { label: string; muscles: string[]; cx: number; cy: number; rx: number; ry: number }[] = [
  // Chest — two lobes
  { label: 'Chest',    muscles: ['Chest'],       cx: 36, cy: 40, rx: 12, ry: 10 },
  { label: 'Chest',    muscles: ['Chest'],       cx: 64, cy: 40, rx: 12, ry: 10 },
  // Front delts / Shoulders
  { label: 'Shoulders', muscles: ['Shoulders'],  cx: 14, cy: 32, rx:  7, ry:  7 },
  { label: 'Shoulders', muscles: ['Shoulders'],  cx: 86, cy: 32, rx:  7, ry:  7 },
  // Biceps
  { label: 'Biceps',   muscles: ['Biceps'],      cx: 15, cy: 52, rx:  5, ry: 10 },
  { label: 'Biceps',   muscles: ['Biceps'],      cx: 85, cy: 52, rx:  5, ry: 10 },
  // Forearms
  { label: 'Forearms', muscles: ['Forearms'],    cx: 12, cy: 82, rx:  5, ry: 10 },
  { label: 'Forearms', muscles: ['Forearms'],    cx: 88, cy: 82, rx:  5, ry: 10 },
  // Core / Abs — 2 × 3 grid
  { label: 'Core',     muscles: ['Core'],        cx: 38, cy: 58, rx:  8, ry:  6 },
  { label: 'Core',     muscles: ['Core'],        cx: 62, cy: 58, rx:  8, ry:  6 },
  { label: 'Core',     muscles: ['Core'],        cx: 38, cy: 71, rx:  8, ry:  6 },
  { label: 'Core',     muscles: ['Core'],        cx: 62, cy: 71, rx:  8, ry:  6 },
  { label: 'Core',     muscles: ['Core'],        cx: 38, cy: 84, rx:  8, ry:  5 },
  { label: 'Core',     muscles: ['Core'],        cx: 62, cy: 84, rx:  8, ry:  5 },
  // Quads
  { label: 'Quadriceps', muscles: ['Quadriceps'], cx: 35, cy: 118, rx: 10, ry: 18 },
  { label: 'Quadriceps', muscles: ['Quadriceps'], cx: 65, cy: 118, rx: 10, ry: 18 },
  // Calves (front)
  { label: 'Calves',   muscles: ['Calves'],      cx: 34, cy: 159, rx:  8, ry: 14 },
  { label: 'Calves',   muscles: ['Calves'],      cx: 66, cy: 159, rx:  8, ry: 14 },
];

const BACK_MUSCLES: { label: string; muscles: string[]; cx: number; cy: number; rx: number; ry: number }[] = [
  // Traps — wide band across upper back
  { label: 'Traps',    muscles: ['Back', 'Traps'], cx: 50, cy: 29, rx: 21, ry:  8 },
  // Lats / Back
  { label: 'Back',     muscles: ['Back'],         cx: 30, cy: 52, rx: 10, ry: 18 },
  { label: 'Back',     muscles: ['Back'],         cx: 70, cy: 52, rx: 10, ry: 18 },
  // Rear delts / Shoulders
  { label: 'Shoulders', muscles: ['Shoulders'],   cx: 14, cy: 32, rx:  7, ry:  7 },
  { label: 'Shoulders', muscles: ['Shoulders'],   cx: 86, cy: 32, rx:  7, ry:  7 },
  // Triceps (back of upper arm)
  { label: 'Triceps',  muscles: ['Triceps'],      cx: 15, cy: 52, rx:  5, ry: 10 },
  { label: 'Triceps',  muscles: ['Triceps'],      cx: 85, cy: 52, rx:  5, ry: 10 },
  // Forearms (back)
  { label: 'Forearms', muscles: ['Forearms'],     cx: 12, cy: 82, rx:  5, ry: 10 },
  { label: 'Forearms', muscles: ['Forearms'],     cx: 88, cy: 82, rx:  5, ry: 10 },
  // Glutes
  { label: 'Glutes',   muscles: ['Glutes'],       cx: 35, cy: 104, rx: 12, ry:  9 },
  { label: 'Glutes',   muscles: ['Glutes'],       cx: 65, cy: 104, rx: 12, ry:  9 },
  // Hamstrings
  { label: 'Hamstrings', muscles: ['Hamstrings'], cx: 35, cy: 125, rx: 10, ry: 18 },
  { label: 'Hamstrings', muscles: ['Hamstrings'], cx: 65, cy: 125, rx: 10, ry: 18 },
  // Calves (back)
  { label: 'Calves',   muscles: ['Calves'],       cx: 34, cy: 159, rx:  8, ry: 13 },
  { label: 'Calves',   muscles: ['Calves'],       cx: 66, cy: 159, rx:  8, ry: 13 },
];

function getIntensity(muscles: string[], volumes: Record<string, number>): number {
  if (!muscles.length) return 0;
  return Math.max(...muscles.map((m) => volumes[m] ?? 0));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MuscleMap({ muscleVolumes, period = 'this week' }: MuscleMapProps) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const regions = side === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;

  // Unique trained muscles for legend
  const allMusclePairs = regions.reduce<{ label: string; intensity: number }[]>((acc, r) => {
    const v = getIntensity(r.muscles, muscleVolumes);
    if (v > 0 && !acc.find((x) => x.label === r.label)) acc.push({ label: r.label, v } as any);
    return acc;
  }, []).sort((a: any, b: any) => b.v - a.v);

  const trainedLabels = allMusclePairs;
  const allKnown = ['Chest', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Core', 'Back', 'Glutes', 'Quadriceps', 'Hamstrings', 'Calves'];
  const untrained = allKnown.filter((m) => !muscleVolumes[m] || muscleVolumes[m] === 0);

  return (
    <View>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <View>
          <Text style={{ color: '#0F172A', fontSize: 15, fontWeight: '700' }}>Muscle Activity</Text>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>{period}</Text>
        </View>
        {/* Front / Back toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 3 }}>
          {(['front', 'back'] as const).map((s) => (
            <SideToggleButton key={s} side={s} active={side === s} onPress={() => setSide(s)} />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
        {/* SVG figure */}
        <Svg width={100} height={200} viewBox="0 0 100 200">
          {/* Silhouette */}
          {SILHOUETTE.map((p, i) => (
            p.type === 'circle'
              ? <Circle key={i} cx={(p as any).cx} cy={(p as any).cy} r={(p as any).r} fill="#DDE3EE" />
              : <Rect key={i} x={(p as any).x} y={(p as any).y} width={(p as any).w} height={(p as any).h} rx={(p as any).rx} fill="#DDE3EE" />
          ))}

          {/* Muscle overlays */}
          {regions.map((m, i) => {
            const v = getIntensity(m.muscles, muscleVolumes);
            return (
              <Ellipse
                key={i}
                cx={m.cx} cy={m.cy}
                rx={m.rx} ry={m.ry}
                fill={intensityColor(v)}
                opacity={opacity(v)}
              />
            );
          })}
        </Svg>

        {/* Legend */}
        <View style={{ flex: 1 }}>
          {/* Color scale */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 12 }}>
            {['#DDE3EE', '#A7F3D0', '#34D399', '#10B981', '#059669'].map((c) => (
              <View key={c} style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: c }} />
            ))}
            <Text style={{ color: '#94A3B8', fontSize: 10, marginLeft: 4 }}>Low → High</Text>
          </View>

          {trainedLabels.length > 0 ? (
            <>
              <Text style={{ color: '#475569', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Trained</Text>
              {trainedLabels.map((m: any) => (
                <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: intensityColor(m.v) }} />
                  <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '600' }}>{m.label}</Text>
                </View>
              ))}
            </>
          ) : (
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center' }}>No workouts{'\n'}logged {period}</Text>
            </View>
          )}

          {untrained.length > 0 && trainedLabels.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: '#CBD5E1', fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Needs work</Text>
              {untrained.slice(0, 5).map((m) => (
                <Text key={m} style={{ color: '#CBD5E1', fontSize: 12, marginBottom: 3 }}>· {m}</Text>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
