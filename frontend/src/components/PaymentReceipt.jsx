import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "../utils/moneyUtils";

function PaymentReceipt({ receipt, onClose }) {
  const [copied, setCopied] = useState(false);

  const receiptNumber = useMemo(() => {
    if (!receipt) return "";

    return (
      receipt.receiptNumber ||
      receipt.receipt_no ||
      `RK-${receipt.dealTag || "DEAL"}-${String(
        receipt.paymentId || Date.now()
      )
        .slice(-6)
        .toUpperCase()}`
    );
  }, [receipt]);

  useEffect(() => {
    if (!receipt) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [receipt, onClose]);

  if (!receipt) return null;

  const paymentDate = formatDisplayDate(receipt.paymentDate);
  const dueDate = formatDisplayDate(receipt.dueDate);
  const generatedAt = new Date().toLocaleString();

  const status = receipt.paymentStatus || "Paid";
  const remainingBalance = Number(receipt.remainingBalance || 0);
  const amountPaid = Number(receipt.amountPaid || 0);

  const handlePrint = () => {
    const html = buildReceiptPrintHtml({
      receipt,
      receiptNumber,
      paymentDate,
      dueDate,
      generatedAt,
      remainingBalance,
      amountPaid,
      status,
    });

    printHtmlWithIframe(html, "Payment Receipt");
  };

  const handleCopySummary = async () => {
    const summary = [
      "RK Truck and Trailer Sales - Payment Receipt",
      `Receipt No: ${receiptNumber}`,
      `Customer: ${receipt.customerName || "-"}`,
      `Phone: ${receipt.phone || "-"}`,
      `Deal Tag: ${receipt.dealTag || "-"}`,
      `Amount Paid: ${formatMoney(amountPaid)}`,
      `Payment Date: ${paymentDate}`,
      `Payment Method: ${receipt.paymentMethod || "-"}`,
      `Due Date: ${dueDate}`,
      `Remaining Balance: ${formatMoney(remainingBalance)}`,
      `Status: ${status}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={modalTopBar}>
          <div>
            <h2 style={modalTitle}>Payment Receipt</h2>
            <p style={modalSubtitle}>
              Receipt No. {receiptNumber} · Generated {generatedAt}
            </p>
          </div>

          <button type="button" onClick={onClose} style={closeIconButton}>
            ×
          </button>
        </div>

        <div id="payment-receipt-print-area">
          <div className="receipt" style={receiptStyle}>
            <div style={headerStyle}>
              <div>
                <div style={brandBadge}>RK PAYTRACK</div>
                <h1 style={companyTitle}>RK Truck and Trailer Sales</h1>
                <p style={mutedText}>2727 Willowbrook Rd, Dallas, TX 75220</p>
                <p style={mutedText}>Phone: 469-880-2222</p>
              </div>

              <div style={receiptTitleBox}>
                <div style={statusBadge(status)}>{status}</div>
                <h2 style={receiptTitle}>PAYMENT RECEIPT</h2>
                <p style={smallLine}>
                  <strong>No:</strong> {receiptNumber}
                </p>
                <p style={smallLine}>
                  <strong>Date:</strong> {paymentDate}
                </p>
              </div>
            </div>

            <div style={amountBox}>
              <div style={amountLabel}>Amount Paid</div>
              <div style={amountValue}>{formatMoney(amountPaid)}</div>
              <div style={amountSubText}>
                Paid by {receipt.paymentMethod || "Other"} on {paymentDate}
              </div>
            </div>

            <div style={summaryGrid}>
              <SummaryBox
                label="Remaining Balance"
                value={formatMoney(remainingBalance)}
                tone={remainingBalance > 0 ? "danger" : "success"}
              />

              <SummaryBox label="Payment Method" value={receipt.paymentMethod || "—"} />

              <SummaryBox label="Payment Type" value={receipt.paymentType || "Payment"} />

              <SummaryBox label="Due Date" value={dueDate} />
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
              <div style={sectionTitle}>Vehicle / Deal Information</div>

              <div style={gridStyle}>
                <Field label="Truck" value={receipt.truck || ""} />
                <Field label="VIN" value={receipt.vin || ""} />
                <Field label="Payment Date" value={paymentDate} />
                <Field label="Payment Status" value={status} />
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitle}>Payment Details</div>

              <table style={detailTable}>
                <tbody>
                  <ReceiptRow label="Receipt Number" value={receiptNumber} />
                  <ReceiptRow label="Amount Paid" value={formatMoney(amountPaid)} />
                  <ReceiptRow
                    label="Payment Method"
                    value={receipt.paymentMethod || "—"}
                  />
                  <ReceiptRow label="Payment Date" value={paymentDate} />
                  <ReceiptRow label="Applied Due Date" value={dueDate} />
                  <ReceiptRow
                    label="Remaining Balance"
                    value={formatMoney(remainingBalance)}
                    highlight={remainingBalance > 0 ? "danger" : "success"}
                  />
                </tbody>
              </table>
            </div>

            {receipt.notes && (
              <div style={sectionStyle}>
                <div style={sectionTitle}>Notes</div>
                <p style={notesStyle}>{receipt.notes}</p>
              </div>
            )}

            <div style={importantBox}>
              <strong>Important:</strong> This receipt confirms the payment
              recorded above. Remaining balance, if any, is still due according
              to the customer agreement and company records.
            </div>

            <div style={footerStyle}>
              <div style={signatureLine}>Customer Signature</div>
              <div style={signatureLine}>Authorized Signature</div>
            </div>

            <div style={bottomFooter}>
              <p style={bottomNote}>
                Thank you for your payment. Please keep this receipt for your
                records.
              </p>

              <p style={generatedText}>Generated from RK PayTrack · {generatedAt}</p>
            </div>
          </div>
        </div>

        <div style={buttonRow}>
          <button type="button" onClick={handlePrint} style={buttonStyle}>
            Print / Save PDF
          </button>

          <button type="button" onClick={handleCopySummary} style={copyButtonStyle}>
            {copied ? "Copied" : "Copy Summary"}
          </button>

          <button type="button" onClick={onClose} style={cancelButtonStyle}>
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
      <span style={fieldValue}>{value || "—"}</span>
    </div>
  );
}

function SummaryBox({ label, value, tone = "default" }) {
  return (
    <div style={{ ...summaryBox, ...getSummaryTone(tone) }}>
      <span style={summaryBoxLabel}>{label}</span>
      <strong style={summaryBoxValue}>{value || "—"}</strong>
    </div>
  );
}

function ReceiptRow({ label, value, highlight }) {
  return (
    <tr>
      <td style={detailLabelCell}>{label}</td>
      <td
        style={{
          ...detailValueCell,
          ...(highlight === "danger" ? dangerText : {}),
          ...(highlight === "success" ? successText : {}),
        }}
      >
        {value || "—"}
      </td>
    </tr>
  );
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  return `${month}/${day}/${year}`;
}

function statusBadge(status) {
  const base = {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "999px",
    padding: "7px 11px",
    fontSize: "12px",
    fontWeight: "900",
    marginBottom: "9px",
    border: "1px solid transparent",
  };

  if (status === "Voided") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }

  if (status === "Partial" || status === "Partial Payment") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  return {
    ...base,
    background: "#dcfce7",
    color: "#166534",
    borderColor: "#bbf7d0",
  };
}

function getSummaryTone(tone) {
  if (tone === "danger") {
    return {
      background: "#fef2f2",
      borderColor: "#fecaca",
    };
  }

  if (tone === "success") {
    return {
      background: "#f0fdf4",
      borderColor: "#bbf7d0",
    };
  }

  return {
    background: "#f8fafc",
    borderColor: "#e5e7eb",
  };
}

function printHtmlWithIframe(html, title) {
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
  iframeDocument.write(html);
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
}

function buildReceiptPrintHtml({
  receipt,
  receiptNumber,
  paymentDate,
  dueDate,
  generatedAt,
  remainingBalance,
  amountPaid,
  status,
}) {
  return `
    <html>
      <head>
        <title>Payment Receipt</title>
        <style>
          @page {
            size: letter;
            margin: 0.25in;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: white;
            font-size: 11px;
            margin: 0;
            padding: 0;
          }

          .receipt {
            width: 100%;
            max-width: 760px;
            margin: 0 auto;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 14px;
          }

          .header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 3px solid #0A1A2F;
            padding-bottom: 9px;
            margin-bottom: 10px;
          }

          .brand-badge {
            display: inline-block;
            background: #0A1A2F;
            color: white;
            border-radius: 999px;
            padding: 4px 8px;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 0.06em;
            margin-bottom: 5px;
          }

          h1, h2, h3, p {
            margin-top: 0;
          }

          .company h1 {
            color: #0A1A2F;
            margin: 0 0 3px;
            font-size: 20px;
          }

          .muted {
            color: #6b7280;
            font-size: 10.5px;
            margin: 2px 0;
          }

          .receipt-title {
            text-align: right;
            min-width: 190px;
          }

          .status {
            display: inline-block;
            background: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
            border-radius: 999px;
            padding: 4px 8px;
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 5px;
          }

          .receipt-title h2 {
            color: #166534;
            margin: 0 0 4px;
            font-size: 19px;
          }

          .small-line {
            margin: 3px 0;
            font-size: 10.5px;
          }

          .amount-box {
            background: #ecfdf5;
            border: 1px solid #bbf7d0;
            border-radius: 9px;
            padding: 10px;
            text-align: center;
            margin-bottom: 10px;
          }

          .amount-label {
            color: #166534;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
          }

          .amount {
            color: #166534;
            font-size: 27px;
            font-weight: bold;
            margin-top: 2px;
          }

          .amount-sub {
            color: #166534;
            font-size: 10px;
            margin-top: 2px;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-bottom: 10px;
          }

          .summary-box {
            border: 1px solid #e5e7eb;
            background: #f8fafc;
            border-radius: 8px;
            padding: 7px;
          }

          .summary-box span {
            display: block;
            color: #64748b;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 2px;
          }

          .summary-box strong {
            color: #111827;
            font-size: 10.5px;
          }

          .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .section {
            margin-top: 8px;
          }

          .section-title {
            font-weight: bold;
            color: #0A1A2F;
            margin-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
            font-size: 12px;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 12px;
          }

          .field {
            font-size: 11px;
          }

          .label {
            display: block;
            color: #6b7280;
            font-size: 9.5px;
            margin-bottom: 1px;
          }

          .value {
            font-weight: bold;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          td {
            border: 1px solid #e5e7eb;
            padding: 6px;
            font-size: 10.5px;
          }

          .td-label {
            background: #f8fafc;
            color: #475569;
            width: 36%;
            font-weight: bold;
          }

          .td-value {
            font-weight: bold;
          }

          .notes {
            margin: 0;
            color: #374151;
            line-height: 1.3;
            white-space: pre-wrap;
            font-size: 10.5px;
            max-height: 44px;
            overflow: hidden;
          }

          .important {
            margin-top: 9px;
            background: #fffbeb;
            border: 1px solid #fde68a;
            color: #92400e;
            border-radius: 8px;
            padding: 7px;
            line-height: 1.25;
            font-size: 10px;
          }

          .footer {
            margin-top: 24px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 34px;
          }

          .signature-line {
            border-top: 1px solid #111827;
            padding-top: 5px;
            font-size: 10.5px;
            color: #374151;
          }

          .bottom {
            margin-top: 10px;
            text-align: center;
            color: #6b7280;
            font-size: 10px;
          }

          .generated {
            margin-top: 3px;
            color: #94a3b8;
            font-size: 9px;
            text-align: center;
          }
        </style>
      </head>

      <body>
        <div class="receipt">
          <div class="header">
            <div class="company">
              <div class="brand-badge">RK PAYTRACK</div>
              <h1>RK Truck & Trailer Sales</h1>
              <p class="muted">2727 Willowbrook Rd, Dallas, TX 75220</p>
              <p class="muted">Phone: 469-880-2222</p>
            </div>

            <div class="receipt-title">
              <div class="status">${escapeHtml(status)}</div>
              <h2>PAYMENT RECEIPT</h2>
              <p class="small-line"><strong>No:</strong> ${escapeHtml(receiptNumber)}</p>
              <p class="small-line"><strong>Date:</strong> ${escapeHtml(paymentDate)}</p>
            </div>
          </div>

          <div class="amount-box">
            <div class="amount-label">Amount Paid</div>
            <div class="amount">${formatMoney(amountPaid)}</div>
            <div class="amount-sub">
              Paid by ${escapeHtml(receipt.paymentMethod || "Other")} on ${escapeHtml(paymentDate)}
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-box">
              <span>Remaining Balance</span>
              <strong>${formatMoney(remainingBalance)}</strong>
            </div>
            <div class="summary-box">
              <span>Payment Method</span>
              <strong>${escapeHtml(receipt.paymentMethod || "—")}</strong>
            </div>
            <div class="summary-box">
              <span>Payment Type</span>
              <strong>${escapeHtml(receipt.paymentType || "Payment")}</strong>
            </div>
            <div class="summary-box">
              <span>Due Date</span>
              <strong>${escapeHtml(dueDate)}</strong>
            </div>
          </div>

          <div class="two-column">
            <div class="section">
              <div class="section-title">Customer Information</div>
              <div class="grid">
                ${printField("Customer", receipt.customerName)}
                ${printField("Phone", receipt.phone)}
                ${printField("Deal Tag", receipt.dealTag)}
                ${printField("Deal Type", receipt.dealType)}
              </div>
            </div>

            <div class="section">
              <div class="section-title">Vehicle / Deal</div>
              <div class="grid">
                ${printField("Truck", receipt.truck)}
                ${printField("VIN", receipt.vin)}
                ${printField("Status", status)}
                ${printField("Due Date", dueDate)}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Payment Details</div>
            <table>
              <tbody>
                ${printRow("Receipt Number", receiptNumber)}
                ${printRow("Amount Paid", formatMoney(amountPaid))}
                ${printRow("Payment Method", receipt.paymentMethod)}
                ${printRow("Payment Date", paymentDate)}
                ${printRow("Applied Due Date", dueDate)}
                ${printRow("Remaining Balance", formatMoney(remainingBalance))}
              </tbody>
            </table>
          </div>

          ${
            receipt.notes
              ? `
                <div class="section">
                  <div class="section-title">Notes</div>
                  <p class="notes">${escapeHtml(receipt.notes)}</p>
                </div>
              `
              : ""
          }

          <div class="important">
            <strong>Important:</strong> This receipt confirms the payment recorded above.
            Remaining balance, if any, is still due according to customer agreement
            and company records.
          </div>

          <div class="footer">
            <div class="signature-line">Customer Signature</div>
            <div class="signature-line">Authorized Signature</div>
          </div>

          <p class="bottom">
            Thank you for your payment. Please keep this receipt for your records.
          </p>

          <p class="generated">Generated from RK PayTrack · ${escapeHtml(generatedAt)}</p>
        </div>
      </body>
    </html>
  `;
}

function printField(label, value) {
  return `
    <div class="field">
      <span class="label">${escapeHtml(label)}</span>
      <span class="value">${escapeHtml(value || "—")}</span>
    </div>
  `;
}

function printRow(label, value) {
  return `
    <tr>
      <td class="td-label">${escapeHtml(label)}</td>
      <td class="td-value">${escapeHtml(value || "—")}</td>
    </tr>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.58)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "20px",
};

const modalStyle = {
  background: "white",
  padding: "18px",
  borderRadius: "20px",
  width: "860px",
  maxWidth: "96vw",
  maxHeight: "94vh",
  overflowY: "auto",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.32)",
};

const modalTopBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "13px",
  marginBottom: "16px",
};

const modalTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "22px",
};

const modalSubtitle = {
  margin: "5px 0 0",
  color: "#667085",
  fontSize: "13px",
};

const closeIconButton = {
  width: "36px",
  height: "36px",
  borderRadius: "999px",
  border: "none",
  background: "#e5e7eb",
  color: "#111827",
  cursor: "pointer",
  fontSize: "22px",
  fontWeight: "900",
};

const receiptStyle = {
  border: "1px solid #d1d5db",
  padding: "28px",
  borderRadius: "16px",
  color: "#111827",
  background: "white",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "4px solid #0A1A2F",
  paddingBottom: "16px",
  marginBottom: "20px",
  gap: "24px",
  flexWrap: "wrap",
};

const brandBadge = {
  display: "inline-flex",
  background: "#0A1A2F",
  color: "white",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "0.06em",
  marginBottom: "8px",
};

const companyTitle = {
  margin: 0,
  color: "#0A1A2F",
  fontSize: "25px",
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
  fontSize: "23px",
};

const smallLine = {
  margin: "5px 0",
  fontSize: "13px",
};

const amountBox = {
  marginTop: "18px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  borderRadius: "16px",
  padding: "20px",
  textAlign: "center",
};

const amountLabel = {
  color: "#166534",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const amountValue = {
  color: "#166534",
  fontSize: "36px",
  fontWeight: "900",
  marginTop: "5px",
};

const amountSubText = {
  color: "#166534",
  fontSize: "12px",
  marginTop: "5px",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
  gap: "10px",
  marginTop: "16px",
};

const summaryBox = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "12px",
  display: "grid",
  gap: "4px",
};

const summaryBoxLabel = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const summaryBoxValue = {
  color: "#111827",
  fontSize: "14px",
};

const sectionStyle = {
  marginTop: "20px",
};

const sectionTitle = {
  fontWeight: "900",
  color: "#0A1A2F",
  marginBottom: "9px",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "6px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "11px 24px",
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
  fontWeight: "900",
};

const detailTable = {
  width: "100%",
  borderCollapse: "collapse",
};

const detailLabelCell = {
  background: "#f8fafc",
  color: "#475569",
  width: "36%",
  fontWeight: "900",
  border: "1px solid #e5e7eb",
  padding: "10px",
};

const detailValueCell = {
  color: "#111827",
  fontWeight: "900",
  border: "1px solid #e5e7eb",
  padding: "10px",
};

const successText = {
  color: "#166534",
};

const dangerText = {
  color: "#991b1b",
};

const notesStyle = {
  margin: 0,
  color: "#374151",
  fontSize: "14px",
  lineHeight: "1.5",
  whiteSpace: "pre-wrap",
};

const importantBox = {
  marginTop: "20px",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#92400e",
  borderRadius: "14px",
  padding: "13px",
  lineHeight: "1.5",
  fontSize: "13px",
};

const footerStyle = {
  marginTop: "38px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "42px",
};

const signatureLine = {
  borderTop: "1px solid #111827",
  paddingTop: "8px",
  fontSize: "13px",
  color: "#374151",
};

const bottomFooter = {
  marginTop: "24px",
};

const bottomNote = {
  textAlign: "center",
  color: "#6b7280",
  fontSize: "12px",
  margin: 0,
};

const generatedText = {
  textAlign: "center",
  color: "#94a3b8",
  fontSize: "11px",
  margin: "6px 0 0",
};

const buttonRow = {
  display: "flex",
  gap: "10px",
  marginTop: "18px",
  justifyContent: "flex-end",
  flexWrap: "wrap",
};

const buttonStyle = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  padding: "11px 15px",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: "900",
};

const copyButtonStyle = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  padding: "11px 15px",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: "900",
};

const cancelButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  padding: "11px 15px",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: "900",
};

export default PaymentReceipt;