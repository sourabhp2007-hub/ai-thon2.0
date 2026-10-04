"""Dense embeddings for paragraphs (pgvector, 384 dimensions).

Uses fastembed (ONNX, CPU) with BAAI/bge-small-en-v1.5 by default, so no GPU
or PyTorch is required. The model is downloaded on first use.
"""

from functools import lru_cache

import numpy as np

from .config import get_settings
from .db import connection

DIM = 384


@lru_cache(maxsize=1)
def _model():
    from fastembed import TextEmbedding

    return TextEmbedding(model_name=get_settings().embed_model)


def embed_texts(texts: list[str]) -> list[np.ndarray]:
    return [np.asarray(v, dtype=np.float32) for v in _model().embed(texts)]


def embed_query(text: str) -> np.ndarray:
    # bge models expect this instruction prefix on queries (not on passages).
    return np.asarray(next(iter(_model().query_embed([text]))), dtype=np.float32)


def embed_missing(batch: int = 256, limit: int | None = None, dataset: str | None = None, kind: str | None = None, log=print) -> int:
    """Embed paragraphs that have no vector yet, optionally for one dataset and/or authority kind."""
    done = 0
    with connection() as conn:
        while limit is None or done < limit:
            size = batch if limit is None else min(batch, limit - done)
            rows = conn.execute(
                """SELECT p.id, p.text FROM paragraphs p JOIN authorities a ON a.id = p.authority_id
                   WHERE p.embedding IS NULL AND (%(ds)s::text IS NULL OR a.dataset_id = %(ds)s)
                     AND (%(kind)s::text IS NULL OR a.kind = %(kind)s)
                   ORDER BY p.id LIMIT %(n)s""",
                {"ds": dataset, "kind": kind, "n": size},
            ).fetchall()
            if not rows:
                break
            # ~250 tokens per passage keeps CPU embedding fast; retrieval quality holds at this length.
            vectors = embed_texts([r["text"][:1000] for r in rows])
            with conn.cursor() as cur:
                cur.executemany(
                    "UPDATE paragraphs SET embedding = %s WHERE id = %s",
                    [(v, r["id"]) for v, r in zip(vectors, rows)],
                )
            conn.commit()
            done += len(rows)
            if done % (batch * 20) == 0:
                log(f"  {done} paragraphs embedded")
    return done
