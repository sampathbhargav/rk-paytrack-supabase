import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDealById } from "../api/dealsApi";
import {
  getPaymentsByDealId,
  updateDealPaidOffStatus,
} from "../api/paymentsApi";
import { getPromisesByDealId, updateBrokenPromises } from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";
import { getDealDueSchedule } from "../utils/duePaymentsUtils";
import {
  createGoogleCollectionReminderBatch,
  createIcsCollectionReminderBatch,
} from "../utils/calendarUtils";
import PaymentHistory from "../components/PaymentHistory";
import PromiseHistory from "../components/PromiseHistory";
import DueSchedule from "../components/DueSchedule";
import AccountSummaryPrint from "../components/AccountSummaryPrint";
import PaymentReceipt from "../components/PaymentReceipt";

function CustomerDetail() {
  const { dealId } = useParams();

  const [deal, setDeal] = useState(null);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);
  const [error, setError] = useState("");

  const [receipt, setReceipt] = useState(null);
  const [showReminderMenu, setShowReminderMenu] = useState(false);

  useEffect(() => {
    loadCustomerDetail();
  }, [dealId]);

  const loadCustomerDetail = async () => {
    try {
      setError("");

      await updateBrokenPromises();
      await updateDealPaidOffStatus(dealId);

      const dealData = await getDealById(dealId);
      const paymentsData = await getPaymentsByDealId(dealId);
      const promisesData = await getPromisesByDealId(dealId);

      setDeal(dealData);
      setPayments(paymentsData || []);
      setPromises(promisesData || []);
    } catch (error) {
      setError(error.message);
    }
  };

  if (error) {
    return (
      <div style={pageWrapper}>
        <Link to="/deals" style={backLink}>
          ← Back to Deals
        </Link>

        <div style={errorBox}>{error}</div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={pageWrapper}>
        <div style={loadingCard}>
          <div style={loadingIcon}>⏳</div>
          <strong>Loading customer account...</strong>
          <p style={{ margin: "6px 0 0", color: "#667085" }}>
            Please wait while RK PayTrack loads the deal details.
          </p>
        </div>
      </div>
    );
  }

  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const totalAmount = Number(deal.total_amount || 0);

  const totalPaid = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  const balance = Math.max(totalAmount - totalPaid, 0);

  const paidPercent =
    totalAmount > 0 ? Math.min((totalPaid / totalAmount) * 100, 100) : 0;

  const pendingPromises = promises.filter(
    (promise) => promise.promise_status === "Pending"
  );

  const brokenPromises = promises.filter(
    (promise) => promise.promise_status === "Broken"
  );

  const activePromiseBalance = promises
    .filter(
      (promise) =>
        promise.promise_status !== "Paid" &&
        promise.promise_status !== "Cancelled" &&
        promise.promise_status !== "Rescheduled"
    )
    .reduce((sum, promise) => sum + Number(promise.remaining_amount || 0), 0);

  const openPaymentReceipt = (payment) => {
    const activePaymentsForReceipt = payments.filter(
      (p) => p.payment_status !== "Voided"
    );

    const totalPaidForReceipt = activePaymentsForReceipt.reduce(
      (sum, p) => sum + Number(p.amount_paid || 0),
      0
    );

    const totalAmountForReceipt = Number(deal.total_amount || 0);

    const remainingBalance = Math.max(
      totalAmountForReceipt - totalPaidForReceipt,
      0
    );

    setReceipt({
      paymentId: payment.id,
      customerName: deal.customers?.customer_name || "",
      phone: deal.customers?.phone || "",
      dealTag: deal.deal_tag || "",
      dealType: deal.deal_type || "",
      truck: `${deal.year || ""} ${deal.truck || ""}`.trim(),
      vin: deal.vin || "",
      amountPaid: payment.amount_paid || 0,
      paymentMethod: payment.payment_method || "Other",
      paymentDate: payment.payment_date || "",
      dueDate: payment.due_date || "",
      paymentType: payment.payment_type || "",
      paymentStatus: payment.payment_status || "Paid",
      remainingBalance,
      notes: payment.notes || "",
    });
  };

  const getAllUnpaidReminderItems = () => {
    const schedule = getDealDueSchedule(deal);

    return schedule
      .map((installment) => {
        const paymentsForDueDate = activePayments.filter(
          (payment) =>
            payment.deal_id === deal.id &&
            payment.due_date === installment.dueDate &&
            payment.payment_status !== "Voided"
        );

        const paidForDueDate = paymentsForDueDate.reduce(
          (sum, payment) => sum + Number(payment.amount_paid || 0),
          0
        );

        const remaining = Math.max(
          Number(installment.amountDue || 0) - paidForDueDate,
          0
        );

        return {
          customerName: deal.customers?.customer_name || "",
          phone: deal.customers?.phone || "",
          dealTag: deal.deal_tag || "",
          truck: `${deal.year || ""} ${deal.truck || ""}`.trim(),
          dueDate: installment.dueDate,
          installmentNumber: installment.installmentNumber,
          amountDue: installment.amountDue,
          paidAmount: paidForDueDate,
          remainingAmount: remaining,
          notes: `Collection reminder for installment ${installment.installmentNumber}`,
        };
      })
      .filter((item) => Number(item.remainingAmount || 0) > 0);
  };

  const handleAddAllToGoogleCalendar = () => {
    createGoogleCollectionReminderBatch(
      getAllUnpaidReminderItems(),
      deal.deal_tag || "customer"
    );
  };

  const handleDownloadAllIcs = () => {
    createIcsCollectionReminderBatch(
      getAllUnpaidReminderItems(),
      deal.deal_tag || "customer"
    );
  };

  return (
    <div style={pageWrapper}>
      <div style={topNav}>
        <Link to="/deals" style={backLink}>
          ← Back to Deals
        </Link>

        <div style={topActions}>
          <Link to={`/deals/${dealId}/edit`} style={editButtonStyle}>
            ✏️ Edit Deal
          </Link>

          <div style={reminderDropdownWrapper}>
            <button
              type="button"
              onClick={() => setShowReminderMenu((prev) => !prev)}
              style={reminderDropdownButton}
            >
              📅 Collection Reminders ▾
            </button>

            {showReminderMenu && (
              <div style={reminderDropdownMenu}>
                <button
                  type="button"
                  onClick={() => {
                    handleAddAllToGoogleCalendar();
                    setShowReminderMenu(false);
                  }}
                  style={reminderDropdownItem}
                >
                  📅 Add All to Google Calendar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDownloadAllIcs();
                    setShowReminderMenu(false);
                  }}
                  style={reminderDropdownItem}
                >
                  🗓️ Download All ICS
                </button>
              </div>
            )}
          </div>

          <AccountSummaryPrint
            deal={deal}
            payments={payments}
            promises={promises}
            totalPaid={totalPaid}
            balance={balance}
          />
        </div>
      </div>

      <div style={profileLayout}>
        <aside style={profileSidebar}>
          <div style={avatarCircle}>
            {getInitials(deal.customers?.customer_name)}
          </div>

          <h1 style={customerName}>
            {deal.customers?.customer_name || "Customer"}
          </h1>

          <p style={dealTagText}>Deal #{deal.deal_tag || "—"}</p>

          <div style={statusRow}>
            <span style={getDealStatusBadgeStyle(deal.status)}>
              {deal.status || "Active"}
            </span>
          </div>

          <div style={sidebarBalanceCard}>
            <span style={sidebarBalanceLabel}>Current Balance</span>
            <strong style={sidebarBalanceAmount}>{formatMoney(balance)}</strong>
          </div>

          <div style={sidebarDivider} />

          <InfoLine label="Phone" value={deal.customers?.phone || "—"} />
          <InfoLine label="Email" value={deal.customers?.email || "—"} />
          <InfoLine label="Address" value={deal.customers?.address || "—"} />

          <div style={sidebarDivider} />

          <InfoLine
            label="Truck"
            value={`${deal.year || ""} ${deal.truck || ""}`.trim() || "—"}
          />
          <InfoLine label="VIN" value={deal.vin || "—"} />

          <div style={infoLine}>
            <span style={infoLabel}>Deal Type</span>
            <DealTypeBadge dealType={deal.deal_type} />
          </div>

          <InfoLine label="Sub Type" value={deal.deal_subtype || "—"} />
        </aside>

        <main style={accountPanel}>
          <div style={accountHeader}>
            <div>
              <div style={eyebrow}>Customer Account</div>

              <h2 style={accountTitle}>
                {`${deal.year || ""} ${deal.truck || ""}`.trim() ||
                  "Truck Deal"}
              </h2>

              <div style={accountBadgeRow}>
                <DealTypeBadge dealType={deal.deal_type} />

                {deal.deal_subtype && (
                  <span style={subTypeBadge}>{deal.deal_subtype}</span>
                )}
              </div>

              <p style={accountDescription}>
                Payment activity, due schedule, promises, receipts, and account
                balance for this customer.
              </p>
            </div>

            {balance <= 0 ? (
              <div style={paidOffPill}>✅ PAID OFF</div>
            ) : (
              <div style={balancePill}>Balance Due: {formatMoney(balance)}</div>
            )}
          </div>

          <div style={progressCard}>
            <div style={progressTop}>
              <div>
                <span style={progressLabel}>Payment Progress</span>
                <strong style={progressPercent}>{paidPercent.toFixed(1)}%</strong>
              </div>

              <div style={progressAmounts}>
                <span>{formatMoney(totalPaid)} paid</span>
                <span>{formatMoney(totalAmount)} total</span>
              </div>
            </div>

            <div style={progressTrack}>
              <div style={{ ...progressFill, width: `${paidPercent}%` }} />
            </div>
          </div>

          <div style={metricGrid}>
            <MetricCard
              label="Total Amount"
              value={formatMoney(totalAmount)}
              tone="default"
            />

            <MetricCard
              label="Total Paid"
              value={formatMoney(totalPaid)}
              tone="success"
            />

            <MetricCard
              label="Balance"
              value={formatMoney(balance)}
              tone={balance > 0 ? "danger" : "success"}
            />

            <MetricCard
              label="Monthly Payment"
              value={formatMoney(deal.monthly_payment)}
              tone="info"
            />

            <MetricCard
              label="Pending Promises"
              value={pendingPromises.length}
              tone="warning"
            />

            <MetricCard
              label="Broken Promises"
              value={brokenPromises.length}
              tone="danger"
            />

            <MetricCard
              label="Open Promise Balance"
              value={formatMoney(activePromiseBalance)}
              tone="warning"
            />

            <MetricCard
              label="Payments Recorded"
              value={activePayments.length}
              tone="default"
            />
          </div>
        </main>
      </div>

      <div style={notesPanel}>
        <div style={notesHeader}>
          <div>
            <h2 style={sectionTitle}>Internal Deal Notes</h2>
            <p style={sectionDescription}>
              Internal comments, special terms, title notes, customer agreements,
              or dealership notes.
            </p>
          </div>
        </div>

        <div style={notesContent}>
          {deal.notes || "No internal notes added for this deal."}
        </div>
      </div>

      <div style={sectionStack}>
        <SectionShell
          label="Installment Schedule"
          title="Due Schedule"
          description="Review installment status, paid amounts, remaining balances, and promise activity."
        >
          <DueSchedule deal={deal} payments={activePayments} promises={promises} />
        </SectionShell>

        <SectionShell
          label="Payment Activity"
          title="Payment History"
          description="View customer payments, print receipts, and manage payment records."
        >
          <PaymentHistory
            payments={payments}
            onPaymentUpdated={loadCustomerDetail}
            openPaymentReceipt={openPaymentReceipt}
          />
        </SectionShell>

        <SectionShell
          label="Promise Tracking"
          title="Promise History"
          description="Track pending, broken, paid, partial, rescheduled, and cancelled promises."
        >
          <PromiseHistory
            promises={promises}
            onPromiseUpdated={loadCustomerDetail}
          />
        </SectionShell>
      </div>

      <PaymentReceipt receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function DealTypeBadge({ dealType }) {
  return (
    <span style={getDealTypeBadgeStyle(dealType)}>
      {dealType || "No Deal Type"}
    </span>
  );
}

function MetricCard({ label, value, tone = "default" }) {
  return (
    <div style={{ ...metricCard, ...getMetricToneStyle(tone) }}>
      <span style={metricLabel}>{label}</span>
      <strong style={metricValue}>{value}</strong>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div style={infoLine}>
      <span style={infoLabel}>{label}</span>
      <strong style={infoValue}>{value || "—"}</strong>
    </div>
  );
}

function SectionShell({ label, title, description, children }) {
  return (
    <section style={sectionShell}>
      <div style={sectionHeader}>
        <div>
          <div style={sectionLabel}>{label}</div>
          <h2 style={sectionTitle}>{title}</h2>
          <p style={sectionDescription}>{description}</p>
        </div>
      </div>

      <div style={sectionContent}>{children}</div>
    </section>
  );
}

function getInitials(name) {
  if (!name) return "RK";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getMetricToneStyle(tone) {
  if (tone === "danger") {
    return {
      borderColor: "#fecaca",
      background: "#fef2f2",
    };
  }

  if (tone === "success") {
    return {
      borderColor: "#bbf7d0",
      background: "#f0fdf4",
    };
  }

  if (tone === "warning") {
    return {
      borderColor: "#fde68a",
      background: "#fffbeb",
    };
  }

  if (tone === "info") {
    return {
      borderColor: "#bfdbfe",
      background: "#eff6ff",
    };
  }

  return {
    borderColor: "#e5e7eb",
    background: "#ffffff",
  };
}

function getDealTypeBadgeStyle(dealType) {
  const normalized = String(dealType || "").toLowerCase();

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    padding: "8px 13px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "13px",
    border: "1px solid transparent",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  };

  if (normalized.includes("in-house") || normalized.includes("inhouse")) {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  if (normalized.includes("down")) {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
      borderColor: "#bfdbfe",
    };
  }

  if (normalized.includes("borrow")) {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  if (normalized.includes("motor")) {
    return {
      ...base,
      background: "#ede9fe",
      color: "#6d28d9",
      borderColor: "#ddd6fe",
    };
  }

  if (normalized.includes("registration")) {
    return {
      ...base,
      background: "#ccfbf1",
      color: "#0f766e",
      borderColor: "#99f6e4",
    };
  }

  if (normalized.includes("cash")) {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#374151",
      borderColor: "#d1d5db",
    };
  }

  return {
    ...base,
    background: "#f8fafc",
    color: "#334155",
    borderColor: "#cbd5e1",
  };
}

function getDealStatusBadgeStyle(status) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "12px",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };

  if (status === "Paid Off") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  if (status === "Defaulted") {
    return {
      ...base,
      background: "#111827",
      color: "#ffffff",
      borderColor: "#111827",
    };
  }

  if (status === "Repo") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }

  if (status === "Closed") {
    return {
      ...base,
      background: "#e5e7eb",
      color: "#374151",
      borderColor: "#d1d5db",
    };
  }

  if (status === "Cancelled") {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#6b7280",
      borderColor: "#e5e7eb",
    };
  }

  return {
    ...base,
    background: "#dbeafe",
    color: "#1d4ed8",
    borderColor: "#bfdbfe",
  };
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
  display: "grid",
  gap: "18px",
};

const topNav = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  padding: "14px",
  marginBottom: "0",
  flexWrap: "wrap",
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

const backLink = {
  display: "inline-flex",
  alignItems: "center",
  color: "#0A1A2F",
  textDecoration: "none",
  fontWeight: "900",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "9px 13px",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
};

const topActions = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const editButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0A1A2F",
  color: "white",
  padding: "10px 14px",
  borderRadius: "999px",
  textDecoration: "none",
  fontWeight: "900",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.18)",
};

const reminderDropdownWrapper = {
  position: "relative",
  display: "inline-block",
};

const reminderDropdownButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "900",
  boxShadow: "0 6px 16px rgba(37, 99, 235, 0.22)",
};

const reminderDropdownMenu = {
  position: "absolute",
  top: "46px",
  right: 0,
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
  minWidth: "250px",
  zIndex: 20,
  overflow: "hidden",
};

const reminderDropdownItem = {
  width: "100%",
  background: "white",
  border: "none",
  padding: "13px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: "800",
  color: "#374151",
};

const profileLayout = {
  display: "grid",
  gridTemplateColumns: "340px minmax(0, 1fr)",
  gap: "18px",
  alignItems: "start",
};

const profileSidebar = {
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid #e5e7eb",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  position: "sticky",
  top: "88px",
};

const avatarCircle = {
  width: "78px",
  height: "78px",
  borderRadius: "24px",
  background: "linear-gradient(135deg, #0A1A2F 0%, #1d4ed8 100%)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "25px",
  fontWeight: "900",
  marginBottom: "16px",
  boxShadow: "0 12px 24px rgba(29, 78, 216, 0.25)",
};

const customerName = {
  margin: 0,
  color: "#111827",
  fontSize: "24px",
  lineHeight: "1.2",
};

const dealTagText = {
  margin: "8px 0 0",
  color: "#667085",
  fontWeight: "800",
};

const statusRow = {
  display: "flex",
  marginTop: "14px",
};

const sidebarBalanceCard = {
  marginTop: "16px",
  background: "#0A1A2F",
  color: "white",
  borderRadius: "18px",
  padding: "15px",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.18)",
};

const sidebarBalanceLabel = {
  display: "block",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "6px",
};

const sidebarBalanceAmount = {
  fontSize: "24px",
  fontWeight: "900",
};

const sidebarDivider = {
  height: "1px",
  background: "#e5e7eb",
  margin: "18px 0",
};

const infoLine = {
  display: "grid",
  gap: "4px",
  marginBottom: "12px",
};

const infoLabel = {
  color: "#667085",
  fontSize: "12px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const infoValue = {
  color: "#111827",
  fontSize: "14px",
  lineHeight: "1.35",
  wordBreak: "break-word",
};

const accountPanel = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #102A4C 55%, #1d4ed8 100%)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.20)",
  minWidth: 0,
  color: "white",
};

const accountHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const eyebrow = {
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "8px",
};

const accountTitle = {
  margin: 0,
  color: "white",
  fontSize: "30px",
  lineHeight: "1.15",
};

const accountBadgeRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "10px",
};

const subTypeBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
  padding: "8px 13px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "13px",
  background: "#f8fafc",
  color: "#475569",
  border: "1px solid #e2e8f0",
};

const accountDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#dbeafe",
  lineHeight: "1.5",
  maxWidth: "760px",
};

const paidOffPill = {
  background: "#16a34a",
  color: "white",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "13px",
  boxShadow: "0 8px 20px rgba(22, 163, 74, 0.25)",
};

const balancePill = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "13px",
  boxShadow: "0 8px 20px rgba(153, 27, 27, 0.18)",
};

const progressCard = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.20)",
  borderRadius: "18px",
  padding: "16px",
  marginBottom: "16px",
  backdropFilter: "blur(10px)",
};

const progressTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  marginBottom: "12px",
  flexWrap: "wrap",
};

const progressLabel = {
  display: "block",
  color: "#bfdbfe",
  fontSize: "13px",
  fontWeight: "800",
  marginBottom: "4px",
};

const progressPercent = {
  color: "white",
  fontSize: "26px",
};

const progressAmounts = {
  display: "grid",
  gap: "4px",
  textAlign: "right",
  color: "#dbeafe",
  fontWeight: "800",
  fontSize: "13px",
};

const progressTrack = {
  height: "13px",
  background: "rgba(255,255,255,0.20)",
  borderRadius: "999px",
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  background: "linear-gradient(90deg, #22c55e, #a7f3d0)",
  borderRadius: "999px",
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
  gap: "12px",
};

const metricCard = {
  border: "1px solid rgba(255,255,255,0.20)",
  borderRadius: "16px",
  padding: "15px",
  display: "grid",
  gap: "7px",
  background: "rgba(255,255,255,0.96)",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.10)",
};

const metricLabel = {
  color: "#667085",
  fontSize: "12px",
  fontWeight: "800",
};

const metricValue = {
  color: "#111827",
  fontSize: "17px",
  wordBreak: "break-word",
};

const notesPanel = {
  background: "linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)",
  border: "1px solid #fde68a",
  borderRadius: "22px",
  padding: "18px",
  marginTop: "0",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.07)",
};

const notesHeader = {
  marginBottom: "12px",
};

const notesContent = {
  background: "#ffffff",
  padding: "15px",
  borderRadius: "14px",
  border: "1px solid #fed7aa",
  whiteSpace: "pre-wrap",
  color: "#78350f",
  lineHeight: "1.5",
  wordBreak: "break-word",
};

const sectionStack = {
  display: "grid",
  gap: "20px",
  marginTop: "0",
};

const sectionShell = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "18px",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.07)",
  maxWidth: "100%",
  overflow: "hidden",
  boxSizing: "border-box",
};

const sectionHeader = {
  marginBottom: "14px",
};

const sectionLabel = {
  color: "#2563eb",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "6px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
};

const sectionDescription = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#667085",
  fontSize: "14px",
  lineHeight: "1.45",
};

const sectionContent = {
  maxWidth: "100%",
  overflow: "hidden",
};

const loadingCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "28px",
  textAlign: "center",
  color: "#111827",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
};

const loadingIcon = {
  fontSize: "34px",
  marginBottom: "10px",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "13px",
  borderRadius: "12px",
  marginTop: "15px",
  fontWeight: "bold",
};

export default CustomerDetail;