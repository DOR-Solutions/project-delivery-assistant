"""Watched drop-zone auto-ingest.

Scans a folder (sub-folders map to projects), detects new/changed files by
content hash, parses + extracts insight, and snapshots each affected project's
KPIs so reports show change over time. Runs on a schedule and on demand.
"""
from __future__ import annotations
import os
import glob
import uuid
import asyncio
import hashlib
from datetime import datetime

from .database import SessionLocal
from . import models, portfolio, engine, ai
from .parsing import parse_file

SUPPORTED = ("pdf", "docx", "doc", "xlsx", "xls", "xlsm", "pptx", "ppt", "csv", "tsv", "txt")


def watch_dir() -> str:
    return os.path.abspath(os.getenv("MAXAI_WATCH_DIR", "dropzone"))


def interval_minutes() -> int:
    return int(os.getenv("MAXAI_SCAN_MINUTES", "60"))


def auto_enabled() -> bool:
    return os.getenv("MAXAI_AUTOINGEST", "1") not in ("0", "false", "False")


def ensure_dirs() -> None:
    """Create the drop-zone with a sub-folder per project terminal."""
    root = watch_dir()
    os.makedirs(root, exist_ok=True)
    for meta in portfolio.PROJECTS_META.values():
        os.makedirs(os.path.join(root, meta["terminal"]), exist_ok=True)
    readme = os.path.join(root, "README.txt")
    if not os.path.exists(readme):
        with open(readme, "w") as f:
            f.write("Drop project documents into the matching terminal sub-folder "
                    "(T1–T5). MAX auto-ingests new/changed files and refreshes reports.\n")


def project_for(rel_path: str) -> str:
    """Map the first path segment (folder) to a project id."""
    seg = rel_path.replace("\\", "/").split("/")[0].lower()
    for pid, meta in portfolio.PROJECTS_META.items():
        if seg == pid or seg == meta["terminal"].lower() or (meta["terminal"].lower() and meta["terminal"].lower() in seg):
            return pid
    return "t5-baggage-programme"


def _extract_sync(name: str, text: str) -> dict:
    """Run the (async) insight extractor from sync code safely."""
    try:
        return asyncio.run(ai.extract_insights(name, text))
    except RuntimeError:
        return ai.heuristic_extract(name, text)


def _snapshot(db, pid: str) -> None:
    ops = portfolio.get_ops(pid)
    if not ops:
        return
    comp = engine.compute_ops(ops)
    meta = ops["meta"]
    db.add(models.Report(project_id=pid, data={
        "completion": meta.get("completion", 0),
        "open_high": comp["open_high"], "critical": comp["critical"],
        "utilisation": comp["util_pct"],
        "docs": db.query(models.Document).filter(models.Document.project_id == pid).count(),
    }))


def scan(db=None) -> dict:
    own = db is None
    db = db or SessionLocal()
    root = watch_dir()
    ensure_dirs()
    result = {"scanned": 0, "ingested": 0, "updated": 0, "skipped": 0, "errors": [], "by_project": {}}
    changed = set()
    try:
        for path in sorted(glob.glob(os.path.join(root, "**", "*"), recursive=True)):
            if os.path.isdir(path):
                continue
            ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
            if ext not in SUPPORTED or os.path.basename(path).lower() == "readme.txt":
                continue
            result["scanned"] += 1
            rel = os.path.relpath(path, root)
            try:
                data = open(path, "rb").read()
            except Exception as e:
                result["errors"].append(f"{rel}: {e}"); continue
            sha = hashlib.sha1(data).hexdigest()
            man = db.query(models.IngestManifest).filter(models.IngestManifest.path == rel).first()
            if man and man.sha1 == sha:
                result["skipped"] += 1
                continue
            pid = project_for(rel)
            try:
                text, kind = parse_file(os.path.basename(path), data)
                ins = _extract_sync(os.path.basename(path), text)
            except Exception as e:
                result["errors"].append(f"{rel}: {e}"); continue
            if man and man.document_id:
                doc = db.query(models.Document).filter(models.Document.id == man.document_id).first()
            else:
                doc = None
            if doc:
                doc.kind = kind; doc.text = text[:60000]; doc.summary = ins.get("summary", "")
                doc.topics = ins.get("topics", []); doc.insights = ins.get("insights", [])
                result["updated"] += 1
            else:
                doc = models.Document(id=uuid.uuid4().hex[:12], project_id=pid,
                                      name=os.path.basename(path), kind=kind, text=text[:60000],
                                      summary=ins.get("summary", ""), topics=ins.get("topics", []),
                                      insights=ins.get("insights", []), status="done")
                db.add(doc); db.flush()
                result["ingested"] += 1
            if man:
                man.sha1 = sha; man.ingested_at = datetime.utcnow(); man.project_id = pid; man.document_id = doc.id
            else:
                db.add(models.IngestManifest(path=rel, sha1=sha, project_id=pid, document_id=doc.id))
            changed.add(pid)
            result["by_project"][pid] = result["by_project"].get(pid, 0) + 1
        for pid in changed:
            _snapshot(db, pid)
        db.commit()
    finally:
        if own:
            db.close()
    result["last_scan"] = datetime.utcnow().isoformat()
    return result


def status(db) -> dict:
    rows = db.query(models.IngestManifest).all()
    last = max((r.ingested_at for r in rows), default=None)
    by = {}
    for r in rows:
        by[r.project_id] = by.get(r.project_id, 0) + 1
    return {
        "watch_dir": watch_dir(), "exists": os.path.isdir(watch_dir()),
        "files_tracked": len(rows), "by_project": by,
        "last_scan": last.isoformat() if last else None,
        "auto_enabled": auto_enabled(), "interval_minutes": interval_minutes(),
    }
