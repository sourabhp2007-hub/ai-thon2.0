import { buildClaims, renderPages, type ClaimSpec } from "./build";

/** DEMO DATA — "Research Memo — Electronic Evidence (Demo).docx". */

export const MEMO_REPORT_ID = "rpt-research-memo";

const specs: ClaimSpec[] = [
  {
    text: "A certificate is a condition of admissibility where an electronic record is produced as secondary evidence (Leela Desai v. State of Northbridge, (2021) 6 DLR 301, ¶24).",
    status: "supported",
    cites: [{ raw: "Leela Desai v. State of Northbridge, (2021) 6 DLR 301, ¶24", authorityId: "a07", paragraphId: "24", support: "pass" }],
    evidence: [
      {
        authorityId: "a07",
        paragraphId: "24",
        highlight: "A certificate is a condition of admissibility where an electronic record is produced as secondary evidence.",
        relationship: "supports",
        note: "States the rule described in the claim.",
      },
    ],
    reason: [["Paragraph 24 states that a certificate is a condition of admissibility for secondary electronic evidence, matching the claim.", [0]]],
  },
  {
    text: "An electronic record is admissible only if accompanied by a certificate (Leela Desai, ¶24).",
    status: "partially_supported",
    cites: [{ raw: "Leela Desai, ¶24", authorityId: "a07", paragraphId: "24", shortForm: true, support: "warn" }],
    evidence: [
      {
        authorityId: "a07",
        paragraphId: "24",
        highlight: "A certificate is a condition of admissibility where an electronic record is produced as secondary evidence.",
        relationship: "partially_supports",
        note: "Limits the certificate requirement to secondary evidence.",
      },
    ],
    reason: [
      ["Paragraph 24 requires a certificate where an electronic record is produced as secondary evidence.", [0]],
      ["The claim extends the requirement to every electronic record.", [0]],
    ],
  },
  {
    text: "The certificate must be signed by a person in a responsible position in relation to the device (Leela Desai, ¶29).",
    status: "supported",
    cites: [{ raw: "Leela Desai, ¶29", authorityId: "a07", paragraphId: "29", shortForm: true, support: "pass" }],
    evidence: [{ authorityId: "a07", paragraphId: "29", relationship: "supports", note: "Sets out who must sign the certificate." }],
    reason: [["Paragraph 29 requires the certificate to be signed by a person in a responsible position, matching the claim.", [0]]],
  },
  {
    text: "A certificate may be produced for the first time at the appellate stage (Leela Desai, ¶31).",
    status: "partially_supported",
    cites: [{ raw: "Leela Desai, ¶31", authorityId: "a07", paragraphId: "31", shortForm: true, support: "warn" }],
    evidence: [{ authorityId: "a07", paragraphId: "31", relationship: "partially_supports", note: "Permits later production subject to conditions; does not address appeals." }],
    reason: [
      ["Paragraph 31 permits later production subject to the court’s permission and no prejudice.", [0]],
      ["It does not address production at the appellate stage.", [0]],
    ],
  },
  {
    text: "Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 sets out conditions for the admissibility of electronic records.",
    status: "supported",
    cites: [{ raw: "Section 63, Bharatiya Sakshya Adhiniyam, 2023", authorityId: "a02", support: "pass" }],
    evidence: [{ authorityId: "a02", paragraphId: "s63", relationship: "supports", note: "Sets out admissibility conditions for electronic records." }],
    reason: [["Section 63 sets out conditions for the admissibility of electronic records, matching the claim.", [0]]],
  },
];

const pageTemplate: string[][] = [
  [
    "Research memo — admissibility of electronic evidence. Demo document: all parties, courts and reported decisions are fictional.",
    "Question presented: what must a party establish before electronic records are admitted in evidence?",
  ],
  ["## Short answer", "{c5}"],
  ["## Analysis — the certificate requirement", "{c1}", "{c2}"],
  ["## Who may sign", "{c3}"],
  ["## Timing of production", "{c4}"],
  ["Conclusion: the respondent should be asked to produce a certificate before the records are relied upon."],
];

export const researchMemoPages = renderPages(
  pageTemplate,
  specs.map((s) => s.text),
);

export const researchMemo = buildClaims(MEMO_REPORT_ID, specs, researchMemoPages);
