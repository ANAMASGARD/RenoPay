import * as Clipboard from 'expo-clipboard';
import { useCallback } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { RenoPayBrand } from '@/constants/renopay-brand';

type WalletAddressCopyRowProps = {
  address: string;
};

export function WalletAddressCopyRow({ address }: WalletAddressCopyRowProps) {
  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(address);
    Alert.alert('Copied', 'Wallet address copied. Paste into faucet with no spaces.');
  }, [address]);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>WALLET ADDRESS</Text>
      <Text selectable style={styles.address}>
        {address}
      </Text>
      <NeoBrutalButton label="COPY ADDRESS" onPress={handleCopy} />
      <Text style={styles.hint}>Use Candide or Pimlico Sepolia USDT faucet to fund demo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: RenoPayBrand.backgroundElevated,
    borderColor: RenoPayBrand.border,
    borderRadius: 12,
    borderWidth: 2,
    gap: 10,
    marginBottom: 12,
    padding: 14,
  },
  label: {
    color: RenoPayBrand.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  address: {
    color: RenoPayBrand.foreground,
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
  hint: {
    color: RenoPayBrand.muted,
    fontSize: 12,
    lineHeight: 16,
  },
});
