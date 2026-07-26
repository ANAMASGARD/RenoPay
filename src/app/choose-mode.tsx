import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { personaHome, usePersona, type AppPersona } from '@/features/persona/persona-context';

function ModeCard({
  icon,
  title,
  copy,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  copy: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.cardWrap}>
      <View style={styles.cardShadow} />
      <View style={styles.card}>
        <MaterialCommunityIcons name={icon} size={48} color={RenoPayBrand.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardCopy}>{copy}</Text>
        <NeoBrutalButton label={label} onPress={onPress} style={styles.button} />
      </View>
    </View>
  );
}

export default function ChooseModeScreen() {
  const router = useRouter();
  const { setPersona } = usePersona();

  const choose = async (persona: AppPersona) => {
    await setPersona(persona);
    router.replace(personaHome(persona));
  };

  return (
    <PitchScreen>
      <StatusBar style="light" />
      <Text style={styles.kicker}>MATCHDAY MODE</Text>
      <Text style={styles.heading}>HOW DO YOU PLAY?</Text>
      <Text style={styles.intro}>Choose a focused workspace. You can switch modes any time in Settings.</Text>
      <ModeCard
        icon="qrcode-scan"
        title="FAN"
        copy="Pay in USD₮, keep your verified ticket, and share your entry pass."
        label="PAY & ENTER"
        onPress={() => void choose('fan')}
      />
      <ModeCard
        icon="shield-star-outline"
        title="CLUB"
        copy="Issue payment QRs, verify attendees, and protect matchday revenue."
        label="SELL & PROTECT"
        onPress={() => void choose('club')}
      />
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: RenoPayBrand.primary, fontSize: 13, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center', marginTop: 8 },
  heading: { color: RenoPayBrand.foreground, fontSize: 32, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', marginTop: 8 },
  intro: { color: RenoPayBrand.muted, fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10, marginBottom: 22 },
  cardWrap: { position: 'relative', marginBottom: 20 },
  cardShadow: { position: 'absolute', left: 0, right: 0, top: 5, bottom: -5, borderRadius: 16, backgroundColor: RenoPayBrand.border },
  card: { alignItems: 'center', borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 16, backgroundColor: RenoPayBrand.backgroundElevated, padding: 20, gap: 9 },
  cardTitle: { color: RenoPayBrand.foreground, fontSize: 26, fontWeight: '900', letterSpacing: 1.4 },
  cardCopy: { color: RenoPayBrand.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', minHeight: 40 },
  button: { alignSelf: 'stretch', marginTop: 4 },
});
