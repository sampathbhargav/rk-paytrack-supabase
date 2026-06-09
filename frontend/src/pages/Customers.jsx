import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCustomerDashboardRows } from "../api/customersApi";
import { formatMoney } from "../utils/moneyUtils";
import LoadingSpinner from "../components/LoadingSpinner";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getCustomerDashboardRows();
      setCustomers(data || []);
    } catch (error) {
      setError(error.message || "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const text = search.toLowerCase().trim();

    if (!text) return customers;

    return customers.filter((customer) => {
      return (
        customer.customer_name?.toLowerCase().includes(text) ||
        customer.phone?.toLowerCase().includes(text) ||
        customer.email?.toLowerCase().includes(text) ||
        customer.address?.toLowerCase().includes(text)
      );
    });
  }, [customers, search]);

  const totalBalance = filteredCustomers.reduce(
    (sum, customer) => sum + Number(customer.total_balance || 0),
    0
  );

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Customer Management</div>
          <h1 style={pageTitle}>Customers</h1>
          <p style={pageDescription}>
            Search customers, review balances, and open the full customer profile.
          </p>
        </div>

        <button type="button" onClick={loadCustomers} style={refreshButton}>
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={metricGrid}>
        <MetricCard label="Customers" value={filteredCustomers.length} />
        <MetricCard label="Total Balance" value={formatMoney(totalBalance)} tone={totalBalance > 0 ? "danger" : "success"} />
      </div>

      <div style={filterCard}>
        <label style={labelStyle}>Search Customers</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, email, or address..."
          style={inputStyle}
        />
      </div>
      {loading ? (
        <LoadingSpinner message="Loading customers..." />
      ) : (
      <div style={tableCard}>
        <div style={tableWrapper}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Email</th>
                <th style={centerTh}>Deals</th>
                <th style={centerTh}>Maintenance</th>
                <th style={rightTh}>Deal Balance</th>
                <th style={rightTh}>Maintenance Balance</th>
                <th style={rightTh}>Total Balance</th>
                <th style={centerTh}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td style={emptyCell} colSpan="9">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td style={tdStyle}>
                      <Link to={`/customers/${customer.id}`} style={customerLink}>
                        {customer.customer_name || "—"}
                      </Link>
                      <div style={smallText}>{customer.address || ""}</div>
                    </td>

                    <td style={tdStyle}>{customer.phone || "—"}</td>
                    <td style={tdStyle}>{customer.email || "—"}</td>
                    <td style={centerTd}>{customer.deal_count}</td>
                    <td style={centerTd}>{customer.maintenance_count}</td>
                    <td style={rightTd}>{formatMoney(customer.deal_balance)}</td>
                    <td style={rightTd}>{formatMoney(customer.maintenance_balance)}</td>

                    <td style={rightTd}>
                      <strong
                        style={
                          Number(customer.total_balance || 0) > 0
                            ? dangerText
                            : successText
                        }
                      >
                        {formatMoney(customer.total_balance)}
                      </strong>
                    </td>

                    <td style={centerTd}>
                      <Link to={`/customers/${customer.id}`} style={viewButton}>
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, tone = "default" }) {
  return (
    <div style={{ ...metricCard, ...getMetricTone(tone) }}>
      <span style={metricLabel}>{label}</span>
      <strong style={metricValue}>{value}</strong>
    </div>
  );
}

function getMetricTone(tone) {
  if (tone === "success") return { background: "#f0fdf4", borderColor: "#bbf7d0" };
  if (tone === "danger") return { background: "#fef2f2", borderColor: "#fecaca" };
  return { background: "white", borderColor: "#e5e7eb" };
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
  color: "white",
};

const pageDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#dbeafe",
};

const refreshButton = {
  background: "white",
  color: "#0A1A2F",
  border: "none",
  borderRadius: "12px",
  padding: "11px 15px",
  cursor: "pointer",
  fontWeight: "900",
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const metricCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "15px",
  display: "grid",
  gap: "7px",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.06)",
};

const metricLabel = {
  color: "#667085",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const metricValue = {
  color: "#111827",
  fontSize: "20px",
};

const filterCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "16px",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.07)",
};

const labelStyle = {
  display: "block",
  fontWeight: "800",
  color: "#374151",
  marginBottom: "7px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  outline: "none",
  boxSizing: "border-box",
};

const tableCard = {
  background: "white",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
};

const tableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
};

const tableStyle = {
  width: "100%",
  minWidth: "1120px",
  borderCollapse: "collapse",
};

const thStyle = {
  background: "#f8fafc",
  color: "#334155",
  fontSize: "12px",
  textAlign: "left",
  padding: "11px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const centerTh = {
  ...thStyle,
  textAlign: "center",
};

const rightTh = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle = {
  padding: "11px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  fontSize: "13px",
  verticalAlign: "top",
};

const centerTd = {
  ...tdStyle,
  textAlign: "center",
};

const rightTd = {
  ...tdStyle,
  textAlign: "right",
};

const customerLink = {
  color: "#0A1A2F",
  fontWeight: "900",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
};

const viewButton = {
  display: "inline-flex",
  background: "#0A1A2F",
  color: "white",
  textDecoration: "none",
  borderRadius: "9px",
  padding: "8px 10px",
  fontWeight: "900",
  fontSize: "12px",
};

const smallText = {
  marginTop: "4px",
  color: "#667085",
  fontSize: "12px",
};

const emptyCell = {
  padding: "20px",
  textAlign: "center",
  color: "#667085",
};

const dangerText = {
  color: "#991b1b",
};

const successText = {
  color: "#166534",
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

export default Customers;