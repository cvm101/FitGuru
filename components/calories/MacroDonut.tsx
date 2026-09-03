import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface MacroArcProps {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  color: string;
  dash: number;
  offset: number;
  circumference: number;
  progress: Animated.SharedValue<number>;
}

function MacroArc({ cx, cy, radius, strokeWidth, color, dash, offset, circumference, progress }: MacroArcProps) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${dash * progress.value} ${circumference - dash * progress.value}`,
  }));

  return (
    <AnimatedCircle
      cx={cx} cy={cy} r={radius}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      animatedProps={animatedProps}
      strokeDashoffset={-offset}
      strokeLinecap="round"
      opacity={0.9}
    />
  );
}

interface MacroDonutProps {
  calories: number;
  goalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
}

const MACRO_COLORS = {
  protein: '#3B82F6',
  carbs: '#F59E0B',
  fat: '#EF4444',
  empty: '#F1F5F9',
};

export default function MacroDonut({
  calories,
  goalCalories,
  protein,
  carbs,
  fat,
  size = 160,
}: MacroDonutProps) {
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 14;
  const radius = (size - strokeWidth - 4) / 2;
  const circumference = 2 * Math.PI * radius;

  const totalMacroKcal = protein * 4 + carbs * 4 + fat * 9;

  const arcs = totalMacroKcal > 0 ? [
    { label: 'protein', kcal: protein * 4, color: MACRO_COLORS.protein },
    { label: 'carbs', kcal: carbs * 4, color: MACRO_COLORS.carbs },
    { label: 'fat', kcal: fat * 9, color: MACRO_COLORS.fat },
  ].reduce<{ label: string; dash: number; offset: number; color: string }[]>((acc, item) => {
    const prev = acc[acc.length - 1];
    const prevOffset = prev ? prev.offset + prev.dash : 0;
    const dash = (item.kcal / totalMacroKcal) * circumference * 0.98;
    return [...acc, { label: item.label, dash, offset: prevOffset + circumference * 0.01, color: item.color }];
  }, []) : [];

  const pct = Math.round(Math.min((calories / goalCalories) * 100, 100));

  const macros = [
    { label: 'Protein', value: Math.round(protein), color: MACRO_COLORS.protein, bg: '#EFF6FF' },
    { label: 'Carbs', value: Math.round(carbs), color: MACRO_COLORS.carbs, bg: '#FFFBEB' },
    { label: 'Fat', value: Math.round(fat), color: MACRO_COLORS.fat, bg: '#FEF2F2' },
  ];

  // Animated draw-in for the goal-progress ring and each macro arc.
  const goalProgress = useSharedValue(0);
  const macroProgress = useSharedValue(0);

  useEffect(() => {
    goalProgress.value = withTiming(pct / 100, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [pct]);

  useEffect(() => {
    macroProgress.value = 0;
    macroProgress.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [protein, carbs, fat]);

  const goalRingProps = useAnimatedProps(() => ({
    strokeDasharray: `${goalProgress.value * circumference} ${circumference}`,
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Ring */}
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G transform={`rotate(-90, ${cx}, ${cy})`}>
            {/* Background ring */}
            <Circle
              cx={cx} cy={cy} r={radius}
              stroke={MACRO_COLORS.empty}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Goal progress overlay (thin outer) */}
            <AnimatedCircle
              cx={cx} cy={cy} r={radius}
              stroke={calories > goalCalories ? '#EF444433' : '#10B98133'}
              strokeWidth={strokeWidth}
              fill="none"
              animatedProps={goalRingProps}
              strokeDashoffset={0}
              strokeLinecap="round"
            />
            {/* Macro segments */}
            {arcs.map((arc) => (
              <MacroArc
                key={arc.label}
                cx={cx} cy={cy} radius={radius}
                strokeWidth={strokeWidth - 4}
                color={arc.color}
                dash={arc.dash}
                offset={arc.offset}
                circumference={circumference}
                progress={macroProgress}
              />
            ))}
          </G>
        </Svg>

        {/* Center text (absolute over SVG) */}
        <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <AnimatedNumber value={Math.round(calories)} style={{ fontSize: size * 0.16, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }} />
          <Text style={{ fontSize: size * 0.072, color: '#94A3B8', marginTop: 1 }}>kcal eaten</Text>
          <View style={{ width: 40, height: 2, backgroundColor: '#E2E8F0', borderRadius: 1, marginVertical: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <AnimatedNumber
              value={pct}
              suffix="% of goal"
              style={{ fontSize: size * 0.065, color: calories > goalCalories ? '#EF4444' : '#10B981', fontWeight: '600' }}
            />
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
        {macros.map((m) => (
          <View key={m.label} style={{ alignItems: 'center', gap: 3 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: m.color }} />
            <AnimatedNumber value={m.value} suffix="g" style={{ fontWeight: '800', fontSize: 15, color: '#0F172A' }} />
            <Text style={{ fontSize: 10, color: '#94A3B8' }}>{m.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
