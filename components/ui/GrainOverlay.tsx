import { StyleSheet } from 'react-native';
import Svg, { Filter, Rect, FeTurbulence, FeColorMatrix } from 'react-native-svg';

interface GrainOverlayProps {
  opacity?: number;
}

// A cheap, asset-free noise texture (SVG fractal turbulence) laid over gradient
// headers so they read as textured surfaces instead of flat, generic gradients.
export default function GrainOverlay({ opacity = 0.05 }: GrainOverlayProps) {
  return (
    <Svg style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Filter id="grain">
        <FeTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
        <FeColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0" />
      </Filter>
      <Rect width="100%" height="100%" filter="url(#grain)" />
    </Svg>
  );
}
