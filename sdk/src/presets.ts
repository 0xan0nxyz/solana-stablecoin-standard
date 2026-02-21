import { PublicKey } from "@solana/web3.js";

/** Canonical SSS Token program ID */
export const SSS_TOKEN_PROGRAM_ID = new PublicKey(
  "7xPa6e4hMagWEryfLD8bPvTs8cj8FT48FCoJPnP2EdyV"
);

/** Canonical Transfer Hook program ID */
export const HOOK_PROGRAM_ID = new PublicKey(
  "6tULvFAJ7HfaMsjqcUyS7G3kJyncrBsth9kp2UGramiY"
);

/**
 * SSS-1 preset: minimal stablecoin with no compliance extensions.
 * No permanent delegate, no transfer hook, no default-frozen accounts.
 */
export const SSS_1 = {
  enablePermanentDelegate: false,
  enableTransferHook: false,
  enableDefaultFrozen: false,
  transferHookProgramId: null as PublicKey | null,
} as const;

/**
 * SSS-2 preset: fully-compliant stablecoin with:
 * - Permanent delegate (enables seizure without owner signature)
 * - Transfer hook (enforces blacklist checks on every transfer)
 * - Default-frozen accounts (all new token accounts start frozen)
 */
export const SSS_2 = {
  enablePermanentDelegate: true,
  enableTransferHook: true,
  enableDefaultFrozen: true,
  transferHookProgramId: HOOK_PROGRAM_ID as PublicKey | null,
} as const;
