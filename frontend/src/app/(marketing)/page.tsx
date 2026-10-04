import { ArrowRight, ArrowUp, BookOpen, ChevronDown, FileText, GitBranch, Paperclip, Plus, Quote, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { RevealList } from "@/components/marketing/reveal";
import { Wordmark } from "@/components/navigation/logo";
import { ButtonLink } from "@/components/ui/button";
import { StatusIcon } from "@/components/verification/status";
import { PRODUCT_NAME, RU_STANDARD, TAGLINE } from "@/lib/domain/copy";
import { DEMO_PREVIEW_CLAIM, DEMO_REPORT_ID } from "@/lib/domain/demo";
import { CHECK_RESULT_META, checkLabel } from "@/lib/domain/labels";
import { claimCitations, claimEvidence, claimHref, findAuthority, findParagraph } from "@/lib/domain/report";
import { STATUS_META, STATUS_ORDER } from "@/lib/domain/status";
import { countStatuses } from "@/lib/domain/summary";
import { getReport } from "@/lib/services";
import type { ReportBundle } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

const DEMO_HREF = `/reports/${DEMO_REPORT_ID}`;

const PROBLEMS = [
  { title: "Citations that do not exist", body: "A case name, reference or year may be generated rather than retrieved." },
  { title: "Quotes that are not in the source", body: "Quoted words may be altered, paraphrased or attributed to the wrong paragraph." },
  { title: "Authorities that say less than claimed", body: "A real authority may support only a narrower proposition, or a different one." },
];

const STAGES = [
  { title: "Input document", body: "Upload a PDF or DOCX, or paste AI-generated legal text." },
  { title: "Claim & citation extraction", body: "The document is separated into individual legal claims, and each citation is identified." },
  { title: "Search & retrieval", body: "Cited authorities are located in available sources, together with related authority." },
  { title: "Verification", body: "Each citation is checked for accuracy, and each claim is compared with the text of its authority." },
  { title: "Explainable report", body: "Each result shows the authority, the evidence and the reason for its status." },
];

const CAPABILITIES = [
  { icon: Quote, title: "Claim Verification", body: "Separates a document into individual propositions of law and assesses each one.", answers: "Does the authority support this claim?" },
  { icon: BookOpen, title: "Citation Integrity", body: "Checks that a cited case exists and that its name, court, year, reference and paragraph are correct.", answers: "Is this citation accurate?" },
  { icon: GitBranch, title: "Evidence Traceability", body: "Links every result to the exact paragraph and passage it relies on.", answers: "Where does this result come from?" },
  { icon: Scale, title: "Contradiction Detection", body: "Surfaces authority in available sources that points the other way.", answers: "Is there contrary authority?" },
  { icon: ShieldCheck, title: "Legal Status Awareness", body: "Shows later treatment of a cited case: followed, distinguished, modified, reconsidered or overruled.", answers: "How has this case been treated since?" },
];

const CHAIN = [
  { title: "Claim", body: "What the document asserts." },
  { title: "Authority", body: "What it cites, and whether that citation is accurate." },
  { title: "Evidence", body: "The passage in the source that bears on the claim." },
  { title: "Reason", body: "Why the evidence leads to this status." },
  { title: "Status", body: "One of four defined outcomes." },
];

const LAYERS = [
  { title: "Interface", body: "Review reports, claims and evidence.", tech: "Next.js" },
  { title: "Verification service", body: "Runs the pipeline and assembles reports.", tech: "FastAPI" },
  { title: "Retrieval layer", body: "Hybrid search across available authoritative sources.", tech: "PostgreSQL + pgvector · Neo4j" },
  { title: "Analysis layer", body: "Claim extraction, citation parsing and support analysis.", tech: "NLP / LLM analysis" },
  { title: "Authoritative sources", body: "Constitutional provisions, statutes and case law available to the platform.", tech: "Source corpus" },
];

const DATASETS = [
  { name: "Supreme Court of India", detail: "Judgments 1950–2026", className: "font-serif text-[19px] italic" },
  { name: "India Code", detail: "Central Acts", className: "font-display text-[20px] font-semibold tracking-[-0.02em]" },
  { name: "open-india-law", detail: "Legislation", className: "font-mono text-[16px]" },
  { name: "AILA 2019", detail: "Retrieval benchmark", className: "font-display text-[20px] font-bold tracking-[0.06em] uppercase" },
];

const NAV = [
  ["How it works", "#how-it-works"],
  ["Capabilities", "#capabilities"],
  ["Statuses", "#statuses"],
  ["Responsible use", "#responsible-use"],
] as const;

/* ---------------------------------------------------------------- pieces */

function SectionHead({ id, title, subtitle, action }: { id: string; title: ReactNode; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h2 id={id} className="display text-[34px] text-white md:text-[48px]">
          {title}
        </h2>
        {subtitle && <p className="mt-4 text-[17px] leading-relaxed text-white/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-white">
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function StatusPill({ status, className }: { status: keyof typeof STATUS_META; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-medium whitespace-nowrap", meta.bg, meta.text, meta.border, className)}>
      <StatusIcon status={status} className="size-3.5" />
      {meta.label}
    </span>
  );
}

/** Large product card: a visual on top, then title, description and a link. */
function FeatureCard({ visual, title, body, href, cta, label }: { visual: ReactNode; title: string; body: string; href: string; cta: string; label: string }) {
  return (
    <article className="panel overflow-hidden p-2.5">
      <div className="relative overflow-hidden rounded-[18px] border border-white/5 bg-[#0c0c0c] p-5 md:p-8">
        <p className="mb-4 text-[12px] font-medium text-primary">{label}</p>
        {visual}
      </div>
      <div className="flex flex-col gap-5 px-5 pt-6 pb-5 md:flex-row md:items-end md:justify-between md:px-6">
        <div className="max-w-xl">
          <h3 className="text-[19px] font-medium text-white">{title}</h3>
          <p className="mt-1 text-[17px] leading-relaxed text-white/55">{body}</p>
        </div>
        <MoreLink href={href}>{cta}</MoreLink>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------- visuals (demo data) */

function HeroInput({ bundle }: { bundle: ReportBundle }) {
  const sample = bundle.claims.find((c) => c.index === DEMO_PREVIEW_CLAIM)?.text ?? "";
  const counts = countStatuses(bundle.claims);
  return (
    <div className="panel relative overflow-hidden px-4 pt-16 pb-10 md:px-10 md:pt-24 md:pb-14">
      <div aria-hidden className="glow pointer-events-none absolute inset-0" />
      <div role="img" aria-label="Preview: a legal document submitted for verification, with results by status" className="relative mx-auto max-w-[460px]">
        <div className="flex items-center gap-3" aria-hidden>
          <div className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-[14px] border border-white/10 bg-[#1a1d2e]/80 px-4 text-white/90 backdrop-blur">
            <FileText className="size-4 shrink-0 text-white/60" />
            <span className="truncate text-[15px]">{bundle.document.name}</span>
            <ChevronDown className="ml-auto size-4 shrink-0 text-white/50" />
          </div>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-[#1a1d2e]/80 text-white/70">
            <Plus className="size-5" />
          </span>
        </div>
        <div className="my-4 h-px bg-white/10" aria-hidden />
        <div aria-hidden className="glow-ring rounded-[18px] bg-[#141a3a]/90 p-4 backdrop-blur">
          <p className="line-clamp-3 min-h-[72px] text-[15px] leading-relaxed text-white/45">{sample}</p>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="flex items-center gap-1 text-[14px] text-white/55">
              PDF · DOCX · Text <ChevronDown className="size-3.5" />
            </span>
            <span className="flex gap-1.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-white/70">
                <Paperclip className="size-4" />
              </span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-white text-black">
                <ArrowUp className="size-4" />
              </span>
            </span>
          </div>
        </div>
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {STATUS_ORDER.map((s) => (
            <li key={s} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[12.5px] text-white/80 backdrop-blur">
              <StatusIcon status={s} className={cn("size-3.5", STATUS_META[s].text)} />
              {STATUS_META[s].label}
              <span className="text-white/45 tabular-nums">{counts[s]}</span>
            </li>
          ))}
        </ul>
      </div>
      <span className="absolute right-4 bottom-4 rounded-md border border-accent/30 bg-accent/15 px-2 py-0.5 text-[11.5px] font-medium text-[#c4b5fd]">Demo Data</span>
    </div>
  );
}

function ClaimsVisual({ bundle }: { bundle: ReportBundle }) {
  const claims = bundle.claims.slice(0, 5);
  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-black/60">
      <div className="grid grid-cols-[36px_1fr_auto] gap-3 border-b border-white/8 px-4 py-2.5 text-[12px] text-white/40">
        <span>#</span>
        <span>Claim</span>
        <span>Status</span>
      </div>
      <ul>
        {claims.map((c, i) => (
          <li
            key={c.id}
            className={cn("grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0", i === 1 && "bg-primary/10 ring-1 ring-primary/40 ring-inset")}
          >
            <span className="font-mono text-[12px] text-white/40">{c.index}</span>
            <span className="truncate text-[14px] text-white/85">{c.text}</span>
            <StatusPill status={c.status} className="max-sm:hidden" />
            <StatusIcon status={c.status} className={cn("size-4 sm:hidden", STATUS_META[c.status].text)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CitationVisual({ bundle }: { bundle: ReportBundle }) {
  const citation = bundle.citations.find((c) => c.checks.some((k) => k.result === "warn")) ?? bundle.citations[0];
  if (!citation) return null;
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
      <div className="rounded-xl border border-white/8 bg-black/60 p-4">
        <p className="text-[12px] text-white/40">As cited</p>
        <p className="mt-2 font-mono text-[13px] leading-relaxed text-white/85">{citation.rawText}</p>
      </div>
      <ul className="rounded-xl border border-white/8 bg-black/60 p-2">
        {citation.checks.slice(0, 6).map((check) => {
          const meta = CHECK_RESULT_META[check.result];
          return (
            <li key={check.key} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-[13.5px]">
              <span className="text-white/80">{checkLabel(check)}</span>
              <span className={cn("font-mono text-[12px]", meta.className)}>
                {meta.symbol} <span className="sr-only">{meta.label}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EvidenceVisual({ bundle }: { bundle: ReportBundle }) {
  const claim = bundle.claims.find((c) => c.index === DEMO_PREVIEW_CLAIM);
  const evidence = claim ? claimEvidence(bundle, claim)[0] : undefined;
  const authority = findAuthority(bundle, evidence?.authorityId);
  const paragraph = findParagraph(authority, evidence?.paragraphId);
  if (!evidence || !authority || !paragraph) return null;
  const at = paragraph.text.indexOf(evidence.highlight);
  const before = at >= 0 ? paragraph.text.slice(Math.max(0, at - 160), at) : "";
  const after = at >= 0 ? paragraph.text.slice(at + evidence.highlight.length, at + evidence.highlight.length + 140) : "";
  return (
    <div className="rounded-xl border border-white/8 bg-black/60">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
        <span className="truncate text-[13px] text-white/70">{authority.title}</span>
        <span className="shrink-0 font-mono text-[12px] text-white/45">{paragraph.label}</span>
      </div>
      <p className="border-l-2 border-primary px-5 py-5 font-serif text-[16px] leading-[1.8] text-white/60">
        {before && "…"}
        {before}
        <mark className="rounded-sm bg-highlight px-0.5 text-highlight-text">{evidence.highlight}</mark>
        {after}
        {after && "…"}
      </p>
    </div>
  );
}

/** Right-hand panel: one claim worked through the chain, styled as a running log. */
function ChainPanel({ bundle }: { bundle: ReportBundle }) {
  const claim = bundle.claims.find((c) => c.index === DEMO_PREVIEW_CLAIM);
  if (!claim) return null;
  const citation = claimCitations(bundle, claim)[0];
  const authority = findAuthority(bundle, citation?.authorityId);
  const paragraph = findParagraph(authority, citation?.paragraphId);
  const evidence = claimEvidence(bundle, claim)[0];
  return (
    <aside aria-label={`Worked example: claim ${claim.index}`} className="panel flex flex-col gap-3 p-2.5 lg:sticky lg:top-24">
      <div className="rounded-[16px] border border-white/8 bg-white/[0.04] p-3.5">
        <p className="mb-1.5 flex items-center gap-2 text-[12px]">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary">Claim {claim.index}</span>
          <span className="rounded border border-accent/30 bg-accent/15 px-1.5 py-0.5 font-medium text-[#c4b5fd]">Demo Data</span>
        </p>
        <p className="text-[14px] leading-snug font-medium text-white">{claim.text}</p>
      </div>
      <div className="space-y-3 px-1.5 text-[13.5px] leading-relaxed">
        <p className="text-white/40">Checking against available sources…</p>
        <div>
          <p className="text-[11.5px] tracking-[0.08em] text-white/40 uppercase">Authority</p>
          <p className="mt-1 font-mono text-[12.5px] text-white/80">
            {authority?.shortTitle ?? authority?.title} · {authority?.citation} · {paragraph?.label}
          </p>
        </div>
        {evidence && (
          <div>
            <p className="text-[11.5px] tracking-[0.08em] text-white/40 uppercase">Evidence</p>
            <p className="mt-1 font-serif text-[14.5px] text-highlight-text">“…{evidence.highlight}”</p>
          </div>
        )}
        <div>
          <p className="text-[11.5px] tracking-[0.08em] text-white/40 uppercase">Reason</p>
          <p className="mt-1 text-white/75">{claim.reason[claim.reason.length - 1]?.text}</p>
        </div>
      </div>
      <div className="rounded-[16px] border border-white/8 bg-white/[0.04] p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-white">Status</p>
          <Link href={claimHref(DEMO_REPORT_ID, claim)} className="rounded-md bg-white/10 px-2 py-0.5 text-[12px] text-white/70 hover:bg-white/15 hover:text-white">
            Open
          </Link>
        </div>
        <div className="mt-2.5">
          <StatusPill status={claim.status} />
        </div>
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------------- page */

export default async function LandingPage() {
  const bundle = await getReport(DEMO_REPORT_ID, { includeDemo: true });
  const small = CAPABILITIES.slice(3);

  return (
    <div className="min-h-dvh bg-black text-white">
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-8 px-4 md:px-6">
          <Link href="/" aria-label="AI Legal Integrity — Home">
            <Wordmark />
          </Link>
          <nav aria-label="Primary" className="hidden flex-1 md:block">
            <ul className="flex gap-6 text-[15px] text-white/75">
              {NAV.map(([label, href]) => (
                <li key={href}>
                  <a href={href} className="transition-colors hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <Link href={DEMO_HREF} className="hidden text-[15px] text-white/60 transition-colors hover:text-white sm:inline">
              Explore Demo
            </Link>
            <ButtonLink href="/verify/new" size="sm">
              Verify a Document
            </ButtonLink>
          </div>
        </div>
      </header>

      <main>
        {/* S1 — Hero */}
        <section className="mx-auto max-w-[1240px] px-4 pt-16 md:px-6 md:pt-28" aria-labelledby="hero-title">
          <h1 id="hero-title" className="display max-w-[920px] text-[38px] md:text-[56px]">
            {PRODUCT_NAME}
            <span className="block text-white/45">{TAGLINE}</span>
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/verify/new">Verify a Document</ButtonLink>
            <ButtonLink href={DEMO_HREF} variant="inverse">
              Explore Demo
            </ButtonLink>
            <Link href="#how-it-works" className="group ml-auto hidden items-center gap-1.5 text-[15px] md:inline-flex">
              <span className="font-medium text-white">Pipeline:</span>
              <span className="text-white/55 group-hover:text-white">How it works</span>
              <ArrowRight className="size-4 text-white/55" aria-hidden />
            </Link>
          </div>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/50">
            Check each legal claim and citation in a document against available authoritative sources. Every result shows the authority, the evidence and the reason behind it.
          </p>
          <div className="mt-12">{bundle && <HeroInput bundle={bundle} />}</div>
        </section>

        {/* Data sources */}
        <section className="mx-auto max-w-[1240px] px-4 py-20 md:px-6 md:py-28" aria-labelledby="data-title">
          <h2 id="data-title" className="mb-10 text-center text-[14px] text-white/45">
            Built on open Indian legal data
          </h2>
          <ul className="mx-auto grid max-w-4xl grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {DATASETS.map((d) => (
              <li key={d.name} className="flex flex-col items-center text-center">
                <span className={cn("text-white", d.className)}>{d.name}</span>
                <span className="mt-1.5 text-[12px] text-white/40">{d.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* S2 — Problem */}
        <section className="mx-auto max-w-[1240px] px-4 pb-24 md:px-6 md:pb-32" aria-labelledby="problem-title">
          <SectionHead
            id="problem-title"
            title={
              <>
                AI can draft legal text.
                <br />
                <span className="text-white/45">It cannot vouch for it.</span>
              </>
            }
            subtitle="AI-assisted research saves time, but its output must be checked before it is relied on."
          />
          <ul className="grid gap-3 md:grid-cols-3">
            {PROBLEMS.map((p, i) => (
              <li key={p.title} className="panel p-6 md:p-7">
                <span className="font-mono text-[12px] text-white/35">0{i + 1}</span>
                <h3 className="mt-8 text-[19px] font-medium tracking-[-0.01em]">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/55">{p.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-2xl text-[15px] text-white/60">Checking each of these by hand is slow. The platform performs the first pass and shows its evidence.</p>
        </section>

        {/* S4 — Capabilities */}
        <section id="capabilities" className="mx-auto max-w-[1240px] scroll-mt-16 px-4 pb-24 md:px-6 md:pb-32" aria-labelledby="cap-title">
          <SectionHead
            id="cap-title"
            title={
              <>
                Verification that works
                <br />
                alongside you, not instead of you
              </>
            }
            subtitle="Verification happens claim by claim, not as a single score."
            action={
              <ButtonLink href={DEMO_HREF} variant="inverse" size="sm" className="self-start md:self-auto">
                Explore Demo
              </ButtonLink>
            }
          />
          {bundle && (
            <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <FeatureCard
                  label="Claims"
                  visual={<ClaimsVisual bundle={bundle} />}
                  title={CAPABILITIES[0].title}
                  body={`${CAPABILITIES[0].body} ${CAPABILITIES[0].answers}`}
                  href={DEMO_HREF}
                  cta="See the claims"
                />
                <FeatureCard
                  label="Citation Integrity"
                  visual={<CitationVisual bundle={bundle} />}
                  title={CAPABILITIES[1].title}
                  body={`${CAPABILITIES[1].body} ${CAPABILITIES[1].answers}`}
                  href={`${DEMO_HREF}/citations`}
                  cta="See the citations"
                />
                <FeatureCard
                  label="Source"
                  visual={<EvidenceVisual bundle={bundle} />}
                  title={CAPABILITIES[2].title}
                  body={`${CAPABILITIES[2].body} ${CAPABILITIES[2].answers}`}
                  href={`${DEMO_HREF}/graph`}
                  cta="See the evidence graph"
                />
                <ul className="grid gap-4 md:grid-cols-2">
                  {small.map((c) => (
                    <li key={c.title} className="panel flex flex-col p-6 md:p-7">
                      <c.icon className="size-5 text-white/70" aria-hidden />
                      <h3 className="mt-10 text-[19px] font-medium">{c.title}</h3>
                      <p className="mt-1 flex-1 text-[15px] leading-relaxed text-white/55">{c.body}</p>
                      <p className="mt-5 text-[14px] text-white/80">
                        <span className="text-white/40">Answers: </span>
                        {c.answers}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <ChainPanel bundle={bundle} />
            </div>
          )}
        </section>

        {/* S3 — How it works */}
        <section id="how-it-works" className="mx-auto max-w-[1240px] scroll-mt-16 px-4 pb-24 md:px-6 md:pb-32" aria-labelledby="how-title">
          <SectionHead id="how-title" title="How verification works" subtitle="Every document passes through the same traceable pipeline." />
          <RevealList className="panel grid gap-px overflow-hidden p-0 md:grid-cols-5">
            {STAGES.map((s, i) => (
              <div key={s.title} className="relative h-full border-white/8 p-6 max-md:border-b md:border-r md:last:border-r-0">
                <span className="flex size-8 items-center justify-center rounded-full border border-white/15 font-mono text-[12px] text-white/70">{i + 1}</span>
                <h3 className="mt-8 text-[16px] font-medium">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/50">{s.body}</p>
              </div>
            ))}
          </RevealList>
        </section>

        {/* S5 — Verification workflow */}
        <section className="mx-auto max-w-[1240px] px-4 pb-24 md:px-6 md:pb-32" aria-labelledby="chain-title">
          <SectionHead
            id="chain-title"
            title={
              <>
                Every result follows
                <br />
                <span className="text-white/45">the same chain.</span>
              </>
            }
            subtitle="Claim, authority, evidence, reason, status. In that order, every time."
          />
          <RevealList className="grid gap-3 md:grid-cols-5">
            {CHAIN.map((c, i) => (
              <div key={c.title} className="panel h-full p-6">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-primary">0{i + 1}</span>
                  {i < CHAIN.length - 1 && <span className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" aria-hidden />}
                </div>
                <h3 className="display mt-8 text-[24px]">{c.title}</h3>
                <p className="mt-2 text-[14px] text-white/55">{c.body}</p>
              </div>
            ))}
          </RevealList>
        </section>

        {/* S6 — Evidence & trust */}
        <section id="statuses" className="mx-auto max-w-[1240px] scroll-mt-16 px-4 pb-24 md:px-6 md:pb-32" aria-labelledby="status-title">
          <SectionHead id="status-title" title="Four statuses. No single score." subtitle="Results describe what the available evidence shows, not whether an argument will succeed." />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STATUS_ORDER.map((s) => (
              <li key={s} className="panel relative overflow-hidden p-6">
                <span aria-hidden className={cn("absolute inset-x-0 top-0 h-px opacity-70", STATUS_META[s].fill)} />
                <span className={cn("inline-flex items-center gap-2 text-[16px] font-medium", STATUS_META[s].text)}>
                  <StatusIcon status={s} />
                  {STATUS_META[s].label}
                </span>
                <p className="mt-3 text-[14px] leading-relaxed text-white/55">{STATUS_META[s].definition}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="panel p-6 md:p-7">
              <h3 className="text-[19px] font-medium">Verification Coverage</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/55">
                The share of claims that could be assessed against available sources. It measures how much could be checked, not how much is correct.
              </p>
            </div>
            <ul className="panel space-y-3 p-6 text-[15px] text-white/70 md:p-7">
              {[
                "Source text is always shown separately from system-generated reasoning.",
                "Every result links to its source paragraph.",
                "When evidence is insufficient, the result says so.",
                "Later treatment of cases is shown when it is available, never assumed.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* S7 — Architecture */}
        <section className="mx-auto max-w-[1240px] px-4 pb-24 md:px-6 md:pb-32" aria-labelledby="arch-title">
          <SectionHead id="arch-title" title="How the platform is built" />
          <ol className="panel divide-y divide-white/8 p-0">
            {LAYERS.map((l, i) => (
              <li key={l.title} className="grid gap-2 px-6 py-5 md:grid-cols-[48px_1fr_1.4fr_auto] md:items-center md:gap-6">
                <span className="font-mono text-[12px] text-white/35">0{i + 1}</span>
                <h3 className="text-[16px] font-medium">{l.title}</h3>
                <p className="text-[14px] text-white/55">{l.body}</p>
                <p className="w-fit rounded-md bg-white/8 px-2 py-1 font-mono text-[12px] text-white/70">{l.tech}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* S8 — CTA band */}
        <section className="mx-auto max-w-[1240px] px-4 pb-24 md:px-6 md:pb-32" aria-labelledby="cta-title">
          <div className="panel relative overflow-hidden px-6 py-20 text-center md:py-28">
            <div aria-hidden className="glow pointer-events-none absolute inset-0 opacity-70" />
            <h2 id="cta-title" className="display relative mx-auto max-w-3xl text-[34px] md:text-[56px]">
              Check the authorities before you rely on them.
            </h2>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/verify/new">Verify a Document</ButtonLink>
              <ButtonLink href={DEMO_HREF} variant="inverse">
                Explore Demo
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* S9 — Responsible use */}
        <section id="responsible-use" className="mx-auto max-w-[1240px] scroll-mt-16 px-4 pb-20 md:px-6" aria-labelledby="ru-title">
          <div className="grid gap-4 border-t border-white/10 pt-10 md:grid-cols-[1fr_2fr]">
            <h2 id="ru-title" className="text-[19px] font-medium">
              Responsible use
            </h2>
            <p className="max-w-2xl text-[15px] leading-relaxed text-white/60">{RU_STANDARD}</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 text-[14px] text-white/45 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <Wordmark collapsed />
            <p>{PRODUCT_NAME} · Prototype built for HackMatrix 5.0 by Tech Blasters</p>
          </div>
          <ul className="flex flex-wrap gap-5">
            <li><a href="#how-it-works" className="hover:text-white">How it works</a></li>
            <li><a href="#capabilities" className="hover:text-white">Capabilities</a></li>
            <li><a href="#responsible-use" className="hover:text-white">Responsible use</a></li>
            <li><Link href={DEMO_HREF} className="hover:text-white">Explore Demo</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
