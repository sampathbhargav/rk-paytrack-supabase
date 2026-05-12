import { formatMoney } from "../utils/moneyUtils";

function PaymentHistory({ payments }) {
  return (
    <div style={boxStyle}>
      <h2>Payment History</h2>

      {payments.length === 0 ? (
        <p>No payments recorded yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Amount Due</th>
              <th style={th}>Amount Paid</th>
              <th style={th}>Remaining</th>
              <th style={th}>Method</th>
              <th style={th}>Type</th>
              <th style={th}>Notes</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td style={td}>{payment.payment_date}</td>
                <td style={td}>{formatMoney(payment.amount_due)}</td>
                <td style={td}>{formatMoney(payment.amount_paid)}</td>
                <td style={td}>{formatMoney(payment.remaining_amount)}</td>
                <td style={td}>{payment.payment_method}</td>
                <td style={td}>{payment.payment_type}</td>
                <td style={td}>{payment.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const boxStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginTop: "25px",
};

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

export default PaymentHistory;