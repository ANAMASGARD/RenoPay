import { describe, expect, it } from 'vitest';

import { matchFromTicket, mergeMatches, resolveTicketLocation } from '@/features/matches/match-storage';
import { sampleIssuedTicket } from '@/features/tickets/__tests__/test-fixtures';

describe('persistent match markers', () => {
  it('prefers explicit ticket location over venue fallback', () => {
    expect(resolveTicketLocation({
      venue: 'GMC Balayogi Athletic Stadium, Hyderabad',
      location: { latitude: 12.34, longitude: 56.78, label: 'Custom pin' },
    })).toEqual({ latitude: 12.34, longitude: 56.78, label: 'Custom pin' });
  });

  it('rehydrates a demo stadium pin when an older ticket lacks location data', () => {
    const match = matchFromTicket(sampleIssuedTicket({ venue: 'GMC Balayogi Athletic Stadium, Hyderabad', location: undefined }));
    expect(match?.location).toEqual({ latitude: 17.4103, longitude: 78.3436, label: 'GMC Balayogi Athletic Stadium' });
  });

  it('merges cached and on-chain copies of the same event', () => {
    const cached = { ...matchFromTicket(sampleIssuedTicket({ location: { latitude: 17.4103, longitude: 78.3436 } }))!, saleAddress: '' };
    const onChain = { ...cached, matchId: '0xmatch', saleAddress: '0xsale' };
    const merged = mergeMatches([cached], [onChain]);
    expect(merged).toHaveLength(1);
    expect(merged[0].saleAddress).toBe('0xsale');
  });
});
