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
import { updateCustomer } from "../api/customersApi";
import { calculateMaintenanceTotals } from "../api/maintenanceApi";
import { formatMoney } from "../utils/moneyUtils";
import CustomerFollowUps from "../components/CustomerFollowUps";

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

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCustomerData, setEditCustomerData] = useState({
    customerName: "",
    companyName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    loadCustomerProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const openEditCustomerModal = () => {
    setEditCustomerData({
      customerName: customer?.customer_name || "",
      companyName: customer?.company_name || "",
      phone: customer?.phone || "",
      email: customer?.email || "",
      address: customer?.address || "",
    });

    setEditError("");
    setEditModalOpen(true);
  };

  const closeEditCustomerModal = () => {
    if (editSaving) return;

    setEditModalOpen(false);
    setEditError("");
  };

  const handleEditCustomerChange = (event) => {
    const { name, value } = event.target;

    setEditError("");

    setEditCustomerData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateEditCustomer = () => {
    const data = cleanEditCustomerData(editCustomerData);

    if (!data.customerName) {
      return "Customer name is required.";
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return "Please enter a valid email address.";
    }

    return "";
  };

  const handleSaveCustomerInfo = async (event) => {
    event.preventDefault();

    const validationError = validateEditCustomer();

    if (validationError) {
      setEditError(validationError);
      return;
    }

    const data = cleanEditCustomerData(editCustomerData);

    try {
      setEditSaving(true);
      setEditError("");

      const updatedCustomer = await updateCustomer(customer.id, {
        customerName: data.customerName,
        companyName: data.companyName,
        phone: data.phone,
        email: data.email,
        address: data.address,
      });

      setCustomer((prev) => ({
        ...prev,
        customer_name: updatedCustomer?.customer_name ?? data.customerName,
        company_name: updatedCustomer?.company_name ?? data.companyName,
        phone: updatedCustomer?.phone ?? data.phone,
        email: updatedCustomer?.email ?? data.email,
        address: updatedCustomer?.address ?? data.address,
      }));

      setEditModalOpen(false);
      setEditError("");

      await loadCustomerProfile();
    } catch (error) {
      setEditError(error.message || "Failed to update customer information.");
    } finally {
      setEditSaving(false);
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

  const dealPaid = dealsWithTotals.reduce(
    (sum, deal) => sum + Number(deal.totals.totalPaid || 0),
    0
  );

  const dealBalance = dealsWithTotals.reduce(
    (sum, deal) => sum + Number(deal.totals.balance || 0),
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
  const companyName = customer?.company_name?.trim();

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

        <button
          type="button"
          onClick={openEditCustomerModal}
          style={editCustomerButton}
        >
          ✏️ Edit Customer Info
        </button>
      </div>

      <div style={profileHero}>
        <div style={avatarCircle}>{getInitials(customer.customer_name)}</div>

        <div style={heroCustomerInfo}>
          <div style={eyebrow}>Customer Profile</div>

          <h1 style={customerNameStyle}>{customer.customer_name}</h1>

          {companyName && (
            <div style={companyNamePill}>
              <span style={companyIcon}>🏢</span>
              <span>{companyName}</span>
            </div>
          )}

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

      <div style={customerInfoGrid}>
        <InfoTile label="Customer Name" value={customer.customer_name || "—"} />
        <InfoTile label="Company Name" value={companyName || "—"} />
        <InfoTile label="Phone" value={customer.phone || "—"} />
        <InfoTile label="Email" value={customer.email || "—"} />
        <InfoTile label="Address" value={customer.address || "—"} wide />
      </div>

      <div style={metricGrid}>
        <MetricCard
          label="Deal Balance"
          value={formatMoney(dealBalance)}
          tone={dealBalance > 0 ? "danger" : "success"}
        />
        <MetricCard
          label="Maintenance Balance"
          value={formatMoney(maintenanceBalance)}
          tone={maintenanceBalance > 0 ? "danger" : "success"}
        />
        <MetricCard
          label="Total Balance"
          value={formatMoney(totalCustomerBalance)}
          tone={totalCustomerBalance > 0 ? "danger" : "success"}
        />
        <MetricCard
          label="Open Deals"
          value={openDeals.length}
          tone={openDeals.length > 0 ? "warning" : "success"}
        />
        <MetricCard
          label="Open Maintenance"
          value={openMaintenance.length}
          tone={openMaintenance.length > 0 ? "warning" : "success"}
        />
        <MetricCard
          label="Total Paid"
          value={formatMoney(dealPaid + maintenancePaid)}
          tone="success"
        />
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
                        {`${deal.year || ""} ${deal.truck || ""}`.trim() ||
                          "—"}
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

                      <td style={tdStyle}>
                        {formatMoney(deal.totals.totalAmount)}
                      </td>
                      <td style={tdStyle}>
                        {formatMoney(deal.totals.totalPaid)}
                      </td>

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

                    <td style={tdStyle}>
                      {formatMoney(job.totals.totalAmount)}
                    </td>
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

      <CustomerFollowUps
        customerId={customer?.id}
        customerName={customer?.customer_name || ""}
      />

      {editModalOpen && (
        <EditCustomerModal
          data={editCustomerData}
          error={editError}
          saving={editSaving}
          onChange={handleEditCustomerChange}
          onSave={handleSaveCustomerInfo}
          onClose={closeEditCustomerModal}
        />
      )}
    </div>
  );
}

function EditCustomerModal({
  data,
  error,
  saving,
  onChange,
  onSave,
  onClose,
}) {
  return (
    <div style={modalOverlay}>
      <form onSubmit={onSave} style={modalBox}>
        <div style={modalHeader}>
          <div>
            <h2 style={modalTitle}>Edit Customer Info</h2>
            <p style={modalDescription}>
              Update only the customer contact details. Deals, payments,
              promises, and maintenance records will not be changed.
            </p>
          </div>

          <button type="button" onClick={onClose} style={modalCloseButton}>
            ×
          </button>
        </div>

        {error && <div style={modalErrorBox}>{error}</div>}

        <div style={modalGrid}>
          <ModalInput
            label="Customer Name"
            name="customerName"
            value={data.customerName}
            onChange={onChange}
            required
          />

          <ModalInput
            label="Company Name"
            name="companyName"
            value={data.companyName}
            onChange={onChange}
            helperText="Optional"
          />

          <ModalInput
            label="Phone"
            name="phone"
            value={data.phone}
            onChange={onChange}
          />

          <ModalInput
            label="Email"
            name="email"
            type="email"
            value={data.email}
            onChange={onChange}
          />

          <div style={modalWideField}>
            <ModalInput
              label="Address"
              name="address"
              value={data.address}
              onChange={onChange}
            />
          </div>
        </div>

        <div style={modalActions}>
          <button type="submit" style={modalSaveButton} disabled={saving}>
            {saving ? "Saving..." : "Save Customer Info"}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={modalCancelButton}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ModalInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
  helperText,
}) {
  return (
    <div>
      <label style={modalLabel}>
        {label} {required && <span style={requiredMark}>*</span>}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        style={modalInput}
      />

      {helperText && <small style={modalHelperText}>{helperText}</small>}
    </div>
  );
}

function cleanEditCustomerData(data) {
  return {
    customerName: String(data.customerName || "").trim(),
    companyName: String(data.companyName || "").trim(),
    phone: String(data.phone || "").trim(),
    email: String(data.email || "").trim(),
    address: String(data.address || "").trim(),
  };
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

function InfoTile({ label, value, wide }) {
  return (
    <div style={wide ? { ...infoTile, gridColumn: "span 2" } : infoTile}>
      <span style={infoTileLabel}>{label}</span>
      <strong style={infoTileValue}>{value || "—"}</strong>
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
  if (tone === "success") {
    return { background: "#f0fdf4", borderColor: "#bbf7d0" };
  }

  if (tone === "danger") {
    return { background: "#fef2f2", borderColor: "#fecaca" };
  }

  if (tone === "warning") {
    return { background: "#fffbeb", borderColor: "#fde68a" };
  }

  return { background: "white", borderColor: "#e5e7eb" };
}

function getStatusBadge(status) {
  const base = badgeBase;

  if (status === "Paid Off" || status === "Closed") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  if (status === "Completed" || status === "In Progress") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
      borderColor: "#bfdbfe",
    };
  }

  if (status === "Repo" || status === "Defaulted" || status === "Overdue") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }

  if (status === "Cancelled") {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#6b7280",
      borderColor: "#e5e7eb",
    };
  }

  return {
    ...base,
    background: "#fef3c7",
    color: "#92400e",
    borderColor: "#fde68a",
  };
}

function getBalanceBadge(status) {
  const base = badgeBase;

  if (status === "Paid" || status === "No Charge") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  if (status === "Promised") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
      borderColor: "#bfdbfe",
    };
  }

  if (status === "Partial") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  if (status === "Overdue" || status === "Broken Promise") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }

  return {
    ...base,
    background: "#f3f4f6",
    color: "#374151",
    borderColor: "#d1d5db",
  };
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const topNav = {
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
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

const heroCustomerInfo = {
  minWidth: 0,
  flex: "1 1 320px",
};

const eyebrow = {
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#cbd5e1",
  marginBottom: "8px",
};

const customerNameStyle = {
  margin: 0,
  fontSize: "30px",
  color: "white",
  overflowWrap: "anywhere",
};

const companyNamePill = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  marginTop: "10px",
  background: "rgba(255,255,255,0.13)",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "#ffffff",
  borderRadius: "999px",
  padding: "7px 11px",
  fontSize: "13px",
  fontWeight: "900",
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const companyIcon = {
  flexShrink: 0,
};

const customerMeta = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "9px",
  color: "#e5e7eb",
  fontSize: "13px",
  overflowWrap: "anywhere",
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

const customerInfoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const infoTile = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "13px",
  display: "grid",
  gap: "5px",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
  minWidth: 0,
};

const infoTileLabel = {
  color: "#667085",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const infoTileValue = {
  color: "#111827",
  fontSize: "14px",
  overflowWrap: "anywhere",
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

const editCustomerButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.18)",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.58)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
  zIndex: 9999,
};

const modalBox = {
  background: "white",
  borderRadius: "20px",
  width: "720px",
  maxWidth: "96vw",
  maxHeight: "92vh",
  overflowY: "auto",
  padding: "18px",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.3)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  paddingBottom: "14px",
  marginBottom: "16px",
  borderBottom: "1px solid #e5e7eb",
};

const modalTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "21px",
};

const modalDescription = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "14px",
  lineHeight: "1.45",
};

const modalCloseButton = {
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  border: "none",
  background: "#e5e7eb",
  color: "#111827",
  cursor: "pointer",
  fontSize: "20px",
  fontWeight: "900",
  flexShrink: 0,
};

const modalGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "14px",
};

const modalWideField = {
  gridColumn: "1 / -1",
};

const modalLabel = {
  display: "block",
  color: "#374151",
  fontWeight: "900",
  marginBottom: "6px",
  fontSize: "13px",
};

const requiredMark = {
  color: "#dc2626",
};

const modalInput = {
  width: "100%",
  padding: "11px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  boxSizing: "border-box",
  fontSize: "14px",
};

const modalHelperText = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  marginTop: "5px",
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "18px",
  flexWrap: "wrap",
};

const modalSaveButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "11px 14px",
  fontWeight: "900",
  cursor: "pointer",
};

const modalCancelButton = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: "10px",
  padding: "11px 14px",
  fontWeight: "900",
  cursor: "pointer",
};

const modalErrorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "12px",
  padding: "11px",
  marginBottom: "14px",
  fontWeight: "900",
};

export default CustomerProfile;