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
              <td style={td}>{deal.status}</td>
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