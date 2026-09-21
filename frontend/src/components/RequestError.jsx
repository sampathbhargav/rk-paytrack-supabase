import { useRef, useState } from "react";

export default function RequestError({ error, onRetry, busy = false, retryLabel = "Try again", title = "Unable to load this information" }) {
  const pending = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");
  const retry = async () => {
    if (pending.current || busy) return;
    pending.current = true;
    setRetrying(true);
    setRetryError("");
    try { await onRetry(); }
    catch { setRetryError("The request still could not be completed. Check your connection and try again."); }
    finally { pending.current = false; setRetrying(false); }
  };
  return <div role="alert">
    <strong>{title}</strong>
    <p style={{ margin: "8px 0", fontWeight: 400, lineHeight: 1.5 }}>Check your connection and try again. Any information still displayed may be out of date.</p>
    <details style={{ fontSize: 13, fontWeight: 400, overflowWrap: "anywhere", marginBottom: 12 }}><summary>Technical details</summary>{String(error?.message || error || "Request failed")}</details>
    {retryError && <p>{retryError}</p>}
    {onRetry && <button type="button" disabled={busy || retrying} onClick={retry} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #fecaca", background: "white", color: "#991b1b", fontWeight: 700, cursor: busy || retrying ? "wait" : "pointer" }}>{busy || retrying ? "Retrying…" : retryLabel}</button>}
  </div>;
}
