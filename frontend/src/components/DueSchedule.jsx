import { getDealDueSchedule } from "../utils/duePaymentsUtils";
import { formatMoney } from "../utils/moneyUtils";

function DueSchedule({ deal, payments, promises = [] }) {
  const schedule = getDealDueSchedule(deal);

  const scheduleWithStatus = schedule.map((installment) => {
    const paymentsForDueDate = payments.filter(
      (payment) =>
        payment.deal_id === deal.id &&
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
        promise.deal_id === deal.id &&
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

    if (paidForDueDate >= installment.amountDue) {
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
      paidForDueDate,
      remaining,
      status,
      promiseStatus,
    };
  });

  return (
    <div style={boxStyle}>
      <div style={sectionHeader}>
        <h2 style={sectionTitle}>Due Schedule</h2>
        <p style={sectionDescription}>
          Monthly installment schedule with paid, partial, due, past-due, and promise status.
        </p>
      </div>

      {scheduleWithStatus.length === 0 ? (
        <div style={emptyState}>
          <strong>No due schedule available.</strong>
          <p>
            Check the deal start date, due day, term, and monthly payment to generate the installment schedule.
          </p>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Installment</th>
              <th style={th}>Due Date</th>
              <th style={th}>Amount Due</th>
              <th style={th}>Paid</th>
              <th style={th}>Remaining</th>
              <th style={th}>Status</th>
              <th style={th}>Promise</th>
            </tr>
          </thead>

          <tbody>
            {scheduleWithStatus.map((item) => (
              <tr key={item.installmentNumber}>
                <td style={td}>{item.installmentNumber}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
}

function getStatusStyle(status) {
  const base = {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "bold",
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

const emptyState = {
  background: "#f9fafb",
  border: "1px dashed #cbd5e1",
  padding: "16px",
  borderRadius: "10px",
  color: "#475569",
};

export default DueSchedule;