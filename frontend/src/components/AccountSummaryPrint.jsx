import { getDealDueSchedule } from "../utils/duePaymentsUtils";
import { formatMoney } from "../utils/moneyUtils";
import logo from "../assets/rk-paytrack-logo.png";

function AccountSummaryPrint({ deal, payments = [], promises = [], totalPaid, balance }) {
  const today = new Date().toISOString().split("T")[0];

  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const cashCollected = activePayments.reduce(
    (sum, payment) => sum + getPaymentCashAmount(payment),
    0
  );

  const referralCreditsApplied = activePayments.reduce(
    (sum, payment) => sum + getPaymentCreditAmount(payment),
    0
  );

  const totalAppliedToBalance = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  const calculatedBalance = Math.max(
    Number(deal?.total_amount || 0) - totalAppliedToBalance,
    0
  );

  const displayBalance =
    balance !== undefined && balance !== null
      ? Number(balance || 0)
      : calculatedBalance;

  const displayTotalPaid =
    totalPaid !== undefined && totalPaid !== null
      ? Number(totalPaid || 0)
      : totalAppliedToBalance;

  const paymentFrequency = getPaymentFrequency(deal);
  const paymentAmountLabel = getPaymentAmountLabel(paymentFrequency);

  const schedule = getDealDueSchedule(deal || {}).map((installment) => {
    const paidForDueDate = activePayments
      .filter(
        (payment) =>
          String(payment.deal_id) === String(deal?.id) &&
          payment.due_date === installment.dueDate
      )
      .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);

    const remaining = Math.max(
      Number(installment.amountDue || 0) - paidForDueDate,
      0
    );

    let status = "Due";

    if (paidForDueDate >= Number(installment.amountDue || 0)) {
      status = "Paid";
    } else if (paidForDueDate > 0) {
      status = "Partial";
    } else if (installment.dueDate < today) {
      status = "Past Due";
    }

    return {
      ...installment,
      paidForDueDate,
      remaining,
      status,
      paymentFrequency: installment.paymentFrequency || paymentFrequency,
    };
  });

  const openInstallments = schedule
    .filter((item) => Number(item.remaining || 0) > 0)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

  const upcomingInstallments = openInstallments.slice(0, 6);

  const recentPayments = [...payments]
    .sort((a, b) =>
      String(b.payment_date || "").localeCompare(String(a.payment_date || ""))
    )
    .slice(0, 6);

  const activePromises = promises
    .filter(
      (promise) =>
        promise.promise_status !== "Paid" &&
        promise.promise_status !== "Cancelled" &&
        promise.promise_status !== "Rescheduled"
    )
    .sort((a, b) =>
      String(a.promised_date || "").localeCompare(String(b.promised_date || ""))
    )
    .slice(0, 4);

  const nextDue = openInstallments[0];

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
            @page {
              size: letter;
              margin: 0.35in;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 0;
              color: #111827;
              background: white;
              font-size: 10.5px;
            }

            .document {
              width: 100%;
              max-width: 8in;
              margin: 0 auto;
            }

            .top-band {
              background: #0A1A2F;
              color: white;
              border-radius: 14px;
              padding: 14px 16px;
              display: grid;
              grid-template-columns: 1.25fr 0.75fr;
              gap: 16px;
              align-items: center;
              margin-bottom: 12px;
            }

            .brand-block {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .logo-box {
              width: 62px;
              height: 62px;
              border-radius: 14px;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 6px;
              flex-shrink: 0;
            }

            .logo-box img {
              width: 52px;
              height: auto;
              display: block;
              object-fit: contain;
            }

            .brand-title {
              margin: 0;
              font-size: 24px;
              line-height: 1.05;
              letter-spacing: 0.3px;
            }

            .brand-subtitle {
              margin: 5px 0 0;
              color: #dbeafe;
              line-height: 1.35;
              font-size: 10.5px;
            }

            .statement-box {
              text-align: right;
            }

            .statement-title {
              margin: 0;
              font-size: 19px;
              letter-spacing: 0.7px;
            }

            .statement-meta {
              margin: 6px 0 0;
              color: #dbeafe;
              line-height: 1.45;
            }

            .status-strip {
              display: grid;
              grid-template-columns: 1.4fr 0.6fr;
              gap: 10px;
              margin-bottom: 10px;
            }

            .customer-card,
            .balance-card {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 12px;
              background: #f8fafc;
            }

            .customer-name {
              margin: 0;
              font-size: 18px;
              color: #111827;
            }

            .customer-line {
              margin: 5px 0 0;
              color: #475569;
              line-height: 1.35;
            }

            .balance-card {
              background: #ffffff;
              text-align: right;
              border-color: ${displayBalance <= 0 ? "#bbf7d0" : "#fecaca"};
            }

            .balance-label {
              color: #64748b;
              text-transform: uppercase;
              font-size: 9.5px;
              font-weight: 800;
              letter-spacing: 0.6px;
              margin-bottom: 6px;
            }

            .balance-value {
              font-size: 24px;
              font-weight: 900;
              color: ${displayBalance <= 0 ? "#166534" : "#991b1b"};
              line-height: 1;
            }

            .badge-row {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              margin-top: 8px;
            }

            .badge {
              display: inline-flex;
              align-items: center;
              border-radius: 999px;
              padding: 4px 8px;
              font-size: 9.5px;
              font-weight: 800;
              border: 1px solid transparent;
              white-space: nowrap;
            }

            .badge-blue {
              background: #dbeafe;
              color: #1d4ed8;
              border-color: #bfdbfe;
            }

            .badge-gray {
              background: #f1f5f9;
              color: #334155;
              border-color: #cbd5e1;
            }

            .badge-green {
              background: #dcfce7;
              color: #166534;
              border-color: #bbf7d0;
            }

            .badge-red {
              background: #fee2e2;
              color: #991b1b;
              border-color: #fecaca;
            }

            .summary-grid {
              display: grid;
              grid-template-columns: repeat(6, 1fr);
              gap: 8px;
              margin-bottom: 10px;
            }

            .summary-card {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 9px;
              min-height: 58px;
              background: white;
            }

            .summary-card.highlight {
              background: #fffbeb;
              border-color: #fde68a;
            }

            .summary-label {
              color: #64748b;
              font-size: 8.5px;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              font-weight: 900;
              margin-bottom: 6px;
            }

            .summary-value {
              color: #111827;
              font-size: 13px;
              font-weight: 900;
              line-height: 1.15;
              word-break: break-word;
            }

            .two-column {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 10px;
            }

            .panel {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              overflow: hidden;
              background: white;
              page-break-inside: avoid;
            }

            .panel-title {
              background: #0A1A2F;
              color: white;
              padding: 8px 10px;
              margin: 0;
              font-size: 11.5px;
              letter-spacing: 0.2px;
            }

            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
            }

            .info-item {
              padding: 8px 9px;
              border-bottom: 1px solid #e5e7eb;
              min-height: 42px;
            }

            .info-item:nth-child(odd) {
              border-right: 1px solid #e5e7eb;
            }

            .info-label {
              color: #64748b;
              font-size: 8.5px;
              text-transform: uppercase;
              letter-spacing: 0.35px;
              font-weight: 900;
              margin-bottom: 4px;
            }

            .info-value {
              color: #111827;
              font-weight: 800;
              line-height: 1.3;
              word-break: break-word;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9.6px;
            }

            th {
              background: #f1f5f9;
              color: #0f172a;
              padding: 6px;
              border: 1px solid #e5e7eb;
              text-align: left;
              font-weight: 900;
              white-space: nowrap;
            }

            td {
              padding: 6px;
              border: 1px solid #e5e7eb;
              vertical-align: top;
              line-height: 1.25;
              word-break: break-word;
            }

            tr:nth-child(even) td {
              background: #fafafa;
            }

            .money {
              font-weight: 900;
              color: #111827;
              white-space: nowrap;
            }

            .status-paid {
              color: #166534;
              font-weight: 900;
            }

            .status-partial {
              color: #854d0e;
              font-weight: 900;
            }

            .status-past-due {
              color: #991b1b;
              font-weight: 900;
            }

            .status-due {
              color: #1d4ed8;
              font-weight: 900;
            }

            .notes-box {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 10px;
              min-height: 48px;
              background: #fffbeb;
              color: #374151;
              line-height: 1.45;
              margin-bottom: 10px;
              page-break-inside: avoid;
            }

            .fine-print {
              border: 1px solid #e5e7eb;
              background: #f8fafc;
              border-radius: 12px;
              padding: 9px;
              color: #475569;
              line-height: 1.35;
              margin-top: 8px;
            }

            .signature-row {
              margin-top: 20px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 34px;
            }

            .signature-line {
              border-top: 1px solid #111827;
              padding-top: 6px;
              color: #475569;
              font-size: 9.5px;
            }

            .footer {
              margin-top: 14px;
              padding-top: 8px;
              border-top: 1px solid #e5e7eb;
              color: #64748b;
              font-size: 9px;
              display: flex;
              justify-content: space-between;
              gap: 10px;
            }

            @media print {
              .document {
                page-break-after: avoid;
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
        🖨 Print Account Summary
      </button>

      <div id="account-summary-print" style={hiddenPrintContainer}>
        <div className="document">
          <div className="top-band">
            <div className="brand-block">
              <div className="logo-box">
                <img src={logo} alt="RK PayTrack Logo" />
              </div>

              <div>
                <h1 className="brand-title">RK PayTrack</h1>
                <p className="brand-subtitle">
                  RK Truck & Trailer Sales
                  <br />
                  Customer Account Statement
                </p>
              </div>
            </div>

            <div className="statement-box">
              <h2 className="statement-title">ACCOUNT SUMMARY</h2>
              <p className="statement-meta">
                Generated: {new Date().toLocaleString()}
                <br />
                Deal Tag: {deal?.deal_tag || "—"}
              </p>
            </div>
          </div>

          <div className="status-strip">
            <div className="customer-card">
              <h2 className="customer-name">
                {deal?.customers?.customer_name || "Customer"}
              </h2>

              <p className="customer-line">
                {deal?.customers?.company_name
                  ? `${deal.customers.company_name} · `
                  : ""}
                {deal?.customers?.phone || "No phone"}{" "}
                {deal?.customers?.email ? `· ${deal.customers.email}` : ""}
              </p>

              <p className="customer-line">
                Deal #{deal?.deal_tag || "—"} ·{" "}
                {`${deal?.year || ""} ${deal?.truck || ""}`.trim() ||
                  "Truck not listed"}{" "}
                · VIN: {deal?.vin || "—"}
              </p>

              <div className="badge-row">
                <span className="badge badge-blue">
                  {deal?.deal_type || "Deal Type Not Set"}
                </span>
                <span className="badge badge-gray">
                  {paymentFrequency}
                </span>
                <span className="badge badge-gray">
                  {deal?.status || "Active"}
                </span>
                {displayBalance <= 0 ? (
                  <span className="badge badge-green">Paid Off</span>
                ) : (
                  <span className="badge badge-red">Balance Due</span>
                )}
              </div>
            </div>

            <div className="balance-card">
              <div className="balance-label">
                {displayBalance <= 0 ? "Account Status" : "Current Balance"}
              </div>
              <div className="balance-value">
                {displayBalance <= 0 ? "PAID OFF" : formatMoney(displayBalance)}
              </div>
              <div className="badge-row" style={{ justifyContent: "flex-end" }}>
                <span
                  className={
                    displayBalance <= 0
                      ? "badge badge-green"
                      : "badge badge-red"
                  }
                >
                  {displayBalance <= 0 ? "No Balance Due" : "Payment Required"}
                </span>
              </div>
            </div>
          </div>

          <div className="summary-grid">
            <SummaryCard
              label="Total Amount"
              value={formatMoney(deal?.total_amount)}
            />
            <SummaryCard
              label="Cash Collected"
              value={formatMoney(cashCollected)}
            />
            <SummaryCard
              label="Referral Credit"
              value={formatMoney(referralCreditsApplied)}
            />
            <SummaryCard
              label="Applied to Balance"
              value={formatMoney(displayTotalPaid)}
            />
            <SummaryCard
              label="Current Balance"
              value={formatMoney(displayBalance)}
              highlight
            />
            <SummaryCard
              label="Next Due"
              value={
                nextDue
                  ? `${formatMoney(nextDue.remaining)} on ${formatDisplayDate(
                      nextDue.dueDate
                    )}`
                  : "No open due"
              }
            />
          </div>

          <div className="two-column">
            <div className="panel">
              <h3 className="panel-title">Customer Information</h3>
              <div className="info-grid">
                <InfoItem
                  label="Customer"
                  value={deal?.customers?.customer_name || "—"}
                />
                <InfoItem
                  label="Company"
                  value={deal?.customers?.company_name || "—"}
                />
                <InfoItem label="Phone" value={deal?.customers?.phone || "—"} />
                <InfoItem label="Email" value={deal?.customers?.email || "—"} />
                <InfoItem
                  label="Address"
                  value={deal?.customers?.address || "—"}
                />
                <InfoItem label="Deal Tag" value={deal?.deal_tag || "—"} />
              </div>
            </div>

            <div className="panel">
              <h3 className="panel-title">Deal Information</h3>
              <div className="info-grid">
                <InfoItem label="Deal Type" value={deal?.deal_type || "—"} />
                <InfoItem label="Sub Type" value={deal?.deal_subtype || "—"} />
                <InfoItem label="Frequency" value={paymentFrequency} />
                <InfoItem
                  label={paymentAmountLabel}
                  value={formatMoney(deal?.monthly_payment)}
                />
                <InfoItem
                  label={
                    paymentFrequency === "Biweekly"
                      ? "First Payment"
                      : "Start Date"
                  }
                  value={formatDisplayDate(
                    paymentFrequency === "Biweekly"
                      ? deal?.first_payment_date || deal?.start_date
                      : deal?.start_date
                  )}
                />
                <InfoItem
                  label="Maturity"
                  value={formatDisplayDate(deal?.maturity_date)}
                />
              </div>
            </div>
          </div>

          <div className="two-column">
            <div className="panel">
              <h3 className="panel-title">Open / Upcoming Installments</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Due Date</th>
                    <th>Due</th>
                    <th>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {upcomingInstallments.length === 0 ? (
                    <tr>
                      <td colSpan="5">No open installments.</td>
                    </tr>
                  ) : (
                    upcomingInstallments.map((item) => (
                      <tr key={`${item.installmentNumber}-${item.dueDate}`}>
                        <td>{item.installmentNumber}</td>
                        <td>{formatDisplayDate(item.dueDate)}</td>
                        <td className="money">{formatMoney(item.amountDue)}</td>
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

            <div className="panel">
              <h3 className="panel-title">Recent Payments</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan="4">No payments recorded.</td>
                    </tr>
                  ) : (
                    recentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDisplayDate(payment.payment_date)}</td>
                        <td className="money">
                          {formatMoney(payment.amount_paid)}
                        </td>
                        <td>{payment.payment_method || "—"}</td>
                        <td>{payment.payment_status || "Active"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: "10px" }}>
            <h3 className="panel-title">Active Promises</h3>
            <table>
              <thead>
                <tr>
                  <th>Original Due</th>
                  <th>Promised Date</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>

              <tbody>
                {activePromises.length === 0 ? (
                  <tr>
                    <td colSpan="5">No active promises.</td>
                  </tr>
                ) : (
                  activePromises.map((promise) => (
                    <tr key={promise.id}>
                      <td>{formatDisplayDate(promise.original_due_date)}</td>
                      <td>{formatDisplayDate(promise.promised_date)}</td>
                      <td className="money">
                        {formatMoney(promise.remaining_amount)}
                      </td>
                      <td>{promise.promise_status || "Pending"}</td>
                      <td>{promise.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* <div className="notes-box">
            <strong>Account Notes:</strong>{" "}
            {deal?.notes
              ? limitText(deal.notes, 260)
              : "No special notes listed on this account."}
          </div> */}

          <div className="fine-print">
            This account summary is generated from RK PayTrack records as of the
            generated date above. Referral Credit reduces the account balance but
            is shown separately from actual cash collected. Please contact RK
            Truck & Trailer Sales if you believe any payment or balance is
            incorrect.
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

function isCreditPayment(payment) {
  return (
    String(payment?.payment_method || "").trim().toLowerCase() ===
    "referral credit"
  );
}

function getPaymentCashAmount(payment) {
  if (isCreditPayment(payment)) return 0;
  return Number(payment?.amount_paid || 0);
}

function getPaymentCreditAmount(payment) {
  if (!isCreditPayment(payment)) return 0;
  return Number(payment?.amount_paid || 0);
}

function getPaymentFrequency(deal) {
  if (deal?.deal_type === "Cash") return "Cash";
  if (deal?.deal_type === "Registration Money") return "One-Time";
  return deal?.payment_frequency || deal?.paymentFrequency || "Monthly";
}

function getPaymentAmountLabel(paymentFrequency) {
  if (paymentFrequency === "Biweekly") return "Biweekly Payment";
  if (paymentFrequency === "One-Time") return "One-Time Amount";
  if (paymentFrequency === "Cash") return "Cash Amount";
  return "Monthly Payment";
}

function getPrintStatusClass(status) {
  if (status === "Paid") return "status-paid";
  if (status === "Partial") return "status-partial";
  if (status === "Past Due") return "status-past-due";
  return "status-due";
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  return `${month}/${day}/${year}`;
}

function limitText(value, maxLength) {
  const text = String(value || "").trim();

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength)}...`;
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
  width: "850px",
  maxWidth: "850px",
  height: "0px",
  overflow: "hidden",
};

export default AccountSummaryPrint;