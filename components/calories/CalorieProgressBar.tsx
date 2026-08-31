import { View, Text } from 'react-native';

interface CalorieProgressBarProps {
  consumed: number;
  goal: number;
  showLabel?: boolean;
}

export default function CalorieProgressBar({ consumed, goal, showLabel = true }: CalorieProgressBarProps) {
  const pct = Math.min(consumed / (goal || 2000), 1);
  const remaining = Math.max(goal - consumed, 0);
  const over = consumed > goal;

  const barColor = over ? '#EF4444' : pct > 0.85 ? '#F59E0B' : '#10B981';

  return (
    <View className="gap-2">
      {showLabel && (
        <View className="flex-row justify-between items-center">
          <Text className="text-slate-500 text-sm">Daily Progress</Text>
          <Text className="text-slate-500 text-sm">
            {over ? (
              <Text className="text-red-500 font-semibold">+{Math.round(consumed - goal)} over</Text>
            ) : (
              <Text className="font-semibold" style={{ color: barColor }}>{Math.round(remaining)} kcal left</Text>
            )}
          </Text>
        </View>
      )}
      <View className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: barColor }}
        />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-slate-600 font-semibold text-sm">{Math.round(consumed)} kcal</Text>
        <Text className="text-slate-400 text-sm">Goal: {goal}</Text>
      </View>
    </View>
  );
}
