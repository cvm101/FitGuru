import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  variant?: 'default' | 'elevated' | 'flat';
}

const SHADOWS = {
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

// "Double-bezel" construction: a tinted outer shell with a hairline border
// (the machined frame) around a white inner core with a concentric, smaller
// radius — instead of a single flat rounded rectangle sitting on the page.
const BEZEL = 4;
const OUTER_RADIUS = 28;
const INNER_RADIUS = OUTER_RADIUS - BEZEL;

export default function Card({ children, className = '', noPadding = false, variant = 'default', style, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: '#E9EDF3',
          borderRadius: OUTER_RADIUS,
          padding: BEZEL,
          borderWidth: 1,
          borderColor: 'rgba(15,23,42,0.07)',
        },
        SHADOWS[variant],
      ]}
      {...props}
    >
      <View
        className={`bg-white ${noPadding ? '' : 'p-5'} ${className}`}
        style={[{ borderRadius: INNER_RADIUS, overflow: 'hidden' }, style as any]}
      >
        {children}
      </View>
    </View>
  );
}
