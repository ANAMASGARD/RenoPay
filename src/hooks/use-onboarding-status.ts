import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const ONBOARDING_KEY = '@renopay/onboarding_complete';

export function useOnboardingStatus() {
  const [isComplete, setIsComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => {
        if (!cancelled) {
          setIsComplete(value === 'true');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsComplete(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setIsComplete(true);
  }, []);

  return { isComplete, completeOnboarding };
}
