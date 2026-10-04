from legal_data.citations import extract_case_name, parse_citations, parse_scr_path


def test_parses_each_reporter_and_normalises_keys():
    text = "See 2023 INSC 1043; [2023] 16 S.C.R. 872; (2022) 5 SCC 123 and AIR 1950 SC 27."
    keys = [c.key for c in parse_citations(text)]
    assert keys == ["INSC:2023:1043", "SCR:2023:16:872", "SCC:2022:5:123", "AIR:1950:SC:27"]


def test_scr_variants_normalise_to_the_same_key():
    variants = ["[2023] 16 S.C.R. 872", "(2023) 16 SCR 872", "[2023] 16 SCR 872", "2023INSC1043"]
    assert {c.key for v in variants for c in parse_citations(v)} == {"SCR:2023:16:872", "INSC:2023:1043"}


def test_display_round_trips():
    (c,) = parse_citations("(2023) 16 SCR 872")
    assert c.display == "[2023] 16 S.C.R. 872"


def test_scr_path_parsing():
    assert parse_scr_path("2023_16_872_887") == (2023, 16, 872, 887)
    assert parse_scr_path("not_a_path") is None


def test_case_name_extraction():
    assert extract_case_name("As held in Asha Rao v. State of Northbridge, (2022) 5 SCC 123") == "Asha Rao v. State of Northbridge"
    assert extract_case_name("No parties here") is None
