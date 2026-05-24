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

  const [loading, setLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  useEffect(() => {
    loadPromises();
  }, []);

  const loadPromises = async () => {
    try {
      setLoading(true);
      setError("");

      await updateBrokenPromises();

      const data = await getPromises();

      setPromises(data || []);
      setLastRefreshedAt(new Date());
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
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

  const cancelledPromises = promises.filter(
    (promise) => promise.promise_status === "Cancelled"
  );

  const totalPendingAmount = pendingPromises.reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  const totalBrokenAmount = brokenPromises.reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  const totalOpenAmount = [...pendingPromises, ...brokenPromises].reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Customer Commitments</div>
          <h1 style={pageTitle}>Payment Promises</h1>
          <p style={pageDescription}>
            Track deferred payments, partial payments, broken promises,
            rescheduled commitments, and customer follow-up history.
          </p>

          {lastRefreshedAt && (
            <p style={lastRefreshedText}>
              Last Refreshed: {lastRefreshedAt.toLocaleString()}
            </p>
          )}
        </div>

        <div style={heroActions}>
          <div style={openAmountBadge}>
            <span style={openAmountLabel}>Open Promise Balance</span>
            <strong>{formatMoney(totalOpenAmount)}</strong>
          </div>

          <button
            type="button"
            onClick={loadPromises}
            style={{
              ...refreshButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={cardGrid}>
        <MetricCard
          icon="🤝"
          title="Pending"
          value={pendingPromises.length}
          subtitle={formatMoney(totalPendingAmount)}
          tone="info"
        />

        <MetricCard
          icon="🚨"
          title="Broken"
          value={brokenPromises.length}
          subtitle={formatMoney(totalBrokenAmount)}
          tone="danger"
        />

        <MetricCard
          icon="✅"
          title="Paid"
          value={paidPromises.length}
          subtitle="Completed promises"
          tone="success"
        />

        <MetricCard
          icon="🔁"
          title="Rescheduled"
          value={rescheduledPromises.length}
          subtitle="Moved to new date"
          tone="purple"
        />

        <MetricCard
          icon="🧾"
          title="Partial Paid"
          value={partialPaidPromises.length}
          subtitle="Some amount collected"
          tone="warning"
        />

        <MetricCard
          icon="🚫"
          title="Cancelled"
          value={cancelledPromises.length}
          subtitle="No longer active"
        />
      </div>

      <div style={filterPanel}>
        <div style={filterHeader}>
          <div>
            <h2 style={filterTitle}>Find a Promise</h2>
            <p style={filterDescription}>
              Search by deal tag, customer name, phone number, promise status,
              or notes.
            </p>
          </div>

          <button type="button" onClick={handleClearFilters} style={clearButton}>
            Clear Filters
          </button>
        </div>

        <div style={filterGrid}>
          <div style={searchBox}>
            <label style={labelStyle}>Search Promises</label>
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
      </div>

      <div style={summaryStrip}>
        <SummaryItem label="Showing" value={filteredPromises.length} />
        <SummaryItem label="Search" value={search || "All Promises"} />
        <SummaryItem label="Status" value={statusFilter} />
        <SummaryItem label="Total Records" value={promises.length} />
      </div>

      <div style={tableBox}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>Promise History</h2>
            <p style={sectionDescription}>
              Deal Tag stays locked. Scroll inside the table to view more
              columns or records.
            </p>
          </div>

          <span style={tableCountBadge}>
            {filteredPromises.length} result
            {filteredPromises.length === 1 ? "" : "s"}
          </span>
        </div>

        {filteredPromises.length === 0 ? (
          <EmptyState
            icon="🔎"
            title="No promises found."
            message="Try changing the search text or status filter."
          />
        ) : (
          <div style={tableScroll}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={stickyTh}>Deal Tag</th>
                  <th style={{ ...th, width: "180px" }}>Customer</th>
                  <th style={{ ...th, width: "125px" }}>Phone</th>
                  <th style={{ ...th, width: "125px" }}>Original Due</th>
                  <th style={{ ...th, width: "135px" }}>Promised Date</th>
                  <th style={{ ...th, width: "110px" }}>Due</th>
                  <th style={{ ...th, width: "110px" }}>Paid Now</th>
                  <th style={{ ...th, width: "120px" }}>Remaining</th>
                  <th style={{ ...th, width: "130px" }}>Status</th>
                  <th style={{ ...th, width: "240px" }}>Notes</th>
                </tr>
              </thead>

              <tbody>
                {filteredPromises.map((promise, index) => (
                  <tr
                    key={promise.id}
                    style={{
                      background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <td
                      style={{
                        ...stickyTd,
                        background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                      }}
                    >
                      {promise.deals?.id ? (
                        <Link
                          to={`/deals/${promise.deals.id}`}
                          style={dealLink}
                        >
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

                    <td style={td}>
                      {formatDisplayDate(promise.promised_date)}
                    </td>

                    <td style={moneyCell}>{formatMoney(promise.amount_due)}</td>

                    <td style={moneyCell}>
                      {formatMoney(promise.amount_paid_now)}
                    </td>

                    <td style={remainingMoneyCell}>
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

function MetricCard({ icon, title, value, subtitle, tone = "default" }) {
  return (
    <div style={{ ...metricCard, ...getCardToneStyle(tone) }}>
      <div style={metricTop}>
        <span style={metricIcon}>{icon}</span>
        <span style={metricTitle}>{title}</span>
      </div>

      <h3 style={metricValue}>{value}</h3>
      <p style={metricSubtitle}>{subtitle}</p>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={summaryItem}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
  );
}

function EmptyState({ icon, title, message }) {
  return (
    <div style={emptyState}>
      <div style={emptyIcon}>{icon}</div>
      <strong>{title}</strong>
      <p style={{ margin: "6px 0 0" }}>{message}</p>
    </div>
  );
}

function getCardToneStyle(tone) {
  if (tone === "danger") return { borderTop: "4px solid #991b1b" };
  if (tone === "warning") return { borderTop: "4px solid #f59e0b" };
  if (tone === "info") return { borderTop: "4px solid #2563eb" };
  if (tone === "success") return { borderTop: "4px solid #16a34a" };
  if (tone === "purple") return { borderTop: "4px solid #7c3aed" };

  return { borderTop: "4px solid #cbd5e1" };
}

function getStatusStyle(status) {
  const base = {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap",
    display: "inline-block",
  };

  if (status === "Broken") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    };
  }

  if (status === "Pending") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
  }

  if (status === "Paid") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (status === "Partial Paid") {
    return {
      ...base,
      background: "#fef9c3",
      color: "#854d0e",
      border: "1px solid #fde68a",
    };
  }

  if (status === "Rescheduled") {
    return {
      ...base,
      background: "#e0e7ff",
      color: "#3730a3",
      border: "1px solid #c7d2fe",
    };
  }

  if (status === "Cancelled") {
    return {
      ...base,
      background: "#e5e7eb",
      color: "#374151",
      border: "1px solid #d1d5db",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
    border: "1px solid #d1d5db",
  };
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
  boxSizing: "border-box",
};

const heroCard = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #102A4C 55%, #1d4ed8 100%)",
  borderRadius: "18px",
  padding: "24px",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  boxShadow: "0 14px 35px rgba(15, 23, 42, 0.22)",
  marginBottom: "18px",
};

const eyebrow = {
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#bfdbfe",
  marginBottom: "8px",
};

const pageTitle = {
  margin: 0,
  fontSize: "30px",
  lineHeight: "1.1",
  color: "white",
};

const pageDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#dbeafe",
  maxWidth: "760px",
  lineHeight: "1.5",
};

const lastRefreshedText = {
  marginTop: "10px",
  marginBottom: 0,
  color: "#bbf7d0",
  fontSize: "13px",
  fontWeight: "800",
};

const heroActions = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const openAmountBadge = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.24)",
  borderRadius: "14px",
  padding: "10px 14px",
  minWidth: "170px",
};

const openAmountLabel = {
  display: "block",
  fontSize: "11px",
  color: "#bfdbfe",
  marginBottom: "4px",
  fontWeight: "800",
  textTransform: "uppercase",
};

const refreshButton = {
  background: "white",
  color: "#0A1A2F",
  border: "none",
  borderRadius: "12px",
  padding: "11px 15px",
  cursor: "pointer",
  fontWeight: "900",
  boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "14px",
  marginBottom: "18px",
  maxWidth: "100%",
};

const metricCard = {
  background: "white",
  padding: "16px",
  borderRadius: "16px",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.07)",
  border: "1px solid #e5e7eb",
};

const metricTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "12px",
};

const metricIcon = {
  fontSize: "22px",
};

const metricTitle = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "11px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const metricValue = {
  margin: 0,
  color: "#111827",
  fontSize: "26px",
  fontWeight: "900",
};

const metricSubtitle = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "13px",
  fontWeight: "700",
};

const filterPanel = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "16px",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.07)",
};

const filterHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  marginBottom: "14px",
  flexWrap: "wrap",
};

const filterTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
};

const filterDescription = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "14px",
  lineHeight: "1.45",
};

const filterGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) 220px",
  gap: "14px",
  alignItems: "end",
};

const searchBox = {
  minWidth: "240px",
};

const filterControl = {
  minWidth: "190px",
};

const labelStyle = {
  display: "block",
  fontWeight: "800",
  color: "#374151",
  marginBottom: "7px",
  fontSize: "13px",
};

const selectStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  outline: "none",
  background: "white",
  color: "#111827",
  fontWeight: "700",
};

const clearButton = {
  background: "#f8fafc",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "10px 13px",
  cursor: "pointer",
  fontWeight: "800",
};

const summaryStrip = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "12px",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
  marginBottom: "18px",
};

const summaryItem = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
};

const summaryLabel = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  marginBottom: "5px",
  fontWeight: "700",
};

const summaryValue = {
  color: "#111827",
  fontSize: "15px",
};

const tableBox = {
  background: "white",
  padding: "16px",
  borderRadius: "16px",
  marginTop: "18px",
  width: "100%",
  maxWidth: "100%",
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
  border: "1px solid #e5e7eb",
  boxSizing: "border-box",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  marginBottom: "14px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "19px",
};

const sectionDescription = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#667085",
  fontSize: "14px",
  lineHeight: "1.45",
};

const tableCountBadge = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const tableScroll = {
  width: "100%",
  maxWidth: "100%",
  height: "520px",
  overflowX: "auto",
  overflowY: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  boxSizing: "border-box",
};

const tableStyle = {
  width: "100%",
  minWidth: "1310px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const th = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #d1d5db",
  background: "#f1f5f9",
  color: "#334155",
  whiteSpace: "normal",
  fontSize: "12px",
  lineHeight: "1.25",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const stickyTh = {
  ...th,
  left: 0,
  width: "105px",
  minWidth: "105px",
  zIndex: 5,
  background: "#e0e7ff",
  color: "#1e1b4b",
  boxShadow: "3px 0 8px rgba(0,0,0,0.08)",
};

const td = {
  padding: "11px 12px",
  borderBottom: "1px solid #edf2f7",
  whiteSpace: "nowrap",
  fontSize: "12px",
  background: "transparent",
  verticalAlign: "middle",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: "#374151",
};

const stickyTd = {
  ...td,
  position: "sticky",
  left: 0,
  zIndex: 4,
  width: "105px",
  minWidth: "105px",
  boxShadow: "3px 0 8px rgba(0,0,0,0.06)",
};

const customerCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
  color: "#111827",
  fontWeight: "800",
};

const moneyCell = {
  ...td,
  fontWeight: "900",
  color: "#111827",
};

const remainingMoneyCell = {
  ...moneyCell,
  color: "#92400e",
};

const notesCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
};

const dealLink = {
  color: "#1d4ed8",
  fontWeight: "900",
  textDecoration: "none",
  cursor: "pointer",
};

const missingDealTag = {
  color: "#374151",
  fontWeight: "bold",
};

const emptyState = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  padding: "24px",
  borderRadius: "14px",
  color: "#475569",
  textAlign: "center",
};

const emptyIcon = {
  fontSize: "28px",
  marginBottom: "8px",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "13px",
  borderRadius: "12px",
  marginBottom: "15px",
  fontWeight: "bold",
};

export default Promises;