import { View, Text, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import type { ExerciseProgressPoint } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProgressChartProps {
  data: ExerciseProgressPoint[];
  exerciseName: string;
}

export default function ProgressChart({ data, exerciseName }: ProgressChartProps) {
  if (data.length < 2) {
    return (
      <View className="bg-white rounded-2xl p-5 items-center justify-center" style={{ height: 140 }}>
        <Text className="text-slate-400 text-sm text-center">
          Log at least 2 sessions to see progress for{'\n'}
          <Text className="font-semibold text-slate-600">{exerciseName}</Text>
        </Text>
      </View>
    );
  }

  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = 120;
  const paddingX = 40;
  const paddingY = 16;

  const weights = data.map((d) => d.maxWeight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const rangeW = maxW - minW || 1;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (chartWidth - paddingX * 2);
    const y = paddingY + (1 - (d.maxWeight - minW) / rangeW) * (chartHeight - paddingY * 2);
    return { x, y, ...d };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  const xLabels = [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]];

  return (
    <View className="bg-white rounded-2xl p-4 overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
      <Text className="text-slate-700 font-semibold mb-1">{exerciseName}</Text>
      <Text className="text-slate-400 text-xs mb-3">Max weight progression (kg)</Text>
      <Svg width={chartWidth} height={chartHeight + paddingY}>
        {/* Grid lines */}
        {[0, 0.5, 1].map((pct) => {
          const y = paddingY + pct * (chartHeight - paddingY * 2);
          return (
            <Line
              key={pct}
              x1={paddingX}
              y1={y}
              x2={chartWidth - paddingX}
              y2={y}
              stroke="#F1F5F9"
              strokeWidth={1}
            />
          );
        })}

        {/* Y axis labels */}
        {[0, 0.5, 1].map((pct) => {
          const y = paddingY + pct * (chartHeight - paddingY * 2);
          const val = maxW - pct * rangeW;
          return (
            <SvgText key={pct} x={paddingX - 6} y={y + 4} fontSize={9} fill="#94A3B8" textAnchor="end">
              {Math.round(val)}
            </SvgText>
          );
        })}

        {/* Line */}
        <Polyline points={polylinePoints} fill="none" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill="#10B981" />
        ))}

        {/* Last point highlight */}
        <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={6} fill="none" stroke="#10B981" strokeWidth={2} />

        {/* X axis labels */}
        {[points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].filter(Boolean).map((p, i) => (
          <SvgText key={i} x={p.x} y={chartHeight + paddingY - 2} fontSize={9} fill="#94A3B8" textAnchor="middle">
            {p.date.slice(5)}
          </SvgText>
        ))}
      </Svg>

      {/* Stats row */}
      <View className="flex-row justify-between mt-2 pt-3 border-t border-slate-50">
        <View>
          <Text className="text-slate-400 text-xs">Starting</Text>
          <Text className="text-slate-700 font-semibold text-sm">{weights[0]}kg</Text>
        </View>
        <View className="items-center">
          <Text className="text-slate-400 text-xs">Best</Text>
          <Text className="text-primary font-bold text-sm">{Math.max(...weights)}kg</Text>
        </View>
        <View className="items-end">
          <Text className="text-slate-400 text-xs">Sessions</Text>
          <Text className="text-slate-700 font-semibold text-sm">{data.length}</Text>
        </View>
      </View>
    </View>
  );
}
