import { useState } from "react";
import {
  markPromisePaidAndCreatePayment,
  reschedulePromise,
  partialPayPromiseAndCreateNewPromise,
} from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";

function PromiseHistory({ promises, onPromiseUpdated }) {
  const [selectedPromise, setSelectedPromise] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const [reschedulePromiseItem, setReschedulePromiseItem] = useState(null);
  const [newPromisedDate, setNewPromisedDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  const [partialPromiseItem, setPartialPromiseItem] = useState(null);
  const [partialPaymentDate, setPartialPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [partialAmountPaid, setPartialAmountPaid] = useState("");
  const [partialPaymentMethod, setPartialPaymentMethod] = useState("Cash");
  const [partialNewPromisedDate, setPartialNewPromisedDate] = useState("");
  const [partialNotes, setPartialNotes] = useState("");

  const openMarkPaidForm = (promise) => {
    setSelectedPromise(promise);
    setPaymentMethod("Cash");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setNotes(`Promise payment received for ${formatMoney(promise.remaining_amount)}`);
    setMessage("");
  };

  const handleConfirmPaid = async () => {
    if (!selectedPromise) return;
  
    const confirmed = window.confirm(
      "Are you sure you want to mark this promise as paid? This will create a payment record and affect the balance."
    );
  
    if (!confirmed) return;
  
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

  const openRescheduleForm = (promise) => {
    setReschedulePromiseItem(promise);
    setNewPromisedDate("");
    setRescheduleReason(
      `Customer missed promise date ${promise.promised_date} and promised a new date.`
    );
  };
  
  const handleReschedulePromise = async () => {
    if (!reschedulePromiseItem) return;
  
    const confirmed = window.confirm(
      "Are you sure you want to reschedule this promise? The old promise will be marked as Rescheduled and a new promise will be created."
    );
  
    if (!confirmed) return;
  
    try {
      await reschedulePromise({
        promise: reschedulePromiseItem,
        newPromisedDate,
        reason: rescheduleReason,
      });
  
      setReschedulePromiseItem(null);
      setNewPromisedDate("");
      setRescheduleReason("");
      onPromiseUpdated();
    } catch (error) {
      alert(`Failed to reschedule promise: ${error.message}`);
    }
  };

  const openPartialPromiseForm = (promise) => {
    setPartialPromiseItem(promise);
    setPartialPaymentDate(new Date().toISOString().split("T")[0]);
    setPartialAmountPaid("");
    setPartialPaymentMethod("Cash");
    setPartialNewPromisedDate("");
    setPartialNotes(
      `Customer paid part of promised amount and re-promised remaining balance.`
    );
  };
  
  const handlePartialPromisePayment = async () => {
    if (!partialPromiseItem) return;
  
    const confirmed = window.confirm(
      "Are you sure you want to record a partial promise payment and create a new promise for the remaining amount?"
    );
  
    if (!confirmed) return;
  
    try {
      await partialPayPromiseAndCreateNewPromise({
        promise: partialPromiseItem,
        paymentDate: partialPaymentDate,
        amountPaid: partialAmountPaid,
        paymentMethod: partialPaymentMethod,
        newPromisedDate: partialNewPromisedDate,
        notes: partialNotes,
      });
  
      setPartialPromiseItem(null);
      setPartialAmountPaid("");
      setPartialNewPromisedDate("");
      setPartialNotes("");
  
      onPromiseUpdated();
    } catch (error) {
      alert(`Failed to record partial promise payment: ${error.message}`);
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

{reschedulePromiseItem && (
  <div style={modalBox}>
    <h3>Reschedule Promise</h3>

    <p>
      <strong>Old Promised Date:</strong>{" "}
      {reschedulePromiseItem.promised_date}
    </p>

    <p>
      <strong>Remaining Amount:</strong>{" "}
      {formatMoney(reschedulePromiseItem.remaining_amount)}
    </p>

    <div style={grid}>
      <div>
        <label>New Promised Date</label>
        <input
          type="date"
          value={newPromisedDate}
          onChange={(e) => setNewPromisedDate(e.target.value)}
          style={inputStyle}
        />
      </div>
    </div>

    <div style={{ marginTop: "15px" }}>
      <label>Reason / Notes</label>
      <textarea
        value={rescheduleReason}
        onChange={(e) => setRescheduleReason(e.target.value)}
        style={{
          ...inputStyle,
          height: "80px",
          resize: "vertical",
        }}
      />
    </div>

    <button onClick={handleReschedulePromise} style={buttonStyle}>
      Save New Promise Date
    </button>

    <button
      onClick={() => setReschedulePromiseItem(null)}
      style={cancelButtonStyle}
    >
      Cancel
    </button>
  </div>
)}

{partialPromiseItem && (
  <div style={modalBox}>
    <h3>Partial Promise Payment</h3>

    <p>
      <strong>Current Promised Amount:</strong>{" "}
      {formatMoney(partialPromiseItem.remaining_amount)}
    </p>

    <div style={grid}>
      <div>
        <label>Payment Date</label>
        <input
          type="date"
          value={partialPaymentDate}
          onChange={(e) => setPartialPaymentDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label>Amount Paid Now</label>
        <input
          type="number"
          value={partialAmountPaid}
          onChange={(e) => setPartialAmountPaid(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label>Payment Method</label>
        <select
          value={partialPaymentMethod}
          onChange={(e) => setPartialPaymentMethod(e.target.value)}
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

      <div>
        <label>New Promised Date for Remaining</label>
        <input
          type="date"
          value={partialNewPromisedDate}
          onChange={(e) => setPartialNewPromisedDate(e.target.value)}
          style={inputStyle}
        />
      </div>
    </div>

    <div style={{ marginTop: "15px" }}>
      <label>Notes</label>
      <textarea
        value={partialNotes}
        onChange={(e) => setPartialNotes(e.target.value)}
        style={{
          ...inputStyle,
          height: "80px",
          resize: "vertical",
        }}
      />
    </div>

    <button onClick={handlePartialPromisePayment} style={buttonStyle}>
      Save Partial Payment
    </button>

    <button
      onClick={() => setPartialPromiseItem(null)}
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
                  {promise.promise_status !== "Paid" &&
                  promise.promise_status !== "Rescheduled" &&
                  promise.promise_status !== "Partial Paid" ? (
                    <>
                      <button
                        onClick={() => openMarkPaidForm(promise)}
                        style={buttonStyle}
                      >
                        Mark Paid
                      </button>

                      <button
                        onClick={() => openPartialPromiseForm(promise)}
                        style={{
                          ...buttonStyle,
                          background: "#1d4ed8",
                        }}
                      >
                        Partial Pay
                      </button>

                      <button
                        onClick={() => openRescheduleForm(promise)}
                        style={{
                          ...buttonStyle,
                          background: "#92400e",
                        }}
                      >
                        Reschedule
                      </button>
                    </>
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

  if (status === "Rescheduled") {
    return {
      ...base,
      background: "#e0e7ff",
      color: "#3730a3",
    };
  }

  if (status === "Partial Paid") {
    return {
      ...base,
      background: "#fef9c3",
      color: "#854d0e",
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