"""Indian citation parsing and normalisation.

Recognises the formats lawyers and AI drafts commonly use:

    2023 INSC 1043          neutral citation (Supreme Court)
    [2023] 16 S.C.R. 872    Supreme Court Reports (also "(2023) 16 SCR 872")
    (2022) 5 SCC 123        Supreme Court Cases
    AIR 1950 SC 27          All India Reporter

Each citation is normalised to a key such as ``INSC:2023:1043`` or
``SCR:2023:16:872`` so it can be matched against the citation index.
"""

import re
from dataclasses import dataclass

Reporter = str  # "INSC" | "SCR" | "SCC" | "AIR"

_NEUTRAL = re.compile(r"\b(?P<year>(?:19|20)\d{2})\s*INSC\s*(?P<num>\d{1,5})\b", re.I)
_SCR = re.compile(
    r"[\[(](?P<year>(?:19|20)\d{2})[\])]\s*(?P<vol>\d{1,3})\s*S\.?\s*C\.?\s*R\.?\s*(?P<page>\d{1,5})",
    re.I,
)
_SCC = re.compile(r"\((?P<year>(?:19|20)\d{2})\)\s*(?P<vol>\d{1,3})\s*S\.?\s*C\.?\s*C\.?\s*(?P<page>\d{1,5})", re.I)
_AIR = re.compile(r"\bA\.?\s*I\.?\s*R\.?\s*(?P<year>(?:19|20)\d{2})\s*(?P<court>SC|S\.C\.)\s*(?P<page>\d{1,5})", re.I)


@dataclass(frozen=True)
class ParsedCitation:
    reporter: Reporter
    raw: str
    year: int
    volume: int | None
    page: int
    start: int
    end: int

    @property
    def key(self) -> str:
        if self.reporter == "INSC":
            return f"INSC:{self.year}:{self.page}"
        if self.reporter == "AIR":
            return f"AIR:{self.year}:SC:{self.page}"
        return f"{self.reporter}:{self.year}:{self.volume}:{self.page}"

    @property
    def display(self) -> str:
        if self.reporter == "INSC":
            return f"{self.year} INSC {self.page}"
        if self.reporter == "SCR":
            return f"[{self.year}] {self.volume} S.C.R. {self.page}"
        if self.reporter == "SCC":
            return f"({self.year}) {self.volume} SCC {self.page}"
        return f"AIR {self.year} SC {self.page}"


def parse_citations(text: str) -> list[ParsedCitation]:
    """Find every recognised citation in a block of text, in order of appearance."""
    found: list[ParsedCitation] = []
    for m in _NEUTRAL.finditer(text):
        found.append(ParsedCitation("INSC", m.group(0), int(m["year"]), None, int(m["num"]), m.start(), m.end()))
    for m in _SCR.finditer(text):
        found.append(ParsedCitation("SCR", m.group(0), int(m["year"]), int(m["vol"]), int(m["page"]), m.start(), m.end()))
    for m in _SCC.finditer(text):
        found.append(ParsedCitation("SCC", m.group(0), int(m["year"]), int(m["vol"]), int(m["page"]), m.start(), m.end()))
    for m in _AIR.finditer(text):
        found.append(ParsedCitation("AIR", m.group(0), int(m["year"]), None, int(m["page"]), m.start(), m.end()))
    return sorted(found, key=lambda c: c.start)


def parse_scr_path(path: str) -> tuple[int, int, int, int] | None:
    """Supreme Court dataset paths look like ``2023_16_872_887``: year, volume, first page, last page."""
    parts = path.split("_")
    if len(parts) != 4 or not all(p.isdigit() for p in parts):
        return None
    year, vol, first, last = (int(p) for p in parts)
    return year, vol, first, last


_VERSUS = re.compile(r"\s+(?:v\.?|vs\.?|versus)\s+", re.I)
_NAME_WORD = re.compile(r"^(?:[A-Z][\w.&'’\-]*|of|and|the|&|for|in|de|ors\.?|anr\.?)$")


def extract_case_name(text: str) -> str | None:
    """Best-effort case name, e.g. "Asha Rao v. State of Northbridge" from a sentence citing it.

    Takes the run of name-like words (capitalised words and connectors such as
    "of", "and") on either side of "v." / "vs." / "versus".
    """
    m = _VERSUS.search(text)
    if not m:
        return None
    left_words = text[: m.start()].split()
    left: list[str] = []
    for word in reversed(left_words):
        if not _NAME_WORD.match(word.strip(",;:")):
            break
        left.insert(0, word.strip(",;:"))
    while left and not left[0][0].isupper():  # a name starts with a capital, not a connector
        left.pop(0)
    right: list[str] = []
    for word in re.split(r"\s+", text[m.end():]):
        bare = word.rstrip(",;:")
        if not bare or not _NAME_WORD.match(bare) or bare[0] in "([":
            break
        right.append(bare)
        if word != bare:  # punctuation ends the name
            break
    while right and not right[-1][0].isupper():
        right.pop()
    if not left or not right:
        return None
    return f"{' '.join(left)} v. {' '.join(right)}"
