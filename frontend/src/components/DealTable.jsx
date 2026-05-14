import { Link } from "react-router-dom";
import { formatMoney } from "../utils/moneyUtils";

function DealTable({ deals }) {
  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "12px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Deal Tag</th>
            <th style={th}>Deal Type</th>
            <th style={th}>Customer</th>
            <th style={th}>Phone</th>
            <th style={th}>Truck</th>
            <th style={th}>Year</th>
            <th style={th}>Total</th>
            <th style={th}>Monthly</th>
            <th style={th}>Maturity</th>
            <th style={th}>Status</th>
            <th style={th}>Action</th>
          </tr>
        </thead>

        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id}>
              <td style={td}>
                <Link
                  to={`/deals/${deal.id}`}
                  style={{
                    color: "#0A1A2F",
                    fontWeight: "bold",
                    textDecoration: "underline",
                  }}
                >
                  {deal.deal_tag}
                </Link>
              </td>
              <td style={td}>{deal.deal_type}</td>
              <td style={td}>{deal.customers?.customer_name}</td>
              <td style={td}>{deal.customers?.phone}</td>
              <td style={td}>{deal.truck}</td>
              <td style={td}>{deal.year}</td>
              <td style={td}>{formatMoney(deal.total_amount)}</td>
              <td style={td}>{formatMoney(deal.monthly_payment)}</td>
              <td style={td}>{deal.maturity_date}</td>
              <td style={td}>
                <span style={getStatusStyle(deal.status)}>
                  {deal.status || "Active"}
                </span>
              </td>
              <td style={td}>
                <Link
                  to={`/deals/${deal.id}/edit`}
                  style={{
                    background: "#0A1A2F",
                    color: "white",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "13px",
                  }}
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getStatusStyle(status) {
  const base = {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "13px",
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

  if (status === "Closed") {
    return {
      ...base,
      background: "#e5e7eb",
      color: "#374151",
    };
  }

  if (status === "Repo") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (status === "Cancelled") {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#6b7280",
    };
  }

  if (status === "Defaulted") {
    return {
      ...base,
      background: "#111827",
      color: "#ffffff",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
  };
}

const th = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #ddd",
  background: "#f9fafb",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #eee",
};



export default DealTable;