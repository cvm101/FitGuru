import { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  percent: number;
  color?: string;
  gradientColors?: readonly [string, string, ...string[]];
  height?: number;
  trackColor?: string;
  style?: ViewStyle;
  delay?: number;
}

export default function AnimatedProgressBar({
  percent,
  color = '#10B981',
  gradientColors,
  height = 6,
  trackColor = '#F1F5F9',
  style,
  delay = 0,
}: AnimatedProgressBarProps) {
  const width = useSharedValue(0);
  const clamped = Math.min(Math.max(percent, 0), 100);

  useEffect(() => {
    width.value = withDelay(delay, withSpring(clamped, { damping: 18, stiffness: 90 }));
  }, [clamped]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={[{ height, backgroundColor: trackColor, borderRadius: height / 2, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, overflow: 'hidden' }, animatedStyle]}>
        {gradientColors ? (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        ) : (
          <View style={{ flex: 1, backgroundColor: color }} />
        )}
      </Animated.View>
    </View>
  );
}
