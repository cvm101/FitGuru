import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { BodyWeightLog } from '@/lib/types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function usePressScale(to = 0.95) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => { scale.value = withSpring(to, { damping: 15, stiffness: 300 }); },
    onPressOut: () => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); },
  };
}

interface BodyWeightChartProps {
  logs: BodyWeightLog[];
  goalWeight?: number | null;
  onAdd: () => void;
}

const W = Dimensions.get('window').width - 80;
const H = 140;
const PAD = { top: 16, bottom: 28, left: 32, right: 12 };

export default function BodyWeightChart({ logs, goalWeight, onAdd }: BodyWeightChartProps) {
  const emptyPress = usePressScale();
  const addPress = usePressScale();

  if (logs.length === 0) {
    return (
      <AnimatedTouchable
        onPress={onAdd}
        onPressIn={emptyPress.onPressIn}
        onPressOut={emptyPress.onPressOut}
        style={[{ alignItems: 'center', padding: 24, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed', gap: 8 }, emptyPress.style]}
      >
        <Text style={{ fontSize: 28 }}>⚖️</Text>
        <Text style={{ color: '#475569', fontWeight: '700', fontSize: 14 }}>No weight logged yet</Text>
        <Text style={{ color: '#94A3B8', fontSize: 12 }}>Tap to log today's weight</Text>
      </AnimatedTouchable>
    );
  }

  const weights = logs.map((l) => l.weight_kg);
  const minW = Math.min(...weights, goalWeight ?? Infinity) - 2;
  const maxW = Math.max(...weights, goalWeight ?? -Infinity) + 2;
  const range = maxW - minW || 1;

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  function xOf(i: number) {
    return PAD.left + (i / Math.max(logs.length - 1, 1)) * chartW;
  }
  function yOf(w: number) {
    return PAD.top + (1 - (w - minW) / range) * chartH;
  }

  // Build smooth path
  const points = logs.map((l, i) => ({ x: xOf(i), y: yOf(l.weight_kg) }));
  const pathD = points.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${d} C ${cpX} ${prev.y} ${cpX} ${p.y} ${p.x} ${p.y}`;
  }, '');

  // Area fill path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${H - PAD.bottom} L ${PAD.left} ${H - PAD.bottom} Z`;

  const latest = logs[logs.length - 1];
  const first = logs[0];
  const diff = latest.weight_kg - first.weight_kg;
  const trending = diff < 0 ? 'down' : diff > 0 ? 'up' : 'same';

  return (
    <View>
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
        <View>
          <Text style={{ color: '#0F172A', fontSize: 28, fontWeight: '900' }}>{latest.weight_kg} <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '400' }}>kg</Text></Text>
          {logs.length > 1 && (
            <Text style={{ color: diff < 0 ? '#10B981' : diff > 0 ? '#EF4444' : '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
              {trending === 'down' ? '↓' : trending === 'up' ? '↑' : '→'} {Math.abs(diff).toFixed(1)}kg in {logs.length} entries
            </Text>
          )}
        </View>
        <AnimatedTouchable
          onPress={onAdd}
          onPressIn={addPress.onPressIn}
          onPressOut={addPress.onPressOut}
          style={[{ backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }, addPress.style]}
        >
          <Text style={{ color: '#059669', fontSize: 13, fontWeight: '700' }}>+ Log weight</Text>
        </AnimatedTouchable>
      </View>

      {/* SVG Chart */}
      <Svg width={W} height={H}>
        <Defs>
          <SvgGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </SvgGradient>
        </Defs>

        {/* Y axis labels */}
        {[minW + range * 0.25, minW + range * 0.5, minW + range * 0.75].map((w, i) => (
          <SvgText key={i} x={PAD.left - 4} y={yOf(w) + 4} fontSize="9" fill="#94A3B8" textAnchor="end">
            {Math.round(w)}
          </SvgText>
        ))}

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <Line key={f} x1={PAD.left} y1={PAD.top + (1 - f) * chartH} x2={W - PAD.right} y2={PAD.top + (1 - f) * chartH} stroke="#F1F5F9" strokeWidth="1" />
        ))}

        {/* Goal weight line */}
        {goalWeight && (
          <Line
            x1={PAD.left} y1={yOf(goalWeight)}
            x2={W - PAD.right} y2={yOf(goalWeight)}
            stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4,3"
          />
        )}

        {/* Area fill */}
        {logs.length > 1 && <Path d={areaD} fill="url(#wGrad)" />}

        {/* Line */}
        {logs.length > 1 && <Path d={pathD} stroke="#10B981" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Dots + x labels */}
        {points.map((p, i) => (
          <View key={i}>
            <Circle cx={p.x} cy={p.y} r="4" fill="#10B981" stroke="white" strokeWidth="2" />
          </View>
        ))}

        {/* Last point label */}
        {points.length > 0 && (
          <SvgText
            x={points[points.length - 1].x}
            y={points[points.length - 1].y - 8}
            fontSize="10"
            fill="#059669"
            textAnchor="middle"
            fontWeight="700"
          >
            {latest.weight_kg}kg
          </SvgText>
        )}
      </Svg>

      {/* Goal label */}
      {goalWeight && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <View style={{ width: 16, height: 2, backgroundColor: '#F59E0B' }} />
          <Text style={{ color: '#94A3B8', fontSize: 11 }}>Goal: {goalWeight}kg ({(latest.weight_kg - goalWeight > 0 ? '+' : '')}{(latest.weight_kg - goalWeight).toFixed(1)}kg away)</Text>
        </View>
      )}
    </View>
  );
}
