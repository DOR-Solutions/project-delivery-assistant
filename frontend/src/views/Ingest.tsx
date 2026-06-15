import { useEffect, useRef, useState } from "react";
import { api, Doc } from "../lib/api";

export default function Ingest({ pid }: { pid: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = () => api.documents(pid).then(setDocs).catch(() => {});
  useEffect(() => { load(); setLog([]); }, [pid]);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      setLog((l) => [`⟳ Parsing ${f.name}…`, ...l]);
      try {
        const d = await api.uploadDoc(pid, f);
        setLog((l) => [`✓ ${f.name} — ${d.insights.length} insight(s) extracted`, ...l]);
      } catch (e) {
        setLog((l) => [`✗ ${f.name} — ${e}`, ...l]);
      }
    }
    setBusy(false); load();
  };

  return (
    <div>
      <div className="eyebrow">Workspace · data pipeline</div>
      <h1>⊕ Ingest</h1>
      <p style={{ color: "var(--gray)", marginBottom: 12, maxWidth: 720 }}>
        Drop live or historic project data — programme briefs, risk registers, bag-count exports,
        commissioning logs. MAX parses PDF · DOCX · XLSX · CSV server-side and extracts structured insight.
      </p>

      <div className="card" style={{ textAlign: "center", border: "1.5px dashed var(--bor)", cursor: "pointer", padding: 36 }}
        onClick={() => fileRef.current?.click()}>
        <div style={{ fontSize: 26 }}>⊕</div>
        <div style={{ marginTop: 8, color: "var(--ink)", fontWeight: 600 }}>
          {busy ? "Ingesting & analysing…" : "Click to ingest files"}
        </div>
        <div style={{ fontSize: 11, color: "var(--gray)", marginTop: 4 }}>PDF · DOCX · XLSX · CSV · TXT — parsed & analysed on the server</div>
      </div>
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => onUpload(e.target.files)} />

      {!!log.length && (
        <>
          <div className="sec">Pipeline activity</div>
          <div className="card" style={{ fontFamily: "var(--fm)", fontSize: 12 }}>
            {log.map((l, i) => <div key={i} style={{ padding: "2px 0", color: l.startsWith("✗") ? "#D4374C" : l.startsWith("✓") ? "#178A43" : "var(--gray)" }}>{l}</div>)}
          </div>
        </>
      )}

      <div className="sec">Ingested for this project ({docs.length})</div>
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        {docs.map((d) => (
          <div className="card" key={d.id}>
            <div style={{ fontWeight: 700, color: "var(--ink)" }}>{d.name}
              <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--gray)" }}> · {d.kind} · {d.insights.length} insights</span></div>
            <div style={{ fontSize: 12, marginTop: 6 }}>{d.summary}</div>
          </div>
        ))}
        {!docs.length && <div className="card" style={{ color: "var(--gray)" }}>Nothing ingested yet for this project.</div>}
      </div>
    </div>
  );
}
