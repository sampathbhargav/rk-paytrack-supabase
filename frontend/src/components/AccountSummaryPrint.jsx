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
    const printElement = document.getElementById("account-summary-print");

    if (!printElement) {
      alert("Print summary was not found.");
      return;
    }

    const printContents = printElement.innerHTML;

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
          <title>RK PayTrack Account Summary</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 30px;
              color: #111827;
              background: #ffffff;
              font-size: 12.5px;
            }

            .document {
              width: 100%;
            }

            .top-bar {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 20px;
              padding-bottom: 18px;
              border-bottom: 5px solid #0A1A2F;
              margin-bottom: 20px;
            }

            .brand-block {
              display: flex;
              align-items: center;
              gap: 14px;
            }

            .logo-box {
              width: 78px;
              height: 78px;
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 6px;
              box-shadow: 0 3px 10px rgba(15, 23, 42, 0.12);
              background: #ffffff;
              flex-shrink: 0;
            }

            .logo-box img {
              width: 66px;
              height: auto;
              display: block;
              object-fit: contain;
            }

            .brand-title {
              margin: 0;
              color: #0A1A2F;
              font-size: 28px;
              letter-spacing: 0.4px;
            }

            .brand-subtitle {
              margin: 5px 0 0;
              color: #475569;
              font-size: 13px;
              line-height: 1.35;
            }

            .statement-box {
              text-align: right;
              min-width: 245px;
            }

            .statement-title {
              margin: 0;
              color: #0A1A2F;
              font-size: 22px;
              letter-spacing: 0.6px;
            }

            .statement-meta {
              margin: 6px 0 0;
              color: #475569;
              line-height: 1.45;
            }

            .customer-hero {
              display: grid;
              grid-template-columns: 1.4fr 0.8fr;
              gap: 14px;
              margin-bottom: 18px;
            }

            .customer-card {
              background: #f8fafc;
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 16px;
            }

            .customer-card h2 {
              margin: 0;
              font-size: 22px;
              color: #111827;
            }

            .customer-card p {
              margin: 7px 0 0;
              color: #475569;
              line-height: 1.45;
            }

            .balance-card {
              border-radius: 14px;
              padding: 16px;
              border: 1px solid #e5e7eb;
              background: #ffffff;
            }

            .balance-label {
              color: #64748b;
              text-transform: uppercase;
              font-size: 11px;
              font-weight: bold;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }

            .balance-value {
              font-size: 24px;
              font-weight: bold;
              color: #111827;
            }

            .badge-row {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 10px;
            }

            .badge {
              display: inline-block;
              padding: 6px 11px;
              border-radius: 999px;
              font-size: 11px;
              font-weight: bold;
              border: 1px solid transparent;
            }

            .badge-paid {
              background: #dcfce7;
              color: #166534;
              border-color: #bbf7d0;
            }

            .badge-balance {
              background: #fee2e2;
              color: #991b1b;
              border-color: #fecaca;
            }

            .badge-type {
              background: #dbeafe;
              color: #1d4ed8;
              border-color: #bfdbfe;
            }

            .badge-status {
              background: #f1f5f9;
              color: #334155;
              border-color: #cbd5e1;
            }

            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 11px;
              margin-bottom: 18px;
            }

            .summary-card {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 13px;
              padding: 13px;
              min-height: 76px;
            }

            .summary-card.highlight {
              background: #f8fafc;
              border-color: #cbd5e1;
            }

            .summary-label {
              color: #64748b;
              font-size: 10.5px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: bold;
              margin-bottom: 8px;
            }

            .summary-value {
              font-size: 17px;
              font-weight: bold;
              color: #111827;
              word-break: break-word;
            }

            .section {
              margin-top: 20px;
              page-break-inside: avoid;
            }

            .section-title {
              background: #0A1A2F;
              color: #ffffff;
              padding: 10px 12px;
              border-radius: 10px 10px 0 0;
              margin: 0;
              font-size: 14px;
              letter-spacing: 0.2px;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 10px 10px;
              overflow: hidden;
            }

            .info-item {
              padding: 10px 12px;
              border-bottom: 1px solid #e5e7eb;
              min-height: 54px;
            }

            .info-item:nth-child(odd) {
              border-right: 1px solid #e5e7eb;
            }

            .info-label {
              color: #64748b;
              font-size: 10.5px;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              font-weight: bold;
              margin-bottom: 5px;
            }

            .info-value {
              color: #111827;
              font-weight: bold;
              word-break: break-word;
              line-height: 1.35;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #e5e7eb;
              font-size: 11.5px;
            }

            th {
              background: #f1f5f9;
              color: #0f172a;
              padding: 8px;
              border: 1px solid #e5e7eb;
              text-align: left;
              font-weight: bold;
              white-space: nowrap;
            }

            td {
              padding: 8px;
              border: 1px solid #e5e7eb;
              vertical-align: top;
              word-break: break-word;
            }

            tr:nth-child(even) td {
              background: #fafafa;
            }

            .money {
              font-weight: bold;
              color: #111827;
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
              padding: 13px;
              border-radius: 0 0 10px 10px;
              min-height: 72px;
              background: #ffffff;
              color: #374151;
              line-height: 1.5;
              word-break: break-word;
            }

            .signature-row {
              margin-top: 34px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 44px;
            }

            .signature-line {
              border-top: 1px solid #111827;
              padding-top: 7px;
              color: #475569;
              font-size: 11.5px;
            }

            .footer {
              margin-top: 34px;
              padding-top: 13px;
              border-top: 1px solid #e5e7eb;
              color: #64748b;
              font-size: 10.5px;
              display: flex;
              justify-content: space-between;
              gap: 12px;
            }

            @media print {
              body {
                padding: 18px;
              }

              .section,
              .top-bar,
              .customer-hero {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>

        <body>
          ${printContents}
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

  return (
    <>
      <button type="button" onClick={handlePrint} style={printButtonStyle}>
        🖨 Account Summary
      </button>

      <div id="account-summary-print" style={hiddenPrintContainer}>
        <div className="document">
          <div className="top-bar">
            <div className="brand-block">
              <div className="logo-box">
                <img src={logo} alt="RK PayTrack Logo" />
              </div>

              <div>
                <h1 className="brand-title">RK PayTrack</h1>
                <p className="brand-subtitle">
                  Dealer Payment Tracking System
                  <br />
                  RK Truck & Trailer Sales
                </p>
              </div>
            </div>

            <div className="statement-box">
              <h2 className="statement-title">ACCOUNT SUMMARY</h2>
              <p className="statement-meta">
                Generated: {new Date().toLocaleString()}
                <br />
                Deal Tag: {deal.deal_tag || "—"}
              </p>
            </div>
          </div>

          <div className="customer-hero">
            <div className="customer-card">
              <h2>
                {deal.deal_tag || "—"} -{" "}
                {deal.customers?.customer_name || "Customer"}
              </h2>

              <p>
                {deal.year || ""} {deal.truck || "Truck"} | VIN:{" "}
                {deal.vin || "—"}
              </p>

              <div className="badge-row">
                <span className="badge badge-type">
                  {deal.deal_type || "Deal Type Not Set"}
                </span>

                <span className="badge badge-status">
                  {deal.status || "Active"}
                </span>

                {deal.deal_subtype && (
                  <span className="badge badge-status">
                    {deal.deal_subtype}
                  </span>
                )}
              </div>
            </div>

            <div className="balance-card">
              <div className="balance-label">
                {balance <= 0 ? "Account Status" : "Current Balance"}
              </div>

              <div className="balance-value">
                {balance <= 0 ? "PAID OFF" : formatMoney(balance)}
              </div>

              <div className="badge-row">
                {balance <= 0 ? (
                  <span className="badge badge-paid">PAID OFF</span>
                ) : (
                  <span className="badge badge-balance">BALANCE DUE</span>
                )}
              </div>
            </div>
          </div>

          <div className="summary-grid">
            <SummaryCard
              label="Total Amount"
              value={formatMoney(deal.total_amount)}
            />

            <SummaryCard label="Total Paid" value={formatMoney(totalPaid)} />

            <SummaryCard
              label="Balance"
              value={formatMoney(balance)}
              highlight
            />

            <SummaryCard
              label="Monthly Payment"
              value={formatMoney(deal.monthly_payment)}
            />
          </div>

          <div className="section">
            <h3 className="section-title">Customer Information</h3>

            <div className="info-grid">
              <InfoItem
                label="Customer"
                value={deal.customers?.customer_name || "—"}
              />
              <InfoItem label="Phone" value={deal.customers?.phone || "—"} />
              <InfoItem label="Email" value={deal.customers?.email || "—"} />
              <InfoItem
                label="Address"
                value={deal.customers?.address || "—"}
              />
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">Deal Information</h3>

            <div className="info-grid">
              <InfoItem label="Deal Status" value={deal.status || "—"} />
              <InfoItem label="Deal Type" value={deal.deal_type || "—"} />
              <InfoItem label="Sub Type" value={deal.deal_subtype || "—"} />
              <InfoItem
                label="Start Date"
                value={formatDisplayDate(deal.start_date)}
              />
              <InfoItem label="Due Day" value={deal.due_day || "—"} />
              <InfoItem label="Term" value={deal.term || "—"} />
              <InfoItem
                label="Maturity Date"
                value={formatDisplayDate(deal.maturity_date)}
              />
              <InfoItem
                label="Truck"
                value={`${deal.year || ""} ${deal.truck || ""}`.trim() || "—"}
              />
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">Due Schedule</h3>

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
                {schedule.length === 0 ? (
                  <tr>
                    <td colSpan="6">No due schedule available.</td>
                  </tr>
                ) : (
                  schedule.map((item) => (
                    <tr key={item.installmentNumber}>
                      <td>{item.installmentNumber}</td>
                      <td>{formatDisplayDate(item.dueDate)}</td>
                      <td className="money">{formatMoney(item.amountDue)}</td>
                      <td className="money">
                        {formatMoney(item.paidForDueDate)}
                      </td>
                      <td className="money">{formatMoney(item.remaining)}</td>
                      <td>
                        <span className={getPrintStatusClass(item.status)}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="section">
            <h3 className="section-title">Payment History</h3>

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
                      <td className="money">{formatMoney(payment.amount_paid)}</td>
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
            <h3 className="section-title">Promise History</h3>

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
                      <td className="money">
                        {formatMoney(promise.amount_due)}
                      </td>
                      <td className="money">
                        {formatMoney(promise.amount_paid_now)}
                      </td>
                      <td className="money">
                        {formatMoney(promise.remaining_amount)}
                      </td>
                      <td>{promise.promise_status}</td>
                      <td>{promise.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="section">
            <h3 className="section-title">Deal Notes</h3>
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
      </div>
    </>
  );
}

function SummaryCard({ label, value, highlight = false }) {
  return (
    <div className={highlight ? "summary-card highlight" : "summary-card"}>
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="info-item">
      <div className="info-label">{label}</div>
      <div className="info-value">{value || "—"}</div>
    </div>
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
  background: "linear-gradient(135deg, #166534, #15803d)",
  color: "white",
  padding: "10px 14px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  fontWeight: "900",
  boxShadow: "0 6px 14px rgba(22, 101, 52, 0.22)",
};

const hiddenPrintContainer = {
  position: "absolute",
  left: "-99999px",
  top: 0,
  width: "900px",
  maxWidth: "900px",
  height: "0px",
  overflow: "hidden",
};

export default AccountSummaryPrint;