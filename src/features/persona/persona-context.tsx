import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppPersona = 'fan' | 'club';

const PERSONA_KEY = '@renopay/app_persona_v1';

type PersonaContextValue = {
  persona: AppPersona | null;
  loading: boolean;
  setPersona: (persona: AppPersona) => Promise<void>;
};

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<AppPersona | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PERSONA_KEY)
      .then((value) => setPersonaState(value === 'fan' || value === 'club' ? value : null))
      .finally(() => setLoading(false));
  }, []);

  const setPersona = useCallback(async (nextPersona: AppPersona) => {
    await AsyncStorage.setItem(PERSONA_KEY, nextPersona);
    setPersonaState(nextPersona);
  }, []);

  const value = useMemo(() => ({ persona, loading, setPersona }), [loading, persona, setPersona]);
  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaContextValue {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error('usePersona must be used within PersonaProvider');
  }
  return context;
}

export function personaHome(persona: AppPersona): '/(tabs)/pay' | '/(tabs)/gate' {
  return persona === 'fan' ? '/(tabs)/pay' : '/(tabs)/gate';
}
