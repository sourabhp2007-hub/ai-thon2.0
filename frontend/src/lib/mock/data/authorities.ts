import type { Authority } from "@/lib/types/domain";

/**
 * DEMO DATA. Every case, party, court designation and reporter ("DLR",
 * Demo Law Reports) is fictional and set in the fictional jurisdiction
 * "Northbridge". Real Indian provisions appear as labels only: Article 21 is
 * quoted from its text; the others are illustrative summaries, not the
 * official text. No treatment is attributed to any real authority.
 */

const DEMO_JURISDICTION = "Northbridge (demo jurisdiction)";

export const authorities: Authority[] = [
  {
    id: "a01",
    type: "constitutional_provision",
    title: "Constitution of India, Article 21",
    shortTitle: "Article 21",
    court: null,
    decidedOn: null,
    citation: "Art. 21",
    jurisdiction: "India",
    textNature: "official_text",
    isDemo: true,
    sourceUrl: null,
    paragraphs: [
      {
        id: "art21",
        label: "Art. 21",
        text: "No person shall be deprived of his life or personal liberty except according to procedure established by law.",
      },
    ],
    treatments: [],
    treatmentDataAvailable: false,
    interprets: [],
    related: [],
  },
  {
    id: "a02",
    type: "statutory_provision",
    title: "Bharatiya Sakshya Adhiniyam, 2023, Section 63",
    shortTitle: "BSA, s. 63",
    court: null,
    decidedOn: null,
    citation: "s. 63",
    jurisdiction: "India",
    textNature: "illustrative_summary",
    isDemo: true,
    sourceUrl: null,
    paragraphs: [
      {
        id: "s63",
        label: "s. 63",
        text: "Sets out the conditions on which information in an electronic record is admissible as evidence, including the requirement of a certificate.",
      },
    ],
    treatments: [],
    treatmentDataAvailable: false,
    interprets: [],
    related: [],
  },
  {
    id: "a03",
    type: "statutory_provision",
    title: "Digital Personal Data Protection Act, 2023, Section 8",
    shortTitle: "DPDP Act, s. 8",
    court: null,
    decidedOn: null,
    citation: "s. 8",
    jurisdiction: "India",
    textNature: "illustrative_summary",
    isDemo: true,
    sourceUrl: null,
    paragraphs: [
      {
        id: "s8",
        label: "s. 8",
        text: "A data fiduciary is responsible for complying with the Act in respect of processing undertaken by it or on its behalf by a data processor.",
      },
    ],
    treatments: [],
    treatmentDataAvailable: false,
    interprets: [],
    related: [],
  },
  {
    id: "a04",
    type: "case",
    title: "Asha Rao v. State of Northbridge",
    shortTitle: "Asha Rao",
    court: "Supreme Court (Demo)",
    decidedOn: "2022-03-14",
    citation: "(2022) 5 DLR 123",
    jurisdiction: DEMO_JURISDICTION,
    textNature: "judgment_excerpt",
    isDemo: true,
    sourceUrl: null,
    paragraphs: [
      {
        id: "36",
        label: "¶36",
        text: "We respectfully follow the three-part test laid down in Meridian Health Network: any intrusion must have a basis in law, pursue a legitimate aim, and be proportionate to that aim.",
      },
      {
        id: "38",
        label: "¶38",
        text: "The State must inform the individual of the purpose for which personal data is collected at the time it is collected.",
      },
      {
        id: "43",
        label: "¶43",
        text: "Where the purpose for which data was collected has been served, continued retention by the State is ordinarily impermissible in the absence of a statutory mandate. We do not hold that retention is barred in every case; a law that authorises retention for a defined period may satisfy the test of proportionality.",
      },
      {
        id: "47",
        label: "¶47",
        text: "Where retention is found to be unlawful, the court may direct deletion of the data and require the State to file a compliance affidavit.",
      },
      {
        id: "52",
        label: "¶52",
        text: "Kiran Joshi concerned devices owned and issued by the employer. It does not assist the State where the personal devices of private individuals are concerned.",
      },
    ],
    treatments: [],
    treatmentDataAvailable: true,
    interprets: ["a01"],
    related: [
      { authorityId: "a05", note: "Followed at ¶36 (three-part privacy test)" },
      { authorityId: "a06", note: "Distinguished at ¶52" },
      { authorityId: "a01", note: "Interpreted in this authority" },
    ],
  },
  {
    id: "a05",
    type: "case",
    title: "Meridian Health Network v. Northbridge Health Authority",
    shortTitle: "Meridian Health Network",
    court: "Supreme Court (Demo)",
    decidedOn: "2019-08-09",
    citation: "(2019) 3 DLR 410",
    jurisdiction: DEMO_JURISDICTION,
    textNature: "judgment_excerpt",
    isDemo: true,
    sourceUrl: null,
    paragraphs: [
      {
        id: "19",
        label: "¶19",
        text: "Any procedure that deprives a person of liberty must be fair, just and reasonable; a procedure that is arbitrary does not satisfy Article 21.",
      },
      {
        id: "27",
        label: "¶27",
        text: "An intrusion into privacy must satisfy three requirements: legality, a legitimate aim, and proportionality between the aim and the means adopted.",
      },
      {
        id: "33",
        label: "¶33",
        text: "The legitimate aim must be identified by the State. It is not for the court to supply an aim the State has not advanced.",
      },
      {
        id: "41",
        label: "¶41",
        text: "Health data reveals intimate information about a person and calls for heightened safeguards in its collection and use.",
      },
      {
        id: "44",
        label: "¶44",
        text: "Processing of health data requires the informed consent of the individual, save where a law expressly authorises processing for a defined public-health purpose.",
      },
    ],
    treatments: [
      {
        kind: "followed",
        byAuthorityId: "a04",
        paragraphId: "36",
        date: "2022-03-14",
        note: "Three-part privacy test applied.",
      },
    ],
    treatmentDataAvailable: true,
    interprets: ["a01"],
    related: [
      { authorityId: "a04", note: "Follows this authority at ¶36" },
      { authorityId: "a01", note: "Interpreted in this authority" },
    ],
  },
  {
    id: "a06",
    type: "case",
    title: "Kiran Joshi v. Northbridge Transport Corporation",
    shortTitle: "Kiran Joshi",
    court: "High Court of Northbridge (Demo)",
    decidedOn: "2017-02-21",
    citation: "(2017) 2 DLR 88",
    jurisdiction: DEMO_JURISDICTION,
    textNature: "judgment_excerpt",
    isDemo: true,
    sourceUrl: null,
    paragraphs: [
      {
        id: "12",
        label: "¶12",
        text: "An employer that monitors devices issued to employees must communicate its monitoring policy to them in writing.",
      },
      {
        id: "18",
        label: "¶18",
        text: "Monitoring without prior notice to the employee is not permissible, even on devices issued by the employer.",
      },
    ],
    treatments: [
      {
        kind: "distinguished",
        byAuthorityId: "a04",
        paragraphId: "52",
        date: "2022-03-14",
        note: "Employer-issued devices distinguished from personal devices of private individuals.",
      },
    ],
    treatmentDataAvailable: true,
    interprets: [],
    related: [{ authorityId: "a04", note: "Distinguishes this authority at ¶52" }],
  },
  {
    id: "a07",
    type: "case",
    title: "Leela Desai v. State of Northbridge",
    shortTitle: "Leela Desai",
    court: "Supreme Court (Demo)",
    decidedOn: "2021-11-05",
    citation: "(2021) 6 DLR 301",
    jurisdiction: DEMO_JURISDICTION,
    textNature: "judgment_excerpt",
    isDemo: true,
    sourceUrl: null,
    paragraphs: [
      {
        id: "24",
        label: "¶24",
        text: "A certificate is a condition of admissibility where an electronic record is produced as secondary evidence. To the extent Vikram Sethi holds otherwise, it does not lay down the correct law and is overruled.",
      },
      {
        id: "29",
        label: "¶29",
        text: "The certificate must be signed by a person occupying a responsible position in relation to the operation of the device or the management of the relevant activities.",
      },
      {
        id: "31",
        label: "¶31",
        text: "The court may permit a certificate to be produced at a later stage, provided the delay does not cause prejudice to the opposite party.",
      },
    ],
    treatments: [],
    treatmentDataAvailable: true,
    interprets: ["a02"],
    related: [
      { authorityId: "a08", note: "Overrules this authority at ¶24" },
      { authorityId: "a02", note: "Interpreted in this authority" },
    ],
  },
  {
    id: "a08",
    type: "case",
    title: "State of Northbridge v. Vikram Sethi",
    shortTitle: "Vikram Sethi",
    court: "Supreme Court (Demo)",
    decidedOn: "2015-06-12",
    citation: "(2015) 1 DLR 77",
    jurisdiction: DEMO_JURISDICTION,
    textNature: "judgment_excerpt",
    isDemo: true,
    sourceUrl: null,
    paragraphs: [
      {
        id: "22",
        label: "¶22",
        text: "Where the certificate cannot be obtained, secondary electronic evidence may be admitted without it.",
      },
    ],
    treatments: [
      {
        kind: "overruled",
        byAuthorityId: "a07",
        paragraphId: "24",
        date: "2021-11-05",
        note: "On whether a certificate is required for secondary electronic evidence.",
      },
    ],
    treatmentDataAvailable: true,
    interprets: [],
    related: [{ authorityId: "a07", note: "Overruled by this authority at ¶24" }],
  },
];

export const sourcesAsOf = "2026-09-30";
