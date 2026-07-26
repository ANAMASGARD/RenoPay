import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { EventLocationPicker } from '@/components/tickets/event-location-picker';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { pickTicketImage } from '@/features/tickets/ticket-image';
import type { TicketDraftInput } from '@/features/tickets/ticket-types';

const TEMPLATES: { label: string; draft: Partial<TicketDraftInput> }[] = [
  {
    label: 'CLUB GATE',
    draft: {
      eventName: 'Club Gate A',
      homeTeam: 'Arunachal FC',
      awayTeam: 'Hill United',
      venue: 'Community Ground',
      gate: '3A',
      seatLabel: 'General Admission',
      priceUsdt: '10.00',
      quantity: 20, location: { latitude: 26.9124, longitude: 75.7873, label: 'Sawai Mansingh Stadium, Jaipur' },
    },
  },
  {
    label: 'WATCH PARTY',
    draft: {
      eventName: 'Watch Party Night',
      homeTeam: 'National Squad',
      awayTeam: 'Rival XI',
      venue: 'Fan Zone',
      gate: 'VIP',
      seatLabel: 'Lounge',
      priceUsdt: '5.00',
      quantity: 50, location: { latitude: 28.6139, longitude: 77.209, label: 'Jawaharlal Nehru Stadium, New Delhi' },
    },
  },
  {
    label: 'FINAL',
    draft: {
      eventName: 'Tournament Final',
      homeTeam: 'Reno Pay FC',
      awayTeam: 'Cup Challengers',
      venue: 'Stadium Gate B',
      gate: 'B2',
      seatLabel: 'Lower Bowl',
      priceUsdt: '25.00',
      quantity: 10, location: { latitude: 19.0607, longitude: 72.8562, label: 'Wankhede Stadium, Mumbai' },
    },
  },
  {
    label: 'EDEN GARDENS',
    draft: {
      eventName: 'Kolkata Derby Night', homeTeam: 'Mohun Bagan', awayTeam: 'East Bengal', venue: 'Eden Gardens, Kolkata', gate: 'A1', seatLabel: 'Lower Bowl', priceUsdt: '15.00', quantity: 30,
      location: { latitude: 22.5646, longitude: 88.3433, label: 'Eden Gardens, Kolkata' },
    },
  },
  {
    label: 'CHINNASWAMY',
    draft: {
      eventName: 'Bengaluru Night Football', homeTeam: 'Bengaluru FC', awayTeam: 'Kerala Blasters', venue: 'M Chinnaswamy Stadium, Bengaluru', gate: 'C2', seatLabel: 'East Stand', priceUsdt: '18.00', quantity: 40,
      location: { latitude: 12.9788, longitude: 77.5996, label: 'M Chinnaswamy Stadium, Bengaluru' },
    },
  },
  {
    label: 'HYDERABAD FC',
    draft: {
      eventName: 'Deccan Football Fest', homeTeam: 'Hyderabad FC', awayTeam: 'Goa United', venue: 'GMC Balayogi Athletic Stadium, Hyderabad', gate: 'N1', seatLabel: 'General Admission', priceUsdt: '12.00', quantity: 35,
      location: { latitude: 17.4103, longitude: 78.3436, label: 'GMC Balayogi Athletic Stadium, Hyderabad' },
    },
  },
  {
    label: 'KOCHI ARENA',
    draft: {
      eventName: 'Kerala Super Match', homeTeam: 'Kerala Blasters', awayTeam: 'Chennaiyin FC', venue: 'Jawaharlal Nehru Stadium, Kochi', gate: 'B4', seatLabel: 'North Stand', priceUsdt: '14.00', quantity: 45,
      location: { latitude: 10.0498, longitude: 76.3627, label: 'Jawaharlal Nehru Stadium, Kochi' },
    },
  },
  {
    label: 'PUNE SHOWDOWN',
    draft: {
      eventName: 'Pune City Cup', homeTeam: 'Pune FC', awayTeam: 'Mumbai City', venue: 'Shree Shiv Chhatrapati Sports Complex, Pune', gate: 'S1', seatLabel: 'West Stand', priceUsdt: '11.00', quantity: 25,
      location: { latitude: 18.5954, longitude: 73.7388, label: 'Shree Shiv Chhatrapati Sports Complex, Pune' },
    },
  },
  {
    label: 'AHMEDABAD FINAL',
    draft: {
      eventName: 'Sabarmati Cup Final', homeTeam: 'Gujarat FC', awayTeam: 'Rajasthan XI', venue: 'Narendra Modi Stadium, Ahmedabad', gate: 'G5', seatLabel: 'Upper Tier', priceUsdt: '22.00', quantity: 60,
      location: { latitude: 23.0917, longitude: 72.597, label: 'Narendra Modi Stadium, Ahmedabad' },
    },
  },
  {
    label: 'GUWAHATI DERBY',
    draft: {
      eventName: 'Brahmaputra Derby', homeTeam: 'NorthEast United', awayTeam: 'Assam United', venue: 'Indira Gandhi Athletic Stadium, Guwahati', gate: 'E2', seatLabel: 'Main Stand', priceUsdt: '9.00', quantity: 20,
      location: { latitude: 26.1258, longitude: 91.7612, label: 'Indira Gandhi Athletic Stadium, Guwahati' },
    },
  },
  {
    label: 'CHENNAI NIGHT',
    draft: {
      eventName: 'Marina Football Night', homeTeam: 'Chennaiyin FC', awayTeam: 'Bengaluru FC', venue: 'Jawaharlal Nehru Stadium, Chennai', gate: 'M3', seatLabel: 'South Stand', priceUsdt: '16.00', quantity: 32,
      location: { latitude: 13.0627, longitude: 80.2792, label: 'Jawaharlal Nehru Stadium, Chennai' },
    },
  },
  {
    label: 'DELHI CLASSIC',
    draft: {
      eventName: 'Capital Classic', homeTeam: 'Delhi FC', awayTeam: 'Punjab FC', venue: 'Ambedkar Stadium, New Delhi', gate: 'D1', seatLabel: 'Central Stand', priceUsdt: '13.00', quantity: 28,
      location: { latitude: 28.6372, longitude: 77.2431, label: 'Ambedkar Stadium, New Delhi' },
    },
  },
];

const DURATION_OPTIONS = [
  { label: '1H', hours: 1 },
  { label: '2H', hours: 2 },
  { label: '3H', hours: 3 },
];

function defaultDraft(): TicketDraftInput {
  const start = new Date();
  start.setHours(start.getHours() + 2, 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return {
    eventName: '',
    homeTeam: '',
    awayTeam: '',
    venue: '',
    gate: '',
    seatLabel: '',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    priceUsdt: '10.00',
    quantity: 1,
    notes: '',
  };
}

function applyDuration(startAt: string, hours: number): string {
  const start = new Date(startAt);
  const end = new Date(start);
  end.setHours(end.getHours() + hours);
  return end.toISOString();
}

type TicketBuilderFormProps = {
  onSubmit: (draft: TicketDraftInput) => void;
  onDraftChange?: (draft: TicketDraftInput) => void;
  loading?: boolean;
  disabled?: boolean;
};

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  multiline?: boolean;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline ? fieldStyles.multiline : null]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={RenoPayBrand.muted}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

export function TicketBuilderForm({ onSubmit, onDraftChange, loading, disabled }: TicketBuilderFormProps) {
  const [draft, setDraft] = useState<TicketDraftInput>(defaultDraft);
  const [durationHours, setDurationHours] = useState(2);

  useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  const update = (patch: Partial<TicketDraftInput>) => {
    setDraft((current) => {
      const next = { ...current, ...patch };
      onDraftChange?.(next);
      return next;
    });
  };

  const setDuration = (hours: number) => {
    setDurationHours(hours);
    update({ endAt: applyDuration(draft.startAt, hours) });
  };

  const handlePickImage = async () => {
    const uri = await pickTicketImage();
    if (uri) {
      update({ imageUri: uri });
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.templatesLabel}>MATCHDAY TEMPLATES</Text>
      <View style={styles.templateRow}>
        {TEMPLATES.map((template) => (
          <Pressable
            key={template.label}
            accessibilityRole="button"
            onPress={() => {
              const next = { ...draft, ...template.draft };
              setDraft(next);
              onDraftChange?.(next);
            }}
            style={styles.templateChip}>
            <Text style={styles.templateChipText}>{template.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={handlePickImage} style={styles.imageBtn}>
        {draft.imageUri ? (
          <Image source={{ uri: draft.imageUri }} style={styles.imagePreview} contentFit="cover" />
        ) : (
          <Text style={styles.imageBtnText}>UPLOAD COVER IMAGE</Text>
        )}
      </Pressable>

      <Field label="EVENT NAME" value={draft.eventName} onChangeText={(v) => update({ eventName: v })} />
      <Field label="HOME TEAM" value={draft.homeTeam} onChangeText={(v) => update({ homeTeam: v })} />
      <Field label="AWAY TEAM" value={draft.awayTeam} onChangeText={(v) => update({ awayTeam: v })} />
      <Field label="VENUE" value={draft.venue} onChangeText={(v) => update({ venue: v })} />
      <EventLocationPicker value={draft.location} onChange={(location) => update({ location })} />
      <Field label="GATE" value={draft.gate} onChangeText={(v) => update({ gate: v })} />
      <Field label="SECTION / SEAT" value={draft.seatLabel} onChangeText={(v) => update({ seatLabel: v })} />

      <Text style={fieldStyles.label}>DURATION</Text>
      <View style={styles.durationRow}>
        {DURATION_OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            onPress={() => setDuration(option.hours)}
            style={[
              styles.durationChip,
              durationHours === option.hours ? styles.durationChipActive : null,
            ]}>
            <Text
              style={[
                styles.durationChipText,
                durationHours === option.hours ? styles.durationChipTextActive : null,
              ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Field
        label="PRICE (USDT)"
        value={draft.priceUsdt}
        onChangeText={(v) => update({ priceUsdt: v })}
        keyboardType="decimal-pad"
      />
      <Field
        label="MAX CAPACITY"
        value={String(draft.quantity)}
        onChangeText={(v) => update({ quantity: Math.max(1, Number.parseInt(v, 10) || 1) })}
        keyboardType="number-pad"
      />
      <Field label="NOTES" value={draft.notes ?? ''} onChangeText={(v) => update({ notes: v })} multiline />

      <NeoBrutalButton
        label="GENERATE TICKET"
        disabled={disabled || loading}
        onPress={() => onSubmit(draft)}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    color: RenoPayBrand.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 10,
    backgroundColor: RenoPayBrand.backgroundElevated,
    color: RenoPayBrand.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
});

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  templatesLabel: {
    color: RenoPayBrand.foreground,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  templateChip: {
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: RenoPayBrand.accentGreen,
  },
  templateChipText: {
    color: RenoPayBrand.foreground,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  imageBtn: {
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 10,
    backgroundColor: RenoPayBrand.backgroundElevated,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  imageBtnText: {
    color: RenoPayBrand.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  imagePreview: {
    width: '100%',
    height: 140,
  },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  durationChip: {
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: RenoPayBrand.backgroundElevated,
  },
  durationChipActive: {
    backgroundColor: RenoPayBrand.primary,
  },
  durationChipText: {
    color: RenoPayBrand.foreground,
    fontSize: 12,
    fontWeight: '900',
  },
  durationChipTextActive: {
    color: RenoPayBrand.border,
  },
});
