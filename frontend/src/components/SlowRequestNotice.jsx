import { useEffect, useState } from "react";

export default function SlowRequestNotice() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(timer);
  }, []);
  return slow ? <p role="status" style={{ fontSize: 13, lineHeight: 1.6, margin: "12px 0", textAlign: "center" }}>This is taking longer than usual. Please check your connection and keep this page open. If you just submitted a payment, wait for confirmation before trying again.</p> : null;
}
