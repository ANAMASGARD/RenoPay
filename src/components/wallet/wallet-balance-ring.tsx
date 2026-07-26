import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { useWalletUsdtBalance } from '@/hooks/use-wallet-usdt-balance';

const RING_SIZE = 200;
const STROKE_WIDTH = 14;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = RING_SIZE / 2;

type WalletBalanceRingProps = {
  address: string;
};

export function WalletBalanceRing({ address }: WalletBalanceRingProps) {
  const { displayUsdt, fillRatio, status, error, refresh } = useWalletUsdtBalance(address, true);

  const strokeDashoffset = CIRCUMFERENCE * (1 - fillRatio);
  const subtitle =
    status === 'loading'
      ? 'Loading balance…'
      : status === 'error'
        ? (error ?? 'Unable to load balance')
        : 'Sepolia testnet USDT';

  return (
    <View style={styles.wrap}>
      <View style={styles.shadow} />
      <View style={styles.card}>
        <Text style={styles.label}>WALLET BALANCE</Text>

        <View style={styles.ringContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke={RenoPayBrand.pitchLine}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke={RenoPayBrand.primary}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            />
          </Svg>

          <View style={styles.centerContent}>
            <Text style={styles.amount}>{displayUsdt}</Text>
            <Text style={styles.unit}>USDT</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>
        <NeoBrutalButton
          disabled={status === 'loading'}
          label="REFRESH"
          onPress={refresh}
          variant="secondary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    position: 'relative',
  },
  shadow: {
    backgroundColor: RenoPayBrand.border,
    borderRadius: 14,
    bottom: -5,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 5,
  },
  card: {
    alignItems: 'center',
    backgroundColor: RenoPayBrand.backgroundElevated,
    borderColor: RenoPayBrand.border,
    borderRadius: 14,
    borderWidth: 3,
    gap: 12,
    padding: 16,
  },
  label: {
    color: RenoPayBrand.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  ringContainer: {
    alignItems: 'center',
    height: RING_SIZE,
    justifyContent: 'center',
    width: RING_SIZE,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  amount: {
    color: RenoPayBrand.primary,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  unit: {
    color: RenoPayBrand.foreground,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  subtitle: {
    color: RenoPayBrand.muted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
