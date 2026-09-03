import { useEffect, useRef, useState } from 'react';
import { Text, TextProps } from 'react-native';

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

interface AnimatedNumberProps extends TextProps {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export default function AnimatedNumber({
  value,
  decimals = 0,
  duration = 700,
  prefix = '',
  suffix = '',
  style,
  ...rest
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const start = Date.now();

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const current = from + (value - from) * easeOutCubic(t);
      setDisplay(current);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <Text {...rest} style={style}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </Text>
  );
}
