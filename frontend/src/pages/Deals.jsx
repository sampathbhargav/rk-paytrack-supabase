import { useEffect, useState } from "react";
import { getDeals } from "../api/dealsApi";
import { getPayments } from "../api/paymentsApi";
import { getPromises } from "../api/promisesApi";
import DealTable from "../components/DealTable";
import SearchBar from "../components/SearchBar";
import { exportToCsv } from "../utils/exportUtils";

function Deals() {
  const [deals, setDeals] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isExporting, setIsExporting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getDeals();

      setDeals(data || []);
      setLastRefreshedAt(new Date());
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeals = deals.filter((deal) => {
    const text = search.toLowerCase();

    const matchesSearch =
      deal.deal_tag?.toLowerCase().includes(text) ||
      deal.customers?.customer_name?.toLowerCase().includes(text) ||
      deal.customers?.phone?.toLowerCase().includes(text) ||
      deal.truck?.toLowerCase().includes(text) ||
      deal.year?.toLowerCase().includes(text) ||
      deal.vin?.toLowerCase().includes(text) ||
      deal.deal_type?.toLowerCase().includes(text) ||
      deal.deal_subtype?.toLowerCase().includes(text);

    const matchesStatus =
      statusFilter === "All" || deal.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeDeals = deals.filter((deal) => deal.status === "Active");
  const paidOffDeals = deals.filter((deal) => deal.status === "Paid Off");
  const defaultedDeals = deals.filter((deal) => deal.status === "Defaulted");
  const repoDeals = deals.filter((deal) => deal.status === "Repo");
  const closedDeals = deals.filter((deal) => deal.status === "Closed");
  const cancelledDeals = deals.filter((deal) => deal.status === "Cancelled");

  const totalFinanced = deals.reduce(
    (sum, deal) => sum + Number(deal.total_amount || 0),
    0
  );

  const handleExportDeals = async () => {
    try {
      setIsExporting(true);
      setError("");

      const payments = await getPayments();
      const promises = await getPromises();

      const activePayments = payments.filter(
        (payment) => payment.payment_status !== "Voided"
      );

      const exportRows = filteredDeals.map((deal) => {
        const dealPayments = activePayments.filter(
          (payment) => payment.deal_id === deal.id
        );

        const dealPromises = promises.filter(
          (promise) => promise.deal_id === deal.id
        );

        const totalPaid = dealPayments.reduce(
          (sum, payment) => sum + Number(payment.amount_paid || 0),
          0
        );

        const totalAmount = Number(deal.total_amount || 0);
        const balance = Math.max(totalAmount - totalPaid, 0);

        const sortedPayments = [...dealPayments].sort((a, b) =>
          String(b.payment_date || "").localeCompare(
            String(a.payment_date || "")
          )
        );

        const lastPayment = sortedPayments[0];

        const paymentHistory = sortedPayments
          .map((payment) => {
            return `${payment.payment_date || "No Date"} - ${
              payment.amount_paid || 0
            } - ${payment.payment_method || "Other"} - Due: ${
              payment.due_date || ""
            } - ${payment.payment_type || ""}`;
          })
          .join(" | ");

        const activePromises = dealPromises.filter(
          (promise) =>
            promise.promise_status !== "Paid" &&
            promise.promise_status !== "Cancelled" &&
            promise.promise_status !== "Rescheduled"
        );

        const promiseHistory = dealPromises
          .map((promise) => {
            return `${promise.promise_status || ""} - Original Due: ${
              promise.original_due_date || ""
            } - Promised: ${promise.promised_date || ""} - Remaining: ${
              promise.remaining_amount || 0
            }`;
          })
          .join(" | ");

        const activePromiseAmount = activePromises.reduce(
          (sum, promise) => sum + Number(promise.remaining_amount || 0),
          0
        );

        return {
          Deal_Tag: deal.deal_tag || "",
          Customer: deal.customers?.customer_name || "",
          Phone: deal.customers?.phone || "",
          Email: deal.customers?.email || "",
          Address: deal.customers?.address || "",

          Status: deal.status || "Active",
          Deal_Type: deal.deal_type || "",
          Deal_Sub_Type: deal.deal_subtype || "",

          Year: deal.year || "",
          Truck: deal.truck || "",
          VIN: deal.vin || "",

          Start_Date: deal.start_date || "",
          Due_Day: deal.due_day || "",
          Monthly_Payment: deal.monthly_payment || 0,
          Term: deal.term || "",
          Maturity_Date: deal.maturity_date || "",

          Total_Amount: totalAmount,
          Total_Paid: totalPaid,
          Balance: balance,

          Last_Payment_Date: lastPayment?.payment_date || "",
          Last_Payment_Amount: lastPayment?.amount_paid || "",
          Last_Payment_Method: lastPayment?.payment_method || "",

          Payment_Count: dealPayments.length,
          Payment_History: paymentHistory,

          Active_Promise_Count: activePromises.length,
          Active_Promise_Amount: activePromiseAmount,
          Promise_History: promiseHistory,

          Notes: deal.notes || "",
        };
      });

      const today = new Date().toISOString().split("T")[0];

      exportToCsv(`rk-paytrack-full-deals-export-${today}.csv`, exportRows);
    } catch (error) {
      setError(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Deal Management</div>
          <h1 style={pageTitle}>Deals</h1>
          <p style={pageDescription}>
            Search, filter, review, export, and manage all customer dealership
            deals from one place.
          </p>

          {lastRefreshedAt && (
            <p style={lastRefreshedText}>
              Last Refreshed: {lastRefreshedAt.toLocaleString()}
            </p>
          )}
        </div>

        <div style={headerActions}>
          <button
            type="button"
            onClick={loadDeals}
            style={{
              ...refreshButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>

          <button
            type="button"
            onClick={handleExportDeals}
            style={{
              ...exportButton,
              opacity: isExporting ? 0.7 : 1,
              cursor: isExporting ? "not-allowed" : "pointer",
            }}
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "⬇ Export Deals"}
          </button>
        </div>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={cardGrid}>
        <MetricCard
          icon="📁"
          title="Total Deals"
          value={deals.length}
          subtitle="All records"
        />

        <MetricCard
          icon="✅"
          title="Active"
          value={activeDeals.length}
          subtitle="Currently collecting"
          tone="info"
        />

        <MetricCard
          icon="💵"
          title="Paid Off"
          value={paidOffDeals.length}
          subtitle="Completed deals"
          tone="success"
        />

        <MetricCard
          icon="⚫"
          title="Defaulted"
          value={defaultedDeals.length}
          subtitle="Default status"
          tone="dark"
        />

        <MetricCard
          icon="🚨"
          title="Repo"
          value={repoDeals.length}
          subtitle="Repossession"
          tone="danger"
        />

        <MetricCard
          icon="💰"
          title="Total Financed"
          value={formatCompactMoney(totalFinanced)}
          subtitle="All deal totals"
          tone="money"
        />
      </div>

      <div style={filterPanel}>
        <div style={filterHeader}>
          <div>
            <h2 style={filterTitle}>Find a Deal</h2>
            <p style={filterDescription}>
              Search by deal tag, customer, phone, truck, year, VIN, deal type,
              or subtype.
            </p>
          </div>

          <button type="button" onClick={handleClearFilters} style={clearButton}>
            Clear Filters
          </button>
        </div>

        <div style={filterGrid}>
          <div style={searchBox}>
            <label style={labelStyle}>Search Deals</label>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search deal tag, customer, phone, truck, year, VIN, or type..."
            />
          </div>

          <div style={filterControl}>
            <label style={labelStyle}>Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={selectStyle}
            >
              <option>All</option>
              <option>Active</option>
              <option>Paid Off</option>
              <option>Closed</option>
              <option>Repo</option>
              <option>Cancelled</option>
              <option>Defaulted</option>
            </select>
          </div>
        </div>
      </div>

      <div style={summaryStrip}>
        <SummaryItem label="Showing" value={filteredDeals.length} />
        <SummaryItem label="Search" value={search || "All Deals"} />
        <SummaryItem label="Status" value={statusFilter} />
        <SummaryItem label="Closed" value={closedDeals.length} />
        <SummaryItem label="Cancelled" value={cancelledDeals.length} />
      </div>

      <div style={tableSection}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>Deal List</h2>
            <p style={sectionDescription}>
              Highest deal tags appear first. Click the deal tag or View to open
              the customer account.
            </p>
          </div>

          <div style={tableCountBadge}>
            {filteredDeals.length} result{filteredDeals.length === 1 ? "" : "s"}
          </div>
        </div>

        <DealTable deals={filteredDeals} />
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

function getCardToneStyle(tone) {
  if (tone === "danger") {
    return {
      borderTop: "4px solid #991b1b",
    };
  }

  if (tone === "success") {
    return {
      borderTop: "4px solid #16a34a",
    };
  }

  if (tone === "info") {
    return {
      borderTop: "4px solid #2563eb",
    };
  }

  if (tone === "dark") {
    return {
      borderTop: "4px solid #111827",
    };
  }

  if (tone === "money") {
    return {
      borderTop: "4px solid #166534",
    };
  }

  return {
    borderTop: "4px solid #cbd5e1",
  };
}

function formatCompactMoney(value) {
  const amount = Number(value || 0);

  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }

  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }

  return `$${amount.toFixed(0)}`;
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
  maxWidth: "720px",
  lineHeight: "1.5",
};

const lastRefreshedText = {
  marginTop: "10px",
  marginBottom: 0,
  color: "#bbf7d0",
  fontSize: "13px",
  fontWeight: "800",
};

const headerActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
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

const exportButton = {
  background: "#16a34a",
  color: "white",
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

const tableSection = {
  background: "white",
  padding: "16px",
  borderRadius: "16px",
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

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "13px",
  borderRadius: "12px",
  marginBottom: "15px",
  fontWeight: "bold",
};

export default Deals;