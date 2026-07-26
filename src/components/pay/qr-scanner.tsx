import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RenoPayInlineLoader } from '@/components/ui/renopay-inline-loader';
import { RenoPayBrand } from '@/constants/renopay-brand';

type QrScannerProps = {
  onScan: (data: string) => void;
  onClose: () => void;
};

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (scanned) {
        return;
      }
      setScanned(true);
      onScan(data.trim());
    },
    [onScan, scanned],
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <RenoPayInlineLoader label="CHECKING CAMERA" height={120} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.copy}>Camera access is required to scan gate QR codes.</Text>
        <Pressable accessibilityRole="button" onPress={() => requestPermission()} style={styles.btn}>
          <Text style={styles.btnText}>ALLOW CAMERA</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>CANCEL</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Align payment QR inside the frame</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTorchOn((value) => !value)}
          style={styles.torchBtn}>
          <Text style={styles.closeText}>{torchOn ? 'TORCH OFF' : 'TORCH ON'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>CLOSE</Text>
        </Pressable>
        {scanned ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setScanned(false)}
            style={styles.rescanBtn}>
            <Text style={styles.closeText}>SCAN AGAIN</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RenoPayBrand.background },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  frame: {
    width: 260,
    height: 260,
    borderWidth: 4,
    borderColor: RenoPayBrand.primary,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: {
    color: RenoPayBrand.foreground,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: RenoPayBrand.background,
  },
  copy: {
    color: RenoPayBrand.foreground,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 12,
    backgroundColor: RenoPayBrand.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  btnText: {
    color: RenoPayBrand.border,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryBtn: { padding: 12 },
  secondaryText: {
    color: RenoPayBrand.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  torchBtn: {
    borderWidth: 2,
    borderColor: RenoPayBrand.primary,
    borderRadius: 10,
    backgroundColor: RenoPayBrand.backgroundElevated,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeBtn: {
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 10,
    backgroundColor: RenoPayBrand.backgroundElevated,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  rescanBtn: {
    borderWidth: 2,
    borderColor: RenoPayBrand.primary,
    borderRadius: 10,
    backgroundColor: RenoPayBrand.backgroundElevated,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeText: {
    color: RenoPayBrand.foreground,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
