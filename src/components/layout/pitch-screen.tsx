import { StatusBar } from 'expo-status-bar';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingBackground } from '@/components/onboarding/onboarding-background';
import { RenoPayBrand } from '@/constants/renopay-brand';

const TAB_BAR_HEIGHT = 92;

type PitchScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function PitchScreen({ children, scroll = true, contentStyle }: PitchScreenProps) {
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews>
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.staticContent,
        { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 },
        contentStyle,
      ]}>
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <OnboardingBackground />
      {body}
    </View>
  );
}

export const TAB_BAR_OFFSET = TAB_BAR_HEIGHT;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: RenoPayBrand.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
