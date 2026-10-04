from legal_data.text import split_paragraphs


def test_numbered_paragraphs_are_labelled():
    text = "JUDGMENT\n1. The appellant was appointed.\n2. The Bank resisted.\n3. We allow the appeal.\n"
    labels = [label for label, _ in split_paragraphs(text)]
    assert labels[-3:] == ["¶1", "¶2", "¶3"]


def test_unnumbered_text_falls_back_to_chunks():
    text = " ".join(["This is a sentence."] * 400)
    parts = split_paragraphs(text)
    assert all(label.startswith("Chunk") for label, _ in parts)
    assert len(parts) > 1


def test_paragraph_numbers_must_increase():
    text = "1. First point.\n2. Second point.\n7. Stray number.\n3. Third point.\n"
    labels = [label for label, _ in split_paragraphs(text)]
    assert labels == ["¶1", "¶2", "¶3"]
