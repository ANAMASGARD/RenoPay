import { describe, expect, it } from 'vitest';

import {
  INCREMENTAL_BLOCK_OVERLAP,
  INCREMENTAL_BLOCK_WINDOW,
  computeIncrementalFromBlock,
} from '@/features/matches/registry';

describe('computeIncrementalFromBlock', () => {
  it('uses deployment block as the floor', () => {
    expect(computeIncrementalFromBlock({
      latest: 11_360_000,
      deploymentBlock: 11_353_499,
      lastSeenBlock: 11_359_900,
    })).toBe(11_359_836);
  });

  it('searches the recent window when no last seen block exists', () => {
    expect(computeIncrementalFromBlock({
      latest: 11_360_000,
      deploymentBlock: 11_353_499,
      lastSeenBlock: null,
    })).toBe(11_357_000);
  });

  it('never goes below zero', () => {
    expect(computeIncrementalFromBlock({
      latest: 100,
      deploymentBlock: 0,
      lastSeenBlock: 50,
    })).toBe(0);
  });

  it('uses the configured window and overlap constants', () => {
    expect(INCREMENTAL_BLOCK_WINDOW).toBe(3_000);
    expect(INCREMENTAL_BLOCK_OVERLAP).toBe(64);
  });
});
