import { formatMoney } from "../utils/moneyUtils";

function PaymentReceipt({ receipt, onClose }) {
  if (!receipt) return null;

  const handlePrint = () => {
    const printContent = document.getElementById("payment-receipt-print-area");
  
    if (!printContent) {
      alert("Payment receipt was not found.");
      return;
    }
  
    const iframe = document.createElement("iframe");
  
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
  
    document.body.appendChild(iframe);
  
    const iframeWindow = iframe.contentWindow;
    const iframeDocument = iframeWindow.document;
  
    iframeDocument.open();
    iframeDocument.write(`
      <html>
        <head>
          <title>Payment Receipt</title>
  
          <style>
            * {
              box-sizing: border-box;
            }
  
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 30px;
              color: #111827;
              background: white;
            }
  
            .receipt {
              max-width: 760px;
              margin: 0 auto;
              border: 1px solid #d1d5db;
              padding: 28px;
              border-radius: 12px;
            }
  
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #0A1A2F;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
  
            h1, h2, h3, p {
              margin-top: 0;
            }
  
            .company h1 {
              color: #0A1A2F;
              margin-bottom: 4px;
              font-size: 24px;
            }
  
            .company p {
              color: #6b7280;
              font-size: 13px;
              margin: 3px 0;
            }
  
            .receipt-title {
              text-align: right;
            }
  
            .receipt-title h2 {
              color: #166534;
              margin-bottom: 6px;
            }
  
            .section {
              margin-top: 18px;
            }
  
            .section-title {
              font-weight: bold;
              color: #0A1A2F;
              margin-bottom: 8px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
            }
  
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 24px;
            }
  
            .field {
              font-size: 14px;
            }
  
            .label {
              display: block;
              color: #6b7280;
              font-size: 12px;
              margin-bottom: 3px;
            }
  
            .value {
              font-weight: bold;
            }
  
            .amount-box {
              margin-top: 22px;
              background: #ecfdf5;
              border: 1px solid #bbf7d0;
              border-radius: 10px;
              padding: 18px;
              text-align: center;
            }
  
            .amount-label {
              color: #166534;
              font-size: 13px;
              font-weight: bold;
            }
  
            .amount {
              color: #166534;
              font-size: 32px;
              font-weight: bold;
              margin-top: 5px;
            }
  
            .footer {
              margin-top: 34px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
            }
  
            .signature-line {
              border-top: 1px solid #111827;
              padding-top: 8px;
              font-size: 13px;
              color: #374151;
            }
  
            .note {
              margin-top: 24px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
  
            @media print {
              body {
                padding: 18px;
              }
  
              .receipt {
                border: 1px solid #d1d5db;
                box-shadow: none;
              }
            }
          </style>
        </head>
  
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
  
    iframeDocument.close();
  
    setTimeout(() => {
      iframeWindow.focus();
      iframeWindow.print();
  
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 500);
  };

  const receiptNumber =
    receipt.receiptNumber ||
    `RK-${receipt.dealTag || "DEAL"}-${String(receipt.paymentId || Date.now())
      .slice(-6)
      .toUpperCase()}`;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div id="payment-receipt-print-area">
          <div className="receipt" style={receiptStyle}>
            <div style={headerStyle}>
              <div>
                <h1 style={companyTitle}>RK Truck and Trailer Sales</h1>
                <p style={mutedText}>2727 Willowbrook Rd, Dallas, TX, 75220</p>
                <p style={mutedText}>📞 469-880-2222</p>
                <p style={mutedText}>Payment Receipt</p>
                {/* <p style={mutedText}>Generated from RK PayTrack</p> */}
              </div>

              <div style={receiptTitleBox}>
                <h2 style={receiptTitle}>RECEIPT</h2>
                <p style={smallLine}>
                  <strong>No:</strong> {receiptNumber}
                </p>
                <p style={smallLine}>
                  <strong>Date:</strong> {receipt.paymentDate}
                </p>
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitle}>Customer Information</div>

              <div style={gridStyle}>
                <Field label="Customer" value={receipt.customerName} />
                <Field label="Phone" value={receipt.phone || ""} />
                <Field label="Deal Tag" value={receipt.dealTag} />
                <Field label="Deal Type" value={receipt.dealType || ""} />
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitle}>Vehicle Information</div>

              <div style={gridStyle}>
                <Field label="Truck" value={receipt.truck || ""} />
                <Field label="VIN" value={receipt.vin || ""} />
              </div>
            </div>

            <div style={amountBox}>
              <div style={amountLabel}>Amount Paid</div>
              <div style={amountValue}>{formatMoney(receipt.amountPaid)}</div>
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitle}>Payment Details</div>

              <div style={gridStyle}>
                <Field label="Payment Date" value={receipt.paymentDate} />
                <Field label="Payment Method" value={receipt.paymentMethod} />
                <Field label="Due Date" value={receipt.dueDate} />
                <Field label="Payment Type" value={receipt.paymentType || ""} />
                <Field
                  label="Remaining Balance"
                  value={formatMoney(receipt.remainingBalance)}
                />
                <Field label="Status" value={receipt.paymentStatus || "Paid"} />
              </div>
            </div>

            {receipt.notes && (
              <div style={sectionStyle}>
                <div style={sectionTitle}>Notes</div>
                <p style={notesStyle}>{receipt.notes}</p>
              </div>
            )}

            <div style={footerStyle}>
              <div style={signatureLine}>Customer Signature</div>
              <div style={signatureLine}>Authorized Signature</div>
            </div>

            <p style={bottomNote}>
              Thank you for your payment. Please keep this receipt for your
              records.
            </p>
          </div>
        </div>

        <div style={buttonRow}>
          <button onClick={handlePrint} style={buttonStyle}>
            Print / Save PDF
          </button>

          <button onClick={onClose} style={cancelButtonStyle}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={fieldStyle}>
      <span style={fieldLabel}>{label}</span>
      <span style={fieldValue}>{value || "-"}</span>
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

const modalStyle = {
  background: "white",
  padding: "22px",
  borderRadius: "14px",
  width: "780px",
  maxWidth: "94vw",
  maxHeight: "92vh",
  overflowY: "auto",
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};

const receiptStyle = {
  border: "1px solid #d1d5db",
  padding: "28px",
  borderRadius: "12px",
  color: "#111827",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "2px solid #0A1A2F",
  paddingBottom: "16px",
  marginBottom: "20px",
  gap: "20px",
};

const companyTitle = {
  margin: 0,
  color: "#0A1A2F",
  fontSize: "24px",
};

const mutedText = {
  margin: "4px 0",
  color: "#6b7280",
  fontSize: "13px",
};

const receiptTitleBox = {
  textAlign: "right",
};

const receiptTitle = {
  margin: 0,
  color: "#166534",
  fontSize: "22px",
};

const smallLine = {
  margin: "5px 0",
  fontSize: "13px",
};

const sectionStyle = {
  marginTop: "18px",
};

const sectionTitle = {
  fontWeight: "bold",
  color: "#0A1A2F",
  marginBottom: "8px",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "5px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px 24px",
};

const fieldStyle = {
  fontSize: "14px",
};

const fieldLabel = {
  display: "block",
  color: "#6b7280",
  fontSize: "12px",
  marginBottom: "3px",
};

const fieldValue = {
  fontWeight: "bold",
};

const amountBox = {
  marginTop: "22px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  borderRadius: "10px",
  padding: "18px",
  textAlign: "center",
};

const amountLabel = {
  color: "#166534",
  fontSize: "13px",
  fontWeight: "bold",
};

const amountValue = {
  color: "#166534",
  fontSize: "32px",
  fontWeight: "bold",
  marginTop: "5px",
};

const notesStyle = {
  margin: 0,
  color: "#374151",
  fontSize: "14px",
};

const footerStyle = {
  marginTop: "34px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "40px",
};

const signatureLine = {
  borderTop: "1px solid #111827",
  paddingTop: "8px",
  fontSize: "13px",
  color: "#374151",
};

const bottomNote = {
  marginTop: "24px",
  textAlign: "center",
  color: "#6b7280",
  fontSize: "12px",
};

const buttonRow = {
  display: "flex",
  gap: "10px",
  marginTop: "18px",
  justifyContent: "flex-end",
};

const buttonStyle = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const cancelButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

export default PaymentReceipt;