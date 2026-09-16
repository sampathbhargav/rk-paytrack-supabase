import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  acknowledgePaymentOperation, recoverPaymentOperation, getPaymentCapabilities,
  hasPendingPaymentOperation, PAYMENT_OPERATION_CHANGED,
} from "../api/paymentOperationsApi";
import "./PaymentRecovery.css";

export default function PaymentRecovery() {
  const navigate = useNavigate();
  const location = useLocation();
  const busy = useRef(false);
  const [isBusy, setIsBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [enabled, setEnabled] = useState(null);

  useEffect(() => {
    let mounted = true;
    let latestCheck = 0;
    const refresh = async () => {
      const check = ++latestCheck;
      try {
        const hasPending = await hasPendingPaymentOperation();
        if (mounted && check === latestCheck) {
          setPending(hasPending);
          setCheckError(false);
          if (!hasPending) {
            setResult(null);
            setMessage("");
          }
        }
      } catch {
        if (mounted && check === latestCheck) setCheckError(true);
      }
    };
    const onStorage = (event) => {
      if (!event.key || event.key.startsWith("rk-payment-intent-v1:")) refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    getPaymentCapabilities().then(value => { if (mounted) setEnabled(value.enabled); })
      .catch(() => { if (mounted) setEnabled(false); });
    window.addEventListener(PAYMENT_OPERATION_CHANGED, refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted = false;
      window.removeEventListener(PAYMENT_OPERATION_CHANGED, refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [location.key]);

  const recover = async () => {
    if (busy.current) return;
    busy.current = true;
    setIsBusy(true);
    setMessage("");
    try {
      const recovered = await recoverPaymentOperation();
      setResult(recovered);
      setPending(Boolean(recovered));
      setCheckError(false);
    } catch (error) {
      setMessage(error.message);
    } finally {
      busy.current = false;
      setIsBusy(false);
    }
  };

  const openConfirmedAccount = async () => {
    if (busy.current) return;
    busy.current = true;
    setIsBusy(true);
    try {
      await acknowledgePaymentOperation(result.requestId);
      navigate(`/deals/${result.dealId}`, { state: { recoveredPayment: result.requestId } });
      setResult(null);
      setPending(false);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      busy.current = false;
      setIsBusy(false);
    }
  };

  if (!pending && !checkError && !result && enabled !== false) return null;

  const needsRecovery = pending || checkError || result;
  return <aside className={`payment-recovery${result ? " payment-recovery--confirmed" : ""}`} aria-label="Payment recovery">
    <div className="payment-recovery__content" aria-live="polite">
      <strong>{result ? "Payment operation confirmed" : needsRecovery ? "Payment needs confirmation" : "Payment saves temporarily unavailable"}</strong>
      <p>{result
        ? "Review the confirmed account before recording another payment."
        : checkError
          ? "We could not check for an unfinished payment. Check recovery before submitting again."
          : pending
            ? "A previous payment or promise operation needs review. Recover it before starting another payment."
            : "Existing accounts remain available to view while payment saves are unavailable."}</p>
      {enabled === false && needsRecovery && <p>New payment saves are temporarily unavailable. You can still try recovering an existing operation.</p>}
      {result && <p>{result.payments.length
        ? `Recorded: ${result.payments.map(p => `$${Number(p.amount_paid).toFixed(2)} for ${p.due_date}`).join(", ")}`
        : "Promise operation confirmed."}</p>}
      {message && <p role="alert">{message}</p>}
    </div>
    {needsRecovery && <button className="payment-recovery__action" type="button" disabled={isBusy}
      onClick={result ? openConfirmedAccount : recover}>
      {isBusy ? "Checking…" : result ? "Open confirmed account" : "Recover Payment"}
    </button>}
  </aside>;
}
