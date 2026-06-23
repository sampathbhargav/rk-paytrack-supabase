import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  formatActivityDate,
  getActivityLogs,
} from "../api/activityLogsApi";

const todayString = new Date().toISOString().split("T")[0];

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    module: "",
    action: "",
    startDate: "",
    endDate: todayString,
  });

  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setMessage("");

      const data = await getActivityLogs(filters);

      setLogs(data || []);
    } catch (error) {
      setMessage(error.message || "Unable to load activity logs.");
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return {
      total: logs.length,
      today: logs.filter((log) => String(log.created_at || "").startsWith(today))
        .length,
      payments: logs.filter((log) =>
        String(log.module || "").toLowerCase().includes("payment")
      ).length,
      maintenance: logs.filter((log) =>
        String(log.module || "").toLowerCase().includes("maintenance")
      ).length,
    };
  }, [logs]);

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>System Monitoring</div>
          <h1 style={pageTitle}>Activity Logs</h1>
          <p style={pageDescription}>
            Track important user actions across deals, payments, maintenance,
            customers, promises, receipts, and reports.
          </p>
        </div>

        <button type="button" onClick={loadLogs} style={refreshButton}>
          Refresh Logs
        </button>
      </div>

      <div style={statsGrid}>
        <StatCard title="Total Logs" value={stats.total} icon="📋" />
        <StatCard title="Today" value={stats.today} icon="📅" />
        <StatCard title="Payment Logs" value={stats.payments} icon="💵" />
        <StatCard title="Maintenance Logs" value={stats.maintenance} icon="🔧" />
      </div>

      <div style={filterCard}>
        <div style={filterGrid}>
          <div>
            <label style={labelStyle}>Search</label>
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search user, action, customer, invoice, deal tag..."
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Module</label>
            <select
              value={filters.module}
              onChange={(event) => updateFilter("module", event.target.value)}
              style={inputStyle}
            >
              <option value="">All Modules</option>
              <option value="Deals">Deals</option>
              <option value="Payments">Payments</option>
              <option value="Promises">Promises</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Customers">Customers</option>
              <option value="Reports">Reports</option>
              <option value="Receipts">Receipts</option>
              <option value="Auth">Auth</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Action</label>
            <select
              value={filters.action}
              onChange={(event) => updateFilter("action", event.target.value)}
              style={inputStyle}
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="VOID">VOID</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="PRINT">PRINT</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => updateFilter("startDate", event.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => updateFilter("endDate", event.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={filterButtonWrap}>
            <button type="button" onClick={loadLogs} style={applyButton}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {message && <div style={errorBox}>{message}</div>}

      <div style={tableCard}>
        <div style={tableHeader}>
          <div>
            <h2 style={sectionTitle}>Recent Activity</h2>
            <p style={sectionDescription}>
              Showing latest user activity based on your selected filters.
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading activity logs..." height="420px" />
        ) : logs.length === 0 ? (
          <div style={emptyState}>
            No activity logs found for the selected filters.
          </div>
        ) : (
          <div style={tableWrapper}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date / Time</th>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Module</th>
                  <th style={thStyle}>Record</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Details</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={tdStyle}>{formatActivityDate(log.created_at)}</td>
                    <td style={tdStyle}>{log.user_email || "—"}</td>
                    <td style={tdStyle}>
                      <span style={actionBadge(log.action)}>{log.action}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={moduleBadge}>{log.module || "—"}</span>
                    </td>
                    <td style={tdStyle}>
                      <strong>{log.entity_label || log.entity_id || "—"}</strong>
                      {log.entity_type && (
                        <span style={subText}>{log.entity_type}</span>
                      )}
                    </td>
                    <td style={tdStyle}>{log.description || "—"}</td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        style={viewButton}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div style={statCard}>
      <div style={statIcon}>{icon}</div>
      <div>
        <p style={statTitle}>{title}</p>
        <strong style={statValue}>{value}</strong>
      </div>
    </div>
  );
}

function LogDetailModal({ log, onClose }) {
  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <div style={modalHeader}>
          <div>
            <h2 style={modalTitle}>Activity Details</h2>
            <p style={modalSubtitle}>
              {formatActivityDate(log.created_at)} · {log.user_email || "Unknown user"}
            </p>
          </div>

          <button type="button" onClick={onClose} style={closeButton}>
            ×
          </button>
        </div>

        <div style={detailGrid}>
          <DetailItem label="Action" value={log.action} />
          <DetailItem label="Module" value={log.module} />
          <DetailItem label="Entity Type" value={log.entity_type} />
          <DetailItem label="Entity ID" value={log.entity_id} />
          <DetailItem label="Entity Label" value={log.entity_label} />
          <DetailItem label="User" value={log.user_email} />
        </div>

        <div style={detailSection}>
          <strong>Description</strong>
          <p>{log.description || "—"}</p>
        </div>

        <div style={detailSection}>
          <strong>Metadata</strong>
          <pre style={metadataBox}>
            {JSON.stringify(log.metadata || {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={detailItem}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function actionBadge(action) {
  const base = {
    display: "inline-flex",
    borderRadius: "999px",
    padding: "5px 8px",
    fontSize: "11px",
    fontWeight: "900",
    border: "1px solid transparent",
  };

  if (action === "DELETE" || action === "VOID") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }

  if (action === "UPDATE") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  if (action === "CREATE" || action === "PAYMENT") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  return {
    ...base,
    background: "#eff6ff",
    color: "#1d4ed8",
    borderColor: "#bfdbfe",
  };
}

const pageWrapper = {
  display: "grid",
  gap: "18px",
};

const heroCard = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #1d4ed8 100%)",
  color: "white",
  borderRadius: "22px",
  padding: "26px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.22)",
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
  fontSize: "32px",
};

const pageDescription = {
  margin: "8px 0 0",
  color: "#dbeafe",
  maxWidth: "760px",
  lineHeight: "1.5",
};

const refreshButton = {
  background: "white",
  color: "#0A1A2F",
  border: "none",
  borderRadius: "999px",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: "900",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "14px",
};

const statCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
};

const statIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "14px",
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "21px",
};

const statTitle = {
  margin: 0,
  color: "#667085",
  fontSize: "13px",
  fontWeight: "800",
};

const statValue = {
  display: "block",
  marginTop: "3px",
  color: "#111827",
  fontSize: "24px",
};

const filterCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
};

const filterGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  alignItems: "end",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "900",
  color: "#374151",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "11px",
  boxSizing: "border-box",
  fontSize: "14px",
};

const filterButtonWrap = {
  display: "flex",
  alignItems: "end",
};

const applyButton = {
  width: "100%",
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "12px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "12px",
  padding: "13px",
  fontWeight: "900",
};

const tableCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "16px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
};

const tableHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "14px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
};

const sectionDescription = {
  margin: "5px 0 0",
  color: "#667085",
  fontSize: "13px",
};

const tableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
};

const tableStyle = {
  width: "100%",
  minWidth: "1050px",
  borderCollapse: "collapse",
};

const thStyle = {
  background: "#f8fafc",
  color: "#475569",
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  fontSize: "13px",
  verticalAlign: "top",
};

const moduleBadge = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "11px",
  fontWeight: "900",
};

const subText = {
  display: "block",
  color: "#667085",
  fontSize: "11px",
  marginTop: "3px",
};

const viewButton = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: "900",
};

const emptyState = {
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  padding: "24px",
  textAlign: "center",
  color: "#667085",
  fontWeight: "800",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "20px",
};

const modalBox = {
  background: "white",
  borderRadius: "20px",
  width: "760px",
  maxWidth: "96vw",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: "18px",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.28)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "12px",
  marginBottom: "14px",
};

const modalTitle = {
  margin: 0,
  color: "#111827",
};

const modalSubtitle = {
  margin: "5px 0 0",
  color: "#667085",
};

const closeButton = {
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  border: "none",
  background: "#e5e7eb",
  color: "#111827",
  cursor: "pointer",
  fontSize: "20px",
  fontWeight: "900",
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "10px",
};

const detailItem = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "11px",
  display: "grid",
  gap: "4px",
};

const detailSection = {
  marginTop: "14px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
};

const metadataBox = {
  background: "#0f172a",
  color: "#e5e7eb",
  padding: "12px",
  borderRadius: "10px",
  overflowX: "auto",
  fontSize: "12px",
};

export default ActivityLogs;