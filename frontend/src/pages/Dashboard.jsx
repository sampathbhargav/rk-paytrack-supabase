import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDeals } from "../api/dealsApi";
import { getPayments } from "../api/paymentsApi";
import { getPromises, updateBrokenPromises } from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";
import {
  getDueDealsForDate,
  getPastDueScheduledPayments,
} from "../utils/duePaymentsUtils";

function Dashboard() {
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
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

  const today = new Date().toISOString().split("T")[0];

  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const dueToday = getDueDealsForDate(deals, activePayments, today);

  const scheduledDueToday = dueToday.filter(
    (item) => item.status === "Due" || item.status === "Partial"
  );

  const promisesDueToday = promises.filter((promise) => {
    return (
      promise.promised_date === today &&
      promise.promise_status !== "Paid" &&
      promise.promise_status !== "Rescheduled" &&
      promise.promise_status !== "Cancelled" &&
      promise.promise_status !== "Partial Paid"
    );
  });

  const pastDuePromises = promises.filter(
    (promise) => promise.promise_status === "Broken"
  );

  const brokenPromises = pastDuePromises;

  const pastDueScheduled = getPastDueScheduledPayments(
    deals,
    activePayments,
    today
  );

  const totalPastDueScheduled = pastDueScheduled.reduce(
    (sum, item) => sum + Number(item.remainingForDueDate || 0),
    0
  );

  const totalPromisesDueToday = promisesDueToday.reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  const totalPastDuePromiseAmount = pastDuePromises.reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  const totalRemainingToday = scheduledDueToday.reduce(
    (sum, item) => sum + Number(item.remainingForDueDate || 0),
    0
  );

  const totalFinanced = deals.reduce(
    (sum, deal) => sum + Number(deal.total_amount || 0),
    0
  );

  const totalCollected = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  const pendingBalance = totalFinanced - totalCollected;

  const pendingPromises = promises.filter(
    (promise) => promise.promise_status === "Pending"
  );

  const balanceByDealType = deals.reduce((acc, deal) => {
    const dealPayments = activePayments.filter(
      (payment) => payment.deal_id === deal.id
    );

    const totalPaidForDeal = dealPayments.reduce(
      (sum, payment) => sum + Number(payment.amount_paid || 0),
      0
    );

    const balance = Math.max(
      Number(deal.total_amount || 0) - totalPaidForDeal,
      0
    );

    const type = deal.deal_type || "Other";

    acc[type] = (acc[type] || 0) + balance;

    return acc;
  }, {});

  return (
    <div style={pageWrapper}>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>Dashboard</h1>
          <p style={pageDescription}>
            Daily customer payment follow-up and finance overview.
          </p>
        </div>

        <button type="button" onClick={loadDashboard} style={refreshButton}>
          Refresh
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={priorityCardGrid}>
        <Card
          title="Past Due Customers"
          value={pastDueScheduled.length}
          tone="danger"
        />

        <Card
          title="Past Due Amount"
          value={formatMoney(totalPastDueScheduled)}
          tone="danger"
        />

        <Card
          title="Due Today"
          value={scheduledDueToday.length}
          tone="warning"
        />

        <Card
          title="Promises Due Today"
          value={promisesDueToday.length}
          tone="info"
        />

        <Card
          title="Broken Promises"
          value={brokenPromises.length}
          tone="danger"
        />

        <Card
          title="Past Due Promise Amount"
          value={formatMoney(totalPastDuePromiseAmount)}
          tone="danger"
        />
      </div>

      <div style={tableBox}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Past Due Customers</h2>
          <p style={sectionDescription}>
            Deal Tag stays locked. Scroll inside the table to view more rows or columns.
          </p>
        </div>

        {pastDueScheduled.length === 0 ? (
          <EmptyState
            title="No past due customers."
            message="There are no unpaid scheduled installments before today."
          />
        ) : (
          <div style={tableScroll}>
            <table style={pastDueTableStyle}>
              <thead>
                <tr>
                  <th style={stickyTh}>Deal Tag</th>
                  <th style={{ ...th, width: "170px" }}>Customer</th>
                  <th style={{ ...th, width: "120px" }}>Original Due</th>
                  <th style={{ ...th, width: "100px" }}>Installment</th>
                  <th style={{ ...th, width: "110px" }}>Amount Due</th>
                  <th style={{ ...th, width: "100px" }}>Paid</th>
                  <th style={{ ...th, width: "110px" }}>Remaining</th>
                  <th style={{ ...th, width: "95px" }}>Days Late</th>
                  <th style={{ ...th, width: "135px" }}>Status</th>
                </tr>
              </thead>

              <tbody>
                {pastDueScheduled.map((item) => (
                  <tr key={`${item.deal.id}-${item.dueDate}`}>
                    <td style={stickyTd}>
                      <Link to={`/deals/${item.deal.id}`} style={dealLink}>
                        {item.deal.deal_tag}
                      </Link>
                    </td>

                    <td style={customerCell}>
                      {item.deal.customers?.customer_name || "—"}
                    </td>

                    <td style={td}>{formatDisplayDate(item.dueDate)}</td>

                    <td style={td}>{item.installmentNumber}</td>

                    <td style={moneyDueCell}>{formatMoney(item.amountDue)}</td>

                    <td style={moneyDueCell}>
                      {formatMoney(item.paidForDueDate)}
                    </td>

                    <td style={moneyDueCell}>
                      {formatMoney(item.remainingForDueDate)}
                    </td>

                    <td style={td}>
                      <strong>{item.daysLate}</strong> days
                    </td>

                    <td style={td}>
                      <span style={getPastDueStatusStyle(item.status)}>
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
          <h2 style={sectionTitle}>Due Today</h2>
          <p style={sectionDescription}>
            Deal Tag stays locked. Scheduled installments due today that are still unpaid or partially paid.
          </p>
        </div>

        {scheduledDueToday.length === 0 ? (
          <EmptyState
            title="No scheduled payments due today."
            message="There are no active scheduled installments due today."
          />
        ) : (
          <FollowUpTable items={scheduledDueToday} />
        )}
      </div>

      <div style={tableBox}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Promises Due Today</h2>
          <p style={sectionDescription}>
            Deal Tag stays locked. Customer promises that need follow-up today.
          </p>
        </div>

        {promisesDueToday.length === 0 ? (
          <EmptyState
            title="No promises due today."
            message="There are no active customer promises due today."
          />
        ) : (
          <PromiseFollowUpTable promises={promisesDueToday} />
        )}
      </div>

      <div style={tableBox}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Past Due Promises</h2>
          <p style={sectionDescription}>
            Deal Tag stays locked. Customer promises where the promised date has passed and payment was not completed.
          </p>
        </div>

        {pastDuePromises.length === 0 ? (
          <EmptyState
            title="No past due promises."
            message="There are no broken customer promises at this time."
          />
        ) : (
          <PromiseFollowUpTable promises={pastDuePromises} />
        )}
      </div>

      <div style={sectionDivider}>
        <h2>Financial Summary</h2>
        <p>Overall collection and balance snapshot.</p>
      </div>

      <div style={cardGrid}>
        <Card title="Active Deals" value={deals.length} />
        <Card title="Total Financed" value={formatMoney(totalFinanced)} />
        <Card title="Total Collected" value={formatMoney(totalCollected)} />
        <Card title="Pending Balance" value={formatMoney(pendingBalance)} />
        <Card title="Pending Promises" value={pendingPromises.length} />
        <Card
          title="Promise Amount Due Today"
          value={formatMoney(totalPromisesDueToday)}
        />
        <Card
          title="Remaining Due Today"
          value={formatMoney(totalRemainingToday)}
        />
      </div>

      <div style={sectionDivider}>
        <h2>Balance by Deal Type</h2>
        <p>Where the current outstanding balance is tied up.</p>
      </div>

      <div style={cardGrid}>
        <Card
          title="In-house Balance"
          value={formatMoney(balanceByDealType["In-house"] || 0)}
        />
        <Card
          title="Down Finance Balance"
          value={formatMoney(balanceByDealType["Down Finance"] || 0)}
        />
        <Card
          title="Borrow Money Balance"
          value={formatMoney(balanceByDealType["Borrow Money"] || 0)}
        />
        <Card
          title="Motor Finance Balance"
          value={formatMoney(balanceByDealType["Motor Finance"] || 0)}
        />
        <Card
          title="Registration Money Balance"
          value={formatMoney(balanceByDealType["Registration Money"] || 0)}
        />
        <Card
          title="Cash Balance"
          value={formatMoney(balanceByDealType["Cash"] || 0)}
        />
      </div>
    </div>
  );
}

function FollowUpTable({ items }) {
  return (
    <div style={tableScroll}>
      <table style={dueTodayTableStyle}>
        <thead>
          <tr>
            <th style={stickyTh}>Deal Tag</th>
            <th style={{ ...th, width: "170px" }}>Customer</th>
            <th style={{ ...th, width: "115px" }}>Due Date</th>
            <th style={{ ...th, width: "100px" }}>Installment</th>
            <th style={{ ...th, width: "105px" }}>Due</th>
            <th style={{ ...th, width: "100px" }}>Paid</th>
            <th style={{ ...th, width: "110px" }}>Remaining</th>
            <th style={{ ...th, width: "110px" }}>Status</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={`${item.deal.id}-${item.dueDate}`}>
              <td style={stickyTd}>
                <Link to={`/deals/${item.deal.id}`} style={dealLink}>
                  {item.deal.deal_tag}
                </Link>
              </td>

              <td style={customerCell}>
                {item.deal.customers?.customer_name || "—"}
              </td>

              <td style={td}>{formatDisplayDate(item.dueDate)}</td>

              <td style={td}>{item.installmentNumber}</td>

              <td style={moneyDueCell}>{formatMoney(item.amountDue)}</td>

              <td style={moneyDueCell}>{formatMoney(item.paidForDueDate)}</td>

              <td style={moneyDueCell}>
                {formatMoney(item.remainingForDueDate)}
              </td>

              <td style={td}>
                <span style={getDueStatusStyle(item.status)}>
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromiseFollowUpTable({ promises }) {
  return (
    <div style={tableScroll}>
      <table style={promiseTableStyle}>
        <thead>
          <tr>
            <th style={stickyTh}>Deal Tag</th>
            <th style={{ ...th, width: "170px" }}>Customer</th>
            <th style={{ ...th, width: "120px" }}>Phone</th>
            <th style={{ ...th, width: "120px" }}>Original Due</th>
            <th style={{ ...th, width: "125px" }}>Promised Date</th>
            <th style={{ ...th, width: "110px" }}>Amount</th>
            <th style={{ ...th, width: "125px" }}>Status</th>
          </tr>
        </thead>

        <tbody>
          {promises.map((promise) => (
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

              <td style={td}>{formatDisplayDate(promise.original_due_date)}</td>

              <td style={td}>{formatDisplayDate(promise.promised_date)}</td>

              <td style={moneyDueCell}>{formatMoney(promise.remaining_amount)}</td>

              <td style={td}>
                <span style={getPromiseStatusStyle(promise.promise_status)}>
                  {promise.promise_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

function Card({ title, value, tone = "default" }) {
  return (
    <div style={{ ...cardStyle, ...getCardToneStyle(tone) }}>
      <p style={{ margin: 0, color: "#667085", fontSize: "12px" }}>
        {title}
      </p>
      <h3 style={{ marginTop: "6px", marginBottom: 0, fontSize: "19px" }}>
        {value}
      </h3>
    </div>
  );
}

function getCardToneStyle(tone) {
  if (tone === "danger") {
    return {
      borderLeft: "4px solid #991b1b",
    };
  }

  if (tone === "warning") {
    return {
      borderLeft: "4px solid #f59e0b",
    };
  }

  if (tone === "info") {
    return {
      borderLeft: "4px solid #2563eb",
    };
  }

  return {
    borderLeft: "4px solid transparent",
  };
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
}

function getPastDueStatusStyle(status) {
  const base = {
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    display: "inline-block",
  };

  if (status === "Past Due - Partial") {
    return {
      ...base,
      background: "#fef9c3",
      color: "#854d0e",
    };
  }

  return {
    ...base,
    background: "#7f1d1d",
    color: "#ffffff",
  };
}

function getDueStatusStyle(status) {
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

  if (status === "Paid") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  return {
    ...base,
    background: "#dbeafe",
    color: "#1d4ed8",
  };
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
};

const refreshButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "9px 13px",
  cursor: "pointer",
  fontWeight: "bold",
};

const priorityCardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "10px",
  marginTop: "18px",
  marginBottom: "14px",
  maxWidth: "100%",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "10px",
  marginTop: "14px",
  maxWidth: "100%",
};

const cardStyle = {
  background: "white",
  padding: "12px",
  borderRadius: "10px",
  boxShadow: "0 1px 5px rgba(0,0,0,0.07)",
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
  height: "390px",
  overflowX: "auto",
  overflowY: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  boxSizing: "border-box",
};

const pastDueTableStyle = {
  width: "100%",
  minWidth: "1145px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const dueTodayTableStyle = {
  width: "100%",
  minWidth: "930px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const promiseTableStyle = {
  width: "100%",
  minWidth: "980px",
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

const sectionDivider = {
  marginTop: "28px",
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

const moneyDueCell = {
  ...td,
  fontWeight: "bold",
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

export default Dashboard;