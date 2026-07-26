import QRCodeLib from 'qrcode';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { RenoPayBrand } from '@/constants/renopay-brand';

type QrCodeViewProps = {
  value: string;
  size?: number;
};

type SvgRect = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function buildMatrix(value: string): boolean[][] {
  try {
    const qr = QRCodeLib.create(value, { errorCorrectionLevel: 'M' });
    const gridSize = qr.modules.size;
    const next: boolean[][] = [];
    for (let row = 0; row < gridSize; row += 1) {
      const cells: boolean[] = [];
      for (let col = 0; col < gridSize; col += 1) {
        cells.push(Boolean(qr.modules.get(row, col)));
      }
      next.push(cells);
    }
    return next;
  } catch {
    return [];
  }
}

function matrixToRunLengthRects(matrix: boolean[][], cellSize: number): SvgRect[] {
  const rects: SvgRect[] = [];
  for (let row = 0; row < matrix.length; row += 1) {
    let col = 0;
    while (col < matrix[row].length) {
      if (!matrix[row][col]) {
        col += 1;
        continue;
      }
      const start = col;
      while (col < matrix[row].length && matrix[row][col]) {
        col += 1;
      }
      rects.push({
        key: `${row}-${start}`,
        x: start * cellSize,
        y: row * cellSize,
        width: (col - start) * cellSize,
        height: cellSize,
      });
    }
  }
  return rects;
}

export const QrCodeView = memo(function QrCodeView({ value, size = 160 }: QrCodeViewProps) {
  const matrix = useMemo(() => buildMatrix(value), [value]);
  const moduleCount = matrix.length;
  const cellSize = moduleCount > 0 ? size / moduleCount : 0;

  const rects = useMemo(
    () => (moduleCount > 0 ? matrixToRunLengthRects(matrix, cellSize) : []),
    [cellSize, matrix, moduleCount],
  );

  if (moduleCount === 0) {
    return <View style={[styles.wrap, { width: size, height: size }]} />;
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Rect width={size} height={size} fill={RenoPayBrand.cream} />
        {rects.map((rect) => (
          <Rect
            key={rect.key}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill={RenoPayBrand.border}
          />
        ))}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: RenoPayBrand.cream,
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    overflow: 'hidden',
  },
});
