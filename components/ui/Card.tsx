import { View, ViewProps } from 'react-native';
import { useTheme } from '@/lib/context/ThemeContext';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  variant?: 'default' | 'elevated' | 'flat';
}

const BASE_SHADOWS = {
  default: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  flat: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
};

const BEZEL = 4;
const OUTER_RADIUS = 28;
const INNER_RADIUS = OUTER_RADIUS - BEZEL;

export default function Card({ children, noPadding = false, variant = 'default', style, ...props }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.cardOuter,
          borderRadius: OUTER_RADIUS,
          padding: BEZEL,
          borderWidth: 1,
          borderColor: colors.cardOuterBorder,
        },
        BASE_SHADOWS[variant],
      ]}
      {...props}
    >
      <View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: INNER_RADIUS,
            overflow: 'hidden',
          },
          noPadding ? undefined : { padding: 20 },
          style as any,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
