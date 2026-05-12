import { useEffect, useState } from "react";
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

  const dueDeals = getDueDealsForDate(deals, payments, selectedDate);

  const promisesDue = promises.filter((promise) => {
    return (
      promise.promised_date === selectedDate &&
      promise.promise_status !== "Paid"
    );
  });

  const scheduledUnpaidOrPartial = dueDeals.filter(
    (item) => item.status === "Due" || item.status === "Partial"
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

  return (
    <div>
      <h1>Due Payments</h1>
      <p>See scheduled payments and promised payments due on any date.</p>

      <div style={topBox}>
        <label>Select Due Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={cardGrid}>
        <Card title="Scheduled Payments Due" value={scheduledUnpaidOrPartial.length} />
        <Card title="Promises Due" value={promisesDue.length} />
        <Card title="Scheduled Amount Due" value={formatMoney(totalScheduledDue)} />
        <Card title="Promise Amount Due" value={formatMoney(totalPromiseDue)} />
        <Card title="Total Due" value={formatMoney(totalDue)} />
      </div>

      <div style={tableBox}>
        <h2>Scheduled Payments Due</h2>

        {scheduledUnpaidOrPartial.length === 0 ? (
          <p>No scheduled payments due for this date.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Deal Tag</th>
                <th style={th}>Installment</th>
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
              {scheduledUnpaidOrPartial.map((item) => (
                <tr key={`${item.deal.id}-${item.dueDate}`}>
                  <td style={td}>{item.deal.deal_tag}</td>
                  <td style={td}>{item.installmentNumber}</td>
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

      <div style={tableBox}>
        <h2>Promises Due</h2>

        {promisesDue.length === 0 ? (
          <p>No promises due for this date.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Deal Tag</th>
                <th style={th}>Customer</th>
                <th style={th}>Phone</th>
                <th style={th}>Original Due Date</th>
                <th style={th}>Promised Date</th>
                <th style={th}>Amount Due</th>
                <th style={th}>Status</th>
                <th style={th}>Notes</th>
              </tr>
            </thead>

            <tbody>
              {promisesDue.map((promise) => (
                <tr key={promise.id}>
                  <td style={td}>{promise.deals?.deal_tag}</td>
                  <td style={td}>{promise.deals?.customers?.customer_name}</td>
                  <td style={td}>{promise.deals?.customers?.phone}</td>
                  <td style={td}>{promise.original_due_date}</td>
                  <td style={td}>{promise.promised_date}</td>
                  <td style={td}>{formatMoney(promise.remaining_amount)}</td>
                  <td style={td}>
                    <span style={getPromiseStatusStyle(promise.promise_status)}>
                      {promise.promise_status}
                    </span>
                  </td>
                  <td style={td}>{promise.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
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

function getPromiseStatusStyle(status) {
  const base = {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "bold",
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

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
  };
}

const topBox = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
  maxWidth: "320px",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginTop: "8px",
  border: "1px solid #ccc",
  borderRadius: "8px",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginBottom: "25px",
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

export default DuePayments;