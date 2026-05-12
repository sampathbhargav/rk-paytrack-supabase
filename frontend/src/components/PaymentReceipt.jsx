import { formatMoney } from "../utils/moneyUtils";

function PaymentReceipt({ receipt, onClose }) {
  if (!receipt) return null;

  return (
    <div style={overlayStyle}>
      <div style={receiptStyle}>
        <h2>RK PayTrack Payment Receipt</h2>

        <div style={lineStyle}>
          <strong>Customer:</strong> {receipt.customerName}
        </div>

        <div style={lineStyle}>
          <strong>Deal Tag:</strong> {receipt.dealTag}
        </div>

        <div style={lineStyle}>
          <strong>Amount Paid:</strong> {formatMoney(receipt.amountPaid)}
        </div>

        <div style={lineStyle}>
          <strong>Payment Method:</strong> {receipt.paymentMethod}
        </div>

        <div style={lineStyle}>
          <strong>Payment Date:</strong> {receipt.paymentDate}
        </div>

        <div style={lineStyle}>
          <strong>Due Date:</strong> {receipt.dueDate}
        </div>

        <div style={lineStyle}>
          <strong>Remaining Balance:</strong> {formatMoney(receipt.remainingBalance)}
        </div>

        <div style={buttonRow}>
          <button onClick={() => window.print()} style={buttonStyle}>
            Print
          </button>

          <button onClick={onClose} style={cancelButtonStyle}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const receiptStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "12px",
  width: "420px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};

const lineStyle = {
  marginBottom: "12px",
};

const buttonRow = {
  display: "flex",
  gap: "10px",
  marginTop: "25px",
};

const buttonStyle = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer",
};

const cancelButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer",
};

export default PaymentReceipt;