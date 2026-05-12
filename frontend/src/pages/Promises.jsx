import { useEffect, useState } from "react";
import { getPromises, updateBrokenPromises } from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";
import SearchBar from "../components/SearchBar";

function Promises() {
  const [promises, setPromises] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPromises();
  }, []);

  const loadPromises = async () => {
    try {
      await updateBrokenPromises();
      const data = await getPromises();
      setPromises(data);
    } catch (error) {
      setError(error.message);
    }
  };

  const filteredPromises = promises.filter((promise) => {
    const text = search.toLowerCase();

    return (
      promise.deals?.deal_tag?.toLowerCase().includes(text) ||
      promise.deals?.customers?.customer_name?.toLowerCase().includes(text) ||
      promise.deals?.customers?.phone?.toLowerCase().includes(text) ||
      promise.promise_status?.toLowerCase().includes(text)
    );
  });

  return (
    <div>
      <h1>Payment Promises</h1>
      <p>Deferred payments and partial payment promises.</p>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by deal tag, customer, phone, or status..."
      />

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ background: "white", padding: "20px", borderRadius: "12px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Deal Tag</th>
              <th style={th}>Customer</th>
              <th style={th}>Original Due</th>
              <th style={th}>Amount Due</th>
              <th style={th}>Paid Now</th>
              <th style={th}>Remaining</th>
              <th style={th}>Promised Date</th>
              <th style={th}>Status</th>
              <th style={th}>Notes</th>
            </tr>
          </thead>

          <tbody>
            {filteredPromises.map((promise) => (
              <tr key={promise.id}>
                <td style={td}>{promise.deals?.deal_tag}</td>
                <td style={td}>{promise.deals?.customers?.customer_name}</td>
                <td style={td}>{promise.original_due_date}</td>
                <td style={td}>{formatMoney(promise.amount_due)}</td>
                <td style={td}>{formatMoney(promise.amount_paid_now)}</td>
                <td style={td}>{formatMoney(promise.remaining_amount)}</td>
                <td style={td}>{promise.promised_date}</td>
                <td style={td}>
                  <span style={getStatusStyle(promise.promise_status)}>
                    {promise.promise_status}
                  </span>
                </td>
                <td style={td}>{promise.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    background: "#e5e7eb",
    color: "#374151",
  };
}

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

export default Promises;