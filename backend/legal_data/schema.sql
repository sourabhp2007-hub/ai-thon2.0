-- AI Legal Integrity — data layer (PostgreSQL 16 + pgvector).
-- Idempotent: safe to run on every start.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- One row per external dataset, with provenance and licence.
CREATE TABLE IF NOT EXISTS datasets (
    id           text PRIMARY KEY,
    name         text NOT NULL,
    source_url   text NOT NULL,
    license      text NOT NULL,
    gated        boolean NOT NULL DEFAULT false,
    status       text NOT NULL DEFAULT 'not_loaded',   -- not_loaded | loading | loaded | partial | failed
    detail       text,
    loaded_at    timestamptz
);

-- Authorities: judgments, statutes and provisions from every dataset.
CREATE TABLE IF NOT EXISTS authorities (
    id                bigserial PRIMARY KEY,
    dataset_id        text NOT NULL REFERENCES datasets(id),
    source_ref        text NOT NULL,              -- the dataset's own identifier
    kind              text NOT NULL,              -- case | statute | provision
    title             text NOT NULL,
    court             text,
    jurisdiction      text,
    decided_on        date,
    year              int,
    neutral_citation  text,                       -- e.g. 2023 INSC 1043
    reporter_citation text,                       -- e.g. [2023] 16 S.C.R. 872
    scr_volume        int,
    scr_page_from     int,
    scr_page_to       int,
    case_number       text,
    cnr               text,
    judges            text,
    petitioner        text,
    respondent        text,
    disposal          text,
    text_available    boolean NOT NULL DEFAULT false,
    meta              jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (dataset_id, source_ref)
);
CREATE INDEX IF NOT EXISTS authorities_title_trgm ON authorities USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS authorities_year ON authorities (year);
CREATE INDEX IF NOT EXISTS authorities_scr ON authorities (year, scr_volume, scr_page_from);

-- Paragraph-level text: the evidence unit shown in the UI (¶N).
CREATE TABLE IF NOT EXISTS paragraphs (
    id            bigserial PRIMARY KEY,
    authority_id  bigint NOT NULL REFERENCES authorities(id) ON DELETE CASCADE,
    ordinal       int NOT NULL,
    label         text NOT NULL,                 -- "¶43", "s. 63", "Chunk 7"
    text          text NOT NULL,
    tsv           tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
    embedding     vector(384),
    UNIQUE (authority_id, ordinal)
);
CREATE INDEX IF NOT EXISTS paragraphs_tsv ON paragraphs USING gin (tsv);
CREATE INDEX IF NOT EXISTS paragraphs_embedding ON paragraphs USING hnsw (embedding vector_cosine_ops);

-- Normalised citation keys → authority, for citation existence checks.
CREATE TABLE IF NOT EXISTS citation_index (
    key           text NOT NULL,                 -- e.g. INSC:2023:1043, SCR:2023:16:872
    authority_id  bigint NOT NULL REFERENCES authorities(id) ON DELETE CASCADE,
    raw           text NOT NULL,
    PRIMARY KEY (key, authority_id)
);

-- Retrieval benchmarks (AILA 2019, IL-PCSR): queries and relevance judgments.
CREATE TABLE IF NOT EXISTS eval_queries (
    dataset_id  text NOT NULL REFERENCES datasets(id),
    query_id    text NOT NULL,
    split       text NOT NULL DEFAULT 'test',
    text        text NOT NULL,
    PRIMARY KEY (dataset_id, query_id)
);
CREATE TABLE IF NOT EXISTS eval_qrels (
    dataset_id    text NOT NULL REFERENCES datasets(id),
    query_id      text NOT NULL,
    task          text NOT NULL,                 -- precedent | statute
    candidate_ref text NOT NULL,                 -- authorities.source_ref within the same dataset
    relevance     int NOT NULL,
    PRIMARY KEY (dataset_id, query_id, task, candidate_ref)
);
