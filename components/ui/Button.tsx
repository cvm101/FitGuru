import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
}: ButtonProps) {
  const paddingV = size === 'sm' ? 10 : size === 'lg' ? 18 : 15;
  const paddingH = size === 'sm' ? 16 : size === 'lg' ? 32 : 24;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;
  const radius = 16;
  const opacity = disabled || loading ? 0.6 : 1;

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pressIn = () => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); };
  const pressOut = () => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); };

  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {loading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <>
          {icon}
          <Text style={{ color: 'white', fontWeight: '700', fontSize, letterSpacing: 0.2 }}>{title}</Text>
        </>
      )}
    </View>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled || loading} activeOpacity={0.9} style={{ opacity, width: fullWidth ? '100%' : undefined }}>
        <Animated.View style={pressStyle}>
          <LinearGradient
            colors={['#059669', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: radius, paddingVertical: paddingV, paddingHorizontal: paddingH, alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            {inner}
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  if (variant === 'dark') {
    return (
      <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled || loading} activeOpacity={0.9} style={{ opacity, width: fullWidth ? '100%' : undefined }}>
        <Animated.View style={pressStyle}>
          <LinearGradient
            colors={['#1E293B', '#334155']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: radius, paddingVertical: paddingV, paddingHorizontal: paddingH, alignItems: 'center', justifyContent: 'center' }}
          >
            {inner}
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled || loading} activeOpacity={0.9} style={{ opacity, width: fullWidth ? '100%' : undefined }}>
        <Animated.View style={pressStyle}>
          <LinearGradient
            colors={['#DC2626', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: radius, paddingVertical: paddingV, paddingHorizontal: paddingH, alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }}
          >
            {inner}
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={{ opacity, width: fullWidth ? '100%' : undefined }}
      >
        <Animated.View
          style={[
            {
              borderRadius: radius,
              paddingVertical: paddingV,
              paddingHorizontal: paddingH,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ECFDF5',
              borderWidth: 1.5,
              borderColor: '#10B981',
            },
            pressStyle,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {icon}
            <Text style={{ color: '#059669', fontWeight: '700', fontSize }}>{title}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // ghost
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={{ opacity, width: fullWidth ? '100%' : undefined }}
    >
      <Animated.View
        style={[
          {
            borderRadius: radius,
            paddingVertical: paddingV,
            paddingHorizontal: paddingH,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: '#CBD5E1',
            backgroundColor: 'transparent',
          },
          pressStyle,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon}
          <Text style={{ color: '#475569', fontWeight: '600', fontSize }}>{title}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
