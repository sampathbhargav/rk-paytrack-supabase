import { Link } from "react-router-dom";
import { formatMoney } from "../utils/moneyUtils";

function DealTable({ deals }) {
  if (!deals || deals.length === 0) {
    return (
      <div style={emptyState}>
        <div style={emptyIcon}>🚚</div>
        <strong>No deals found.</strong>
        <p style={{ margin: "6px 0 0" }}>
          Try changing the search text, deal type, or status filter.
        </p>
      </div>
    );
  }

  const sortedDeals = [...deals].sort((a, b) => {
    const aTag = Number(a.deal_tag);
    const bTag = Number(b.deal_tag);
  
    if (!Number.isNaN(aTag) && !Number.isNaN(bTag)) {
      return bTag - aTag;
    }
  
    return String(b.deal_tag || "").localeCompare(String(a.deal_tag || ""));
  });

  return (
    <div style={tableCard}>
      <div style={tableTopBar}>
        <div>
          <h3 style={tableTitle}>Deal List</h3>
          <p style={tableSubtitle}>
          Showing {sortedDeals.length} customer deal
          {sortedDeals.length === 1 ? "" : "s"}
          </p>
        </div>

        <div style={tableHint}>Scroll table horizontally if needed</div>
      </div>

      <div style={tableOuter}>
        <div style={tableScroll}>
          <table style={tableStyle}>
            <colgroup>
              <col style={{ width: "125px" }} />
              <col style={{ width: "210px" }} />
              <col style={{ width: "135px" }} />
              <col style={{ width: "125px" }} />
              <col style={{ width: "145px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "125px" }} />
              <col style={{ width: "125px" }} />
              <col style={{ width: "85px" }} />
              <col style={{ width: "85px" }} />
              <col style={{ width: "150px" }} />
            </colgroup>

            <thead>
              <tr>
                <th style={stickyTh}>Deal Tag</th>
                <th style={th}>Customer</th>
                <th style={th}>Phone</th>
                <th style={th}>Status</th>
                <th style={th}>Deal Type</th>
                <th style={th}>Truck</th>
                <th style={rightTh}>Total</th>
                <th style={rightTh}>Monthly</th>
                <th style={centerTh}>Due</th>
                <th style={centerTh}>Term</th>
                <th style={centerTh}>Action</th>
              </tr>
            </thead>

            <tbody>
              {sortedDeals.map((deal, index) => (
                <tr
                  key={deal.id}
                  style={{
                    ...tableRow,
                    background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#eef2ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      index % 2 === 0 ? "#ffffff" : "#f8fafc";
                  }}
                >
                  <td
                    style={{
                      ...stickyTd,
                      background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#eef2ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        index % 2 === 0 ? "#ffffff" : "#f8fafc";
                    }}
                  >
                    <Link to={`/deals/${deal.id}`} style={dealLink}>
                      {deal.deal_tag || "—"}
                    </Link>
                  </td>

                  <td style={customerCell}>
                    {deal.customer_id ? (
                      <Link to={`/customers/${deal.customer_id}`} style={customerLink}>
                        {deal.customers?.customer_name || "—"}
                      </Link>
                    ) : deal.customers?.id ? (
                      <Link to={`/customers/${deal.customers.id}`} style={customerLink}>
                        {deal.customers?.customer_name || "—"}
                      </Link>
                    ) : (
                      <strong>{deal.customers?.customer_name || "—"}</strong>
                    )}
                  </td>

                  <td style={td}>{deal.customers?.phone || "—"}</td>

                  <td style={td}>
                    <span style={getStatusStyle(deal.status)}>
                      {deal.status || "Active"}
                    </span>
                  </td>

                  <td style={wrapCell}>
                    <span style={dealTypeBadge}>{deal.deal_type || "—"}</span>
                  </td>

                  <td style={wrapCell}>
                    <span style={truckText}>
                      {`${deal.year || ""} ${deal.truck || ""}`.trim() || "—"}
                    </span>
                  </td>

                  <td style={rightMoneyCell}>
                    {formatMoney(deal.total_amount)}
                  </td>

                  <td style={rightMoneyCell}>
                    {formatMoney(deal.monthly_payment)}
                  </td>

                  <td style={centerCell}>{deal.due_day || "—"}</td>

                  <td style={centerCell}>{deal.term || "—"}</td>

                  <td style={centerCell}>
                    <div style={actionGroup}>
                      <Link to={`/deals/${deal.id}`} style={viewLink}>
                        View
                      </Link>

                      <Link to={`/deals/${deal.id}/edit`} style={editLink}>
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getStatusStyle(status) {
  const base = {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    minWidth: "78px",
  };

  if (!status || status === "Active") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
  }

  if (status === "Paid Off") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (status === "Defaulted") {
    return {
      ...base,
      background: "#111827",
      color: "#ffffff",
      border: "1px solid #111827",
    };
  }

  if (status === "Repo") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    };
  }

  if (status === "Closed") {
    return {
      ...base,
      background: "#e5e7eb",
      color: "#374151",
      border: "1px solid #d1d5db",
    };
  }

  if (status === "Cancelled") {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#6b7280",
      border: "1px solid #e5e7eb",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
    border: "1px solid #d1d5db",
  };
}

const tableCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  overflow: "hidden",
};

const tableTopBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  padding: "16px 18px",
  borderBottom: "1px solid #e5e7eb",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  flexWrap: "wrap",
};

const tableTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
};

const tableSubtitle = {
  margin: "4px 0 0",
  color: "#667085",
  fontSize: "13px",
};

const tableHint = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "7px 11px",
  fontSize: "12px",
  fontWeight: "700",
};

const tableOuter = {
  width: "100%",
  maxWidth: "100%",
  height: "590px",
  overflow: "hidden",
  background: "white",
  boxSizing: "border-box",
};

const tableScroll = {
  width: "100%",
  height: "100%",
  overflowX: "auto",
  overflowY: "auto",
};

const tableStyle = {
  width: "100%",
  minWidth: "1490px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const th = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  textAlign: "left",
  padding: "13px 12px",
  borderBottom: "1px solid #d1d5db",
  background: "#f1f5f9",
  color: "#334155",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const rightTh = {
  ...th,
  textAlign: "right",
};

const centerTh = {
  ...th,
  textAlign: "center",
};

const stickyTh = {
  ...th,
  left: 0,
  zIndex: 6,
  background: "#e0e7ff",
  color: "#1e1b4b",
  boxShadow: "3px 0 8px rgba(0,0,0,0.08)",
};

const tableRow = {
  transition: "background 0.15s ease",
};

const td = {
  padding: "13px 12px",
  borderBottom: "1px solid #edf2f7",
  fontSize: "13px",
  color: "#374151",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const stickyTd = {
  ...td,
  position: "sticky",
  left: 0,
  zIndex: 5,
  boxShadow: "3px 0 8px rgba(0,0,0,0.06)",
};

const customerCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.4",
  color: "#111827",
};

const wrapCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
};

const centerCell = {
  ...td,
  textAlign: "center",
};

const rightMoneyCell = {
  ...td,
  textAlign: "right",
  fontWeight: "800",
  color: "#111827",
};

const dealLink = {
  color: "#1d4ed8",
  fontWeight: "900",
  textDecoration: "none",
  fontSize: "15px",
  cursor: "pointer",
};

const dealTypeBadge = {
  display: "inline-block",
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "12px",
  fontWeight: "700",
};

const truckText = {
  color: "#374151",
  fontWeight: "700",
};

const actionGroup = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const viewLink = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  padding: "7px 10px",
  borderRadius: "8px",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: "800",
};

const editLink = {
  background: "#0A1A2F",
  color: "white",
  border: "1px solid #0A1A2F",
  padding: "7px 10px",
  borderRadius: "8px",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: "800",
};

const emptyState = {
  background: "#f9fafb",
  border: "1px dashed #cbd5e1",
  padding: "28px",
  borderRadius: "14px",
  color: "#475569",
  textAlign: "center",
};

const emptyIcon = {
  fontSize: "34px",
  marginBottom: "10px",
};

const customerLink = {
  color: "#0A1A2F",
  fontWeight: "900",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  cursor: "pointer",
};

export default DealTable;