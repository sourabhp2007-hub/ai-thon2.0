import type { VerificationStatus } from "@/lib/types/domain";

/** Single source of truth for the four verification statuses. */

export const STATUS_ORDER: VerificationStatus[] = [
  "supported",
  "partially_supported",
  "unsupported",
  "unable_to_verify",
];

/** Lower = more serious. Used for "Most serious first" sorting. */
export const STATUS_SEVERITY: Record<VerificationStatus, number> = {
  unsupported: 0,
  partially_supported: 1,
  unable_to_verify: 2,
  supported: 3,
};

export interface StatusMeta {
  label: string;
  /** Full definition, used in tooltips and the claim Status step. */
  definition: string;
  /** Short definition for dashboard tiles. */
  short: string;
  /** Tailwind class fragments; tokens are defined in globals.css. */
  text: string;
  bg: string;
  border: string;
  fill: string;
  /** CSS color variable, for SVG and graph edges. */
  color: string;
}

export const STATUS_META: Record<VerificationStatus, StatusMeta> = {
  supported: {
    label: "Supported",
    definition: "The available evidence supports the claim.",
    short: "Available evidence supports the claim.",
    text: "text-supported",
    bg: "bg-supported-bg",
    border: "border-supported/40",
    fill: "bg-supported",
    color: "var(--color-supported)",
  },
  partially_supported: {
    label: "Partially Supported",
    definition: "The authority supports only part of the claim, or a narrower version of it.",
    short: "Authority supports only part of the claim.",
    text: "text-partial",
    bg: "bg-partial-bg",
    border: "border-partial/40",
    fill: "bg-partial",
    color: "var(--color-partial)",
  },
  unsupported: {
    label: "Unsupported",
    definition: "The cited or retrieved authority does not support the claim.",
    short: "Authority does not support the claim.",
    text: "text-unsupported",
    bg: "bg-unsupported-bg",
    border: "border-unsupported/40",
    fill: "bg-unsupported",
    color: "var(--color-unsupported)",
  },
  unable_to_verify: {
    label: "Unable to Verify",
    definition: "There is not enough available evidence to assess this claim.",
    short: "Not enough available evidence to assess.",
    text: "text-unverified",
    bg: "bg-unverified-bg",
    border: "border-unverified/40",
    fill: "bg-unverified",
    color: "var(--color-unverified)",
  },
};

export function isStatus(value: string): value is VerificationStatus {
  return (STATUS_ORDER as string[]).includes(value);
}
