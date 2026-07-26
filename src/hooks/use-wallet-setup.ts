import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useWdkApp, useWalletManager } from '@/features/wdk/wdk-hooks';

const DEFAULT_WALLET_ID = 'renopay-main';

export function useWalletSetup() {
  const { state } = useWdkApp();
  const { createWallet, unlock, restoreWallet, getMnemonic } = useWalletManager();

  const [loadingAction, setLoadingAction] = useState<'generate' | 'enter' | null>(null);
  const [modalMode, setModalMode] = useState<'display' | 'enter' | null>(null);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [enterPhrase, setEnterPhrase] = useState('');

  const handleGenerateSeed = useCallback(async () => {
    setLoadingAction('generate');
    try {
      if (state.status === 'LOCKED') {
        await unlock(DEFAULT_WALLET_ID);
      } else if (state.status === 'NO_WALLET') {
        await createWallet(DEFAULT_WALLET_ID);
        await unlock(DEFAULT_WALLET_ID);
      } else if (state.status === 'READY') {
        const phrase = await getMnemonic(DEFAULT_WALLET_ID);
        if (phrase) {
          setSeedPhrase(phrase);
          setModalMode('display');
        }
        return;
      }

      const phrase = await getMnemonic(DEFAULT_WALLET_ID);
      if (phrase) {
        setSeedPhrase(phrase);
        setModalMode('display');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wallet setup failed.';
      if (message.includes('already exists')) {
        try {
          await unlock(DEFAULT_WALLET_ID);
          const phrase = await getMnemonic(DEFAULT_WALLET_ID);
          if (phrase) {
            setSeedPhrase(phrase);
            setModalMode('display');
          }
          return;
        } catch (unlockError) {
          Alert.alert(
            'Unlock failed',
            unlockError instanceof Error ? unlockError.message : 'Unable to unlock wallet.',
          );
          return;
        }
      }
      Alert.alert('Wallet setup failed', message);
    } finally {
      setLoadingAction(null);
    }
  }, [createWallet, getMnemonic, state.status, unlock]);

  const handleEnterPhrase = useCallback(() => {
    if (state.status === 'LOCKED') {
      unlock(DEFAULT_WALLET_ID).catch((error) => {
        Alert.alert(
          'Unlock failed',
          error instanceof Error ? error.message : 'Unable to unlock wallet.',
        );
      });
      return;
    }
    setEnterPhrase('');
    setModalMode('enter');
  }, [state.status, unlock]);

  const handleRestorePhrase = useCallback(async () => {
    const normalized = enterPhrase.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) {
      Alert.alert('Seed phrase required', 'Enter your recovery phrase to restore the wallet.');
      return;
    }

    setLoadingAction('enter');
    try {
      const walletId = `renopay-restored-${Date.now()}`;
      await restoreWallet(normalized, walletId);
      setModalMode(null);
      Alert.alert('Wallet restored', 'Your wallet is ready on this device.');
    } catch (error) {
      Alert.alert(
        'Restore failed',
        error instanceof Error ? error.message : 'Unable to restore wallet from phrase.',
      );
    } finally {
      setLoadingAction(null);
    }
  }, [enterPhrase, restoreWallet]);

  return {
    loadingAction,
    modalMode,
    seedPhrase,
    enterPhrase,
    setEnterPhrase,
    setModalMode,
    handleGenerateSeed,
    handleEnterPhrase,
    handleRestorePhrase,
  };
}
