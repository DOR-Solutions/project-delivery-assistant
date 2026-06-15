"""Server-side file parsing: PDF, XLSX, DOCX, CSV/TXT -> plain text."""
import io
from typing import Tuple

def parse_pdf(data: bytes) -> str:
    import pdfplumber
    out = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages[:50]:
            out.append(page.extract_text() or "")
    return "\n\n".join(out).strip()

def parse_xlsx(data: bytes) -> str:
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    chunks = []
    for ws in wb.worksheets:
        chunks.append(f"=== Sheet: {ws.title} ===")
        for row in ws.iter_rows(values_only=True):
            vals = [str(v) for v in row if v is not None]
            if vals:
                chunks.append(", ".join(vals))
    return "\n".join(chunks).strip()

def parse_docx(data: bytes) -> str:
    import docx
    d = docx.Document(io.BytesIO(data))
    parts = [p.text for p in d.paragraphs if p.text.strip()]
    for t in d.tables:
        for r in t.rows:
            parts.append(" | ".join(c.text.strip() for c in r.cells))
    return "\n".join(parts).strip()

def parse_file(filename: str, data: bytes) -> Tuple[str, str]:
    """Returns (text, kind)."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        return parse_pdf(data), "pdf"
    if ext in ("xlsx", "xlsm", "xls"):
        return parse_xlsx(data), "xlsx"
    if ext in ("docx", "doc"):
        return parse_docx(data), "docx"
    return data.decode("utf-8", errors="replace"), ("csv" if ext in ("csv", "tsv") else "text")
