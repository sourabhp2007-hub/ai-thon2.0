"""Citation existence and accuracy checks against the loaded sources.

Results use the same check vocabulary as the frontend (pass / warn / fail /
not_checked / not_applicable) so they can populate the Citation Integrity
checklist directly.

Coverage: neutral citations (INSC) and Supreme Court Reports (SCR) are checked
against the Supreme Court dataset. SCC and AIR are recognised but not in an
open dataset, so they return ``not_checked`` rather than a false "not found".
"""

from .citations import ParsedCitation, extract_case_name, parse_citations
from .db import connection

COVERED = {"INSC", "SCR"}
NAME_MATCH = 0.45  # pg_trgm similarity at which a case name counts as matching


def _authority(conn, authority_id: int) -> dict:
    return conn.execute(
        """SELECT id, dataset_id, title, court, year, decided_on, neutral_citation, reporter_citation,
                  scr_volume, scr_page_from, scr_page_to, text_available
           FROM authorities WHERE id = %s""",
        (authority_id,),
    ).fetchone()


def _find(conn, c: ParsedCitation) -> tuple[list[dict], str | None]:
    """Exact match, else an SCR pinpoint inside a judgment's page range."""
    rows = conn.execute("SELECT authority_id FROM citation_index WHERE key = %s", (c.key,)).fetchall()
    if rows:
        return [_authority(conn, r["authority_id"]) for r in rows], None
    if c.reporter == "SCR":
        rows = conn.execute(
            """SELECT id FROM authorities WHERE year = %s AND scr_volume = %s
                   AND %s BETWEEN scr_page_from AND scr_page_to""",
            (c.year, c.volume, c.page),
        ).fetchall()
        if rows:
            return [_authority(conn, r["id"]) for r in rows], f"Page {c.page} falls within the judgment (pinpoint)."
    return [], None


def _near_miss(conn, c: ParsedCitation) -> list[dict]:
    """Same reference in a different year: the classic mis-typed citation."""
    if c.reporter == "SCR":
        rows = conn.execute(
            "SELECT id FROM authorities WHERE scr_volume = %s AND scr_page_from = %s AND year <> %s LIMIT 3",
            (c.volume, c.page, c.year),
        ).fetchall()
    elif c.reporter == "INSC":
        rows = conn.execute(
            "SELECT authority_id AS id FROM citation_index WHERE key LIKE %s AND key <> %s LIMIT 3",
            (f"INSC:%:{c.page}", c.key),
        ).fetchall()
    else:
        rows = []
    return [_authority(conn, r["id"]) for r in rows]


def _name_check(conn, name: str | None, authority: dict) -> dict:
    if not name:
        return {"key": "case_name", "result": "not_applicable", "label": "No case name given"}
    sim = conn.execute("SELECT similarity(lower(%s), lower(%s)) AS s", (name, authority["title"])).fetchone()["s"]
    result = "pass" if sim >= NAME_MATCH else "warn" if sim >= 0.2 else "fail"
    label = {"pass": "Case name matches", "warn": "Case name differs slightly", "fail": "Case name does not match"}[result]
    return {"key": "case_name", "result": result, "label": label, "asCited": name, "inSource": authority["title"], "similarity": round(sim, 2)}


def check_citation(c: ParsedCitation, case_name: str | None) -> dict:
    out: dict = {"citation": c.display, "raw": c.raw, "reporter": c.reporter, "key": c.key}
    if c.reporter not in COVERED:
        out.update(
            resolution="not_checked",
            checks=[{"key": "existence", "result": "not_checked", "label": "Not checked",
                     "note": f"{c.reporter} citations are not in an open dataset available to the platform."}],
            matches=[],
        )
        return out
    with connection() as conn:
        matches, note = _find(conn, c)
        if not matches:
            near = _near_miss(conn, c)
            checks = [{"key": "existence", "result": "fail", "label": "Case not found",
                       "note": "No judgment with this citation was found in available sources."}]
            if near:
                checks.append({"key": "year", "result": "warn", "label": "Year mismatch", "asCited": str(c.year),
                               "inSource": ", ".join(str(n["year"]) for n in near),
                               "note": "The same reference exists under a different year."})
            out.update(resolution="not_found", checks=checks, matches=[], near_matches=near)
            return out
        best = matches[0]
        checks = [
            {"key": "existence", "result": "pass", "label": "Case found", "inSource": best["title"]},
            _name_check(conn, case_name, best),
            {"key": "court", "result": "pass", "label": "Correct court", "inSource": best["court"]},
            {"key": "year", "result": "pass" if best["year"] == c.year else "warn",
             "label": "Correct year" if best["year"] == c.year else "Year mismatch",
             "asCited": str(c.year), "inSource": str(best["year"])},
            {"key": "reference", "result": "pass", "label": "Reference matches", "asCited": c.display,
             "inSource": best["reporter_citation"] if c.reporter == "SCR" else best["neutral_citation"], "note": note},
        ]
        out.update(resolution="located", checks=checks, matches=matches)
        return out


def check_text(text: str, case_name: str | None = None) -> list[dict]:
    """Find and check every citation in a passage (e.g. a claim)."""
    name = case_name or extract_case_name(text)
    return [check_citation(c, name) for c in parse_citations(text)]
