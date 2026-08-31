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

export default function Card({ children, className = '', noPadding = false, variant = 'default', style, ...props }: CardProps) {
  return (
    <View
      className={`bg-white rounded-3xl ${noPadding ? '' : 'p-5'} ${className}`}
      style={[SHADOWS[variant], style as any]}
      {...props}
    >
      {children}
    </View>
  );
}
