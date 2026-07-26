import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { RenoPayDotsLoader } from '@/components/ui/renopay-dots-loader';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { useWdkApp } from '@/features/wdk/wdk-hooks';
import { personaHome, usePersona } from '@/features/persona/persona-context';

export default function IndexScreen() {
  const { state } = useWdkApp();
  const { persona, loading: personaLoading } = usePersona();

  if (state.status === 'INITIALIZING' || state.status === 'REINITIALIZING') {
    return (
      <View style={styles.loading}>
        <RenoPayDotsLoader size="lg" label="STARTING WALLET" />
      </View>
    );
  }

  if (state.status === 'READY' && !personaLoading) {
    return <Redirect href={(persona ? personaHome(persona) : '/choose-mode') as never} />;
  }

  return <OnboardingScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenoPayBrand.background,
  },
});
