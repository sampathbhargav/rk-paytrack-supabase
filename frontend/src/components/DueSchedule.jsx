import { useState } from "react";
import { addPaymentSkip, cancelPaymentSkip } from "../api/paymentSkipsApi";
import { getDealDueSchedule } from "../utils/duePaymentsUtils";
import { formatMoney } from "../utils/moneyUtils";
import {
  createGoogleCollectionReminder,
  createIcsCollectionReminder,
} from "../utils/calendarUtils";

function DueSchedule({
  deal,
  payments,
  promises = [],
  paymentSkips = [],
  onSkipUpdated,
}) {
  const [isSkipping, setIsSkipping] = useState(false);
  const [isCancellingSkip, setIsCancellingSkip] = useState(false);
  const schedule = getDealDueSchedule(deal, paymentSkips);
  const dealPaymentFrequency = getPaymentFrequency(deal);

  const scheduleWithStatus = schedule.map((installment) => {
    const paymentsForDueDate = payments.filter(
      (payment) =>
        String(payment.deal_id) === String(deal.id) &&
        payment.due_date === installment.dueDate &&
        payment.payment_status !== "Voided"
    );

    const paidForDueDateRaw = paymentsForDueDate.reduce(
      (sum, payment) => sum + Number(payment.amount_paid || 0),
      0
    );

    const amountDueCents = toCents(installment.amountDue);
    const paidForDueDateCents = installment.isSkipped
      ? 0
      : Math.min(toCents(paidForDueDateRaw), amountDueCents);
    const remainingCents = installment.isSkipped
      ? 0
      : Math.max(amountDueCents - paidForDueDateCents, 0);

    const paidForDueDate = fromCents(paidForDueDateCents);
    const remaining = fromCents(remainingCents);

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

    if (installment.isSkipped) {
      status = "Skipped";
      promiseStatus = "";
    } else if (remainingCents <= 0) {
      status = "Paid";
      promiseStatus = "";
    } else {
      if (paidForDueDateCents > 0) {
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

  const handleSkipPayment = async (item) => {
    if (!deal?.id || isSkipping) return;

    if (item.isSkipped) {
      alert("This installment is already skipped.");
      return;
    }

    if (item.isMovedFromSkip) {
      alert("This is already a moved skipped payment. It cannot be skipped again.");
      return;
    }

    if (toCents(item.remaining) <= 0) {
      alert("Paid installments cannot be skipped.");
      return;
    }

    const reason = window.prompt(
      `Reason for skipping installment #${item.installmentNumber} due ${formatDisplayDate(
        item.dueDate
      )}:`,
      "Customer requested to skip this payment"
    );

    if (reason === null) return;

    const confirmed = window.confirm(
      `Skip installment #${item.installmentNumber}?\n\nOriginal due date: ${formatDisplayDate(
        item.dueDate
      )}\nAmount moved to end: ${formatMoney(
        item.remaining || item.amountDue
      )}\n\nThis original due date will no longer appear as past due. A new payment will be added at the end of the schedule.`
    );

    if (!confirmed) return;

    try {
      setIsSkipping(true);

      await addPaymentSkip({
        dealId: deal.id,
        originalDueDate: item.dueDate,
        installmentNo: item.installmentNumber,
        amountDue: item.remaining || item.amountDue,
        skipReason: reason.trim(),
      });

      if (onSkipUpdated) {
        await onSkipUpdated();
      }
    } catch (error) {
      alert(error.message || "Unable to skip this payment.");
    } finally {
      setIsSkipping(false);
    }
  };

  const handleCancelSkipPayment = async (item) => {
    if (!deal?.id || isCancellingSkip) return;

    if (!item.skipId) {
      alert("Skip record was not found for this installment.");
      return;
    }

    const relatedOriginalInstallment = scheduleWithStatus.find(
      (scheduleItem) =>
        scheduleItem.skipId === item.skipId && scheduleItem.isSkipped
    );

    const relatedMovedInstallment = scheduleWithStatus.find(
      (scheduleItem) =>
        scheduleItem.skipId === item.skipId && scheduleItem.isMovedFromSkip
    );

    const originalDueDate = item.isMovedFromSkip
      ? item.originalDueDate || relatedOriginalInstallment?.dueDate || ""
      : item.dueDate || relatedOriginalInstallment?.dueDate || "";

    const originalInstallmentNumber =
      relatedOriginalInstallment?.installmentNumber || item.installmentNumber;

    const movedDueDate = item.isMovedFromSkip
      ? item.dueDate
      : item.movedDueDate || relatedMovedInstallment?.dueDate || "";

    if (!originalDueDate) {
      alert("Original skipped installment date could not be determined.");
      return;
    }

    const laterPayments = payments
      .filter(
        (payment) =>
          String(payment.deal_id) === String(deal.id) &&
          payment.payment_status !== "Voided" &&
          Number(payment.amount_paid || 0) > 0 &&
          payment.due_date &&
          payment.due_date > originalDueDate
      )
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));

    if (laterPayments.length > 0) {
      const firstBlockingPayment = laterPayments[0];

      alert(
        `This skip cannot be cancelled because a payment has already been recorded for a later installment.\n\nSkipped installment: #${originalInstallmentNumber} due ${formatDisplayDate(
          originalDueDate
        )}\nLater paid installment due: ${formatDisplayDate(
          firstBlockingPayment.due_date
        )}\n\nVoid all payments recorded for installments after the skipped installment before cancelling this skip.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Cancel skip for installment #${originalInstallmentNumber}?\n\nOriginal due date ${formatDisplayDate(
        originalDueDate
      )} will go back to normal.\nMoved final payment ${
        movedDueDate ? `due ${formatDisplayDate(movedDueDate)}` : ""
      } will disappear.\nDashboard and reports will recalculate automatically.`
    );

    if (!confirmed) return;

    try {
      setIsCancellingSkip(true);
      await cancelPaymentSkip(item.skipId);

      if (onSkipUpdated) {
        await onSkipUpdated();
      }
    } catch (error) {
      alert(error.message || "Unable to cancel this skipped payment.");
    } finally {
      setIsCancellingSkip(false);
    }
  };


  return (
    <div style={boxStyle}>
      <div style={sectionHeader}>
        <div>
          <h2 style={sectionTitle}>Due Schedule</h2>
          <p style={sectionDescription}>
            Monthly, biweekly, semi-monthly, or one-time installment schedule
            with paid, partial, due, past-due, skipped, promise status, and
            calendar reminders.
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
        ) : dealPaymentFrequency === "Semi-Monthly" ? (
          <>
            <div>
              <span style={summaryLabel}>First Payment Date</span>
              <strong>{formatDisplayDate(deal.first_payment_date)}</strong>
            </div>

            <div>
              <span style={summaryLabel}>First Due Day</span>
              <strong>
                {deal.due_day || getDayFromDate(deal.first_payment_date) || "—"}
              </strong>
            </div>

            <div>
              <span style={summaryLabel}>Second Due Day</span>
              <strong>{deal.second_due_day || "—"}</strong>
            </div>
          </>
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
            Check the deal payment frequency, start date, due day, second due
            day, first payment date, term, and payment amount to generate the
            schedule.
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
                <th style={th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {scheduleWithStatus.map((item) => (
                <tr
                  key={`${item.installmentNumber}-${item.dueDate}-${item.skipId || ""}`}
                  style={item.isSkipped ? skippedRowStyle : undefined}
                >
                  <td style={td}>{item.installmentNumber}</td>

                  <td style={td}>
                    <span style={getFrequencyBadgeStyle(item.paymentFrequency)}>
                      {getPaymentFrequencyLabel(item.paymentFrequency)}
                    </span>
                  </td>

                  <td style={td}>
                    {formatDisplayDate(item.dueDate)}
                    {item.isMovedFromSkip && (
                      <small style={movedNote}>
                        Moved from {formatDisplayDate(item.originalDueDate)}
                      </small>
                    )}
                  </td>
                  <td style={td}>{formatMoney(item.amountDue)}</td>
                  <td style={td}>{formatMoney(item.paidForDueDate)}</td>
                  <td style={td}>{formatMoney(item.remaining)}</td>

                  <td style={td}>
                    <span style={getStatusStyle(item.status)}>{item.status}</span>
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
                    {item.isSkipped ? (
                      <div style={reminderButtonRow}>
                        <span style={skippedText}>Skipped</span>
                        <button
                          type="button"
                          onClick={() => handleCancelSkipPayment(item)}
                          disabled={isCancellingSkip}
                          style={undoSkipButton}
                          title="Cancel this skipped payment"
                        >
                          ↩ Undo Skip
                        </button>
                      </div>
                    ) : item.remaining > 0 ? (
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

                        {item.isMovedFromSkip ? (
                          <button
                            type="button"
                            onClick={() => handleCancelSkipPayment(item)}
                            disabled={isCancellingSkip}
                            style={undoSkipButton}
                            title="Cancel this skipped payment"
                          >
                            ↩ Undo Skip
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSkipPayment(item)}
                            disabled={isSkipping}
                            style={skipButton}
                            title="Skip this payment and move it to the end"
                          >
                            ⏭️ Skip
                          </button>
                        )}
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

function toCents(value) {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.round(numberValue * 100);
}

function fromCents(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
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
  if (frequency === "Semi-Monthly") return "Semi-Monthly";
  if (frequency === "One-Time") return "One-Time";
  if (frequency === "Cash") return "Cash";
  return "Monthly";
}

function getPaymentAmountLabel(deal) {
  const frequency = getPaymentFrequency(deal);

  if (frequency === "Biweekly") return "Biweekly Payment";
  if (frequency === "Semi-Monthly") return "Semi-Monthly Payment";
  if (frequency === "One-Time") return "One-Time Amount";
  if (frequency === "Cash") return "Cash Amount";
  return "Monthly Payment";
}

function getDayFromDate(dateString) {
  if (!dateString) return "";

  const [, , day] = String(dateString).split("-");

  return day ? Number(day) : "";
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

  if (frequency === "Semi-Monthly") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
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

  if (status === "Skipped") {
    return {
      ...base,
      background: "#e5e7eb",
      color: "#374151",
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
  minWidth: "1220px",
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
  flexWrap: "wrap",
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

const skipButton = {
  background: "#7f1d1d",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "12px",
};

const undoSkipButton = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #cbd5e1",
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

const skippedText = {
  color: "#374151",
  fontWeight: "bold",
  fontSize: "13px",
};

const skippedRowStyle = {
  background: "#f3f4f6",
};

const movedNote = {
  display: "block",
  marginTop: "4px",
  color: "#92400e",
  fontWeight: "800",
  fontSize: "11px",
};

export default DueSchedule;
