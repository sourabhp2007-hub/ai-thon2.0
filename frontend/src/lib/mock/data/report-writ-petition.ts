import { DEMO_REPORT_ID } from "@/lib/domain/demo";
import { buildClaims, renderPages, type ClaimSpec } from "./build";

/** DEMO DATA — "Writ Petition Draft — Data Retention (Demo).pdf". */

export const WRIT_REPORT_ID = DEMO_REPORT_ID;

const specs: ClaimSpec[] = [
  {
    text: "Article 21 of the Constitution protects every person against deprivation of life or personal liberty except according to procedure established by law.",
    status: "supported",
    cites: [{ raw: "Article 21 of the Constitution", authorityId: "a01", referenceCited: "Art. 21", support: "pass" }],
    evidence: [{ authorityId: "a01", paragraphId: "art21", relationship: "supports", note: "The constitutional text states the protection described in the claim." }],
    reason: [["The claim restates the text of Article 21.", [0]]],
  },
  {
    text: "The Supreme Court in Asha Rao v. State of Northbridge, (2022) 5 DLR 123, held at paragraph 43 that retention of personal data by the State is “always impermissible” once the purpose of collection has been served.",
    status: "partially_supported",
    cites: [
      {
        raw: "Asha Rao v. State of Northbridge, (2022) 5 DLR 123, ¶43",
        authorityId: "a04",
        paragraphId: "43",
        courtStated: "Supreme Court",
        quote: { asCited: "“always impermissible”", inSource: "“ordinarily impermissible”" },
        support: "warn",
      },
    ],
    evidence: [
      {
        authorityId: "a04",
        paragraphId: "43",
        highlight: "continued retention by the State is ordinarily impermissible in the absence of a statutory mandate.",
        relationship: "partially_supports",
        note: "Addresses retention after purpose is served, but limits the rule to cases without a statutory mandate.",
      },
    ],
    reason: [
      ["Paragraph 43 holds that retention after the purpose is served is ordinarily impermissible where there is no statutory mandate.", [0]],
      ["It expressly states that retention is not barred in every case.", [0]],
      ["The claim states a broader, absolute rule, and the quoted words “always impermissible” do not appear in the paragraph.", [0]],
    ],
    flags: ["quote_mismatch"],
    related: [
      { authorityId: "a05", note: "Followed in Asha Rao ¶36 (three-part privacy test)" },
      { authorityId: "a01", note: "Interpreted in Asha Rao" },
    ],
    quoteComparison: {
      asQuoted: "retention of personal data by the State is “always impermissible” once the purpose of collection has been served",
      inSource: "continued retention by the State is ordinarily impermissible in the absence of a statutory mandate",
      quotedDiff: "always",
      sourceDiff: "ordinarily",
    },
  },
  {
    text: "The High Court in Kiran Joshi v. Northbridge Transport Corporation, (2017) 2 DLR 88, held that an employer may monitor an employee’s devices without prior notice.",
    status: "unsupported",
    cites: [
      {
        raw: "Kiran Joshi v. Northbridge Transport Corporation, (2017) 2 DLR 88",
        authorityId: "a06",
        courtStated: "High Court",
        support: "fail",
      },
    ],
    evidence: [
      {
        authorityId: "a06",
        paragraphId: "18",
        relationship: "contradicts",
        note: "States that monitoring without prior notice is not permissible.",
      },
    ],
    reason: [
      ["Paragraph 18 states that monitoring without prior notice is not permissible, even on employer-issued devices.", [0]],
      ["The cited authority states the opposite of the claim.", [0]],
    ],
    flags: ["contradicting_evidence", "distinguished"],
  },
  {
    text: "Under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023, the admissibility of electronic records is subject to specific statutory conditions.",
    status: "supported",
    cites: [{ raw: "Section 63, Bharatiya Sakshya Adhiniyam, 2023", authorityId: "a02", support: "pass" }],
    evidence: [{ authorityId: "a02", paragraphId: "s63", relationship: "supports", note: "Section 63 sets out conditions for admissibility of electronic records." }],
    reason: [["Section 63 sets out conditions for the admissibility of electronic records, as the claim states.", [0]]],
  },
  {
    text: "In Meridian Health Network v. Northbridge Health Authority, (2019) 3 DLR 410, the Supreme Court held that any intrusion into privacy must satisfy legality, legitimate aim and proportionality.",
    status: "supported",
    cites: [
      {
        raw: "Meridian Health Network v. Northbridge Health Authority, (2019) 3 DLR 410",
        authorityId: "a05",
        courtStated: "Supreme Court",
        support: "pass",
      },
    ],
    evidence: [{ authorityId: "a05", paragraphId: "27", relationship: "supports", note: "States the three requirements described in the claim." }],
    reason: [["Paragraph 27 states the three requirements of legality, legitimate aim and proportionality, matching the claim.", [0]]],
  },
  {
    text: "The State must inform individuals of the purpose of data collection at the time of collection (Asha Rao, ¶38).",
    status: "supported",
    cites: [{ raw: "Asha Rao, ¶38", authorityId: "a04", paragraphId: "38", shortForm: true, support: "pass" }],
    evidence: [{ authorityId: "a04", paragraphId: "38", relationship: "supports", note: "Requires disclosure of purpose at the point of collection." }],
    reason: [["Paragraph 38 requires the State to inform the individual of the purpose at the time of collection, matching the claim.", [0]]],
  },
  {
    text: "Courts have consistently recognised a right to have criminal records erased after acquittal.",
    status: "unable_to_verify",
    cites: [],
    evidence: [],
    reason: [["The claim cites no authority, and no sufficiently relevant authority was found in available sources.", []]],
    flags: ["no_citation"],
    unableReason: "no_citation",
    whatYouCanDo: "Identify an authority for this proposition, then check the claim against its text directly.",
  },
  {
    text: "A certificate is required where an electronic record is produced as secondary evidence (Leela Desai v. State of Northbridge, (2021) 6 DLR 301, ¶24).",
    status: "supported",
    cites: [{ raw: "Leela Desai v. State of Northbridge, (2021) 6 DLR 301, ¶24", authorityId: "a07", paragraphId: "24", support: "pass" }],
    evidence: [
      {
        authorityId: "a07",
        paragraphId: "24",
        highlight: "A certificate is a condition of admissibility where an electronic record is produced as secondary evidence.",
        relationship: "supports",
        note: "Holds that a certificate is a condition of admissibility for secondary electronic evidence.",
      },
    ],
    reason: [["Paragraph 24 holds that a certificate is a condition of admissibility for secondary electronic evidence, matching the claim.", [0]]],
  },
  {
    text: "It is settled law that secondary electronic evidence may be admitted without a certificate where one cannot be obtained (State of Northbridge v. Vikram Sethi, (2015) 1 DLR 77, ¶22).",
    status: "unsupported",
    cites: [{ raw: "State of Northbridge v. Vikram Sethi, (2015) 1 DLR 77, ¶22", authorityId: "a08", paragraphId: "22", support: "fail" }],
    evidence: [
      { authorityId: "a08", paragraphId: "22", relationship: "supports_overruled", note: "States the proposition, but this authority has been overruled on the point." },
      { authorityId: "a07", paragraphId: "24", relationship: "contradicts", note: "Overrules Vikram Sethi and requires a certificate for secondary electronic evidence." },
    ],
    reason: [
      ["Paragraph 22 of Vikram Sethi states this proposition.", [0]],
      ["Leela Desai, decided in 2021, overrules Vikram Sethi on this point.", [1]],
      ["The cited authority therefore does not support the claim as current law.", [0, 1]],
    ],
    flags: ["overruled", "contradicting_authority"],
    contradictions: [{ authorityId: "a07", paragraphId: "24", summary: "Overrules the cited authority on this point." }],
  },
  {
    text: "Processing of health data requires the individual’s informed consent in all cases (Meridian, ¶44).",
    status: "partially_supported",
    cites: [{ raw: "Meridian, ¶44", authorityId: "a05", paragraphId: "44", shortForm: true, support: "warn" }],
    evidence: [{ authorityId: "a05", paragraphId: "44", relationship: "partially_supports", note: "Requires consent, subject to an exception the claim omits." }],
    reason: [
      ["Paragraph 44 requires informed consent, but allows processing without consent where a law expressly authorises it for a defined public-health purpose.", [0]],
      ["The claim omits this exception.", [0]],
    ],
  },
  {
    text: "Health data is a sensitive category of personal data calling for heightened safeguards (Meridian, ¶41).",
    status: "supported",
    cites: [{ raw: "Meridian, ¶41", authorityId: "a05", paragraphId: "41", shortForm: true, support: "pass" }],
    evidence: [{ authorityId: "a05", paragraphId: "41", relationship: "supports", note: "Describes health data as requiring heightened safeguards." }],
    reason: [["Paragraph 41 describes health data as calling for heightened safeguards, matching the claim.", [0]]],
  },
  {
    text: "Under Section 8 of the Digital Personal Data Protection Act, 2023, a data fiduciary remains responsible for processing carried out on its behalf by a data processor.",
    status: "supported",
    cites: [{ raw: "Section 8, Digital Personal Data Protection Act, 2023", authorityId: "a03", support: "pass" }],
    evidence: [{ authorityId: "a03", paragraphId: "s8", relationship: "supports", note: "Places responsibility on the data fiduciary for processing by a data processor." }],
    reason: [["Section 8 places responsibility on the data fiduciary for processing carried out on its behalf by a data processor, matching the claim.", [0]]],
  },
  {
    text: "In Rohan Mehta v. State of Northbridge, (2020) 4 DLR 512, the court held that call-detail records are admissible without certification.",
    status: "unable_to_verify",
    cites: [
      {
        raw: "Rohan Mehta v. State of Northbridge, (2020) 4 DLR 512",
        resolution: "not_found",
        caseName: "Rohan Mehta v. State of Northbridge",
        yearCited: "2020",
        referenceCited: "(2020) 4 DLR 512",
        support: "fail",
      },
    ],
    evidence: [],
    reason: [["The cited case could not be located in available sources, so its content could not be compared with the claim.", []]],
    flags: ["citation_not_found"],
    unableReason: "citation_not_found",
    whatYouCanDo: "Confirm the citation independently. If the authority exists, check the claim against its text directly.",
  },
  {
    text: "Where retention is found unlawful, the court may direct deletion of the data (Asha Rao, ¶47).",
    status: "supported",
    cites: [{ raw: "Asha Rao, ¶47", authorityId: "a04", paragraphId: "47", shortForm: true, support: "pass" }],
    evidence: [
      {
        authorityId: "a04",
        paragraphId: "47",
        highlight: "the court may direct deletion of the data",
        relationship: "supports",
        note: "States the deletion remedy described in the claim.",
      },
    ],
    reason: [["Paragraph 47 states that the court may direct deletion where retention is unlawful, matching the claim.", [0]]],
  },
  {
    text: "A certificate under Section 63 may be filed at any stage of the trial (Leela Desai v. State of Northbridge, (2020) 6 DLR 301, ¶31).",
    status: "partially_supported",
    cites: [
      {
        raw: "Leela Desai v. State of Northbridge, (2020) 6 DLR 301, ¶31",
        authorityId: "a07",
        paragraphId: "31",
        yearCited: "2020",
        referenceCited: "(2020) 6 DLR 301",
        support: "warn",
      },
    ],
    evidence: [{ authorityId: "a07", paragraphId: "31", relationship: "partially_supports", note: "Permits later production only with permission and without prejudice." }],
    reason: [
      ["Paragraph 31 allows a certificate to be produced later only with the court’s permission and if the delay causes no prejudice.", [0]],
      ["The claim states this as an unconditional right.", [0]],
      ["The citation gives the year as 2020; the source is dated 2021.", []],
    ],
    flags: ["citation_details_mismatch"],
  },
  {
    text: "An employer must communicate its monitoring policy to employees in writing (Kiran Joshi, ¶12).",
    status: "supported",
    cites: [{ raw: "Kiran Joshi, ¶12", authorityId: "a06", paragraphId: "12", shortForm: true, support: "pass" }],
    evidence: [{ authorityId: "a06", paragraphId: "12", relationship: "supports", note: "Requires written communication of the monitoring policy." }],
    reason: [
      ["Paragraph 12 requires an employer to communicate its monitoring policy in writing, matching the claim.", [0]],
      ["The case was later distinguished in Asha Rao ¶52; review whether that treatment affects this proposition.", []],
    ],
    flags: ["distinguished"],
  },
  {
    text: "The legitimate aim of a privacy intrusion must be identified by the State, not supplied by the court (Meridian, ¶33).",
    status: "supported",
    cites: [{ raw: "Meridian, ¶33", authorityId: "a05", paragraphId: "33", shortForm: true, support: "pass" }],
    evidence: [{ authorityId: "a05", paragraphId: "33", relationship: "supports", note: "Places the burden of identifying the aim on the State." }],
    reason: [["Paragraph 33 states that the legitimate aim must be identified by the State, not supplied by the court, matching the claim.", [0]]],
  },
  {
    text: "The Northbridge Data Protection Tribunal, in Order No. 14/2023, held that retention schedules must be published.",
    status: "unable_to_verify",
    cites: [{ raw: "Northbridge Data Protection Tribunal, Order No. 14/2023", resolution: "source_not_available", support: "fail" }],
    evidence: [],
    reason: [["Tribunal orders are not among the sources available to the platform, so the cited order could not be checked.", []]],
    flags: ["source_not_available"],
    unableReason: "source_not_available",
    whatYouCanDo: "Obtain the order and check the claim against its text directly.",
  },
  {
    text: "A Section 63 certificate must be signed by a person in a responsible position in relation to the device or the relevant activities (Leela Desai, ¶29).",
    status: "supported",
    cites: [{ raw: "Leela Desai, ¶29", authorityId: "a07", paragraphId: "29", shortForm: true, support: "pass" }],
    evidence: [{ authorityId: "a07", paragraphId: "29", relationship: "supports", note: "Sets out who must sign the certificate." }],
    reason: [["Paragraph 29 requires the certificate to be signed by a person in a responsible position, matching the claim.", [0]]],
  },
  {
    text: "A procedure depriving a person of liberty must be fair, just and reasonable (Article 21; Meridian, ¶19).",
    status: "supported",
    cites: [
      { raw: "Article 21", authorityId: "a01", referenceCited: "Art. 21", support: "pass" },
      { raw: "Meridian, ¶19", authorityId: "a05", paragraphId: "19", shortForm: true, support: "pass" },
    ],
    evidence: [
      { authorityId: "a01", paragraphId: "art21", relationship: "supports", note: "Requires deprivation of liberty to follow procedure established by law." },
      {
        authorityId: "a05",
        paragraphId: "19",
        highlight: "Any procedure that deprives a person of liberty must be fair, just and reasonable",
        relationship: "supports",
        note: "Holds that such procedure must be fair, just and reasonable.",
      },
    ],
    reason: [
      ["Article 21 requires deprivation of liberty to follow procedure established by law,", [0]],
      ["and Meridian ¶19 holds that such procedure must be fair, just and reasonable.", [1]],
      ["Together they support the claim.", [0, 1]],
    ],
  },
];

const pageTemplate: string[][] = [
  [
    "Writ Petition (Civil) — draft submissions for review. Prepared with AI assistance. Demo document: all parties, courts and reported decisions are fictional.",
    "The petitioner challenges the continued retention of personal data collected by the State’s transport and health departments after the purposes for which it was collected had been served.",
    "These submissions set out the constitutional basis of the challenge, the governing authorities on data retention, and the evidentiary position on electronic records relied upon by the respondent.",
  ],
  [
    "## A. Constitutional framework",
    "{c1} The petitioner’s case rests on the guarantee contained in that provision and on the decisions interpreting it.",
  ],
  [
    "## B. Retention of personal data",
    "{c2} The respondent has offered no statutory basis for retaining the petitioner’s records after the licensing inquiry closed.",
  ],
  [
    "{c3} The respondent may be expected to rely on that decision to justify the monitoring of the petitioner’s phone.",
    "## C. Electronic records",
    "{c4} The respondent’s affidavit annexes call-detail records without explaining how those conditions were met.",
  ],
  [
    "## D. The test for intrusion",
    "{c5} Each element must be established by the respondent.",
    "{c6} No such notice was given to the petitioner at any stage.",
  ],
  [
    "{c7} The petitioner was acquitted in 2021, yet the records remain on the respondent’s database.",
  ],
  [
    "## E. Certification of electronic evidence",
    "{c8} The respondent has not produced any certificate.",
    "{c9} That position cannot assist the respondent.",
  ],
  [
    "## F. Health data",
    "{c10} The petitioner never consented to the transfer of the records.",
    "{c11}",
  ],
  [
    "{c12} The respondent cannot avoid responsibility by pointing to its contractor.",
    "{c13} The respondent may rely on that decision; it should be examined carefully.",
  ],
  [
    "## G. Relief",
    "{c14} The petitioner seeks that relief together with a compliance affidavit.",
  ],
  [
    "{c15} Even so, no certificate has been produced to date.",
    "{c16} No written policy was ever communicated to the petitioner.",
  ],
  [
    "{c17} The respondent’s counter-affidavit identifies no aim at all.",
    "{c18} The respondent has published no retention schedule.",
  ],
  [
    "{c19} The respondent’s records were certified, if at all, by a clerical officer.",
  ],
  [
    "{c20}",
    "For these reasons, the petitioner prays that the respondent be directed to delete the retained records and to file an affidavit of compliance.",
  ],
];

export const writPetitionPages = renderPages(
  pageTemplate,
  specs.map((s) => s.text),
);

export const writPetition = buildClaims(WRIT_REPORT_ID, specs, writPetitionPages);
