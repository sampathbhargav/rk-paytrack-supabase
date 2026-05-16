import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDeals } from "../api/dealsApi";
import { getPayments } from "../api/paymentsApi";
import { getPromises, updateBrokenPromises } from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";
import { getDueDealsForDate } from "../utils/duePaymentsUtils";

function DuePayments() {
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError("");

      await updateBrokenPromises();

      const dealsData = await getDeals();
      const paymentsData = await getPayments();
      const promisesData = await getPromises();

      setDeals(dealsData);
      setPayments(paymentsData);
      setPromises(promisesData);
    } catch (error) {
      setError(error.message);
    }
  };

  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const dueDeals = getDueDealsForDate(deals, activePayments, selectedDate);

  const scheduledUnpaidOrPartial = dueDeals.filter(
    (item) => item.status === "Due" || item.status === "Partial"
  );

  const promisesDue = promises.filter((promise) => {
    return (
      promise.promised_date === selectedDate &&
      promise.promise_status !== "Paid" &&
      promise.promise_status !== "Rescheduled" &&
      promise.promise_status !== "Cancelled" &&
      promise.promise_status !== "Partial Paid"
    );
  });

  const brokenPromisesDue = promisesDue.filter(
    (promise) => promise.promise_status === "Broken"
  );

  const pendingPromisesDue = promisesDue.filter(
    (promise) => promise.promise_status === "Pending"
  );

  const totalScheduledDue = scheduledUnpaidOrPartial.reduce(
    (sum, item) => sum + Number(item.remainingForDueDate || 0),
    0
  );

  const totalPromiseDue = promisesDue.reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  const totalDue = totalScheduledDue + totalPromiseDue;

  const isToday = selectedDate === today;
  const pageDateLabel = isToday ? "Today" : formatDisplayDate(selectedDate);

  return (
    <div style={pageWrapper}>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>Due Payments</h1>
          <p style={pageDescription}>
            View scheduled installments and customer promises due on a selected date.
          </p>
        </div>

        <div style={dateBadge}>
          Viewing: <strong>{pageDateLabel}</strong>
        </div>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={controlBox}>
        <div>
          <label style={labelStyle}>Select Due Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={quickDateButtons}>
          <button
            type="button"
            style={secondaryButton}
            onClick={() => setSelectedDate(today)}
          >
            Today
          </button>

          <button
            type="button"
            style={secondaryButton}
            onClick={() => setSelectedDate(getDateOffset(today, 1))}
          >
            Tomorrow
          </button>

          <button
            type="button"
            style={secondaryButton}
            onClick={() => setSelectedDate(getDateOffset(today, -1))}
          >
            Yesterday
          </button>
        </div>
      </div>

      <div style={cardGrid}>
        <Card
          title="Scheduled Payments Due"
          value={scheduledUnpaidOrPartial.length}
          tone="warning"
        />
        <Card
          title="Scheduled Amount Due"
          value={formatMoney(totalScheduledDue)}
          tone="warning"
        />
        <Card title="Promises Due" value={promisesDue.length} tone="info" />
        <Card
          title="Promise Amount Due"
          value={formatMoney(totalPromiseDue)}
          tone="info"
        />
        <Card title="Total Due" value={formatMoney(totalDue)} tone="danger" />
        <Card
          title="Broken Promises Due"
          value={brokenPromisesDue.length}
          tone="danger"
        />
      </div>

      <div style={summaryStrip}>
        <SummaryItem label="Selected Date" value={formatDisplayDate(selectedDate)} />
        <SummaryItem label="Pending Promises" value={pendingPromisesDue.length} />
        <SummaryItem label="Broken Promises" value={brokenPromisesDue.length} />
        <SummaryItem
          label="Total Follow-Ups"
          value={scheduledUnpaidOrPartial.length + promisesDue.length}
        />
      </div>

      <div style={tableBox}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Scheduled Payments Due</h2>
          <p style={sectionDescription}>
            Deal Tag stays locked. Scroll inside the table to view more columns or rows.
          </p>
        </div>

        {scheduledUnpaidOrPartial.length === 0 ? (
          <EmptyState
            title="No scheduled payments due for this date."
            message="There are no active scheduled installments that need payment follow-up for the selected date."
          />
        ) : (
          <div style={tableScroll}>
            <table style={scheduledTableStyle}>
              <thead>
                <tr>
                  <th style={stickyTh}>Deal Tag</th>
                  <th style={{ ...th, width: "165px" }}>Customer</th>
                  <th style={{ ...th, width: "115px" }}>Phone</th>
                  <th style={{ ...th, width: "90px" }}>Installment</th>
                  <th style={{ ...th, width: "125px" }}>Deal Type</th>
                  <th style={{ ...th, width: "145px" }}>Truck</th>
                  <th style={{ ...th, width: "105px" }}>Amount Due</th>
                  <th style={{ ...th, width: "95px" }}>Paid</th>
                  <th style={{ ...th, width: "105px" }}>Remaining</th>
                  <th style={{ ...th, width: "105px" }}>Status</th>
                </tr>
              </thead>

              <tbody>
                {scheduledUnpaidOrPartial.map((item) => (
                  <tr key={`${item.deal.id}-${item.dueDate}`}>
                    <td style={stickyTd}>
                      <Link to={`/deals/${item.deal.id}`} style={dealLink}>
                        {item.deal.deal_tag}
                      </Link>
                    </td>

                    <td style={customerCell}>
                      {item.deal.customers?.customer_name || "—"}
                    </td>

                    <td style={td}>{item.deal.customers?.phone || "—"}</td>

                    <td style={td}>{item.installmentNumber}</td>

                    <td style={wrapCell}>{item.deal.deal_type || "—"}</td>

                    <td style={wrapCell}>
                      {item.deal.year || ""} {item.deal.truck || ""}
                    </td>

                    <td style={moneyCell}>{formatMoney(item.amountDue)}</td>

                    <td style={moneyCell}>{formatMoney(item.paidForDueDate)}</td>

                    <td style={moneyCell}>
                      {formatMoney(item.remainingForDueDate)}
                    </td>

                    <td style={td}>
                      <span style={getStatusStyle(item.status)}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={tableBox}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Promises Due</h2>
          <p style={sectionDescription}>
            Deal Tag stays locked. Customer promises due on this date, including pending and broken promise follow-ups.
          </p>
        </div>

        {promisesDue.length === 0 ? (
          <EmptyState
            title="No promises due for this date."
            message="There are no active customer promises to follow up for the selected date."
          />
        ) : (
          <div style={tableScroll}>
            <table style={promiseTableStyle}>
              <thead>
                <tr>
                  <th style={stickyTh}>Deal Tag</th>
                  <th style={{ ...th, width: "165px" }}>Customer</th>
                  <th style={{ ...th, width: "115px" }}>Phone</th>
                  <th style={{ ...th, width: "120px" }}>Original Due</th>
                  <th style={{ ...th, width: "120px" }}>Promised Date</th>
                  <th style={{ ...th, width: "110px" }}>Amount Due</th>
                  <th style={{ ...th, width: "115px" }}>Status</th>
                  <th style={{ ...th, width: "220px" }}>Notes</th>
                </tr>
              </thead>

              <tbody>
                {promisesDue.map((promise) => (
                  <tr key={promise.id}>
                    <td style={stickyTd}>
                      {promise.deals?.id ? (
                        <Link to={`/deals/${promise.deals.id}`} style={dealLink}>
                          {promise.deals?.deal_tag || "—"}
                        </Link>
                      ) : (
                        <span style={missingDealTag}>
                          {promise.deals?.deal_tag || "—"}
                        </span>
                      )}
                    </td>

                    <td style={customerCell}>
                      {promise.deals?.customers?.customer_name || "—"}
                    </td>

                    <td style={td}>{promise.deals?.customers?.phone || "—"}</td>

                    <td style={td}>
                      {formatDisplayDate(promise.original_due_date)}
                    </td>

                    <td style={td}>{formatDisplayDate(promise.promised_date)}</td>

                    <td style={moneyCell}>
                      {formatMoney(promise.remaining_amount)}
                    </td>

                    <td style={td}>
                      <span style={getPromiseStatusStyle(promise.promise_status)}>
                        {promise.promise_status}
                      </span>
                    </td>

                    <td style={notesCell}>{promise.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, value, tone = "default" }) {
  return (
    <div style={{ ...cardStyle, ...getCardToneStyle(tone) }}>
      <p style={{ margin: 0, color: "#667085", fontSize: "12px" }}>{title}</p>
      <h3 style={{ marginTop: "6px", marginBottom: 0, fontSize: "19px" }}>
        {value}
      </h3>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <span style={summaryLabel}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div style={emptyState}>
      <strong>{title}</strong>
      <p style={{ margin: "6px 0 0" }}>{message}</p>
    </div>
  );
}

function getCardToneStyle(tone) {
  if (tone === "danger") return { borderLeft: "4px solid #991b1b" };
  if (tone === "warning") return { borderLeft: "4px solid #f59e0b" };
  if (tone === "info") return { borderLeft: "4px solid #2563eb" };

  return { borderLeft: "4px solid transparent" };
}

function getStatusStyle(status) {
  const base = {
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    display: "inline-block",
  };

  if (status === "Partial") {
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
    background: "#fee2e2",
    color: "#991b1b",
  };
}

function getPromiseStatusStyle(status) {
  const base = {
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    display: "inline-block",
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
      background: "#dbeafe",
      color: "#1d4ed8",
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

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
}

function getDateOffset(dateString, offsetDays) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap",
  maxWidth: "100%",
};

const pageTitle = {
  margin: 0,
  color: "#111827",
};

const pageDescription = {
  marginTop: "6px",
  color: "#667085",
  maxWidth: "680px",
};

const dateBadge = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "9px 14px",
  color: "#374151",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  whiteSpace: "nowrap",
};

const controlBox = {
  background: "white",
  padding: "14px",
  borderRadius: "12px",
  marginBottom: "14px",
  display: "flex",
  alignItems: "flex-end",
  gap: "12px",
  flexWrap: "wrap",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontWeight: "bold",
  color: "#374151",
  marginBottom: "6px",
};

const inputStyle = {
  width: "210px",
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const quickDateButtons = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const secondaryButton = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  padding: "10px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "10px",
  marginBottom: "14px",
  maxWidth: "100%",
};

const cardStyle = {
  background: "white",
  padding: "12px",
  borderRadius: "10px",
  boxShadow: "0 1px 5px rgba(0,0,0,0.07)",
};

const summaryStrip = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px 16px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "12px",
  marginBottom: "16px",
};

const summaryLabel = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  marginBottom: "5px",
};

const tableBox = {
  background: "white",
  padding: "14px",
  borderRadius: "12px",
  marginTop: "18px",
  width: "100%",
  maxWidth: "100%",
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  boxSizing: "border-box",
};

const tableScroll = {
  width: "100%",
  maxWidth: "100%",
  height: "430px",
  overflowX: "auto",
  overflowY: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  boxSizing: "border-box",
};

const scheduledTableStyle = {
  width: "1155px",
  maxWidth: "1155px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const promiseTableStyle = {
  width: "1070px",
  maxWidth: "1070px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const sectionHeader = {
  marginBottom: "12px",
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

const th = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #ddd",
  background: "#f9fafb",
  color: "#374151",
  whiteSpace: "normal",
  fontSize: "12px",
  lineHeight: "1.25",
};

const stickyTh = {
  ...th,
  left: 0,
  width: "95px",
  zIndex: 5,
  background: "#eef2ff",
  boxShadow: "2px 0 6px rgba(0,0,0,0.08)",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
  fontSize: "12px",
  background: "white",
  verticalAlign: "top",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const stickyTd = {
  ...td,
  position: "sticky",
  left: 0,
  zIndex: 4,
  width: "95px",
  background: "#ffffff",
  boxShadow: "2px 0 6px rgba(0,0,0,0.06)",
};

const customerCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
};

const wrapCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
};

const moneyCell = {
  ...td,
  fontWeight: "bold",
};

const notesCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
};

const dealLink = {
  color: "#1d4ed8",
  fontWeight: "800",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  cursor: "pointer",
};

const missingDealTag = {
  color: "#374151",
  fontWeight: "bold",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "12px",
  borderRadius: "10px",
  marginBottom: "15px",
  fontWeight: "bold",
};

export default DuePayments;