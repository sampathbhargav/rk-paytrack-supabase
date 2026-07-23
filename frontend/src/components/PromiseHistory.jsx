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
    setNotes(
      `Promise payment received for ${formatMoney(promise.remaining_amount)}`
    );
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
      "Customer paid part of promised amount and re-promised remaining balance."
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
      <div style={sectionHeader}>
        <h2 style={sectionTitle}>Promise History</h2>
        <p style={sectionDescription}>
          Tracks customer promises, broken promises, rescheduled promises, and
          promise payments.
        </p>
      </div>

      {message && <p style={messageStyle}>{message}</p>}

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
        <div style={emptyState}>
          <strong>No promises recorded yet.</strong>
          <p>
            Promises will appear here when a customer pays partially or
            reschedules a payment commitment.
          </p>
        </div>
      ) : (
        <div style={tableWrapper}>
          <table style={tableStyle}>
            <colgroup>
              <col style={{ width: "230px" }} />
              <col style={{ width: "125px" }} />
              <col style={{ width: "125px" }} />
              <col style={{ width: "125px" }} />
              <col style={{ width: "125px" }} />
              <col style={{ width: "135px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "260px" }} />
              <col style={{ width: "260px" }} />
            </colgroup>

            <thead>
              <tr>
                <th style={th}>Customer</th>
                <th style={th}>Original Due</th>
                <th style={rightTh}>Amount Due</th>
                <th style={rightTh}>Paid Now</th>
                <th style={rightTh}>Remaining</th>
                <th style={th}>Promised Date</th>
                <th style={th}>Status</th>
                <th style={th}>Notes</th>
                <th style={th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {promises.map((promise) => {
                const customerName = getPromiseCustomerName(promise);
                const companyName = getPromiseCompanyName(promise);

                return (
                  <tr key={promise.id}>
                    <td style={customerCell}>
                      <strong style={customerNameText}>
                        {customerName || "—"}
                      </strong>

                      {companyName && (
                        <div style={companyNameText}>🏢 {companyName}</div>
                      )}

                      {promise.deals?.deal_tag && (
                        <div style={smallText}>
                          Deal #{promise.deals.deal_tag}
                        </div>
                      )}
                    </td>

                    <td style={td}>{promise.original_due_date || "—"}</td>

                    <td style={rightTd}>
                      {formatMoney(promise.amount_due)}
                    </td>

                    <td style={rightTd}>
                      {formatMoney(promise.amount_paid_now)}
                    </td>

                    <td style={rightTd}>
                      <strong>{formatMoney(promise.remaining_amount)}</strong>
                    </td>

                    <td style={td}>{promise.promised_date || "—"}</td>

                    <td style={td}>
                      <span style={getStatusStyle(promise.promise_status)}>
                        {promise.promise_status || "—"}
                      </span>
                    </td>

                    <td style={notesCell}>{promise.notes || "—"}</td>

                    <td style={actionCell}>
                      {promise.promise_status !== "Paid" &&
                      promise.promise_status !== "Rescheduled" &&
                      promise.promise_status !== "Partial Paid" ? (
                        <div style={actionGroup}>
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
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getPromiseCustomerName(promise) {
  return (
    promise?.deals?.customers?.customer_name ||
    promise?.customers?.customer_name ||
    promise?.customer?.customer_name ||
    promise?.customer_name ||
    ""
  );
}

function getPromiseCompanyName(promise) {
  return (
    promise?.deals?.customers?.company_name ||
    promise?.customers?.company_name ||
    promise?.customer?.company_name ||
    promise?.company_name ||
    ""
  );
}

function getStatusStyle(status) {
  const base = {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "bold",
    display: "inline-flex",
    whiteSpace: "nowrap",
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
  maxWidth: "100%",
  overflow: "hidden",
  boxSizing: "border-box",
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

const tableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
};

const tableStyle = {
  width: "100%",
  minWidth: "1515px",
  tableLayout: "fixed",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #ddd",
  background: "#f9fafb",
  whiteSpace: "nowrap",
  fontSize: "12px",
  color: "#334155",
};

const rightTh = {
  ...th,
  textAlign: "right",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #eee",
  color: "#111827",
  fontSize: "13px",
  verticalAlign: "top",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const rightTd = {
  ...td,
  textAlign: "right",
};

const customerCell = {
  ...td,
  whiteSpace: "normal",
  overflow: "visible",
  textOverflow: "clip",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  lineHeight: "1.35",
};

const customerNameText = {
  color: "#0A1A2F",
  fontWeight: "900",
  display: "inline-block",
  maxWidth: "100%",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
};

const companyNameText = {
  marginTop: "5px",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: "900",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "5px 8px",
  display: "inline-flex",
  maxWidth: "100%",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const smallText = {
  marginTop: "5px",
  color: "#667085",
  fontSize: "12px",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
};

const notesCell = {
  ...td,
  whiteSpace: "normal",
  overflow: "visible",
  textOverflow: "clip",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  lineHeight: "1.35",
};

const actionCell = {
  ...td,
  whiteSpace: "normal",
  overflow: "visible",
};

const actionGroup = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const buttonStyle = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  marginTop: "0",
  marginRight: "0",
  fontWeight: "800",
  fontSize: "12px",
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

const messageStyle = {
  background: "#ecfdf5",
  color: "#166534",
  border: "1px solid #bbf7d0",
  padding: "10px 12px",
  borderRadius: "10px",
  fontWeight: "800",
};

export default PromiseHistory;