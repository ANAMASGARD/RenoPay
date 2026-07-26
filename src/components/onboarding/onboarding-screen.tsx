import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingBackground } from '@/components/onboarding/onboarding-background';
import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { RenoPayBrand, NeoBrutalShadow } from '@/constants/renopay-brand';

const BODY_LINES = [
  'WDK Football Payments',
  'Tickets & Gate Entry.',
  'No central servers.',
  'Your keys, your tickets.',
] as const;

/**
 * Onboarding — matches Onboarding-Screen.png using cropped mascot only (no baked-in art).
 */
export function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const mascotWidth = Math.min(width * 0.62, 300);
  const mascotHeight = mascotWidth * 1.12;

  const handleGetStarted = useCallback(() => {
    router.replace('/choose-mode' as never);
  }, [router]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <OnboardingBackground />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}>
        <View style={styles.titleWrap}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.titleShadow}>
            RENO PAY
          </Text>
          <Text accessibilityRole="header" style={styles.title}>
            RENO PAY
          </Text>
        </View>

        <View style={styles.mascotWrap}>
          <Image
            source={require('@/assets/images/onboarding-mascot-crop.png')}
            style={{ width: mascotWidth, height: mascotHeight }}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={styles.copyBlock}>
          {BODY_LINES.map((line) => (
            <Text key={line} style={styles.bodyLine}>
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.ctaWrap}>
          <View style={styles.ctaShadow} />
          <NeoBrutalButton
            accessibilityLabel="Get Started"
            label="GET STARTED"
            onPress={handleGetStarted}
            style={styles.cta}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: RenoPayBrand.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  titleWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  titleShadow: {
    position: 'absolute',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 2,
    color: RenoPayBrand.border,
    transform: [{ translateX: 3 }, { translateY: 3 }],
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 2,
    color: RenoPayBrand.primary,
    textTransform: 'uppercase',
    ...NeoBrutalShadow.title,
  },
  mascotWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  copyBlock: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  bodyLine: {
    color: RenoPayBrand.foreground,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  ctaWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  ctaShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -5,
    height: '100%',
    borderRadius: 16,
    backgroundColor: RenoPayBrand.border,
  },
  cta: {
    borderRadius: 16,
    marginBottom: 0,
  },
});
