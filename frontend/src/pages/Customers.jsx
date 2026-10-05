import RequestError from "../components/RequestError";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { getCustomerDashboardRows } from "../api/customersApi";
import { formatMoney } from "../utils/moneyUtils";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Customers.css";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const tableRef = useRef(null);

  const requestBusy = useRef(false);

  const loadCustomers = useCallback(async () => {
    if (requestBusy.current) return;
    requestBusy.current = true;
    try {
      setLoading(true);
      setError("");

      const data = await getCustomerDashboardRows();
      setCustomers(data || []);
      setLastRefreshedAt(new Date());
    } catch (error) {
      setError(error.message || "Unable to load customers.");
    } finally {
      requestBusy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) loadCustomers(); });
    return () => { cancelled = true; };
  }, [loadCustomers]);

  const changePage = (next) => {
    setPage(next);
    if (tableRef.current) tableRef.current.scrollTop = 0;
  };
  const resetFilters = () => { setSearch(""); setBalanceFilter("all"); setSort("name"); changePage(1); };

  const filteredCustomers = useMemo(() => {
    const text = search.toLowerCase().trim();

    return customers.filter(customer => {
      const matchesSearch = [customer.customer_name, customer.company_name, customer.phone, customer.email, customer.address]
        .some(value => String(value || "").toLowerCase().includes(text));
      const matchesBalance = balanceFilter === "all" ||
        (balanceFilter === "outstanding" && Number(customer.total_balance || 0) > 0) ||
        (balanceFilter === "clear" && Number(customer.total_balance || 0) === 0) ||
        (balanceFilter === "maintenance" && Number(customer.maintenance_balance || 0) > 0);
      return matchesSearch && matchesBalance;
    }).sort((a, b) => {
      const byName = String(a.customer_name || "").localeCompare(String(b.customer_name || "")) || String(a.id).localeCompare(String(b.id));
      if (sort === "balance") return Number(b.total_balance || 0) - Number(a.total_balance || 0) || byName;
      if (sort === "deals") return Number(b.deal_count || 0) - Number(a.deal_count || 0) || byName;
      if (sort === "name-desc") return -byName;
      return byName;
    });
  }, [customers, search, balanceFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleCustomers = filteredCustomers.slice(startIndex, startIndex + pageSize);

  const totalBalance = filteredCustomers.reduce(
    (sum, customer) => sum + Number(customer.total_balance || 0),
    0
  );

  return (
    <div className="customers-page" style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Customer Management</div>
          <h1 style={pageTitle}>Customers</h1>
          <p style={pageDescription}>
            Find customer accounts, review outstanding balances, and open a profile to manage deals and maintenance.
          </p>
          {lastRefreshedAt && <p className="customers-refreshed">Last refreshed {lastRefreshedAt.toLocaleString()}</p>}
        </div>

        <button type="button" onClick={loadCustomers} disabled={loading} style={refreshButton}>
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {error && <div style={errorBox}><RequestError error={error} onRetry={loadCustomers} busy={loading} /></div>}

      {!lastRefreshedAt ? (loading ? <LoadingSpinner message="Loading customer accounts…" /> : null) : <>
      <p className="customers-scope">Summary for {filteredCustomers.length} matching customers from {customers.length} loaded accounts. Totals include every matching page.</p>
      <div style={metricGrid}>
        <MetricCard label="Customers" value={filteredCustomers.length} />

        <MetricCard
          label="Total Balance"
          value={formatMoney(totalBalance)}
          tone={totalBalance > 0 ? "danger" : "success"}
        />
      </div>

      <div style={filterCard} className="customers-filters">
        <div className="customers-search-field">
        <label htmlFor="customers-search" style={labelStyle}>Search Customers</label>
        <input
          type="search"
          id="customers-search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); changePage(1); }}
          placeholder="Search customer name, company name, phone, email, or address..."
          style={inputStyle}
        />
        </div>
        <div><label htmlFor="customers-balance" style={labelStyle}>Balance filter</label>
          <select id="customers-balance" value={balanceFilter} onChange={event => { setBalanceFilter(event.target.value); changePage(1); }}>
            <option value="all">All customers</option><option value="outstanding">Outstanding balance</option><option value="clear">Zero balance</option><option value="maintenance">Maintenance balance</option>
          </select>
        </div>
        <div><label htmlFor="customers-sort" style={labelStyle}>Sort by</label>
          <select id="customers-sort" value={sort} onChange={event => { setSort(event.target.value); changePage(1); }}>
            <option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="balance">Highest balance</option><option value="deals">Most deals</option>
          </select>
        </div>
        <button type="button" onClick={resetFilters} disabled={!search && balanceFilter === "all" && sort === "name"}>Reset filters</button>
      </div>
      {loading && <p role="status" className="customers-scope">Refreshing accounts… Current results remain visible until the refresh finishes.</p>}
      {(
        <div style={tableCard}>
          <div ref={tableRef} style={tableWrapper} tabIndex={0} role="region" aria-label="Customer accounts table">
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
                      <strong>{customers.length ? "No customers match these filters" : "No customers available"}</strong>
                      <p>{customers.length ? "Try another name or balance filter." : "Customer accounts will appear here once they are available."}</p>
                      {customers.length > 0 && <button type="button" className="customers-reset" onClick={resetFilters}>Show all customers</button>}
                    </td>
                  </tr>
                ) : (
                  visibleCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td style={tdStyle}>
                        <Link
                          to={`/customers/${customer.id}`}
                          style={customerLink}
                        >
                          {customer.customer_name || "—"}
                        </Link>

                        {customer.company_name && (
                          <div style={companyNameText}>
                            🏢 {customer.company_name}
                          </div>
                        )}

                        <div style={smallText}>{customer.address || ""}</div>
                      </td>

                      <td style={tdStyle}>{customer.phone || "—"}</td>
                      <td style={tdStyle}>{customer.email || "—"}</td>
                      <td style={centerTd}>{customer.deal_count}</td>
                      <td style={centerTd}>{customer.maintenance_count}</td>
                      <td style={rightTd}>
                        {formatMoney(customer.deal_balance)}
                      </td>
                      <td style={rightTd}>
                        {formatMoney(customer.maintenance_balance)}
                      </td>

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
                        <Link
                          to={`/customers/${customer.id}`}
                          style={viewButton}
                        >
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <nav className="customers-pagination" aria-label="Customer table pagination">
            <span className="customers-pagination-summary" role="status">
              Showing {filteredCustomers.length ? startIndex + 1 : 0}–{Math.min(startIndex + pageSize, filteredCustomers.length)} of {filteredCustomers.length} customers
            </span>
            <label className="customers-page-size">
              Rows per page
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); changePage(1); }}>
                {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <div className="customers-page-buttons">
              <button type="button" disabled={currentPage === 1} onClick={() => changePage(1)} aria-label="First customer page">First</button>
              <button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)} aria-label="Previous customer page">Previous</button>
              <span>Page {currentPage} of {totalPages}</span>
              <button type="button" disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)} aria-label="Next customer page">Next</button>
              <button type="button" disabled={currentPage === totalPages} onClick={() => changePage(totalPages)} aria-label="Last customer page">Last</button>
            </div>
          </nav>
        </div>
      )}
      </>}
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
  if (tone === "success") {
    return { background: "#f0fdf4", borderColor: "#bbf7d0" };
  }

  if (tone === "danger") {
    return { background: "#fef2f2", borderColor: "#fecaca" };
  }

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
  font: "inherit",
  fontSize: "14px",
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
  maxHeight: "65vh",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
};

const tableStyle = {
  width: "100%",
  minWidth: "1120px",
  borderCollapse: "collapse",
};

const thStyle = {
  position: "sticky",
  top: 0,
  zIndex: 1,
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

const companyNameText = {
  marginTop: "5px",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: "900",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "5px 8px",
  display: "inline-flex",
  maxWidth: "100%",
  overflowWrap: "anywhere",
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