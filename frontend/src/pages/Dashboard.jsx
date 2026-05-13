import { useEffect, useState } from "react";
import { getDeals } from "../api/dealsApi";
import { getPayments } from "../api/paymentsApi";
import { getPromises } from "../api/promisesApi";
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
      promise.promise_status !== "Cancelled"
    );
  });

  const brokenPromises = promises.filter(
    (promise) => promise.promise_status === "Broken"
  );

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

  const totalDueToday = dueToday.reduce(
    (sum, item) => sum + Number(item.amountDue || 0),
    0
  );

  const totalPaidForTodayDue = dueToday.reduce(
    (sum, item) => sum + Number(item.paidForDueDate || 0),
    0
  );

  const totalRemainingToday = dueToday.reduce(
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
    <div>
      <h1>Dashboard</h1>
      <p>Customer financing and payment overview.</p>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={cardGrid}>
        <Card title="Payments Due Today" value={scheduledDueToday.length} />
        <Card title="Total Due Today" value={formatMoney(totalDueToday)} />
        <Card
          title="Collected for Today's Due"
          value={formatMoney(totalPaidForTodayDue)}
        />
        <Card
          title="Remaining Due Today"
          value={formatMoney(totalRemainingToday)}
        />

        <Card title="Past Due Customers" value={pastDueScheduled.length} />
        <Card
          title="Past Due Amount"
          value={formatMoney(totalPastDueScheduled)}
        />

        <Card title="Active Deals" value={deals.length} />
        <Card title="Total Financed" value={formatMoney(totalFinanced)} />
        <Card title="Total Collected" value={formatMoney(totalCollected)} />
        <Card title="Pending Balance" value={formatMoney(pendingBalance)} />
        <Card title="Pending Promises" value={pendingPromises.length} />
        <Card title="Broken Promises" value={brokenPromises.length} />
        <Card title="Promises Due Today" value={promisesDueToday.length} />
        <Card
          title="Promise Amount Due Today"
          value={formatMoney(totalPromisesDueToday)}
        />
      </div>

      <div style={tableBox}>
        <h2>Today Follow-Up</h2>

        <h3>Scheduled Payments Due Today</h3>
        {scheduledDueToday.length === 0 ? (
          <p>No scheduled payments due today.</p>
        ) : (
          <FollowUpTable items={scheduledDueToday} />
        )}

        <h3>Promises Due Today</h3>
        {promisesDueToday.length === 0 ? (
          <p>No promises due today.</p>
        ) : (
          <PromiseFollowUpTable promises={promisesDueToday} />
        )}

        <h3>Past Due Scheduled Payments</h3>
        {pastDueScheduled.length === 0 ? (
          <p>No past-due scheduled payments.</p>
        ) : (
          <FollowUpTable items={pastDueScheduled} />
        )}
      </div>

      <div style={tableBox}>
        <h2>Past Due Customers</h2>
        <p>Customers with unpaid scheduled installments before today.</p>

        {pastDueScheduled.length === 0 ? (
          <p>No past due scheduled payments.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Deal Tag</th>
                <th style={th}>Customer</th>
                <th style={th}>Original Due Date</th>
                <th style={th}>Installment #</th>
                <th style={th}>Amount Due</th>
                <th style={th}>Paid</th>
                <th style={th}>Remaining</th>
                <th style={th}>Days Late</th>
                <th style={th}>Status</th>
              </tr>
            </thead>

            <tbody>
              {pastDueScheduled.map((item) => (
                <tr key={`${item.deal.id}-${item.dueDate}`}>
                  <td style={td}>{item.deal.deal_tag}</td>
                  <td style={td}>{item.deal.customers?.customer_name}</td>
                  <td style={td}>{formatDisplayDate(item.dueDate)}</td>
                  <td style={td}>{item.installmentNumber}</td>
                  <td style={td}>{formatMoney(item.amountDue)}</td>
                  <td style={td}>{formatMoney(item.paidForDueDate)}</td>
                  <td style={td}>{formatMoney(item.remainingForDueDate)}</td>
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
        )}
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
          title="Cash Balance"
          value={formatMoney(balanceByDealType["Cash"] || 0)}
        />
      </div>
    </div>
  );
}

function FollowUpTable({ items }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "25px" }}>
      <thead>
        <tr>
          <th style={th}>Deal Tag</th>
          <th style={th}>Customer</th>
          <th style={th}>Due Date</th>
          <th style={th}>Installment</th>
          <th style={th}>Due</th>
          <th style={th}>Paid</th>
          <th style={th}>Remaining</th>
          <th style={th}>Status</th>
        </tr>
      </thead>

      <tbody>
        {items.map((item) => (
          <tr key={`${item.deal.id}-${item.dueDate}`}>
            <td style={td}>{item.deal.deal_tag}</td>
            <td style={td}>{item.deal.customers?.customer_name}</td>
            <td style={td}>{formatDisplayDate(item.dueDate)}</td>
            <td style={td}>{item.installmentNumber}</td>
            <td style={td}>{formatMoney(item.amountDue)}</td>
            <td style={td}>{formatMoney(item.paidForDueDate)}</td>
            <td style={td}>{formatMoney(item.remainingForDueDate)}</td>
            <td style={td}>{item.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PromiseFollowUpTable({ promises }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "25px" }}>
      <thead>
        <tr>
          <th style={th}>Deal Tag</th>
          <th style={th}>Customer</th>
          <th style={th}>Phone</th>
          <th style={th}>Original Due</th>
          <th style={th}>Promised Date</th>
          <th style={th}>Amount</th>
          <th style={th}>Status</th>
        </tr>
      </thead>

      <tbody>
        {promises.map((promise) => (
          <tr key={promise.id}>
            <td style={td}>{promise.deals?.deal_tag}</td>
            <td style={td}>{promise.deals?.customers?.customer_name}</td>
            <td style={td}>{promise.deals?.customers?.phone}</td>
            <td style={td}>{formatDisplayDate(promise.original_due_date)}</td>
            <td style={td}>{formatDisplayDate(promise.promised_date)}</td>
            <td style={td}>{formatMoney(promise.remaining_amount)}</td>
            <td style={td}>{promise.promise_status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
}

function getPastDueStatusStyle(status) {
  const base = {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "bold",
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

function Card({ title, value }) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, color: "#667085" }}>{title}</p>
      <h2 style={{ marginTop: "10px" }}>{value}</h2>
    </div>
  );
}

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginTop: "25px",
};

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const tableBox = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginTop: "25px",
  overflowX: "auto",
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

export default Dashboard;