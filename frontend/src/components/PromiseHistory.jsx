import { useState } from "react";
import { markPromisePaidAndCreatePayment } from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";

function PromiseHistory({ promises, onPromiseUpdated }) {
  const [selectedPromise, setSelectedPromise] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const openMarkPaidForm = (promise) => {
    setSelectedPromise(promise);
    setPaymentMethod("Cash");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setNotes(`Promise payment received for ${formatMoney(promise.remaining_amount)}`);
    setMessage("");
  };

  const handleConfirmPaid = async () => {
    if (!selectedPromise) return;

    try {
      await markPromisePaidAndCreatePayment({
        promise: selectedPromise,
        paymentDate,
        paymentMethod,
        notes,
      });

      setMessage("Promise payment recorded successfully.");
      setSelectedPromise(null);
      onPromiseUpdated();
    } catch (error) {
      setMessage(`Failed to record promise payment: ${error.message}`);
    }
  };

  return (
    <div style={boxStyle}>
      <h2>Promise History</h2>

      {message && <p>{message}</p>}

      {selectedPromise && (
        <div style={modalBox}>
          <h3>Record Promise Payment</h3>

          <p>
            <strong>Remaining Amount:</strong>{" "}
            {formatMoney(selectedPromise.remaining_amount)}
          </p>

          <div style={grid}>
            <div>
              <label>Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label>Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={inputStyle}
              >
                <option>Cash</option>
                <option>Zelle</option>
                <option>Card</option>
                <option>Check</option>
                <option>ACH</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: "15px" }}>
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                ...inputStyle,
                height: "80px",
                resize: "vertical",
              }}
            />
          </div>

          <button onClick={handleConfirmPaid} style={buttonStyle}>
            Confirm Payment
          </button>

          <button
            onClick={() => setSelectedPromise(null)}
            style={cancelButtonStyle}
          >
            Cancel
          </button>
        </div>
      )}

      {promises.length === 0 ? (
        <p>No payment promises recorded yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Original Due</th>
              <th style={th}>Amount Due</th>
              <th style={th}>Paid Now</th>
              <th style={th}>Remaining</th>
              <th style={th}>Promised Date</th>
              <th style={th}>Status</th>
              <th style={th}>Notes</th>
              <th style={th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {promises.map((promise) => (
              <tr key={promise.id}>
                <td style={td}>{promise.original_due_date}</td>
                <td style={td}>{formatMoney(promise.amount_due)}</td>
                <td style={td}>{formatMoney(promise.amount_paid_now)}</td>
                <td style={td}>{formatMoney(promise.remaining_amount)}</td>
                <td style={td}>{promise.promised_date}</td>
                <td style={td}>
                  <span style={getStatusStyle(promise.promise_status)}>
                    {promise.promise_status}
                  </span>
                </td>
                <td style={td}>{promise.notes}</td>
                <td style={td}>
                  {promise.promise_status !== "Paid" ? (
                    <button
                      onClick={() => openMarkPaidForm(promise)}
                      style={buttonStyle}
                    >
                      Mark Paid
                    </button>
                  ) : (
                    "—"
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

function getStatusStyle(status) {
  const base = {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "bold",
  };

  if (status === "Broken") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (status === "Pending") {
    return {
      ...base,
      background: "#fef9c3",
      color: "#854d0e",
    };
  }

  if (status === "Paid") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
  };
}

const boxStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginTop: "25px",
};

const modalBox = {
  background: "#f9fafb",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
  border: "1px solid #ddd",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "15px",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginTop: "6px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  boxSizing: "border-box",
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
  marginTop: "15px",
  marginRight: "10px",
};

const cancelButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  marginTop: "15px",
};

export default PromiseHistory;