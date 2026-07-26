import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RenoPayBrand } from '@/constants/renopay-brand';

type DotSize = 'sm' | 'md' | 'lg';

const DOT_DIAMETER: Record<DotSize, number> = {
  sm: 8,
  md: 12,
  lg: 16,
};

const DOT_GAP: Record<DotSize, number> = {
  sm: 6,
  md: 8,
  lg: 10,
};

const BOUNCE_HEIGHT: Record<DotSize, number> = {
  sm: 6,
  md: 10,
  lg: 14,
};

type RenoPayDotsLoaderProps = {
  size?: DotSize;
  label?: string;
};

function AnimatedDot({
  diameter,
  delayMs,
  bounceHeight,
  outlined,
}: {
  diameter: number;
  delayMs: number;
  bounceHeight: number;
  outlined: boolean;
}) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-bounceHeight, { duration: 280, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 160 }),
        ),
        -1,
        false,
      ),
    );
  }, [bounceHeight, delayMs, offset]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: RenoPayBrand.primary,
          borderWidth: outlined ? 2 : 0,
          borderColor: RenoPayBrand.border,
        },
        style,
      ]}
    />
  );
}

export function RenoPayDotsLoader({ size = 'md', label }: RenoPayDotsLoaderProps) {
  const diameter = DOT_DIAMETER[size];
  const gap = DOT_GAP[size];
  const bounceHeight = BOUNCE_HEIGHT[size];
  const outlined = size !== 'sm';

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      <View style={[styles.dotsRow, { gap }]}>
        <AnimatedDot diameter={diameter} delayMs={0} bounceHeight={bounceHeight} outlined={outlined} />
        <AnimatedDot diameter={diameter} delayMs={120} bounceHeight={bounceHeight} outlined={outlined} />
        <AnimatedDot diameter={diameter} delayMs={240} bounceHeight={bounceHeight} outlined={outlined} />
      </View>
      {label ? <Text style={[styles.label, size === 'sm' ? styles.labelSm : null]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 28,
  },
  label: {
    color: RenoPayBrand.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  labelSm: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
});
