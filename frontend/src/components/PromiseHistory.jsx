import { Fragment, useMemo, useState } from "react";
import {
  markPromisePaidAndCreatePayment,
  reschedulePromise,
  partialPayPromiseAndCreateNewPromise,
} from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";

const todayString = new Date().toISOString().split("T")[0];

const paymentMethodOptions = [
  "Cash",
  "Zelle",
  "Cash App",
  "Apple Pay",
  "Card",
  "Check",
  "ACH",
  "Other",
];

function PromiseHistory({ promises = [], onPromiseUpdated }) {
  const [selectedPromise, setSelectedPromise] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(todayString);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const [reschedulePromiseItem, setReschedulePromiseItem] = useState(null);
  const [newPromisedDate, setNewPromisedDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  const [partialPromiseItem, setPartialPromiseItem] = useState(null);
  const [partialPaymentDate, setPartialPaymentDate] = useState(todayString);
  const [partialAmountPaid, setPartialAmountPaid] = useState("");
  const [partialPaymentMethod, setPartialPaymentMethod] = useState("Cash");
  const [partialNewPromisedDate, setPartialNewPromisedDate] = useState("");
  const [partialNotes, setPartialNotes] = useState("");

  const [expandedPromiseId, setExpandedPromiseId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");

  const summary = useMemo(() => {
    const activePromises = promises.filter((promise) =>
      isActionablePromise(promise.promise_status)
    );

    const dueToday = activePromises.filter(
      (promise) => promise.promised_date === todayString
    );

    const pastDue = activePromises.filter(
      (promise) =>
        promise.promised_date && String(promise.promised_date) < todayString
    );

    const broken = promises.filter(
      (promise) => promise.promise_status === "Broken"
    );

    const activeBalance = activePromises.reduce(
      (sum, promise) => sum + Number(promise.remaining_amount || 0),
      0
    );

    return {
      total: promises.length,
      active: activePromises.length,
      dueToday: dueToday.length,
      pastDue: pastDue.length,
      broken: broken.length,
      activeBalance,
    };
  }, [promises]);

  const filteredPromises = useMemo(() => {
    return promises
      .filter((promise) => {
        const status = promise.promise_status || "Pending";

        if (statusFilter === "All") return true;

        if (statusFilter === "Active") {
          return isActionablePromise(status);
        }

        if (statusFilter === "Due Today") {
          return isActionablePromise(status) && promise.promised_date === todayString;
        }

        if (statusFilter === "Past Due") {
          return (
            isActionablePromise(status) &&
            promise.promised_date &&
            String(promise.promised_date) < todayString
          );
        }

        return status === statusFilter;
      })
      .sort(sortPromisesByPriority);
  }, [promises, statusFilter]);

  const openMarkPaidForm = (promise) => {
    setSelectedPromise(promise);
    setPaymentMethod("Cash");
    setPaymentDate(todayString);
    setNotes(
      `Promise payment received for ${formatMoney(promise.remaining_amount)}`
    );
    setMessage("");
  };

  const handleConfirmPaid = async () => {
    if (!selectedPromise) return;

    if (!paymentDate) {
      setMessage("Payment date is required.");
      return;
    }

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

      if (onPromiseUpdated) {
        onPromiseUpdated();
      }
    } catch (error) {
      setMessage(`Failed to record promise payment: ${error.message}`);
    }
  };

  const openRescheduleForm = (promise) => {
    setReschedulePromiseItem(promise);
    setNewPromisedDate("");
    setRescheduleReason(
      `Customer missed promise date ${formatDisplayDate(
        promise.promised_date
      )} and promised a new date.`
    );
    setMessage("");
  };

  const handleReschedulePromise = async () => {
    if (!reschedulePromiseItem) return;

    if (!newPromisedDate) {
      setMessage("New promised date is required.");
      return;
    }

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
      setMessage("Promise rescheduled successfully.");

      if (onPromiseUpdated) {
        onPromiseUpdated();
      }
    } catch (error) {
      setMessage(`Failed to reschedule promise: ${error.message}`);
    }
  };

  const openPartialPromiseForm = (promise) => {
    setPartialPromiseItem(promise);
    setPartialPaymentDate(todayString);
    setPartialAmountPaid("");
    setPartialPaymentMethod("Cash");
    setPartialNewPromisedDate("");
    setPartialNotes(
      "Customer paid part of promised amount and re-promised remaining balance."
    );
    setMessage("");
  };

  const handlePartialPromisePayment = async () => {
    if (!partialPromiseItem) return;

    const amountPaid = Number(partialAmountPaid || 0);
    const remainingAmount = Number(partialPromiseItem.remaining_amount || 0);

    if (!partialPaymentDate) {
      setMessage("Payment date is required.");
      return;
    }

    if (amountPaid <= 0) {
      setMessage("Partial payment amount must be greater than 0.");
      return;
    }

    if (amountPaid >= remainingAmount) {
      setMessage(
        "For full payment, use Mark Paid. Partial payment must be less than the remaining amount."
      );
      return;
    }

    if (!partialNewPromisedDate) {
      setMessage("New promised date for the remaining balance is required.");
      return;
    }

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
      setMessage("Partial promise payment recorded successfully.");

      if (onPromiseUpdated) {
        onPromiseUpdated();
      }
    } catch (error) {
      setMessage(`Failed to record partial promise payment: ${error.message}`);
    }
  };

  const toggleDetails = (promiseId) => {
    setExpandedPromiseId((currentId) =>
      currentId === promiseId ? null : promiseId
    );
  };

  return (
    <div style={boxStyle}>
      <div style={topBar}>
        <div>
          <h2 style={sectionTitle}>Promise History</h2>
          <p style={sectionDescription}>
            Customer payment promises, missed promises, and reschedules.
          </p>
        </div>

        {promises.length > 0 && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={filterSelect}
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Due Today">Due Today</option>
            <option value="Past Due">Past Due</option>
            <option value="Pending">Pending</option>
            <option value="Broken">Broken</option>
            <option value="Paid">Paid</option>
            <option value="Partial Paid">Partial Paid</option>
            <option value="Rescheduled">Rescheduled</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        )}
      </div>

      <div style={miniSummaryBar}>
        <span>
          Total <strong>{summary.total}</strong>
        </span>
        <span>
          Active <strong>{summary.active}</strong>
        </span>
        <span style={summary.dueToday > 0 ? warningText : {}}>
          Due Today <strong>{summary.dueToday}</strong>
        </span>
        <span style={summary.pastDue > 0 ? dangerText : {}}>
          Past Due <strong>{summary.pastDue}</strong>
        </span>
        <span style={summary.broken > 0 ? dangerText : {}}>
          Broken <strong>{summary.broken}</strong>
        </span>
        <span>
          Balance <strong>{formatMoney(summary.activeBalance)}</strong>
        </span>
      </div>

      {message && <div style={messageStyle}>{message}</div>}

      {selectedPromise && (
        <ActionPanel
          title="Record Promise Payment"
          onClose={() => setSelectedPromise(null)}
        >
          <PromiseMiniSummary promise={selectedPromise} />

          <div style={formGrid}>
            <Field label="Payment Date">
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Payment Method">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={inputStyle}
              >
                {paymentMethodOptions.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={textAreaStyle}
            />
          </Field>

          <div style={modalActions}>
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
        </ActionPanel>
      )}

      {reschedulePromiseItem && (
        <ActionPanel
          title="Reschedule Promise"
          onClose={() => setReschedulePromiseItem(null)}
        >
          <PromiseMiniSummary promise={reschedulePromiseItem} />

          <div style={formGrid}>
            <Field label="New Promised Date">
              <input
                type="date"
                value={newPromisedDate}
                onChange={(e) => setNewPromisedDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Reason / Notes">
            <textarea
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              style={textAreaStyle}
            />
          </Field>

          <div style={modalActions}>
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
        </ActionPanel>
      )}

      {partialPromiseItem && (
        <ActionPanel
          title="Partial Promise Payment"
          onClose={() => setPartialPromiseItem(null)}
        >
          <PromiseMiniSummary promise={partialPromiseItem} />

          <div style={formGrid}>
            <Field label="Payment Date">
              <input
                type="date"
                value={partialPaymentDate}
                onChange={(e) => setPartialPaymentDate(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Amount Paid Now">
              <input
                type="number"
                value={partialAmountPaid}
                onChange={(e) => setPartialAmountPaid(e.target.value)}
                style={inputStyle}
                min="0"
                step="0.01"
              />
            </Field>

            <Field label="Payment Method">
              <select
                value={partialPaymentMethod}
                onChange={(e) => setPartialPaymentMethod(e.target.value)}
                style={inputStyle}
              >
                {paymentMethodOptions.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </Field>

            <Field label="New Promised Date">
              <input
                type="date"
                value={partialNewPromisedDate}
                onChange={(e) => setPartialNewPromisedDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={partialNotes}
              onChange={(e) => setPartialNotes(e.target.value)}
              style={textAreaStyle}
            />
          </Field>

          <div style={modalActions}>
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
        </ActionPanel>
      )}

      {promises.length === 0 ? (
        <div style={emptyState}>
          <strong>No promises recorded yet.</strong>
          <p>
            Promises will appear here when a customer partially pays or
            reschedules a payment commitment.
          </p>
        </div>
      ) : filteredPromises.length === 0 ? (
        <div style={emptyState}>
          <strong>No matching promises found.</strong>
          <p>Change the filter to view other promise records.</p>
        </div>
      ) : (
        <div style={tableWrapper}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={th}>Promise</th>
                <th style={th}>Amount</th>
                <th style={th}>Date</th>
                <th style={th}>Status</th>
                <th style={th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredPromises.map((promise) => {
                const customerName = getPromiseCustomerName(promise);
                const companyName = getPromiseCompanyName(promise);
                const paymentFrequency = getPromisePaymentFrequency(promise);
                const status = promise.promise_status || "Pending";
                const risk = getPromiseRisk(promise);
                const isExpanded = expandedPromiseId === promise.id;
                const actionable = isActionablePromise(status);

                return (
                  <Fragment key={promise.id}>
                    <tr style={isExpanded ? expandedRow : undefined}>
                      <td style={promiseCell}>
                        <strong style={customerNameText}>
                          {customerName || "Customer"}
                        </strong>

                        <div style={smallText}>
                          {companyName ? `${companyName} · ` : ""}
                          {promise.deals?.deal_tag
                            ? `Deal #${promise.deals.deal_tag}`
                            : "No deal tag"}
                        </div>

                        <div style={smallText}>
                          Original Due:{" "}
                          <strong>
                            {formatDisplayDate(promise.original_due_date)}
                          </strong>
                        </div>
                      </td>

                      <td style={td}>
                        <strong>{formatMoney(promise.remaining_amount)}</strong>
                        <div style={smallText}>
                          Due: {formatMoney(promise.amount_due)}
                        </div>
                        <div style={smallText}>
                          Paid: {formatMoney(promise.amount_paid_now)}
                        </div>
                      </td>

                      <td style={td}>
                        <strong>{formatDisplayDate(promise.promised_date)}</strong>
                        <div style={smallText}>
                          <span style={getFrequencyBadgeStyle(paymentFrequency)}>
                            {getPaymentFrequencyLabel(paymentFrequency)}
                          </span>
                        </div>
                      </td>

                      <td style={td}>
                        <div style={statusStack}>
                          <span style={getStatusStyle(status)}>{status}</span>
                          <span style={getRiskBadgeStyle(risk)}>{risk}</span>
                        </div>
                      </td>

                      <td style={actionCell}>
                        <div style={actionGroup}>
                          <button
                            type="button"
                            onClick={() => toggleDetails(promise.id)}
                            style={detailsButton}
                          >
                            {isExpanded ? "Hide" : "Details"}
                          </button>

                          {actionable && (
                            <>
                              <button
                                type="button"
                                onClick={() => openMarkPaidForm(promise)}
                                style={buttonStyle}
                              >
                                Paid
                              </button>

                              <button
                                type="button"
                                onClick={() => openPartialPromiseForm(promise)}
                                style={blueButton}
                              >
                                Partial
                              </button>

                              <button
                                type="button"
                                onClick={() => openRescheduleForm(promise)}
                                style={brownButton}
                              >
                                Reschedule
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan="5" style={detailsRow}>
                          <div style={detailsGrid}>
                            <DetailItem
                              label="Customer"
                              value={customerName || "—"}
                            />
                            <DetailItem
                              label="Company"
                              value={companyName || "—"}
                            />
                            <DetailItem
                              label="Original Due"
                              value={formatDisplayDate(
                                promise.original_due_date
                              )}
                            />
                            <DetailItem
                              label="Promised Date"
                              value={formatDisplayDate(promise.promised_date)}
                            />
                            <DetailItem
                              label="Frequency"
                              value={getPaymentFrequencyLabel(paymentFrequency)}
                            />
                            <DetailItem
                              label="Amount Due"
                              value={formatMoney(promise.amount_due)}
                            />
                            <DetailItem
                              label="Paid Now"
                              value={formatMoney(promise.amount_paid_now)}
                            />
                            <DetailItem
                              label="Remaining"
                              value={formatMoney(promise.remaining_amount)}
                            />
                          </div>

                          <div style={notesBox}>
                            <strong>Notes:</strong>{" "}
                            {promise.notes || "No notes added."}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActionPanel({ title, children, onClose }) {
  return (
    <div style={modalBox}>
      <div style={modalHeader}>
        <h3 style={modalTitle}>{title}</h3>

        <button type="button" onClick={onClose} style={modalCloseButton}>
          ×
        </button>
      </div>

      {children}
    </div>
  );
}

function PromiseMiniSummary({ promise }) {
  return (
    <div style={miniSummary}>
      <span>
        Customer: <strong>{getPromiseCustomerName(promise) || "—"}</strong>
      </span>

      <span>
        Promised:{" "}
        <strong>{formatDisplayDate(promise.promised_date)}</strong>
      </span>

      <span>
        Remaining: <strong>{formatMoney(promise.remaining_amount)}</strong>
      </span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={fieldWrapper}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={detailItem}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
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

function getPromisePaymentFrequency(promise) {
  const deal = promise?.deals || {};

  if (deal?.deal_type === "Cash") return "Cash";

  if (deal?.deal_type === "Registration Money") {
    return "One-Time";
  }

  return (
    deal?.payment_frequency ||
    deal?.paymentFrequency ||
    promise?.payment_frequency ||
    promise?.paymentFrequency ||
    "Monthly"
  );
}

function getPaymentFrequencyLabel(frequency) {
  if (frequency === "Biweekly") return "Biweekly";
  if (frequency === "One-Time") return "One-Time";
  if (frequency === "Cash") return "Cash";
  return "Monthly";
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  return `${month}/${day}/${year}`;
}

function isActionablePromise(status) {
  return (
    status !== "Paid" &&
    status !== "Rescheduled" &&
    status !== "Cancelled" &&
    status !== "Partial Paid"
  );
}

function getPromiseRisk(promise) {
  const status = promise.promise_status || "Pending";

  if (status === "Paid") return "Completed";
  if (status === "Rescheduled") return "Rescheduled";
  if (status === "Cancelled") return "Cancelled";
  if (status === "Broken") return "Broken";

  if (promise.promised_date === todayString) {
    return "Due Today";
  }

  if (promise.promised_date && String(promise.promised_date) < todayString) {
    return "Past Due";
  }

  return "Active";
}

function sortPromisesByPriority(a, b) {
  const priority = {
    Broken: 1,
    "Past Due": 2,
    "Due Today": 3,
    Active: 4,
    Pending: 4,
    "Partial Paid": 5,
    Rescheduled: 6,
    Completed: 7,
    Cancelled: 8,
  };

  const aRisk = getPromiseRisk(a);
  const bRisk = getPromiseRisk(b);

  const riskSort = (priority[aRisk] || 99) - (priority[bRisk] || 99);

  if (riskSort !== 0) return riskSort;

  return String(a.promised_date || "").localeCompare(
    String(b.promised_date || "")
  );
}

function getFrequencyBadgeStyle(frequency) {
  const base = {
    padding: "4px 7px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    display: "inline-flex",
    whiteSpace: "nowrap",
    border: "1px solid transparent",
    width: "fit-content",
  };

  if (frequency === "Biweekly") {
    return {
      ...base,
      background: "#ede9fe",
      color: "#6d28d9",
      borderColor: "#ddd6fe",
    };
  }

  if (frequency === "One-Time") {
    return {
      ...base,
      background: "#ccfbf1",
      color: "#0f766e",
      borderColor: "#99f6e4",
    };
  }

  if (frequency === "Cash") {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#374151",
      borderColor: "#d1d5db",
    };
  }

  return {
    ...base,
    background: "#dbeafe",
    color: "#1d4ed8",
    borderColor: "#bfdbfe",
  };
}

function getStatusStyle(status) {
  const base = {
    padding: "5px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    display: "inline-flex",
    whiteSpace: "nowrap",
    width: "fit-content",
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
      background: "#fef3c7",
      color: "#92400e",
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

  if (status === "Cancelled") {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#4b5563",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
  };
}

function getRiskBadgeStyle(risk) {
  const base = {
    padding: "5px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    display: "inline-flex",
    whiteSpace: "nowrap",
    width: "fit-content",
  };

  if (risk === "Broken" || risk === "Past Due") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (risk === "Due Today") {
    return {
      ...base,
      background: "#ffedd5",
      color: "#9a3412",
    };
  }

  if (risk === "Completed") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (risk === "Rescheduled") {
    return {
      ...base,
      background: "#e0e7ff",
      color: "#3730a3",
    };
  }

  if (risk === "Cancelled") {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#4b5563",
    };
  }

  return {
    ...base,
    background: "#eff6ff",
    color: "#1d4ed8",
  };
}

const boxStyle = {
  background: "white",
  padding: "12px",
  borderRadius: "14px",
  marginTop: "12px",
  maxWidth: "100%",
  overflow: "hidden",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
  marginBottom: "8px",
  flexWrap: "wrap",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
};

const sectionDescription = {
  marginTop: "3px",
  marginBottom: 0,
  color: "#667085",
  fontSize: "12px",
};

const filterSelect = {
  border: "1px solid #d1d5db",
  borderRadius: "999px",
  padding: "8px 10px",
  fontSize: "12px",
  fontWeight: "800",
  background: "white",
};

const miniSummaryBar = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "7px 10px",
  marginBottom: "10px",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "800",
};

const warningText = {
  color: "#92400e",
};

const dangerText = {
  color: "#991b1b",
};

const tableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "auto",
};

const th = {
  background: "#f8fafc",
  color: "#475569",
  textAlign: "left",
  padding: "9px",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const td = {
  padding: "9px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  fontSize: "12px",
  verticalAlign: "top",
};

const promiseCell = {
  ...td,
  minWidth: "210px",
};

const customerNameText = {
  color: "#0A1A2F",
  fontWeight: "900",
  fontSize: "13px",
  display: "block",
};

const smallText = {
  marginTop: "3px",
  color: "#667085",
  fontSize: "11px",
  lineHeight: "1.3",
};

const statusStack = {
  display: "grid",
  gap: "5px",
};

const actionCell = {
  ...td,
  minWidth: "230px",
};

const actionGroup = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const buttonStyle = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  padding: "6px 9px",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "11px",
};

const blueButton = {
  ...buttonStyle,
  background: "#1d4ed8",
};

const brownButton = {
  ...buttonStyle,
  background: "#92400e",
};

const detailsButton = {
  ...buttonStyle,
  background: "#e5e7eb",
  color: "#111827",
};

const expandedRow = {
  background: "#f8fafc",
};

const detailsRow = {
  background: "#f8fafc",
  padding: "10px",
  borderBottom: "1px solid #e5e7eb",
};

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "8px",
};

const detailItem = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "8px",
  display: "grid",
  gap: "3px",
  color: "#111827",
  fontSize: "12px",
};

const notesBox = {
  marginTop: "8px",
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "8px",
  color: "#475569",
  fontSize: "12px",
  lineHeight: "1.4",
};

const modalBox = {
  background: "#f8fafc",
  padding: "12px",
  borderRadius: "12px",
  marginBottom: "12px",
  border: "1px solid #dbeafe",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "10px",
};

const modalTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "16px",
};

const modalCloseButton = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  border: "none",
  background: "#e5e7eb",
  color: "#111827",
  cursor: "pointer",
  fontSize: "17px",
  fontWeight: "900",
};

const miniSummary = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "8px",
  marginBottom: "10px",
  fontSize: "12px",
  color: "#475569",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "10px",
};

const fieldWrapper = {
  display: "grid",
  gap: "5px",
  marginTop: "8px",
};

const fieldLabel = {
  color: "#374151",
  fontSize: "12px",
  fontWeight: "900",
};

const inputStyle = {
  width: "100%",
  padding: "9px 10px",
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  boxSizing: "border-box",
  outline: "none",
  background: "white",
  fontSize: "13px",
};

const textAreaStyle = {
  ...inputStyle,
  minHeight: "64px",
  resize: "vertical",
  lineHeight: "1.4",
};

const modalActions = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "10px",
};

const cancelButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  padding: "6px 9px",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "11px",
};

const emptyState = {
  background: "#f9fafb",
  border: "1px dashed #cbd5e1",
  padding: "12px",
  borderRadius: "10px",
  color: "#475569",
  fontSize: "12px",
};

const messageStyle = {
  background: "#ecfdf5",
  color: "#166534",
  border: "1px solid #bbf7d0",
  padding: "8px 10px",
  borderRadius: "10px",
  fontWeight: "900",
  marginBottom: "10px",
  fontSize: "12px",
};

export default PromiseHistory;