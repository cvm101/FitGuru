import { View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassPillProps extends ViewProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  radius?: number;
}

// "Liquid glass" pill: real frosted blur + a 1px inner highlight border to
// simulate edge refraction, instead of a flat translucent rgba box.
export default function GlassPill({ children, intensity = 30, tint = 'dark', radius = 20, style, ...props }: GlassPillProps) {
  return (
    <View
      style={{
        borderRadius: radius,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
      }}
      {...props}
    >
      <BlurView intensity={intensity} tint={tint} style={style}>
        {children}
      </BlurView>
    </View>
  );
}
