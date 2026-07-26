import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { RenoPayBrand } from '@/constants/renopay-brand';

const DURATION = 650;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  const splashKeyframe = new Keyframe({
    0: { opacity: 1, transform: [{ scale: 1 }] },
    70: { opacity: 1 },
    100: { opacity: 0, transform: [{ scale: 1.02 }], easing: Easing.out(Easing.cubic) },
  });

  const content = (
    <View style={styles.content}>
      <Image
        style={styles.mascot}
        source={require('@/assets/images/onboarding-mascot-crop.png')}
        contentFit="contain"
      />
    </View>
  );

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {content}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {content}
    </View>
  );
}

/** Legacy export — onboarding uses mascot directly; home screen no longer uses this. */
export function AnimatedIcon() {
  return (
    <Image
      style={styles.legacyIcon}
      source={require('@/assets/images/onboarding-mascot-crop.png')}
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RenoPayBrand.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: {
    width: 160,
    height: 180,
  },
  legacyIcon: {
    width: 120,
    height: 136,
  },
});
