function PaymentReceiptPrint({ deal, payment, payments = [] }) {
  const formatMoney = (value) => {
    return `$${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date + "T00:00:00").toLocaleDateString();
  };

  const totalPaid = payments
    .filter((p) => p.payment_status !== "Voided")
    .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  const totalAmount = Number(deal.total_amount || 0);
  const balance = Math.max(totalAmount - totalPaid, 0);

  const receiptNumber = `RK-${deal.deal_tag || "DEAL"}-${payment.id
    ?.toString()
    .slice(0, 6)
    .toUpperCase()}`;

  const handlePrintReceipt = () => {
    const receiptHtml = `
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #111827;
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

            .company h1 {
              margin: 0;
              font-size: 24px;
              color: #0A1A2F;
            }

            .company p {
              margin: 4px 0;
              font-size: 13px;
              color: #4b5563;
            }

            .receipt-title {
              text-align: right;
            }

            .receipt-title h2 {
              margin: 0;
              color: #166534;
              font-size: 22px;
            }

            .receipt-title p {
              margin: 5px 0;
              font-size: 13px;
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
              color: #6b7280;
              display: block;
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
              padding: 18px;
              border-radius: 10px;
              text-align: center;
            }

            .amount-box .label {
              font-size: 13px;
              color: #166534;
            }

            .amount-box .amount {
              font-size: 30px;
              font-weight: bold;
              color: #166534;
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
              margin-top: 22px;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }

            @media print {
              button {
                display: none;
              }

              body {
                padding: 0;
              }

              .receipt {
                border: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="receipt">
            <div class="header">
              <div class="company">
                <h1>RK Truck & Trailer Sales</h1>
                <p>Payment Receipt</p>
                <p>Receipt generated from RK PayTrack</p>
              </div>

              <div class="receipt-title">
                <h2>RECEIPT</h2>
                <p><strong>No:</strong> ${receiptNumber}</p>
                <p><strong>Date:</strong> ${formatDate(payment.payment_date)}</p>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Customer Information</div>
              <div class="grid">
                <div class="field">
                  <span class="label">Customer</span>
                  <span class="value">${deal.customers?.customer_name || ""}</span>
                </div>

                <div class="field">
                  <span class="label">Phone</span>
                  <span class="value">${deal.customers?.phone || ""}</span>
                </div>

                <div class="field">
                  <span class="label">Deal Tag</span>
                  <span class="value">${deal.deal_tag || ""}</span>
                </div>

                <div class="field">
                  <span class="label">Deal Type</span>
                  <span class="value">${deal.deal_type || ""}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Vehicle Information</div>
              <div class="grid">
                <div class="field">
                  <span class="label">Truck</span>
                  <span class="value">${deal.year || ""} ${deal.truck || ""}</span>
                </div>

                <div class="field">
                  <span class="label">VIN</span>
                  <span class="value">${deal.vin || ""}</span>
                </div>
              </div>
            </div>

            <div class="amount-box">
              <div class="label">Amount Paid</div>
              <div class="amount">${formatMoney(payment.amount_paid)}</div>
            </div>

            <div class="section">
              <div class="section-title">Payment Details</div>
              <div class="grid">
                <div class="field">
                  <span class="label">Payment Date</span>
                  <span class="value">${formatDate(payment.payment_date)}</span>
                </div>

                <div class="field">
                  <span class="label">Payment Method</span>
                  <span class="value">${payment.payment_method || "Other"}</span>
                </div>

                <div class="field">
                  <span class="label">Due Date / Installment</span>
                  <span class="value">${formatDate(payment.due_date)}</span>
                </div>

                <div class="field">
                  <span class="label">Payment Type</span>
                  <span class="value">${payment.payment_type || ""}</span>
                </div>

                <div class="field">
                  <span class="label">Total Paid</span>
                  <span class="value">${formatMoney(totalPaid)}</span>
                </div>

                <div class="field">
                  <span class="label">Remaining Balance</span>
                  <span class="value">${formatMoney(balance)}</span>
                </div>
              </div>
            </div>

            ${
              payment.notes
                ? `
                <div class="section">
                  <div class="section-title">Notes</div>
                  <div class="field">${payment.notes}</div>
                </div>
              `
                : ""
            }

            <div class="footer">
              <div class="signature-line">Customer Signature</div>
              <div class="signature-line">Authorized Signature</div>
            </div>

            <div class="note">
              Thank you for your payment. Please keep this receipt for your records.
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  return (
    <button type="button" onClick={handlePrintReceipt} style={receiptButton}>
      Receipt
    </button>
  );
}

const receiptButton = {
  background: "#166534",
  color: "white",
  border: "none",
  borderRadius: "7px",
  padding: "7px 10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "bold",
};

export default PaymentReceiptPrint;