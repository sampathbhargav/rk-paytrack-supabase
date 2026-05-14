import { getDealDueSchedule } from "../utils/duePaymentsUtils";
import { formatMoney } from "../utils/moneyUtils";
import logo from "../assets/rk-paytrack-logo.png";

function AccountSummaryPrint({ deal, payments, promises, totalPaid, balance }) {
  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const schedule = getDealDueSchedule(deal).map((installment) => {
    const paidForDueDate = activePayments
      .filter(
        (payment) =>
          payment.deal_id === deal.id &&
          payment.due_date === installment.dueDate
      )
      .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);

    const remaining = Math.max(
      Number(installment.amountDue || 0) - paidForDueDate,
      0
    );

    let status = "Due";

    if (paidForDueDate >= installment.amountDue) {
      status = "Paid";
    } else if (paidForDueDate > 0) {
      status = "Partial";
    } else if (installment.dueDate < new Date().toISOString().split("T")[0]) {
      status = "Past Due";
    }

    return {
      ...installment,
      paidForDueDate,
      remaining,
      status,
    };
  });

  const handlePrint = () => {
    const printContents = document.getElementById(
      "account-summary-print"
    ).innerHTML;

    const logoUrl = new URL(logo, window.location.origin).href;

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    const logoForPrint = logo;

    const finalPrintContents = printContents.replace(
        'src="' + logo + '"',
        'src="' + logoForPrint + '"'
      );

    printWindow.document.write(`
      <html>
        <head>
          <title>RK PayTrack Account Summary</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 28px;
              color: #111827;
              background: white;
              font-size: 13px;
            }

            .top-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 4px solid #0A1A2F;
              padding-bottom: 16px;
              margin-bottom: 22px;
            }

            .brand h1 {
              margin: 0;
              color: #0A1A2F;
              font-size: 28px;
              letter-spacing: 0.5px;
            }

            .brand p {
              margin: 6px 0 0;
              color: #475569;
              font-size: 13px;
            }

            .statement-box {
              text-align: right;
              color: #111827;
            }

            .statement-box h2 {
              margin: 0;
              font-size: 20px;
              color: #0A1A2F;
            }

            .statement-box p {
              margin: 5px 0;
              color: #475569;
            }

            .customer-title {
              background: #f8fafc;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 14px 16px;
              margin-bottom: 20px;
            }

            .customer-title h2 {
              margin: 0;
              font-size: 21px;
              color: #111827;
            }

            .customer-title p {
              margin: 6px 0 0;
              color: #475569;
            }

            .badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 999px;
              font-weight: bold;
              font-size: 12px;
              margin-top: 8px;
            }

            .badge-paid {
              background: #dcfce7;
              color: #166534;
            }

            .badge-active {
              background: #dbeafe;
              color: #1d4ed8;
            }

            .badge-balance {
              background: #fee2e2;
              color: #991b1b;
            }

            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 22px;
            }

            .summary-card {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 12px;
              background: #ffffff;
            }

            .summary-card .label {
              color: #64748b;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              margin-bottom: 8px;
            }

            .summary-card .value {
              font-size: 17px;
              font-weight: bold;
              color: #111827;
            }

            .section {
              margin-top: 22px;
              page-break-inside: avoid;
            }

            .section h3 {
              background: #0A1A2F;
              color: white;
              padding: 9px 12px;
              border-radius: 8px 8px 0 0;
              margin: 0;
              font-size: 15px;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 8px 8px;
              overflow: hidden;
            }

            .info-item {
              padding: 10px 12px;
              border-bottom: 1px solid #e5e7eb;
            }

            .info-item:nth-child(odd) {
              border-right: 1px solid #e5e7eb;
            }

            .info-label {
              color: #64748b;
              font-size: 11px;
              text-transform: uppercase;
              margin-bottom: 4px;
            }

            .info-value {
              font-weight: bold;
              color: #111827;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 0;
              font-size: 12px;
              border: 1px solid #e5e7eb;
            }

            th {
              background: #f1f5f9;
              color: #0f172a;
              font-weight: bold;
              padding: 9px;
              border: 1px solid #e5e7eb;
              text-align: left;
              white-space: nowrap;
            }

            td {
              padding: 8px;
              border: 1px solid #e5e7eb;
              vertical-align: top;
            }

            tr:nth-child(even) td {
              background: #fafafa;
            }

            .status-paid {
              color: #166534;
              font-weight: bold;
            }

            .status-partial {
              color: #854d0e;
              font-weight: bold;
            }

            .status-past-due {
              color: #991b1b;
              font-weight: bold;
            }

            .status-due {
              color: #1d4ed8;
              font-weight: bold;
            }

            .notes {
              white-space: pre-wrap;
              border: 1px solid #e5e7eb;
              border-top: none;
              padding: 12px;
              border-radius: 0 0 8px 8px;
              min-height: 70px;
              background: #fff;
            }

            .footer {
              margin-top: 35px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
              color: #64748b;
              font-size: 11px;
              display: flex;
              justify-content: space-between;
            }

            .signature-row {
              margin-top: 35px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 40px;
            }

            .signature-line {
              border-top: 1px solid #111827;
              padding-top: 7px;
              color: #475569;
              font-size: 12px;
            }

            @media print {
              body {
                padding: 16px;
              }

              .no-print {
                display: none !important;
              }

              .section {
                page-break-inside: avoid;
              }

              .logo-row {
                display: flex;
                align-items: center;
                gap: 14px;
              }
              
              .logo-print-box {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 3px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.12);
                width: fit-content;
              }
              
              .logo-print {
                width: 70px;
                max-width: 70px;
                height: auto;
                display: block;
                object-fit: contain;
              }
            }
          </style>
        </head>
        <body>
          ${finalPrintContents}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <>
      <button onClick={handlePrint} style={printButtonStyle}>
        🖨 Print Account Summary
      </button>

      <div id="account-summary-print" style={{ display: "none" }}>
      <div className="top-header">
        <div className="logo-row">
            <div className="logo-print-box">
            <img
                src={logo}
                alt="RK PayTrack Logo"
                className="logo-print"
                style={{
                    width: "70px",
                    maxWidth: "70px",
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                }}
                />
            </div>

            <div className="brand">
            <h1>RK PayTrack</h1>
            <p>Dealer Payment Tracking System</p>
            <p>Account Summary / Customer Statement</p>
            </div>
        </div>

        <div className="statement-box">
            <h2>ACCOUNT SUMMARY</h2>
            <p>Generated: {new Date().toLocaleString()}</p>
            <p>Deal Tag: {deal.deal_tag}</p>
        </div>
        </div>

        <div className="customer-title">
          <h2>
            {deal.deal_tag} - {deal.customers?.customer_name}
          </h2>
          <p>
            {deal.year || ""} {deal.truck || ""} | VIN: {deal.vin || "—"}
          </p>

          {balance <= 0 ? (
            <div className="badge badge-paid">PAID OFF</div>
          ) : (
            <div className="badge badge-balance">
              BALANCE DUE: {formatMoney(balance)}
            </div>
          )}
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <div className="label">Total Amount</div>
            <div className="value">{formatMoney(deal.total_amount)}</div>
          </div>

          <div className="summary-card">
            <div className="label">Total Paid</div>
            <div className="value">{formatMoney(totalPaid)}</div>
          </div>

          <div className="summary-card">
            <div className="label">Balance</div>
            <div className="value">{formatMoney(balance)}</div>
          </div>

          <div className="summary-card">
            <div className="label">Monthly Payment</div>
            <div className="value">{formatMoney(deal.monthly_payment)}</div>
          </div>
        </div>

        <div className="section">
          <h3>Customer Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Customer</div>
              <div className="info-value">
                {deal.customers?.customer_name || "—"}
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">Phone</div>
              <div className="info-value">{deal.customers?.phone || "—"}</div>
            </div>

            <div className="info-item">
              <div className="info-label">Email</div>
              <div className="info-value">{deal.customers?.email || "—"}</div>
            </div>

            <div className="info-item">
              <div className="info-label">Address</div>
              <div className="info-value">{deal.customers?.address || "—"}</div>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Deal Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Deal Status</div>
              <div className="info-value">{deal.status || "—"}</div>
            </div>

            <div className="info-item">
              <div className="info-label">Deal Type</div>
              <div className="info-value">{deal.deal_type || "—"}</div>
            </div>

            <div className="info-item">
              <div className="info-label">Sub Type</div>
              <div className="info-value">{deal.deal_subtype || "—"}</div>
            </div>

            <div className="info-item">
              <div className="info-label">Start Date</div>
              <div className="info-value">
                {formatDisplayDate(deal.start_date)}
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">Due Day</div>
              <div className="info-value">{deal.due_day || "—"}</div>
            </div>

            <div className="info-item">
              <div className="info-label">Term</div>
              <div className="info-value">{deal.term || "—"}</div>
            </div>

            <div className="info-item">
              <div className="info-label">Maturity Date</div>
              <div className="info-value">
                {formatDisplayDate(deal.maturity_date)}
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">Truck</div>
              <div className="info-value">
                {deal.year || ""} {deal.truck || ""}
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Due Schedule</h3>
          <table>
            <thead>
              <tr>
                <th>Installment</th>
                <th>Due Date</th>
                <th>Amount Due</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {schedule.map((item) => (
                <tr key={item.installmentNumber}>
                  <td>{item.installmentNumber}</td>
                  <td>{formatDisplayDate(item.dueDate)}</td>
                  <td>{formatMoney(item.amountDue)}</td>
                  <td>{formatMoney(item.paidForDueDate)}</td>
                  <td>{formatMoney(item.remaining)}</td>
                  <td>
                    <span className={getPrintStatusClass(item.status)}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section">
          <h3>Payment History</h3>
          <table>
            <thead>
              <tr>
                <th>Payment Date</th>
                <th>Due Date</th>
                <th>Amount Paid</th>
                <th>Method</th>
                <th>Type</th>
                <th>Status</th>
                <th>Notes / Void Reason</th>
              </tr>
            </thead>

            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="7">No payments recorded.</td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDisplayDate(payment.payment_date)}</td>
                    <td>{formatDisplayDate(payment.due_date)}</td>
                    <td>{formatMoney(payment.amount_paid)}</td>
                    <td>{payment.payment_method || "—"}</td>
                    <td>{payment.payment_type || "—"}</td>
                    <td>{payment.payment_status || "Active"}</td>
                    <td>{payment.void_reason || payment.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="section">
          <h3>Promise History</h3>
          <table>
            <thead>
              <tr>
                <th>Original Due Date</th>
                <th>Promised Date</th>
                <th>Amount Due</th>
                <th>Paid Now</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>

            <tbody>
              {promises.length === 0 ? (
                <tr>
                  <td colSpan="7">No promises recorded.</td>
                </tr>
              ) : (
                promises.map((promise) => (
                  <tr key={promise.id}>
                    <td>{formatDisplayDate(promise.original_due_date)}</td>
                    <td>{formatDisplayDate(promise.promised_date)}</td>
                    <td>{formatMoney(promise.amount_due)}</td>
                    <td>{formatMoney(promise.amount_paid_now)}</td>
                    <td>{formatMoney(promise.remaining_amount)}</td>
                    <td>{promise.promise_status}</td>
                    <td>{promise.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="section">
          <h3>Deal Notes</h3>
          <div className="notes">{deal.notes || "No notes added."}</div>
        </div>

        <div className="signature-row">
          <div className="signature-line">Customer Signature</div>
          <div className="signature-line">Authorized Representative</div>
        </div>

        <div className="footer">
          <span>RK PayTrack Account Summary</span>
          <span>Generated by RK PayTrack</span>
        </div>
      </div>
    </>
  );
}

function getPrintStatusClass(status) {
  if (status === "Paid") return "status-paid";
  if (status === "Partial") return "status-partial";
  if (status === "Past Due") return "status-past-due";
  return "status-due";
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
}

const printButtonStyle = {
    display: "inline-block",
    background: "#166534",
    color: "white",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
  };

export default AccountSummaryPrint;