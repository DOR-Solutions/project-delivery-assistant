import { useEffect, useRef, useState } from "react";
import { api, Doc } from "../lib/api";

export default function Ingest({ pid }: { pid: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [auto, setAuto] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = () => api.documents(pid).then(setDocs).catch(() => {});
  const loadAuto = () => api.ingestStatus().then(setAuto).catch(() => {});
  useEffect(() => { load(); loadAuto(); setLog([]); }, [pid]);

  const scanNow = async () => {
    setScanning(true);
    try {
      const r = await api.ingestScan();
      setLog((l) => [`⟳ Drop-zone scan: ${r.ingested} new, ${r.updated} updated, ${r.skipped} unchanged`, ...l]);
    } catch (e) { setLog((l) => [`✗ Scan failed — ${e}`, ...l]); }
    setScanning(false); load(); loadAuto();
  };

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

      {auto && (
        <div className="card" style={{ borderLeft: "3px solid var(--teal)", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div className="panel-h" style={{ marginBottom: 4 }}>Automated drop-zone ingest</div>
              <div style={{ fontSize: 12, color: "var(--ink)" }}>
                {auto.auto_enabled
                  ? <>Watching every <b>{auto.interval_minutes} min</b> · </>
                  : <>Auto-scan off · </>}
                <b>{auto.files_tracked}</b> file(s) tracked · last scan {auto.last_scan ? new Date(auto.last_scan).toLocaleString("en-GB") : "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--gray)", fontFamily: "var(--fm)", marginTop: 4 }}>
                Drop files into <b>{auto.watch_dir}/&lt;terminal&gt;/</b> (T1–T5). New &amp; changed files auto-ingest; reports refresh and snapshot.
              </div>
            </div>
            <button className="btn" onClick={scanNow} disabled={scanning}>{scanning ? "Scanning…" : "↻ Scan now"}</button>
          </div>
          {auto.by_project && Object.keys(auto.by_project).length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {Object.entries(auto.by_project).map(([p, n]: any) => (
                <span key={p} className="pill" style={{ background: "var(--card2)", color: "var(--gray)" }}>{p}: {n}</span>
              ))}
            </div>
          )}
        </div>
      )}

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
