import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPromises, updateBrokenPromises } from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";
import SearchBar from "../components/SearchBar";

function Promises() {
  const [promises, setPromises] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    loadPromises();
  }, []);

  const loadPromises = async () => {
    try {
      setError("");

      await updateBrokenPromises();

      const data = await getPromises();
      setPromises(data);
    } catch (error) {
      setError(error.message);
    }
  };

  const filteredPromises = promises.filter((promise) => {
    const text = search.toLowerCase();

    const matchesSearch =
      promise.deals?.deal_tag?.toLowerCase().includes(text) ||
      promise.deals?.customers?.customer_name?.toLowerCase().includes(text) ||
      promise.deals?.customers?.phone?.toLowerCase().includes(text) ||
      promise.promise_status?.toLowerCase().includes(text) ||
      promise.notes?.toLowerCase().includes(text);

    const matchesStatus =
      statusFilter === "All" || promise.promise_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingPromises = promises.filter(
    (promise) => promise.promise_status === "Pending"
  );

  const brokenPromises = promises.filter(
    (promise) => promise.promise_status === "Broken"
  );

  const paidPromises = promises.filter(
    (promise) => promise.promise_status === "Paid"
  );

  const rescheduledPromises = promises.filter(
    (promise) => promise.promise_status === "Rescheduled"
  );

  const partialPaidPromises = promises.filter(
    (promise) => promise.promise_status === "Partial Paid"
  );

  const totalPendingAmount = pendingPromises.reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  const totalBrokenAmount = brokenPromises.reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  return (
    <div style={pageWrapper}>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>Payment Promises</h1>
          <p style={pageDescription}>
            Track deferred payments, partial payments, broken promises, and
            rescheduled commitments.
          </p>
        </div>

        <button type="button" onClick={loadPromises} style={refreshButton}>
          Refresh
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={cardGrid}>
        <Card title="Pending" value={pendingPromises.length} tone="info" />
        <Card
          title="Pending Amount"
          value={formatMoney(totalPendingAmount)}
          tone="info"
        />
        <Card title="Broken" value={brokenPromises.length} tone="danger" />
        <Card
          title="Broken Amount"
          value={formatMoney(totalBrokenAmount)}
          tone="danger"
        />
        <Card title="Paid" value={paidPromises.length} tone="success" />
        <Card title="Rescheduled" value={rescheduledPromises.length} />
        <Card
          title="Partial Paid"
          value={partialPaidPromises.length}
          tone="warning"
        />
      </div>

      <div style={filterBox}>
        <div style={searchBox}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search deal tag, customer, phone, status, or notes..."
          />
        </div>

        <div style={filterControl}>
          <label style={labelStyle}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={selectStyle}
          >
            <option>All</option>
            <option>Pending</option>
            <option>Broken</option>
            <option>Partial Paid</option>
            <option>Rescheduled</option>
            <option>Paid</option>
            <option>Cancelled</option>
          </select>
        </div>
      </div>

      <div style={tableBox}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Promise History</h2>
          <p style={sectionDescription}>
            Showing {filteredPromises.length} promise record(s).
          </p>
        </div>

        {filteredPromises.length === 0 ? (
          <EmptyState
            title="No promises found."
            message="Try changing the search text or status filter."
          />
        ) : (
          <div style={tableScroll}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={th}>Deal Tag</th>
                  <th style={th}>Customer</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Original Due</th>
                  <th style={th}>Promised Date</th>
                  <th style={th}>Due</th>
                  <th style={th}>Paid Now</th>
                  <th style={th}>Remaining</th>
                  <th style={th}>Status</th>
                  <th style={th}>Notes</th>
                </tr>
              </thead>

              <tbody>
                {filteredPromises.map((promise) => (
                  <tr key={promise.id}>
                    <td style={td}>
                      {promise.deals?.id ? (
                        <Link
                          to={`/deals/${promise.deals.id}`}
                          style={dealLink}
                        >
                          {promise.deals?.deal_tag || "—"}
                        </Link>
                      ) : (
                        promise.deals?.deal_tag || "—"
                      )}
                    </td>

                    <td style={customerCell}>
                      {promise.deals?.customers?.customer_name || "—"}
                    </td>

                    <td style={td}>
                      {promise.deals?.customers?.phone || "—"}
                    </td>

                    <td style={td}>
                      {formatDisplayDate(promise.original_due_date)}
                    </td>

                    <td style={td}>
                      {formatDisplayDate(promise.promised_date)}
                    </td>

                    <td style={td}>{formatMoney(promise.amount_due)}</td>

                    <td style={td}>{formatMoney(promise.amount_paid_now)}</td>

                    <td style={moneyCell}>
                      {formatMoney(promise.remaining_amount)}
                    </td>

                    <td style={td}>
                      <span style={getStatusStyle(promise.promise_status)}>
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
      <p style={{ margin: 0, color: "#667085", fontSize: "13px" }}>{title}</p>
      <h2 style={{ marginTop: "8px", marginBottom: 0, fontSize: "22px" }}>
        {value}
      </h2>
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
  if (tone === "danger") return { borderLeft: "5px solid #991b1b" };
  if (tone === "warning") return { borderLeft: "5px solid #f59e0b" };
  if (tone === "info") return { borderLeft: "5px solid #2563eb" };
  if (tone === "success") return { borderLeft: "5px solid #16a34a" };

  return { borderLeft: "5px solid transparent" };
}

function getStatusStyle(status) {
  const base = {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    display: "inline-block",
  };

  if (status === "Broken") {
    return { ...base, background: "#fee2e2", color: "#991b1b" };
  }

  if (status === "Pending") {
    return { ...base, background: "#dbeafe", color: "#1d4ed8" };
  }

  if (status === "Paid") {
    return { ...base, background: "#dcfce7", color: "#166534" };
  }

  if (status === "Partial Paid") {
    return { ...base, background: "#fef9c3", color: "#854d0e" };
  }

  if (status === "Rescheduled") {
    return { ...base, background: "#e0e7ff", color: "#3730a3" };
  }

  if (status === "Cancelled") {
    return { ...base, background: "#e5e7eb", color: "#374151" };
  }

  return { ...base, background: "#e5e7eb", color: "#374151" };
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const pageTitle = {
  margin: 0,
  color: "#111827",
};

const pageDescription = {
  marginTop: "6px",
  color: "#667085",
  maxWidth: "760px",
};

const refreshButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const cardStyle = {
  background: "white",
  padding: "16px",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const filterBox = {
  background: "white",
  padding: "16px",
  borderRadius: "12px",
  marginBottom: "18px",
  display: "flex",
  gap: "14px",
  alignItems: "flex-end",
  flexWrap: "wrap",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  maxWidth: "100%",
};

const searchBox = {
  flex: "1 1 340px",
  minWidth: "220px",
};

const filterControl = {
  flex: "0 0 165px",
};

const labelStyle = {
  display: "block",
  fontWeight: "bold",
  color: "#374151",
  marginBottom: "6px",
};

const selectStyle = {
  width: "100%",
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
};

const tableBox = {
  background: "white",
  padding: "18px",
  borderRadius: "12px",
  marginTop: "20px",
  maxWidth: "100%",
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const tableScroll = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  minWidth: "880px",
  borderCollapse: "collapse",
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

const th = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #ddd",
  background: "#f9fafb",
  whiteSpace: "nowrap",
  fontSize: "13px",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
  fontSize: "13px",
};

const customerCell = {
  ...td,
  minWidth: "135px",
  maxWidth: "175px",
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
  minWidth: "160px",
  maxWidth: "210px",
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
};

const dealLink = {
  color: "#1d4ed8",
  fontWeight: "bold",
  textDecoration: "none",
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

export default Promises;