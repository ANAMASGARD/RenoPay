import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { RenoPayDotsLoader } from '@/components/ui/renopay-dots-loader';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { wdkConfigs } from '@/config/wdk';

type WdkProviderComponent = ComponentType<{
  bundle: { bundle: string };
  wdkConfigs: typeof wdkConfigs;
  children: ReactNode;
}>;

function ensureWdkPolyfills() {
  // Load only after React Native runtime is ready (never in a custom index.js).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-get-random-values');
}

export function RenoPayWdkProvider({ children }: { children: ReactNode }) {
  const [WdkAppProvider, setWdkAppProvider] = useState<WdkProviderComponent | null>(null);
  const [bundle, setBundle] = useState<string | null>(null);

  useEffect(() => {
    ensureWdkPolyfills();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WdkAppProvider: Provider } = require('@tetherto/wdk-react-native-core') as {
      WdkAppProvider: WdkProviderComponent;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { bundle: workletBundle } = require('../../../.wdk') as { bundle: string };
    setWdkAppProvider(() => Provider);
    setBundle(workletBundle);
  }, []);

  if (!WdkAppProvider || bundle == null) {
    return (
      <View style={styles.loading}>
        <RenoPayDotsLoader size="lg" label="LOADING WALLET" />
      </View>
    );
  }

  return (
    <WdkAppProvider bundle={{ bundle }} wdkConfigs={wdkConfigs}>
      {children}
    </WdkAppProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenoPayBrand.background,
  },
});
