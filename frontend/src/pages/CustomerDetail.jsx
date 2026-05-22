import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDealById } from "../api/dealsApi";
import {
  getPaymentsByDealId,
  updateDealPaidOffStatus,
} from "../api/paymentsApi";
import { getPromisesByDealId, updateBrokenPromises } from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";
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
      setPayments(paymentsData);
      setPromises(promisesData);
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
        <p>Loading customer detail...</p>
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

  const pendingPromises = promises.filter(
    (promise) => promise.promise_status === "Pending"
  );

  const brokenPromises = promises.filter(
    (promise) => promise.promise_status === "Broken"
  );

  const openPaymentReceipt = (payment) => {
  const activePayments = payments.filter(
    (p) => p.payment_status !== "Voided"
  );

  const totalPaid = activePayments.reduce(
    (sum, p) => sum + Number(p.amount_paid || 0),
    0
  );

  const totalAmount = Number(deal.total_amount || 0);
  const remainingBalance = Math.max(totalAmount - totalPaid, 0);

  setReceipt({
    paymentId: payment.id,
    customerName: deal.customers?.customer_name || "",
    phone: deal.customers?.phone || "",
    dealTag: deal.deal_tag || "",
    dealType: deal.deal_type || "",
    truck: `${deal.year || ""} ${deal.truck || ""}`,
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

  return (
    <div style={pageWrapper}>
      <div style={topActionBar}>
        <Link to="/deals" style={backLink}>
          ← Back to Deals
        </Link>

        <div style={rightActions}>
          <Link to={`/deals/${dealId}/edit`} style={editButtonStyle}>
            Edit Deal
          </Link>

          <AccountSummaryPrint
            deal={deal}
            payments={payments}
            promises={promises}
            totalPaid={totalPaid}
            balance={balance}
          />
        </div>
      </div>

      <div style={customerHeader}>
        <div>
          <h1 style={pageTitle}>
            {deal.deal_tag} - {deal.customers?.customer_name}
          </h1>

          <p style={pageDescription}>
            Customer deal, payment history, promises, due schedule, and balance.
          </p>

          <div style={headerBadges}>
            <span style={getDealStatusBadgeStyle(deal.status)}>
              {deal.status || "Active"}
            </span>

            {balance <= 0 ? (
              <span style={paidOffBadge}>PAID OFF</span>
            ) : (
              <span style={balanceBadge}>
                Balance Due: {formatMoney(balance)}
              </span>
            )}
          </div>
        </div>

        <div style={quickInfoBox}>
          <div>
            <span style={quickInfoLabel}>Phone</span>
            <strong>{deal.customers?.phone || "—"}</strong>
          </div>

          <div>
            <span style={quickInfoLabel}>Truck</span>
            <strong>
              {deal.year || ""} {deal.truck || "—"}
            </strong>
          </div>

          <div>
            <span style={quickInfoLabel}>Deal Tag</span>
            <strong>{deal.deal_tag || "—"}</strong>
          </div>
        </div>
      </div>

      <div style={cardGrid}>
        <Card title="Customer" value={deal.customers?.customer_name || "—"} />
        <Card title="Phone" value={deal.customers?.phone || "—"} />
        <Card title="Deal Type" value={deal.deal_type || "—"} />
        <Card title="Sub Type" value={deal.deal_subtype || "—"} />
        <Card title="Truck" value={`${deal.year || ""} ${deal.truck || ""}`} />
        <Card title="VIN" value={deal.vin || "—"} />
        <Card title="Deal Status" value={deal.status || "Active"} />
        <Card title="Total Amount" value={formatMoney(totalAmount)} />
        <Card title="Total Paid" value={formatMoney(totalPaid)} />
        <Card title="Balance" value={formatMoney(balance)} />
        <Card title="Monthly Payment" value={formatMoney(deal.monthly_payment)} />
        <Card title="Pending Promises" value={pendingPromises.length} />
        <Card title="Broken Promises" value={brokenPromises.length} />
      </div>

      <div style={notesBox}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Internal Deal Notes</h2>
          <p style={sectionDescription}>
            Internal comments, special deal terms, title notes, customer
            agreements, or other dealership notes.
          </p>
        </div>

        <div style={notesContent}>
          {deal.notes || "No internal notes added for this deal."}
        </div>
      </div>

      <div style={sectionBox}>
        <DueSchedule deal={deal} payments={activePayments} promises={promises} />
      </div>

      <div style={sectionBox}>
        <PaymentHistory
          payments={payments}
          onPaymentUpdated={loadCustomerDetail}
          openPaymentReceipt={openPaymentReceipt}
        />
      </div>

      <div style={sectionBox}>
        <PromiseHistory
          promises={promises}
          onPromiseUpdated={loadCustomerDetail}
        />
      </div>
      <PaymentReceipt receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, color: "#667085", fontSize: "13px" }}>{title}</p>
      <h3 style={{ marginTop: "8px", marginBottom: 0, fontSize: "18px" }}>
        {value}
      </h3>
    </div>
  );
}

function getDealStatusBadgeStyle(status) {
  const base = {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px",
  };

  if (status === "Paid Off") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "Defaulted") {
    return {
      ...base,
      background: "#111827",
      color: "#ffffff",
    };
  }

  if (status === "Repo") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (status === "Closed") {
    return {
      ...base,
      background: "#e5e7eb",
      color: "#374151",
    };
  }

  if (status === "Cancelled") {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#6b7280",
    };
  }

  return {
    ...base,
    background: "#dbeafe",
    color: "#1d4ed8",
  };
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const topActionBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  marginBottom: "20px",
  flexWrap: "wrap",
};

const backLink = {
  color: "#0A1A2F",
  textDecoration: "none",
  fontWeight: "bold",
};

const rightActions = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const editButtonStyle = {
  display: "inline-block",
  background: "#0A1A2F",
  color: "white",
  padding: "8px 12px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "bold",
};

const customerHeader = {
  background: "white",
  padding: "22px",
  borderRadius: "14px",
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  flexWrap: "wrap",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const pageTitle = {
  margin: 0,
  color: "#111827",
};

const pageDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#667085",
};

const headerBadges = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const paidOffBadge = {
  display: "inline-block",
  background: "#16a34a",
  color: "white",
  padding: "7px 12px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const balanceBadge = {
  display: "inline-block",
  background: "#fee2e2",
  color: "#991b1b",
  padding: "7px 12px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const quickInfoBox = {
  minWidth: "240px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "14px",
  display: "grid",
  gap: "10px",
};

const quickInfoLabel = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  marginBottom: "4px",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginTop: "20px",
};

const cardStyle = {
  background: "white",
  padding: "16px",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  minWidth: 0,
};

const notesBox = {
  background: "#fffbeb",
  padding: "18px",
  borderRadius: "12px",
  marginTop: "22px",
  border: "1px solid #fde68a",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const notesContent = {
  background: "#fff7ed",
  padding: "15px",
  borderRadius: "10px",
  border: "1px solid #fed7aa",
  whiteSpace: "pre-wrap",
  color: "#78350f",
  lineHeight: "1.5",
  wordBreak: "break-word",
};

const sectionBox = {
  marginTop: "22px",
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const sectionHeader = {
  marginBottom: "14px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
};

const sectionDescription = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#667085",
  fontSize: "14px",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "12px",
  borderRadius: "10px",
  marginTop: "15px",
  fontWeight: "bold",
};

export default CustomerDetail;