import { useState } from "react";
import { voidPayment } from "../api/paymentsApi";
import { formatMoney } from "../utils/moneyUtils";

function PaymentHistory({ payments = [], onPaymentUpdated, openPaymentReceipt }) {
  const [voidReason, setVoidReason] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [message, setMessage] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});

  const sortedPayments = [...payments].sort((a, b) =>
    String(b.payment_date || "").localeCompare(String(a.payment_date || ""))
  );

  const paymentGroups = buildPaymentGroups(sortedPayments);

  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const totalCustomerPaid = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  const totalVoided = payments
    .filter((payment) => payment.payment_status === "Voided")
    .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);

  const lastActivePayment = [...activePayments].sort((a, b) =>
    String(b.payment_date || "").localeCompare(String(a.payment_date || ""))
  )[0];

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

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
          Compact view of what the customer paid and how each payment was
          applied.
        </p>
      </div>

      <div style={summaryBar}>
        <SummaryPill
          label="Total Paid"
          value={formatMoney(totalCustomerPaid)}
          tone="success"
        />

        <SummaryPill label="Transactions" value={paymentGroups.length} />

        <SummaryPill
          label="Payment Records"
          value={payments.length}
          helper="split payments create multiple records"
        />

        <SummaryPill
          label="Voided"
          value={formatMoney(totalVoided)}
          tone="danger"
        />

        <SummaryPill
          label="Last Payment"
          value={
            lastActivePayment
              ? formatDisplayDate(lastActivePayment.payment_date)
              : "—"
          }
          helper={
            lastActivePayment ? formatMoney(lastActivePayment.amount_paid) : ""
          }
        />
      </div>

      {selectedPayment && (
        <div style={voidBox}>
          <h3 style={voidTitle}>Void Payment</h3>

          <div style={voidSummaryGrid}>
            <MiniItem
              label="Customer Paid"
              value={formatMoney(selectedPayment.amount_paid)}
            />

            <MiniItem
              label="Payment Date"
              value={formatDisplayDate(selectedPayment.payment_date)}
            />

            <MiniItem
              label="Applied To"
              value={formatDisplayDate(selectedPayment.due_date)}
            />

            <MiniItem
              label="Method"
              value={selectedPayment.payment_method || "—"}
            />
          </div>

          <label style={labelStyle}>Void Reason</label>
          <textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            style={textareaStyle}
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

      {message && <p style={messageStyle}>{message}</p>}

      {sortedPayments.length === 0 ? (
        <div style={emptyState}>
          <strong>No payments recorded yet.</strong>
          <p>
            Use Add Payment to record the first customer payment for this deal.
          </p>
        </div>
      ) : (
        <div style={compactTableWrapper}>
          <table style={compactTable}>
            <thead>
              <tr>
                <th style={th}>Payment</th>
                <th style={rightTh}>Customer Paid</th>
                <th style={rightTh}>Applied Total</th>
                <th style={th}>Applied To</th>
                <th style={th}>Method</th>
                <th style={th}>Status</th>
                <th style={th}>Details</th>
              </tr>
            </thead>

            <tbody>
              {paymentGroups.map((group) => {
                const isExpanded = Boolean(expandedGroups[group.key]);

                return (
                  <>
                    <tr key={group.key} style={mainRow}>
                      <td style={td}>
                        <strong>{formatDisplayDate(group.paymentDate)}</strong>
                        <div style={smallText}>
                          {group.isSplitPayment
                            ? `${group.payments.length} installments`
                            : "Single installment"}
                        </div>
                      </td>

                      <td style={rightTd}>
                        <strong style={paidAmountText}>
                          {formatMoney(group.customerPaid)}
                        </strong>
                      </td>

                      <td style={rightTd}>
                        {formatMoney(group.appliedTotal)}
                      </td>

                      <td style={td}>
                        <strong>{getAppliedSummary(group.payments)}</strong>
                        <div style={smallText}>
                          {group.isSplitPayment
                            ? "Split payment"
                            : getSinglePaymentType(group.payments[0])}
                        </div>
                      </td>

                      <td style={td}>{group.paymentMethod || "Other"}</td>

                      <td style={td}>
                        <span style={getGroupStatusStyle(group.status)}>
                          {group.status}
                        </span>
                      </td>

                      <td style={td}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          style={detailsButton}
                        >
                          {isExpanded ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${group.key}-details`}>
                        <td colSpan={7} style={detailsTd}>
                          <div style={detailsBox}>
                            <div style={detailsHeader}>
                              <strong>How this payment was applied</strong>

                              {group.notes && (
                                <span style={detailNotes}>
                                  Notes: {group.notes}
                                </span>
                              )}
                            </div>

                            <div style={miniTableWrapper}>
                              <table style={miniTable}>
                                <thead>
                                  <tr>
                                    <th style={miniTh}>Due Date</th>
                                    <th style={miniTh}>Frequency</th>
                                    <th style={miniRightTh}>Installment Balance</th>
                                    <th style={miniRightTh}>Applied</th>
                                    <th style={miniRightTh}>Remaining</th>
                                    <th style={miniTh}>Type</th>
                                    <th style={miniTh}>Action</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {group.payments.map((payment) => {
                                    const frequency = getPaymentFrequency(payment);

                                    return (
                                      <tr key={payment.id}>
                                        <td style={miniTd}>
                                          <strong>
                                            {getInstallmentLabel(payment)}
                                          </strong>
                                          <div style={smallText}>
                                            {formatDisplayDate(payment.due_date)}
                                          </div>
                                        </td>

                                        <td style={miniTd}>
                                          <span
                                            style={getFrequencyBadgeStyle(
                                              frequency
                                            )}
                                          >
                                            {getPaymentFrequencyLabel(frequency)}
                                          </span>
                                        </td>

                                        <td style={miniRightTd}>
                                          {formatMoney(payment.amount_due)}
                                        </td>

                                        <td style={miniRightTd}>
                                          <strong>
                                            {formatMoney(payment.amount_paid)}
                                          </strong>
                                        </td>

                                        <td style={miniRightTd}>
                                          <strong
                                            style={{
                                              color:
                                                Number(
                                                  payment.remaining_amount || 0
                                                ) > 0
                                                  ? "#991b1b"
                                                  : "#166534",
                                            }}
                                          >
                                            {formatMoney(
                                              payment.remaining_amount
                                            )}
                                          </strong>
                                        </td>

                                        <td style={miniTd}>
                                          {payment.payment_type || "—"}
                                        </td>

                                        <td style={miniTd}>
                                          {payment.payment_status ===
                                          "Voided" ? (
                                            <div style={voidedReasonBox}>
                                              {payment.void_reason || "Voided"}
                                            </div>
                                          ) : (
                                            <div style={actionButtonRow}>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedPayment(payment);
                                                  setVoidReason("");
                                                  setMessage("");
                                                }}
                                                style={buttonStyle}
                                              >
                                                Void
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (openPaymentReceipt) {
                                                    openPaymentReceipt(payment);
                                                  }
                                                }}
                                                style={receiptIconButton}
                                                title="Print Receipt"
                                              >
                                                🧾
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function buildPaymentGroups(payments) {
  const groupMap = new Map();

  payments.forEach((payment, index) => {
    const statedCustomerPaid = getStatedCustomerPaid(payment);
    const isSplitPayment = statedCustomerPaid !== null;

    const key = isSplitPayment
      ? [
          "split",
          payment.deal_id || "",
          payment.payment_date || "",
          payment.payment_method || "",
          statedCustomerPaid,
          getCreatedMinuteBucket(payment),
        ].join("|")
      : `single-${payment.id || index}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        paymentDate: payment.payment_date || "",
        paymentMethod: payment.payment_method || "Other",
        customerPaid: statedCustomerPaid || Number(payment.amount_paid || 0),
        appliedTotal: 0,
        status: "Active",
        isSplitPayment,
        notes: "",
        payments: [],
      });
    }

    const group = groupMap.get(key);

    group.payments.push(payment);
    group.appliedTotal += Number(payment.amount_paid || 0);

    if (!group.notes && payment.notes) {
      group.notes = cleanPaymentNotes(payment.notes);
    }

    if (statedCustomerPaid !== null) {
      group.customerPaid = statedCustomerPaid;
    }
  });

  return Array.from(groupMap.values())
    .map((group) => ({
      ...group,
      status: getGroupStatus(group.payments),
      appliedTotal: Number(group.appliedTotal.toFixed(2)),
      customerPaid: Number(group.customerPaid || 0),
    }))
    .sort((a, b) =>
      String(b.paymentDate || "").localeCompare(String(a.paymentDate || ""))
    );
}

function getGroupStatus(payments) {
  const allVoided = payments.every(
    (payment) => payment.payment_status === "Voided"
  );

  const someVoided = payments.some(
    (payment) => payment.payment_status === "Voided"
  );

  const somePartial = payments.some(
    (payment) =>
      payment.payment_status === "Partial" ||
      Number(payment.remaining_amount || 0) > 0
  );

  if (allVoided) return "Voided";
  if (someVoided) return "Partially Voided";
  if (somePartial) return "Partial";
  return "Active";
}

function getStatedCustomerPaid(payment) {
  const notes = String(payment?.notes || "");

  const match = notes.match(
    /total customer payment of\s+\$?([\d,]+(?:\.\d{1,2})?)/i
  );

  if (!match) return null;

  const amount = Number(String(match[1]).replace(/,/g, ""));

  if (Number.isNaN(amount)) return null;

  return amount;
}

function getCreatedMinuteBucket(payment) {
  if (!payment?.created_at) return "";
  return String(payment.created_at).slice(0, 16);
}

function getInstallmentLabel(payment) {
  const notes = String(payment?.notes || "");
  const match = notes.match(/installment\s+(\d+)/i);

  if (match?.[1]) {
    return `Installment ${match[1]}`;
  }

  return "Installment";
}

function getAppliedSummary(payments) {
  if (!payments || payments.length === 0) return "—";

  if (payments.length === 1) {
    return formatDisplayDate(payments[0].due_date);
  }

  const dates = payments
    .map((payment) => formatDisplayDate(payment.due_date))
    .filter(Boolean);

  return `${dates[0]} + ${payments.length - 1} more`;
}

function getSinglePaymentType(payment) {
  if (!payment) return "Payment";

  const frequency = getPaymentFrequency(payment);
  const type = payment.payment_type || "Payment";

  return `${getPaymentFrequencyLabel(frequency)} · ${type}`;
}

function cleanPaymentNotes(notes) {
  if (!notes) return "";

  return String(notes)
    .replace(
      /Auto-applied from total customer payment of\s+\$?[\d,]+(?:\.\d{1,2})?\.\s*/i,
      ""
    )
    .trim();
}

function SummaryPill({ label, value, helper, tone = "default" }) {
  return (
    <div style={{ ...summaryPill, ...getSummaryToneStyle(tone) }}>
      <span style={summaryPillLabel}>{label}</span>
      <strong style={summaryPillValue}>{value}</strong>
      {helper && <small style={summaryPillHelper}>{helper}</small>}
    </div>
  );
}

function MiniItem({ label, value }) {
  return (
    <div>
      <span style={miniLabel}>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function getPaymentFrequency(payment) {
  const paymentType = String(payment?.payment_type || "").toLowerCase();

  if (
    payment?.payment_frequency === "Biweekly" ||
    payment?.paymentFrequency === "Biweekly" ||
    payment?.deals?.payment_frequency === "Biweekly" ||
    paymentType.includes("biweekly")
  ) {
    return "Biweekly";
  }

  if (
    payment?.payment_frequency === "One-Time" ||
    payment?.paymentFrequency === "One-Time" ||
    payment?.deals?.deal_type === "Registration Money" ||
    paymentType.includes("one-time")
  ) {
    return "One-Time";
  }

  if (
    payment?.payment_frequency === "Cash" ||
    payment?.paymentFrequency === "Cash" ||
    payment?.deals?.deal_type === "Cash"
  ) {
    return "Cash";
  }

  return "Monthly";
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

function getSummaryToneStyle(tone) {
  if (tone === "success") {
    return {
      borderLeft: "4px solid #16a34a",
    };
  }

  if (tone === "danger") {
    return {
      borderLeft: "4px solid #991b1b",
    };
  }

  return {
    borderLeft: "4px solid #cbd5e1",
  };
}

function getFrequencyBadgeStyle(frequency) {
  const base = {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    whiteSpace: "nowrap",
    border: "1px solid transparent",
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

function getGroupStatusStyle(status) {
  const base = {
    display: "inline-flex",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  };

  if (status === "Voided") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (status === "Partially Voided") {
    return {
      ...base,
      background: "#ffedd5",
      color: "#9a3412",
    };
  }

  if (status === "Partial") {
    return {
      ...base,
      background: "#fef9c3",
      color: "#854d0e",
    };
  }

  return {
    ...base,
    background: "#dcfce7",
    color: "#166534",
  };
}

const boxStyle = {
  background: "white",
  padding: "18px",
  borderRadius: "12px",
  marginTop: "25px",
  maxWidth: "100%",
  overflow: "hidden",
  boxSizing: "border-box",
};

const sectionHeader = {
  marginBottom: "12px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
};

const sectionDescription = {
  marginTop: "5px",
  marginBottom: 0,
  color: "#667085",
  fontSize: "13px",
  lineHeight: "1.4",
};

const summaryBar = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
  gap: "8px",
  marginBottom: "14px",
};

const summaryPill = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "9px 10px",
  display: "grid",
  gap: "2px",
};

const summaryPillLabel = {
  color: "#667085",
  fontSize: "11px",
  fontWeight: "900",
};

const summaryPillValue = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "900",
};

const summaryPillHelper = {
  color: "#667085",
  fontSize: "10px",
};

const compactTableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
};

const compactTable = {
  width: "100%",
  minWidth: "940px",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "9px 10px",
  borderBottom: "1px solid #ddd",
  background: "#f9fafb",
  color: "#334155",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const rightTh = {
  ...th,
  textAlign: "right",
};

const mainRow = {
  background: "white",
};

const td = {
  padding: "9px 10px",
  borderBottom: "1px solid #eee",
  color: "#111827",
  fontSize: "13px",
  verticalAlign: "middle",
};

const rightTd = {
  ...td,
  textAlign: "right",
  whiteSpace: "nowrap",
};

const paidAmountText = {
  color: "#166534",
};

const smallText = {
  display: "block",
  color: "#667085",
  fontSize: "11px",
  marginTop: "2px",
};

const detailsButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  padding: "7px 10px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "800",
  fontSize: "12px",
};

const detailsTd = {
  padding: 0,
  borderBottom: "1px solid #e5e7eb",
  background: "#f8fafc",
};

const detailsBox = {
  padding: "12px",
};

const detailsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "9px",
  color: "#111827",
};

const detailNotes = {
  color: "#92400e",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "11px",
  fontWeight: "800",
};

const miniTableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  background: "white",
};

const miniTable = {
  width: "100%",
  minWidth: "850px",
  borderCollapse: "collapse",
};

const miniTh = {
  textAlign: "left",
  padding: "8px",
  borderBottom: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#334155",
  fontSize: "11px",
  textTransform: "uppercase",
};

const miniRightTh = {
  ...miniTh,
  textAlign: "right",
};

const miniTd = {
  padding: "8px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  fontSize: "12px",
  verticalAlign: "middle",
};

const miniRightTd = {
  ...miniTd,
  textAlign: "right",
  whiteSpace: "nowrap",
};

const actionButtonRow = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
};

const buttonStyle = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  padding: "7px 9px",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "800",
  fontSize: "11px",
};

const receiptIconButton = {
  background: "#166534",
  color: "white",
  border: "none",
  borderRadius: "7px",
  width: "30px",
  height: "30px",
  cursor: "pointer",
  fontSize: "15px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const voidedReasonBox = {
  color: "#991b1b",
  fontWeight: "bold",
  background: "#fee2e2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "6px 8px",
  fontSize: "11px",
};

const voidBox = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  padding: "13px",
  borderRadius: "12px",
  marginBottom: "14px",
};

const voidTitle = {
  marginTop: 0,
  color: "#111827",
};

const voidSummaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "10px",
  background: "white",
  border: "1px solid #fed7aa",
  borderRadius: "10px",
  padding: "10px",
  marginBottom: "12px",
};

const miniLabel = {
  display: "block",
  color: "#667085",
  fontSize: "11px",
  fontWeight: "800",
  marginBottom: "3px",
};

const labelStyle = {
  display: "block",
  fontWeight: "800",
  color: "#374151",
  marginBottom: "6px",
};

const textareaStyle = {
  width: "100%",
  padding: "9px",
  marginTop: "5px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  height: "70px",
  resize: "vertical",
  boxSizing: "border-box",
};

const dangerButtonStyle = {
  background: "#991b1b",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  marginTop: "10px",
  marginRight: "9px",
  fontWeight: "800",
};

const cancelButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  marginTop: "10px",
  fontWeight: "800",
};

const emptyState = {
  background: "#f9fafb",
  border: "1px dashed #cbd5e1",
  padding: "14px",
  borderRadius: "10px",
  color: "#475569",
  marginTop: "12px",
};

const messageStyle = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  padding: "9px 11px",
  borderRadius: "10px",
  fontWeight: "800",
};

export default PaymentHistory;