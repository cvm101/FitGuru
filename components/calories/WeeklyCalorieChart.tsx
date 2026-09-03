import { useEffect } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface DayPoint {
  date: string;
  calories: number;
}

interface WeeklyCalorieChartProps {
  data: DayPoint[];
  goalCalories: number;
  today: string;
}

const W = Dimensions.get('window').width - 72;
const H = 130;
const PAD = { top: 18, bottom: 24, left: 8, right: 8 };

function formatDay(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 2);
}

export default function WeeklyCalorieChart({ data, goalCalories, today }: WeeklyCalorieChartProps) {
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [data]);

  const revealStyle = useAnimatedStyle(() => ({ width: `${reveal.value * 100}%` }));

  const maxVal = Math.max(...data.map((d) => d.calories), goalCalories, 1) * 1.1;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  function xOf(i: number) {
    return PAD.left + (i / Math.max(data.length - 1, 1)) * chartW;
  }
  function yOf(v: number) {
    return PAD.top + (1 - v / maxVal) * chartH;
  }

  const points = data.map((d, i) => ({ x: xOf(i), y: yOf(d.calories), ...d }));
  const pathD = points.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${d} C ${cpX} ${prev.y} ${cpX} ${p.y} ${p.x} ${p.y}`;
  }, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${H - PAD.bottom} L ${PAD.left} ${H - PAD.bottom} Z`;
  const goalY = yOf(goalCalories);

  return (
    <View>
      <View style={{ overflow: 'hidden' }}>
        <Animated.View style={revealStyle}>
          <Svg width={W} height={H}>
            <Defs>
              <SvgGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </SvgGradient>
            </Defs>

            {/* Goal line */}
            <Path d={`M ${PAD.left} ${goalY} L ${W - PAD.right} ${goalY}`} stroke="#F59E0B" strokeWidth={1.25} strokeDasharray="4,4" />

            {/* Area + line */}
            {data.length > 1 && <Path d={areaD} fill="url(#calGrad)" />}
            {data.length > 1 && <Path d={pathD} stroke="#059669" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />}

            {/* Points */}
            {points.map((p) => {
              const isToday = p.date === today;
              const overGoal = p.calories > goalCalories;
              const color = overGoal ? '#EF4444' : isToday ? '#059669' : '#94A3B8';
              return (
                <Circle key={p.date} cx={p.x} cy={p.y} r={isToday ? 5 : 3.5} fill={p.calories > 0 ? color : '#CBD5E1'} stroke="white" strokeWidth={1.5} />
              );
            })}
          </Svg>
        </Animated.View>
      </View>

      {/* X axis labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PAD.left }}>
        {data.map((d) => (
          <Text key={d.date} style={{ fontSize: 10, color: d.date === today ? '#059669' : '#94A3B8', fontWeight: d.date === today ? '700' : '500', width: 24, textAlign: 'center' }}>
            {formatDay(d.date)}
          </Text>
        ))}
      </View>
    </View>
  );
}
