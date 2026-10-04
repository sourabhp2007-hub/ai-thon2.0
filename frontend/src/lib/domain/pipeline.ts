import type { StageKey } from "@/lib/types/domain";

/** The eight verification pipeline stages (spec §3.4), in order. */
export const PIPELINE_STAGES: { key: StageKey; label: string; activeDescription: string }[] = [
  { key: "uploaded", label: "Document uploaded", activeDescription: "Receiving the document." },
  { key: "extract_text", label: "Extracting text", activeDescription: "Reading text and structure from the document." },
  { key: "identify_claims", label: "Identifying legal claims", activeDescription: "Finding the propositions of law the document asserts." },
  { key: "extract_citations", label: "Extracting citations", activeDescription: "Detecting cited cases, constitutional and statutory provisions, and other authorities." },
  { key: "search_authorities", label: "Searching authorities", activeDescription: "Locating cited authorities in available sources." },
  { key: "verify_evidence", label: "Verifying evidence", activeDescription: "Comparing each claim with the text of its cited authority." },
  { key: "check_legal_status", label: "Checking legal status", activeDescription: "Looking for later treatment of cited cases." },
  { key: "generate_report", label: "Generating report", activeDescription: "Assembling the verification report." },
];
