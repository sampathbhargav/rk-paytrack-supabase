import { getDealDueSchedule } from "../utils/duePaymentsUtils";
import { formatMoney } from "../utils/moneyUtils";
import {
  createGoogleCollectionReminder,
  createIcsCollectionReminder,
} from "../utils/calendarUtils";

function DueSchedule({ deal, payments, promises = [] }) {
  const schedule = getDealDueSchedule(deal);
  const dealPaymentFrequency = getPaymentFrequency(deal);

  const scheduleWithStatus = schedule.map((installment) => {
    const paymentsForDueDate = payments.filter(
      (payment) =>
        String(payment.deal_id) === String(deal.id) &&
        payment.due_date === installment.dueDate &&
        payment.payment_status !== "Voided"
    );

    const paidForDueDate = paymentsForDueDate.reduce(
      (sum, payment) => sum + Number(payment.amount_paid || 0),
      0
    );

    const remaining = Math.max(
      Number(installment.amountDue || 0) - paidForDueDate,
      0
    );

    const relatedPromises = promises.filter(
      (promise) =>
        String(promise.deal_id) === String(deal.id) &&
        promise.original_due_date === installment.dueDate
    );

    const pendingPromise = relatedPromises.find(
      (promise) => promise.promise_status === "Pending"
    );

    const brokenPromise = relatedPromises.find(
      (promise) => promise.promise_status === "Broken"
    );

    const today = new Date().toISOString().split("T")[0];

    let status = "Due";
    let promiseStatus = "";

    if (paidForDueDate >= Number(installment.amountDue || 0)) {
      status = "Paid";
      promiseStatus = "";
    } else {
      if (paidForDueDate > 0) {
        status = "Partial";
      } else if (installment.dueDate < today) {
        status = "Past Due";
      }

      if (pendingPromise) {
        promiseStatus = "Promise Pending";
      }

      if (brokenPromise) {
        promiseStatus = "Promise Broken";
      }
    }

    return {
      ...installment,
      paymentFrequency: installment.paymentFrequency || dealPaymentFrequency,
      paidForDueDate,
      remaining,
      status,
      promiseStatus,
    };
  });

  const buildReminderData = (item) => ({
    customerName: deal.customers?.customer_name || "",
    phone: deal.customers?.phone || "",
    dealTag: deal.deal_tag || "",
    truck: `${deal.year || ""} ${deal.truck || ""}`.trim(),
    dueDate: item.dueDate,
    installmentNumber: item.installmentNumber,
    amountDue: item.amountDue,
    paidAmount: item.paidForDueDate,
    remainingAmount: item.remaining,
    notes: `${getPaymentFrequencyLabel(
      item.paymentFrequency
    )} collection reminder for installment ${item.installmentNumber}`,
  });

  const handleGoogleReminder = (item) => {
    createGoogleCollectionReminder(buildReminderData(item));
  };

  const handleIcsReminder = (item) => {
    createIcsCollectionReminder(buildReminderData(item));
  };

  return (
    <div style={boxStyle}>
      <div style={sectionHeader}>
        <div>
          <h2 style={sectionTitle}>Due Schedule</h2>
          <p style={sectionDescription}>
            Monthly, biweekly, or one-time installment schedule with paid,
            partial, due, past-due, promise status, and calendar reminders.
          </p>
        </div>

        <span style={getFrequencyBadgeStyle(dealPaymentFrequency)}>
          {getPaymentFrequencyLabel(dealPaymentFrequency)}
        </span>
      </div>

      <div style={scheduleSummaryBox}>
        <div>
          <span style={summaryLabel}>Payment Frequency</span>
          <strong>{getPaymentFrequencyLabel(dealPaymentFrequency)}</strong>
        </div>

        <div>
          <span style={summaryLabel}>{getPaymentAmountLabel(deal)}</span>
          <strong>{formatMoney(deal.monthly_payment)}</strong>
        </div>

        {dealPaymentFrequency === "Biweekly" ? (
          <div>
            <span style={summaryLabel}>First Payment Date</span>
            <strong>{formatDisplayDate(deal.first_payment_date)}</strong>
          </div>
        ) : dealPaymentFrequency === "Monthly" ? (
          <div>
            <span style={summaryLabel}>Due Day</span>
            <strong>{deal.due_day || "—"}</strong>
          </div>
        ) : (
          <div>
            <span style={summaryLabel}>Due Date</span>
            <strong>{formatDisplayDate(deal.start_date)}</strong>
          </div>
        )}

        <div>
          <span style={summaryLabel}>Term / Payments</span>
          <strong>{deal.term || scheduleWithStatus.length || "—"}</strong>
        </div>
      </div>

      {scheduleWithStatus.length === 0 ? (
        <div style={emptyState}>
          <strong>No due schedule available.</strong>
          <p>
            Check the deal payment frequency, start date, due day or first
            payment date, term, and payment amount to generate the schedule.
          </p>
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={th}>Installment</th>
                <th style={th}>Frequency</th>
                <th style={th}>Due Date</th>
                <th style={th}>Amount Due</th>
                <th style={th}>Paid</th>
                <th style={th}>Remaining</th>
                <th style={th}>Status</th>
                <th style={th}>Promise</th>
                <th style={th}>Reminder</th>
              </tr>
            </thead>

            <tbody>
              {scheduleWithStatus.map((item) => (
                <tr key={`${item.installmentNumber}-${item.dueDate}`}>
                  <td style={td}>{item.installmentNumber}</td>

                  <td style={td}>
                    <span style={getFrequencyBadgeStyle(item.paymentFrequency)}>
                      {getPaymentFrequencyLabel(item.paymentFrequency)}
                    </span>
                  </td>

                  <td style={td}>{formatDisplayDate(item.dueDate)}</td>
                  <td style={td}>{formatMoney(item.amountDue)}</td>
                  <td style={td}>{formatMoney(item.paidForDueDate)}</td>
                  <td style={td}>{formatMoney(item.remaining)}</td>

                  <td style={td}>
                    <span style={getStatusStyle(item.status)}>
                      {item.status}
                    </span>
                  </td>

                  <td style={td}>
                    {item.promiseStatus ? (
                      <span style={getPromiseStyle(item.promiseStatus)}>
                        {item.promiseStatus}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td style={td}>
                    {item.remaining > 0 ? (
                      <div style={reminderButtonRow}>
                        <button
                          type="button"
                          onClick={() => handleGoogleReminder(item)}
                          style={googleButton}
                          title="Create Google Calendar reminder"
                        >
                          📅 Google
                        </button>

                        <button
                          type="button"
                          onClick={() => handleIcsReminder(item)}
                          style={icsButton}
                          title="Download ICS calendar reminder"
                        >
                          🗓️ ICS
                        </button>
                      </div>
                    ) : (
                      <span style={paidText}>Paid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getPaymentFrequency(deal) {
  if (deal?.deal_type === "Cash") return "Cash";

  if (deal?.deal_type === "Registration Money") {
    return "One-Time";
  }

  return deal?.payment_frequency || deal?.paymentFrequency || "Monthly";
}

function getPaymentFrequencyLabel(frequency) {
  if (frequency === "Biweekly") return "Biweekly";
  if (frequency === "One-Time") return "One-Time";
  if (frequency === "Cash") return "Cash";
  return "Monthly";
}

function getPaymentAmountLabel(deal) {
  const frequency = getPaymentFrequency(deal);

  if (frequency === "Biweekly") return "Biweekly Payment";
  if (frequency === "One-Time") return "One-Time Amount";
  if (frequency === "Cash") return "Cash Amount";
  return "Monthly Payment";
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  return `${month}/${day}/${year}`;
}

function getFrequencyBadgeStyle(frequency) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
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

function getStatusStyle(status) {
  const base = {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  };

  if (status === "Paid") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "Partial") {
    return {
      ...base,
      background: "#fef9c3",
      color: "#854d0e",
    };
  }

  if (status === "Past Due") {
    return {
      ...base,
      background: "#7f1d1d",
      color: "#ffffff",
    };
  }

  if (status === "Due") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
  };
}

function getPromiseStyle(status) {
  const base = {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  };

  if (status === "Promise Pending") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (status === "Promise Broken") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
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
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const tableWrap = {
  width: "100%",
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  minWidth: "1120px",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #ddd",
  background: "#f9fafb",
  whiteSpace: "nowrap",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "14px",
  flexWrap: "wrap",
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

const scheduleSummaryBox = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  padding: "14px",
  borderRadius: "12px",
  marginBottom: "16px",
};

const summaryLabel = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  fontWeight: "800",
  marginBottom: "5px",
};

const emptyState = {
  background: "#f9fafb",
  border: "1px dashed #cbd5e1",
  padding: "16px",
  borderRadius: "10px",
  color: "#475569",
};

const reminderButtonRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const googleButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "12px",
};

const icsButton = {
  background: "#166534",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "12px",
};

const paidText = {
  color: "#166534",
  fontWeight: "bold",
  fontSize: "13px",
};

export default DueSchedule;