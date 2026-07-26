import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { RenoPayBrand } from '@/constants/renopay-brand';

const HONEYCOMB_ROWS = 6;
const HONEYCOMB_COLS = 9;
const CELL = 28;

/**
 * Decorative pitch lines + subtle honeycomb mesh matching Onboarding-Screen.png.
 */
export const OnboardingBackground = memo(function OnboardingBackground() {
  const honeycomb = useMemo(() => {
    const cells: { key: string; left: number; top: number }[] = [];
    for (let row = 0; row < HONEYCOMB_ROWS; row += 1) {
      for (let col = 0; col < HONEYCOMB_COLS; col += 1) {
        const offsetX = row % 2 === 0 ? 0 : CELL * 0.5;
        cells.push({
          key: `${row}-${col}`,
          left: col * CELL + offsetX,
          top: row * (CELL * 0.86),
        });
      }
    }
    return cells;
  }, []);

  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={styles.honeycombLayer}>
        {honeycomb.map((cell) => (
          <View
            key={cell.key}
            style={[
              styles.hexCell,
              {
                left: cell.left,
                top: cell.top,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.pitchLayer}>
        <View style={styles.goalLine} />
        <View style={styles.penaltyBox} />
        <View style={styles.penaltySpot} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RenoPayBrand.background,
  },
  honeycombLayer: {
    position: 'absolute',
    top: '6%',
    left: '-4%',
    right: '-4%',
    height: '42%',
    opacity: 0.35,
  },
  hexCell: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: RenoPayBrand.accentGreen,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
    opacity: 0.45,
  },
  pitchLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '34%',
    alignItems: 'center',
  },
  goalLine: {
    position: 'absolute',
    bottom: '28%',
    left: '8%',
    right: '8%',
    height: 2,
    backgroundColor: RenoPayBrand.pitchLine,
    opacity: 0.55,
  },
  penaltyBox: {
    position: 'absolute',
    bottom: '28%',
    width: '52%',
    height: '22%',
    borderWidth: 2,
    borderColor: RenoPayBrand.pitchLine,
    borderBottomWidth: 0,
    opacity: 0.5,
  },
  penaltySpot: {
    position: 'absolute',
    bottom: '40%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RenoPayBrand.pitchLine,
    opacity: 0.45,
  },
});
