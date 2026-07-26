# Sepolia Ticket Payment Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable real WDK/Candide Sepolia USD₮ ticket payments up to a 20 USD₮ ticket price, minting the ticket only after WDK returns an on-chain transaction hash.

**Architecture:** Keep WDK as the sole settlement system. Configure a clearly named, testnet-only high transfer-fee ceiling in the WDK provider so both WDK's transfer guard and Reno Pay's preflight use the same limit; preflight still requires sender balance to cover ticket price plus the quoted fee. The sender displays the real WDK quote before confirmation, then WDK submits the actual ERC-4337 transfer; the ticket is locally minted only from the resulting hash and the receiver watcher independently detects the ERC-20 transfer.

**Tech Stack:** Expo SDK 54, React Native, Tether WDK ERC-4337, Candide Sepolia paymaster, Vitest.

---

### Task 1: Define a safe demo-only WDK transfer limit

**Files:**
- Modify: `src/config/wdk.ts`
- Test: `src/features/tickets/__tests__/payment-send.test.ts`

- [x] **Step 1: Write the failing configuration expectation**

```ts
expect(getTransferMaxFeeAtomic()).toBe(20_000_000n);
```

- [x] **Step 2: Run the focused test to verify the existing 5 USD₮ cap fails it**

Run: `npm run test -- src/features/tickets/__tests__/payment-send.test.ts`

Expected: FAIL because `getTransferMaxFeeAtomic()` returns `5_000_000n`.

- [x] **Step 3: Configure WDK and preflight with the same 20 USD₮ testnet limit**

```ts
export const SEPOLIA_DEMO_TRANSFER_MAX_FEE_ATOMIC = 20_000_000;

// Candide test USD₮ base units. This is intentionally a testnet demo ceiling;
// production must use a materially lower product-defined amount.
transferMaxFee: SEPOLIA_DEMO_TRANSFER_MAX_FEE_ATOMIC,
```

- [x] **Step 4: Run the focused test to verify the limit**

Run: `npm run test -- src/features/tickets/__tests__/payment-send.test.ts`

Expected: PASS.

### Task 2: Surface the WDK quote and prevent unexplained failed sends

**Files:**
- Modify: `src/features/tickets/payment-send.ts`
- Modify: `src/features/tickets/payment-helpers.ts`
- Modify: `src/hooks/use-payment-flow.ts`
- Test: `src/features/tickets/__tests__/payment-send.test.ts`

- [x] **Step 1: Write failing focused tests for exact quote display data and a 20 USD₮ ticket preflight**

```ts
expect(formatUsdtFromAtomic(250_000n)).toBe('0.25');
await expect(sendSepoliaUsdtPayment(baseParams({
  amountUsdt: '20',
  getBalance: vi.fn().mockResolvedValue([mockBalance('20_250_000')]),
  estimateFee: vi.fn().mockResolvedValue(mockEstimate('250000')),
}))).resolves.toMatchObject({ hash: '0xabc', fee: '250000' });
```

- [x] **Step 2: Run focused tests to verify the old payment flow does not provide quote details to the caller before confirmation**

Run: `npm run test -- src/features/tickets/__tests__/payment-send.test.ts`

Expected: PASS for raw math only; the hook has no pre-confirmation quote path.

- [x] **Step 3: Add a quote-first confirmation path**

```ts
const estimate = await estimateFee(txParams);
const feeAtomic = parseFeeAtomic(estimate.fee);
assertFeeWithinCap(feeAtomic, getTransferMaxFeeAtomic());
assertSufficientUsdt(balance, amountAtomic + feeAtomic);
Alert.alert('Confirm payment', `Ticket: ${price} USDT\nNetwork fee: ${formatUsdtFromAtomic(feeAtomic)} test USDT`, ...);
```

The submission must retain the balance check and reject a failed WDK result. It must never create a ticket until `result.success` and `result.hash` are both present.

- [x] **Step 4: Run focused tests**

Run: `npm run test -- src/features/tickets/__tests__/payment-send.test.ts`

Expected: PASS.

### Task 3: Verify the full codebase and make a real-device handoff

**Files:**
- Modify: `docs/memory.md`

- [x] **Step 1: Run static analysis and unit tests**

Run: `npm run verify`

Expected: lint, TypeScript, and Vitest pass.

- [x] **Step 2: Record the result and required device verification**

Add a dated memory entry that records the 20 USD₮ ticket test scenario, correct Candide test token address, and that a physical sender must hold `ticket price + displayed quote` in test USD₮.

- [ ] **Step 3: Build and install a fresh Android dev client**

Run: `npm run android:recover`

Expected: a fresh native build installs on the connected phone. If no ADB device is visible to the build environment, provide the exact command without claiming installation occurred.

- [ ] **Step 4: Perform the two-device manual settlement check**

1. Fund the sender wallet with at least `20 USD₮ + displayed fee` from the Candide Sepolia faucet.
2. On receiver: create a 20 USD₮ ticket and open **Receive Payment**.
3. On sender: scan, review the exact displayed quote, and approve.
4. Confirm the sender shows a transaction hash and a local ticket.
5. Confirm the receiver watcher adds the attendee after the Sepolia ERC-20 `Transfer` log arrives.
