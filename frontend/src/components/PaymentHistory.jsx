import { formatMoney } from "../utils/moneyUtils";
import { useState } from "react";
import { voidPayment } from "../api/paymentsApi";

function PaymentHistory({ payments, onPaymentUpdated }) {

  const [voidReason, setVoidReason] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [message, setMessage] = useState("");

  const handleVoidPayment = async () => {
    if (!selectedPayment) return;

    if (!voidReason.trim()) {
      setMessage("Void reason is required.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to void this payment? This will affect the balance and payment schedule."
    );

    if (!confirmed) return;

    try {
      await voidPayment(selectedPayment.id, voidReason);

      setSelectedPayment(null);
      setVoidReason("");
      setMessage("Payment voided successfully.");

      if (onPaymentUpdated) {
        onPaymentUpdated();
      }
    } catch (error) {
      setMessage(`Failed to void payment: ${error.message}`);
    }
  };

  return (
    <div style={boxStyle}>
      <div style={sectionHeader}>
        <h2 style={sectionTitle}>Payment History</h2>
        <p style={sectionDescription}>
          All recorded payments for this deal, including active and voided payment records.
        </p>
      </div>

      {selectedPayment && (
        <div style={voidBox}>
          <h3>Void Payment</h3>
          <p>
            Payment Date: {selectedPayment.payment_date} | Amount:{" "}
            {formatMoney(selectedPayment.amount_paid)}
          </p>

          <label>Void Reason</label>
          <textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "6px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              height: "80px",
            }}
            placeholder="Example: Wrong amount entered, wrong payment method, wrong due installment..."
          />

          <button onClick={handleVoidPayment} style={dangerButtonStyle}>
            Confirm Void
          </button>

          <button
            onClick={() => {
              setSelectedPayment(null);
              setVoidReason("");
            }}
            style={cancelButtonStyle}
          >
            Cancel
          </button>
        </div>
      )}

      {message && <p>{message}</p>}

      {payments.length === 0 ? (
        <div style={emptyState}>
          <strong>No payments recorded yet.</strong>
          <p>
            Use Add Payment to record the first customer payment for this deal.
          </p>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Amount Due</th>
              <th style={th}>Amount Paid</th>
              <th style={th}>Remaining</th>
              <th style={th}>Method</th>
              <th style={th}>Type</th>
              <th style={th}>Notes</th>
              <th style={th}>Status</th>
              <th style={th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td style={td}>{payment.payment_date}</td>
                <td style={td}>{formatMoney(payment.amount_due)}</td>
                <td style={td}>{formatMoney(payment.amount_paid)}</td>
                <td style={td}>{formatMoney(payment.remaining_amount)}</td>
                <td style={td}>{payment.payment_method}</td>
                <td style={td}>{payment.payment_type}</td>
                <td style={td}>{payment.notes}</td>
                <td style={td}>
                  <span
                    style={
                      payment.payment_status === "Voided"
                        ? {
                            background: "#fee2e2",
                            color: "#991b1b",
                            padding: "5px 10px",
                            borderRadius: "999px",
                            fontWeight: "bold",
                            fontSize: "13px",
                          }
                        : {
                            background: "#dcfce7",
                            color: "#166534",
                            padding: "5px 10px",
                            borderRadius: "999px",
                            fontWeight: "bold",
                            fontSize: "13px",
                          }
                    }
                  >
                    {payment.payment_status || "Active"}
                  </span>
                </td>

                <td style={td}>
                  {payment.payment_status === "Voided" ? (
                    <span>{payment.void_reason || "Voided"}</span>
                  ) : (
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      style={buttonStyle}
                    >
                      Void
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const boxStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginTop: "25px",
};

const th = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #ddd",
  background: "#f9fafb",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #eee",
};

const buttonStyle = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
};

const dangerButtonStyle = {
  background: "#991b1b",
  color: "white",
  border: "none",
  padding: "9px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  marginTop: "12px",
  marginRight: "10px",
};

const cancelButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  padding: "9px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  marginTop: "12px",
};

const voidBox = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  padding: "15px",
  borderRadius: "12px",
  marginBottom: "20px",
};

const emptyState = {
  background: "#f9fafb",
  border: "1px dashed #cbd5e1",
  padding: "16px",
  borderRadius: "10px",
  color: "#475569",
  marginTop: "12px",
};

const sectionHeader = {
  marginBottom: "14px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
};

const sectionDescription = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#667085",
  fontSize: "14px",
};

export default PaymentHistory;