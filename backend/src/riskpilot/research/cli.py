"""Reproducible, explicit catalogue and index maintenance."""
from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path

from .catalog import load_catalog
from .provider import embedding_provider
from .retrieval import build_index


def atomic_write(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         delete=False) as file:
            name = file.name
            file.write(content)
        os.replace(name, path)
    finally:
        if name and os.path.exists(name):
            os.unlink(name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["validate", "export", "index", "evaluate"])
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--with-embeddings", action="store_true",
                        help="Explicitly allow a paid provider call to build an index")
    args = parser.parse_args()
    catalog = load_catalog()
    if args.command == "validate":
        print(json.dumps({"corpusVersion": catalog.version,
                          "notes": sum(len(c.evidence) for c in catalog.companies)}))
        return
    if args.command == "evaluate":
        from .evaluation import evaluate
        content = json.dumps(evaluate(catalog), indent=2, ensure_ascii=False) + "\n"
    elif args.command == "index":
        model = os.getenv("RESEARCH_EMBEDDING_MODEL", "").strip()
        key = os.getenv("OPENAI_API_KEY", "").strip()
        if not args.with_embeddings or not model or not key:
            parser.error("index requires --with-embeddings, OPENAI_API_KEY and RESEARCH_EMBEDDING_MODEL")
        content = build_index(catalog, model, embedding_provider(key, model)).model_dump_json(indent=2) + "\n"
    else:
        content = json.dumps(catalog.snapshot(), indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if not args.output or args.output.read_text() != content:
            parser.error("generated output differs; regenerate and review it")
    elif args.output:
        atomic_write(args.output, content)
    else:
        print(content, end="")


if __name__ == "__main__":
    main()
