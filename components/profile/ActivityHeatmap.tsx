import { View, Text } from 'react-native';
import { useTheme } from '@/lib/context/ThemeContext';
import { toLocalISODate } from '@/lib/date';

interface ActivityHeatmapProps {
  activeDates: string[];
  weeks?: number;
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ActivityHeatmap({ activeDates, weeks = 26 }: ActivityHeatmapProps) {
  const { colors, isDark } = useTheme();
  const activeSet = new Set(activeDates);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - startDate.getDay() - (weeks - 1) * 7);

  const grid: string[][] = [];
  const monthMarkers: { weekIdx: number; label: string }[] = [];

  let prevMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(startDate);
      cell.setDate(startDate.getDate() + w * 7 + d);
      const dateStr = toLocalISODate(cell);
      week.push(dateStr);

      if (d === 0) {
        const m = cell.getMonth();
        if (m !== prevMonth) {
          monthMarkers.push({ weekIdx: w, label: MONTH_LABELS[m] });
          prevMonth = m;
        }
      }
    }
    grid.push(week);
  }

  const totalActive = activeDates.length;
  const todayStr = toLocalISODate(today);
  const CELL = 11;
  const GAP = 2;

  const emptyColor = isDark ? '#1E293B' : '#E2E8F0';
  const legendColors = isDark
    ? ['#1E293B', '#064E3B', '#065F46', '#10B981', '#34D399']
    : ['#E2E8F0', '#6EE7B7', '#34D399', '#10B981', '#059669'];

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>Activity</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{totalActive} workout{totalActive !== 1 ? 's' : ''} in {weeks} weeks</Text>
      </View>

      <View style={{ flexDirection: 'row', paddingLeft: 18, marginBottom: 3, height: 12 }}>
        {monthMarkers.map((m) => (
          <Text
            key={`${m.label}-${m.weekIdx}`}
            style={{
              position: 'absolute',
              left: 18 + m.weekIdx * (CELL + GAP),
              color: colors.textMuted,
              fontSize: 9,
              fontWeight: '500',
            }}
          >
            {m.label}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: GAP }}>
        <View style={{ gap: GAP, paddingTop: 1 }}>
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={{ width: 16, height: CELL, justifyContent: 'center' }}>
              <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'right' }}>{label}</Text>
            </View>
          ))}
        </View>

        {grid.map((week, wIdx) => (
          <View key={wIdx} style={{ gap: GAP }}>
            {week.map((dateStr) => {
              const isActive = activeSet.has(dateStr);
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;

              let bg = emptyColor;
              if (isFuture) bg = 'transparent';
              else if (isActive) bg = '#10B981';
              else bg = emptyColor;

              return (
                <View
                  key={dateStr}
                  style={{
                    width: CELL, height: CELL,
                    borderRadius: 3,
                    backgroundColor: bg,
                    borderWidth: isToday ? 1.5 : 0,
                    borderColor: '#059669',
                    opacity: isFuture ? 0 : 1,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
        <Text style={{ color: colors.textMuted, fontSize: 10 }}>Less</Text>
        {legendColors.map((c) => (
          <View key={c} style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: c }} />
        ))}
        <Text style={{ color: colors.textMuted, fontSize: 10 }}>More</Text>
      </View>
    </View>
  );
}
