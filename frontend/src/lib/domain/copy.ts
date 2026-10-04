/**
 * Shared UI copy from Frontend Content Specification v1.0 (§15–§16).
 * IDs match the specification so copy can be audited against it.
 */

export const PRODUCT_NAME = "AI Legal Integrity & Verification Platform";
export const PRODUCT_SHORT_NAME = "AI Legal Integrity";
export const TAGLINE = "From AI-generated answers to verifiable legal reasoning.";

export const RU_SHORT = "Results assist professional review. They are not legal advice, and final legal judgment remains with you.";
export const RU_STANDARD =
  "The platform assists legal professionals by checking legal claims and citations against available sources and presenting the evidence it finds. It does not provide legal advice or legal opinions and does not replace professional judgment. Results depend on the sources available to the platform and may be incomplete. Final legal assessment remains with the qualified legal professional.";
export const RU_EXPORT =
  "This report records an automated check of legal claims and citations against the sources available to the platform on {date}. It is not a legal opinion and does not certify the correctness of any legal argument. Final legal assessment remains with the qualified legal professional.";
export const RU_STATUS = "Final assessment rests with the reviewing professional.";
export const RU_LEGAL_STATUS =
  "Legal status shows later treatment found in available sources. It may be incomplete and does not confirm that an authority remains good law.";

export const DN_WORKSPACE =
  "This workspace contains fictional authorities and illustrative excerpts. They are not real legal sources.";
export const DN_REPORT =
  "All cases, courts and reporters in this report are fictional. Statutory text is illustrative unless marked otherwise.";
export const DN_UPLOAD =
  "Files are not analysed in this prototype. Starting a verification runs a simulated pipeline and opens the demo report.";
export const DN_PROCESSING = "This pipeline is simulated. Results shown will be from the demo report, not your file.";

export const TT_COVERAGE =
  "The share of claims that could be assessed against available sources. It measures how much could be checked, not how much is correct.";
export const TT_ASSESSED = "Claims that received a status other than Unable to Verify. Assessed does not mean correct.";
export const TT_FULL_COVERAGE = "Every claim could be assessed. This does not mean every claim is supported.";
export const TT_SOURCES_AS_OF = "Results reflect the sources available to the platform on this date.";

export const EMPTY = {
  dash: {
    title: "No verifications yet",
    body: "Upload a legal document or paste AI-generated legal text to verify its claims and citations.",
  },
  reports: { title: "No reports yet", body: "Reports appear here after you run a verification." },
  filter: { title: "No matching results", body: "No items match the current search or filters." },
  claims: {
    title: "No legal claims identified",
    body: "No propositions of law were found in this document. Check that it contains legal argument or analysis.",
  },
  contra: "No contradicting authority found in available sources.",
  related: "No related authorities found in available sources.",
  activity: "Verification activity will appear here.",
  attention: "No claims need review in recent reports.",
  sources: { title: "No sources available", body: "Sources used for verification will be listed here." },
  feed: "Claims will appear here once they are identified.",
} as const;

export const LOADING = {
  dash: "Loading workspace…",
  reports: "Loading reports…",
  report: "Loading verification report…",
  claim: "Loading claim details…",
  doc: "Loading document text…",
  graph: "Building evidence graph…",
  sources: "Loading sources…",
  source: "Loading source…",
  demo: "Opening demo report…",
  export: "Preparing export…",
} as const;

export const ERROR = {
  load: "This content could not be loaded. Check your connection and try again.",
  start: "Verification could not be started. Try again.",
  claim: "This claim could not be loaded.",
  doc: "The document text could not be displayed.",
  graph: "The evidence graph could not be loaded.",
  source: "This source could not be loaded.",
  export: "The report could not be exported. Try again, or choose another format.",
  settings: "Settings could not be saved. Try again.",
} as const;

export const SUCCESS = {
  started: "Verification started.",
  excerpt: "Excerpt copied with citation.",
  link: "Link copied.",
  paragraphLink: "Paragraph link copied.",
  settings: "Settings saved.",
  deleted: "Report deleted.",
  cancelled: "Verification cancelled.",
} as const;
