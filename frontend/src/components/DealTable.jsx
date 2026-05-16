import { Link } from "react-router-dom";
import { formatMoney } from "../utils/moneyUtils";

function DealTable({ deals }) {
  if (!deals || deals.length === 0) {
    return (
      <div style={emptyState}>
        <strong>No deals found.</strong>
        <p style={{ margin: "6px 0 0" }}>
          Try changing the search text or status filter.
        </p>
      </div>
    );
  }

  return (
    <div style={tableOuter}>
      <div style={tableScroll}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={stickyTh}>Deal Tag</th>
              <th style={{ ...th, width: "180px" }}>Customer</th>
              <th style={{ ...th, width: "120px" }}>Phone</th>
              <th style={{ ...th, width: "110px" }}>Status</th>
              <th style={{ ...th, width: "130px" }}>Deal Type</th>
              <th style={{ ...th, width: "160px" }}>Truck</th>
              <th style={{ ...th, width: "120px" }}>Total</th>
              <th style={{ ...th, width: "115px" }}>Monthly</th>
              <th style={{ ...th, width: "75px" }}>Due</th>
              <th style={{ ...th, width: "75px" }}>Term</th>
              <th style={{ ...th, width: "85px" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id}>
                <td style={stickyTd}>
                  <Link to={`/deals/${deal.id}`} style={dealLink}>
                    {deal.deal_tag}
                  </Link>
                </td>

                <td style={wrapCell}>
                  {deal.customers?.customer_name || "—"}
                </td>

                <td style={td}>{deal.customers?.phone || "—"}</td>

                <td style={td}>
                  <span style={getStatusStyle(deal.status)}>
                    {deal.status || "Active"}
                  </span>
                </td>

                <td style={wrapCell}>{deal.deal_type || "—"}</td>

                <td style={wrapCell}>
                  {deal.year || ""} {deal.truck || ""}
                </td>

                <td style={moneyCell}>{formatMoney(deal.total_amount)}</td>

                <td style={moneyCell}>{formatMoney(deal.monthly_payment)}</td>

                <td style={td}>{deal.due_day || "—"}</td>

                <td style={td}>{deal.term || "—"}</td>

                <td style={td}>
                  <Link to={`/deals/${deal.id}/edit`} style={editLink}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getStatusStyle(status) {
  const base = {
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
    display: "inline-block",
    whiteSpace: "nowrap",
  };

  if (status === "Active") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (status === "Paid Off") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "Defaulted") {
    return {
      ...base,
      background: "#111827",
      color: "#ffffff",
    };
  }

  if (status === "Repo") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (status === "Closed") {
    return {
      ...base,
      background: "#e5e7eb",
      color: "#374151",
    };
  }

  if (status === "Cancelled") {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#6b7280",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
  };
}

const tableOuter = {
  width: "100%",
  maxWidth: "100%",
  height: "560px",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
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
  width: "1100px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const th = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #ddd",
  background: "#f9fafb",
  color: "#374151",
  fontSize: "12px",
  whiteSpace: "normal",
  lineHeight: "1.25",
};

const stickyTh = {
  ...th,
  left: 0,
  width: "115px",
  zIndex: 5,
  background: "#eef2ff",
  boxShadow: "2px 0 6px rgba(0,0,0,0.08)",
  fontSize: "13px",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  fontSize: "12px",
  background: "white",
  verticalAlign: "top",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const stickyTd = {
  ...td,
  position: "sticky",
  left: 0,
  zIndex: 4,
  width: "115px",
  background: "#ffffff",
  boxShadow: "2px 0 6px rgba(0,0,0,0.06)",
  fontSize: "15px",
};

const wrapCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
};

const moneyCell = {
  ...td,
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const dealLink = {
  color: "#1d4ed8",
  fontWeight: "800",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  fontSize: "15px",
  cursor: "pointer",
};

const editLink = {
  background: "#0A1A2F",
  color: "white",
  padding: "6px 9px",
  borderRadius: "7px",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: "bold",
};

const emptyState = {
  background: "#f9fafb",
  border: "1px dashed #cbd5e1",
  padding: "16px",
  borderRadius: "10px",
  color: "#475569",
};

export default DealTable;