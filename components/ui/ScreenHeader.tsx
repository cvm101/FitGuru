import { ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GrainOverlay from './GrainOverlay';

interface ScreenHeaderProps {
  colors: readonly [string, string, ...string[]];
  children: React.ReactNode;
  paddingBottom?: number;
  style?: ViewStyle;
}

// Shared shell for every tab's gradient header: consistent top padding,
// horizontal padding, and the grain texture — so screens only differ in
// their actual content, not in re-implementing the header chrome. Children
// are direct flex children of the gradient (not wrapped) so screen-specific
// alignment (e.g. Profile's centered layout) still works via `style`.
export default function ScreenHeader({ colors, children, paddingBottom = 20, style }: ScreenHeaderProps) {
  return (
    <LinearGradient
      colors={colors}
      style={[{ paddingTop: 56, paddingBottom, paddingHorizontal: 20, overflow: 'hidden' }, style]}
    >
      <GrainOverlay />
      {children}
    </LinearGradient>
  );
}
