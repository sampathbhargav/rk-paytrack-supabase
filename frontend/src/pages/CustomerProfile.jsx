import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  calculateDealTotals,
  getCustomerProfileById,
  getDealsByCustomerId,
  getMaintenanceJobsByCustomerId,
  getPaymentsByDealIds,
  getPromisesByDealIds,
} from "../api/customerProfileApi";
import { calculateMaintenanceTotals } from "../api/maintenanceApi";
import { formatMoney } from "../utils/moneyUtils";

function CustomerProfile() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);
  const [maintenanceJobs, setMaintenanceJobs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomerProfile();
  }, [customerId]);

  const loadCustomerProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const customerData = await getCustomerProfileById(customerId);
      const dealsData = await getDealsByCustomerId(customerId);

      const dealIds = (dealsData || []).map((deal) => deal.id);

      const paymentsData = await getPaymentsByDealIds(dealIds);
      const promisesData = await getPromisesByDealIds(dealIds);
      const maintenanceData = await getMaintenanceJobsByCustomerId(customerId);

      setCustomer(customerData);
      setDeals(dealsData || []);
      setPayments(paymentsData || []);
      setPromises(promisesData || []);
      setMaintenanceJobs(maintenanceData || []);
    } catch (error) {
      setError(error.message || "Unable to load customer profile.");
    } finally {
      setLoading(false);
    }
  };

  const dealsWithTotals = useMemo(() => {
    return deals.map((deal) => {
      const dealPayments = payments.filter(
        (payment) => payment.deal_id === deal.id
      );

      const dealPromises = promises.filter(
        (promise) => promise.deal_id === deal.id
      );

      return {
        ...deal,
        totals: calculateDealTotals(deal, dealPayments),
        promises: dealPromises,
      };
    });
  }, [deals, payments, promises]);

  const maintenanceWithTotals = useMemo(() => {
    return maintenanceJobs.map((job) => ({
      ...job,
      totals: calculateMaintenanceTotals(job),
    }));
  }, [maintenanceJobs]);

  const dealTotal = dealsWithTotals.reduce(
    (sum, deal) => sum + Number(deal.totals.totalAmount || 0),
    0
  );

  const dealPaid = dealsWithTotals.reduce(
    (sum, deal) => sum + Number(deal.totals.totalPaid || 0),
    0
  );

  const dealBalance = dealsWithTotals.reduce(
    (sum, deal) => sum + Number(deal.totals.balance || 0),
    0
  );

  const maintenanceTotal = maintenanceWithTotals.reduce(
    (sum, job) => sum + Number(job.totals.totalAmount || 0),
    0
  );

  const maintenancePaid = maintenanceWithTotals.reduce(
    (sum, job) => sum + Number(job.totals.totalPaid || 0),
    0
  );

  const maintenanceBalance = maintenanceWithTotals.reduce(
    (sum, job) => sum + Number(job.totals.balance || 0),
    0
  );

  const totalCustomerBalance = dealBalance + maintenanceBalance;

  const openDeals = dealsWithTotals.filter(
    (deal) =>
      Number(deal.totals.balance || 0) > 0 &&
      deal.status !== "Cancelled" &&
      deal.status !== "Closed" &&
      deal.status !== "Repo"
  );

  const openMaintenance = maintenanceWithTotals.filter(
    (job) =>
      Number(job.totals.balance || 0) > 0 &&
      job.work_status !== "Cancelled"
  );

  if (error) {
    return (
      <div style={pageWrapper}>
        <button type="button" onClick={() => navigate(-1)} style={backButton}>
            ← Back
        </button>

        <div style={errorBox}>{error}</div>
      </div>
    );
  }

  if (loading || !customer) {
    return (
      <div style={pageWrapper}>
        <div style={loadingCard}>Loading customer profile...</div>
      </div>
    );
  }

  return (
    <div style={pageWrapper}>
      <div style={topNav}>
        <button type="button" onClick={() => navigate(-1)} style={backButton}>
            ← Back
        </button>
      </div>

      <div style={profileHero}>
        <div style={avatarCircle}>{getInitials(customer.customer_name)}</div>

        <div style={{ minWidth: 0 }}>
          <div style={eyebrow}>Customer Profile</div>
          <h1 style={customerName}>{customer.customer_name}</h1>

          <div style={customerMeta}>
            <span>{customer.phone || "No phone"}</span>
            <span>{customer.email || "No email"}</span>
            <span>{customer.address || "No address"}</span>
          </div>
        </div>

        <div style={grandBalanceCard}>
          <span>Total Customer Balance</span>
          <strong>{formatMoney(totalCustomerBalance)}</strong>
        </div>
      </div>

      <div style={metricGrid}>
        <MetricCard label="Deal Balance" value={formatMoney(dealBalance)} tone={dealBalance > 0 ? "danger" : "success"} />
        <MetricCard label="Maintenance Balance" value={formatMoney(maintenanceBalance)} tone={maintenanceBalance > 0 ? "danger" : "success"} />
        <MetricCard label="Total Balance" value={formatMoney(totalCustomerBalance)} tone={totalCustomerBalance > 0 ? "danger" : "success"} />
        <MetricCard label="Open Deals" value={openDeals.length} tone={openDeals.length > 0 ? "warning" : "success"} />
        <MetricCard label="Open Maintenance" value={openMaintenance.length} tone={openMaintenance.length > 0 ? "warning" : "success"} />
        <MetricCard label="Total Paid" value={formatMoney(dealPaid + maintenancePaid)} tone="success" />
      </div>

      <SectionCard
        title="All Deals"
        description="Every truck deal connected to this customer."
      >
        <div style={tableWrapper}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Deal Tag</th>
                <th style={thStyle}>Truck</th>
                <th style={thStyle}>Deal Type</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Paid</th>
                <th style={thStyle}>Balance</th>
                <th style={thStyle}>Promises</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {dealsWithTotals.length === 0 ? (
                <tr>
                  <td style={emptyCell} colSpan="9">
                    No truck deals found for this customer.
                  </td>
                </tr>
              ) : (
                dealsWithTotals.map((deal) => {
                  const pendingPromises = deal.promises.filter(
                    (promise) => promise.promise_status === "Pending"
                  );

                  return (
                    <tr key={deal.id}>
                      <td style={tdStyle}>
                        <strong>{deal.deal_tag || "—"}</strong>
                      </td>

                      <td style={tdStyle}>
                        {`${deal.year || ""} ${deal.truck || ""}`.trim() || "—"}
                        <div style={smallText}>{deal.vin || ""}</div>
                      </td>

                      <td style={tdStyle}>
                        <span style={typeBadge}>{deal.deal_type || "—"}</span>
                        {deal.deal_subtype && (
                          <div style={smallText}>{deal.deal_subtype}</div>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <span style={getStatusBadge(deal.status)}>
                          {deal.status || "Active"}
                        </span>
                      </td>

                      <td style={tdStyle}>{formatMoney(deal.totals.totalAmount)}</td>
                      <td style={tdStyle}>{formatMoney(deal.totals.totalPaid)}</td>

                      <td style={tdStyle}>
                        <strong
                          style={
                            Number(deal.totals.balance || 0) > 0
                              ? dangerText
                              : successText
                          }
                        >
                          {formatMoney(deal.totals.balance)}
                        </strong>
                      </td>

                      <td style={tdStyle}>{pendingPromises.length}</td>

                      <td style={tdStyle}>
                        <Link to={`/deals/${deal.id}`} style={viewButton}>
                          View Deal
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="All Maintenance"
        description="All service and repair invoices connected to this customer."
      >
        <div style={tableWrapper}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Invoice</th>
                <th style={thStyle}>Work</th>
                <th style={thStyle}>Truck</th>
                <th style={thStyle}>Technician</th>
                <th style={thStyle}>Work Status</th>
                <th style={thStyle}>Balance Status</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Paid</th>
                <th style={thStyle}>Balance</th>
                <th style={thStyle}>Due Date</th>
              </tr>
            </thead>

            <tbody>
              {maintenanceWithTotals.length === 0 ? (
                <tr>
                  <td style={emptyCell} colSpan="10">
                    No maintenance records found for this customer.
                  </td>
                </tr>
              ) : (
                maintenanceWithTotals.map((job) => (
                  <tr key={job.id}>
                    <td style={tdStyle}>
                      <strong>{job.invoice_no || "—"}</strong>
                    </td>

                    <td style={tdStyle}>
                      <strong>{job.job_title || "—"}</strong>
                      <div style={smallText}>{job.job_description || ""}</div>
                    </td>

                    <td style={tdStyle}>
                      {`${job.year || ""} ${job.truck || ""}`.trim() || "—"}
                      <div style={smallText}>{job.vin || ""}</div>
                    </td>

                    <td style={tdStyle}>{job.technician || "—"}</td>

                    <td style={tdStyle}>
                      <span style={getStatusBadge(job.work_status)}>
                        {job.work_status || "Open"}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <span style={getBalanceBadge(job.totals.balanceStatus)}>
                        {job.totals.balanceStatus}
                      </span>
                    </td>

                    <td style={tdStyle}>{formatMoney(job.totals.totalAmount)}</td>
                    <td style={tdStyle}>{formatMoney(job.totals.totalPaid)}</td>

                    <td style={tdStyle}>
                      <strong
                        style={
                          Number(job.totals.balance || 0) > 0
                            ? dangerText
                            : successText
                        }
                      >
                        {formatMoney(job.totals.balance)}
                      </strong>
                    </td>

                    <td style={tdStyle}>{formatDate(job.due_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <section style={sectionCard}>
      <div style={sectionHeader}>
        <div>
          <h2 style={sectionTitle}>{title}</h2>
          <p style={sectionDescription}>{description}</p>
        </div>
      </div>

      {children}
    </section>
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

function getInitials(name) {
  if (!name) return "RK";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  return `${month}/${day}/${year}`;
}

function getMetricTone(tone) {
  if (tone === "success") return { background: "#f0fdf4", borderColor: "#bbf7d0" };
  if (tone === "danger") return { background: "#fef2f2", borderColor: "#fecaca" };
  if (tone === "warning") return { background: "#fffbeb", borderColor: "#fde68a" };
  return { background: "white", borderColor: "#e5e7eb" };
}

function getStatusBadge(status) {
  const base = badgeBase;

  if (status === "Paid Off" || status === "Closed") {
    return { ...base, background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" };
  }

  if (status === "Completed" || status === "In Progress") {
    return { ...base, background: "#dbeafe", color: "#1d4ed8", borderColor: "#bfdbfe" };
  }

  if (status === "Repo" || status === "Defaulted" || status === "Overdue") {
    return { ...base, background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" };
  }

  if (status === "Cancelled") {
    return { ...base, background: "#f3f4f6", color: "#6b7280", borderColor: "#e5e7eb" };
  }

  return { ...base, background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" };
}

function getBalanceBadge(status) {
  const base = badgeBase;

  if (status === "Paid" || status === "No Charge") {
    return { ...base, background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" };
  }

  if (status === "Promised") {
    return { ...base, background: "#dbeafe", color: "#1d4ed8", borderColor: "#bfdbfe" };
  }

  if (status === "Partial") {
    return { ...base, background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" };
  }

  if (status === "Overdue" || status === "Broken Promise") {
    return { ...base, background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" };
  }

  return { ...base, background: "#f3f4f6", color: "#374151", borderColor: "#d1d5db" };
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const topNav = {
  marginBottom: "18px",
};

const backLink = {
  display: "inline-flex",
  alignItems: "center",
  color: "#0A1A2F",
  textDecoration: "none",
  fontWeight: "900",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "9px 13px",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
};

const profileHero = {
  background: "linear-gradient(135deg, #111827 0%, #0A1A2F 55%, #374151 100%)",
  color: "white",
  borderRadius: "22px",
  padding: "24px",
  display: "flex",
  alignItems: "center",
  gap: "18px",
  marginBottom: "18px",
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.22)",
  flexWrap: "wrap",
};

const avatarCircle = {
  width: "76px",
  height: "76px",
  borderRadius: "24px",
  background: "white",
  color: "#0A1A2F",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  fontWeight: "900",
  flexShrink: 0,
};

const eyebrow = {
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#cbd5e1",
  marginBottom: "8px",
};

const customerName = {
  margin: 0,
  fontSize: "30px",
  color: "white",
};

const customerMeta = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "9px",
  color: "#e5e7eb",
  fontSize: "13px",
};

const grandBalanceCard = {
  marginLeft: "auto",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "16px",
  padding: "14px",
  display: "grid",
  gap: "5px",
  minWidth: "220px",
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
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

const sectionCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "18px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  marginBottom: "18px",
};

const sectionHeader = {
  marginBottom: "14px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
};

const sectionDescription = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#667085",
  fontSize: "14px",
};

const tableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
};

const tableStyle = {
  width: "100%",
  minWidth: "1100px",
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

const tdStyle = {
  padding: "11px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  fontSize: "13px",
  verticalAlign: "top",
};

const emptyCell = {
  padding: "20px",
  textAlign: "center",
  color: "#667085",
};

const smallText = {
  marginTop: "4px",
  color: "#667085",
  fontSize: "12px",
};

const dangerText = {
  color: "#991b1b",
};

const successText = {
  color: "#166534",
};

const typeBadge = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  fontWeight: "900",
  fontSize: "12px",
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

const badgeBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
  border: "1px solid transparent",
  whiteSpace: "nowrap",
};

const loadingCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "24px",
  color: "#111827",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "13px",
  borderRadius: "12px",
  marginTop: "15px",
  fontWeight: "bold",
};

const backButton = {
    display: "inline-flex",
    alignItems: "center",
    color: "#0A1A2F",
    textDecoration: "none",
    fontWeight: "900",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "999px",
    padding: "9px 13px",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
    cursor: "pointer",
  };

export default CustomerProfile;