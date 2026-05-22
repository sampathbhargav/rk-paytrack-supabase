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

  return (
    <div style={pageWrapper}>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>Deals</h1>
          <p style={pageDescription}>
            View, search, and manage all customer deals.
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
          {loading ? "Refreshing..." : "Refresh"}
        </button>

          <button
            type="button"
            onClick={handleExportDeals}
            style={exportButton}
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Export Deals"}
          </button>
        </div>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={cardGrid}>
        <Card title="Total Deals" value={deals.length} />
        <Card title="Active" value={activeDeals.length} tone="info" />
        <Card title="Paid Off" value={paidOffDeals.length} tone="success" />
        <Card title="Defaulted" value={defaultedDeals.length} tone="dark" />
        <Card title="Repo" value={repoDeals.length} tone="danger" />
      </div>

      <div style={filterBox}>
        <div style={searchBox}>
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

      <div style={summaryStrip}>
        <SummaryItem label="Showing" value={filteredDeals.length} />
        <SummaryItem label="Search" value={search || "All"} />
        <SummaryItem label="Status" value={statusFilter} />
      </div>

      <div style={tableBox}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Deal List</h2>
          <p style={sectionDescription}>
            Table is fixed in size. Scroll inside the table to view more records.
          </p>
        </div>

        <DealTable deals={filteredDeals} />
      </div>
    </div>
  );
}

function Card({ title, value, tone = "default" }) {
  return (
    <div style={{ ...cardStyle, ...getCardToneStyle(tone) }}>
      <p style={{ margin: 0, color: "#667085", fontSize: "12px" }}>
        {title}
      </p>
      <h3 style={{ marginTop: "6px", marginBottom: 0, fontSize: "20px" }}>
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

function getCardToneStyle(tone) {
  if (tone === "danger") return { borderLeft: "4px solid #991b1b" };
  if (tone === "success") return { borderLeft: "4px solid #16a34a" };
  if (tone === "info") return { borderLeft: "4px solid #2563eb" };
  if (tone === "dark") return { borderLeft: "4px solid #111827" };

  return { borderLeft: "4px solid transparent" };
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
};

const pageTitle = {
  margin: 0,
  color: "#111827",
};

const pageDescription = {
  marginTop: "6px",
  color: "#667085",
};

const headerActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
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

const exportButton = {
  background: "#166534",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const cardStyle = {
  background: "white",
  padding: "12px",
  borderRadius: "10px",
  boxShadow: "0 1px 5px rgba(0,0,0,0.07)",
};

const filterBox = {
  background: "white",
  padding: "14px",
  borderRadius: "12px",
  marginBottom: "14px",
  display: "flex",
  gap: "14px",
  alignItems: "flex-end",
  flexWrap: "wrap",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const searchBox = {
  flex: "1 1 360px",
  minWidth: "240px",
};

const filterControl = {
  flex: "0 0 190px",
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
  padding: "16px",
  borderRadius: "12px",
  maxWidth: "100%",
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  boxSizing: "border-box",
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

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "12px",
  borderRadius: "10px",
  marginBottom: "15px",
  fontWeight: "bold",
};

const lastRefreshedText = {
  marginTop: "6px",
  color: "#166534",
  fontSize: "13px",
  fontWeight: "bold",
};

export default Deals;