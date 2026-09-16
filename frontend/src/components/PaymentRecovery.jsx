import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { acknowledgePaymentOperation, recoverPaymentOperation, getPaymentCapabilities } from "../api/paymentOperationsApi";

export default function PaymentRecovery() {
  const navigate = useNavigate();
  const busy = useRef(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [enabled, setEnabled] = useState(null);
  useEffect(() => {
    let mounted = true;
    getPaymentCapabilities().then(value => { if (mounted) setEnabled(value.enabled); })
      .catch(() => { if (mounted) setEnabled(false); });
    return () => { mounted = false; };
  }, []);
  const recover = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const recovered = await recoverPaymentOperation();
      setResult(recovered);
      setMessage(recovered
        ? "Operation confirmed. Review the account before recording another payment."
        : "There is no payment awaiting recovery for this account.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      busy.current = false;
    }
  };
  return <aside aria-label="Payment recovery">
    {enabled === false && <p role="status">Payment saves are unavailable during the application update. Existing accounts remain available to view.</p>}
    <button type="button" onClick={recover}>Recover Payment</button>
    {message && <p role="status">{message}</p>}
    {result && <div>
      <p>{result.payments.length
        ? `Recorded: ${result.payments.map(p => `$${Number(p.amount_paid).toFixed(2)} for ${p.due_date}`).join(", ")}`
        : "Promise operation confirmed."}</p>
      <button type="button" onClick={async () => {
        try {
          await acknowledgePaymentOperation(result.requestId);
          navigate(`/deals/${result.dealId}`, { state: { recoveredPayment: result.requestId } });
          setResult(null);
        } catch (error) { setMessage(error.message); }
      }}>Open confirmed account</button>
    </div>}
  </aside>;
}
