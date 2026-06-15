import { useEffect, useRef, useState } from "react";
import { api, Doc } from "../lib/api";

export default function Documents({ pid }: { pid: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = () => api.documents(pid).then(setDocs).catch(() => {});
  useEffect(() => { load(); }, [pid]);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      try { await api.uploadDoc(pid, f); } catch (e) { alert("Upload failed: " + e); }
    }
    setBusy(false); load();
  };

  return (
    <div>
      <h1>Documents</h1>
      <div className="card" style={{ textAlign: "center", border: "1.5px dashed var(--bor)", cursor: "pointer", padding: 30 }}
        onClick={() => fileRef.current?.click()}>
        {busy ? "Uploading & analysing…" : "Click to upload (PDF · DOCX · XLSX · CSV · TXT) — parsed & analysed server-side"}
      </div>
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => onUpload(e.target.files)} />
      <div className="sec">{docs.length} document(s)</div>
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        {docs.map((d) => (
          <div className="card" key={d.id}>
            <div style={{ fontWeight: 700, color: "var(--ink)" }}>{d.name} <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--gray)" }}>· {d.kind} · {d.insights.length} insights</span></div>
            <div style={{ fontSize: 12, marginTop: 6 }}>{d.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
