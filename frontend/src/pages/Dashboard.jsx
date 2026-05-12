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

  const dueToday = getDueDealsForDate(deals, payments, today);

  // const dueToday = getDueDealsForDate(deals, payments, today);

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

const pastDueScheduled = getPastDueScheduledPayments(deals, payments, today);

const totalPastDueScheduled = pastDueScheduled.reduce(
  (sum, item) => sum + Number(item.remainingForDueDate || 0),
  0
);

const totalPromisesDueToday = promisesDueToday.reduce(
  (sum, promise) => sum + Number(promise.remaining_amount || 0),
  0
);

  const dueTodayUnpaidOrPartial = dueToday.filter(
    (item) => item.status === "Due" || item.status === "Partial"
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

  const totalCollected = payments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  const pendingBalance = totalFinanced - totalCollected;

  const pendingPromises = promises.filter(
    (promise) => promise.promise_status === "Pending"
  );

  // const brokenPromises = promises.filter(
  //   (promise) => promise.promise_status === "Broken"
  // );

  // const promisesDueToday = promises.filter((promise) => {
  //   return promise.promised_date === today && promise.promise_status !== "Paid";
  // });

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Customer financing and payment overview.</p>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={cardGrid}>
        <Card title="Payments Due Today" value={dueTodayUnpaidOrPartial.length} />
        <Card title="Total Due Today" value={formatMoney(totalDueToday)} />
        <Card
          title="Collected for Today's Due"
          value={formatMoney(totalPaidForTodayDue)}
        />
        <Card
          title="Remaining Due Today"
          value={formatMoney(totalRemainingToday)}
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
          value={formatMoney(
            promisesDueToday.reduce(
              (sum, promise) => sum + Number(promise.remaining_amount || 0),
              0
            )
          )}
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
        <h2>Due Today</h2>

        {dueTodayUnpaidOrPartial.length === 0 ? (
          <p>No unpaid payments due today.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Deal Tag</th>
                <th style={th}>Type</th>
                <th style={th}>Sub Type</th>
                <th style={th}>Customer</th>
                <th style={th}>Phone</th>
                <th style={th}>Truck</th>
                <th style={th}>Due</th>
                <th style={th}>Paid</th>
                <th style={th}>Remaining</th>
                <th style={th}>Status</th>
              </tr>
            </thead>

            <tbody>
              {dueTodayUnpaidOrPartial.map((item) => (
                <tr key={item.deal.id}>
                  <td style={td}>{item.deal.deal_tag}</td>
                  <td style={td}>{item.deal.deal_type}</td>
                  <td style={td}>{item.deal.deal_subtype || "—"}</td>
                  <td style={td}>{item.deal.customers?.customer_name}</td>
                  <td style={td}>{item.deal.customers?.phone}</td>
                  <td style={td}>
                    {item.deal.year} {item.deal.truck}
                  </td>
                  <td style={td}>{formatMoney(item.amountDue)}</td>
                  <td style={td}>{formatMoney(item.paidForDueDate)}</td>
                  <td style={td}>{formatMoney(item.remainingForDueDate)}</td>
                  <td style={td}>
                    <span style={getStatusStyle(item.status)}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
          <th style={th}>Phone</th>
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
            <td style={td}>{item.deal.customers?.phone}</td>
            <td style={td}>{item.dueDate}</td>
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
            <td style={td}>{promise.original_due_date}</td>
            <td style={td}>{promise.promised_date}</td>
            <td style={td}>{formatMoney(promise.remaining_amount)}</td>
            <td style={td}>{promise.promise_status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Card({ title, value }) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, color: "#667085" }}>{title}</p>
      <h2 style={{ marginTop: "10px" }}>{value}</h2>
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

  return {
    ...base,
    background: "#fee2e2",
    color: "#991b1b",
  };
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

export default Dashboard;