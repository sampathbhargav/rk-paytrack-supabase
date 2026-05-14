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

function CustomerDetail() {
  const { dealId } = useParams();

  const [deal, setDeal] = useState(null);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);
  const [error, setError] = useState("");

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
      <div>
        <Link to="/deals">← Back to Deals</Link>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (!deal) {
    return <p>Loading customer detail...</p>;
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

  return (
    <div>
      <div style={topActionBar}>
      <Link to="/deals" style={{ color: "#0A1A2F", textDecoration: "none" }}>
        ← Back to Deals
      </Link>

      <div style={rightActions}>
        <Link
          to={`/deals/${dealId}/edit`}
          style={editButtonStyle}
        >
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
      <h1>
        {deal.deal_tag} - {deal.customers?.customer_name}
      </h1>

      {balance <= 0 && (
        <div style={paidOffBadge}>
          PAID OFF
        </div>
      )}

      <p>Customer deal, payment history, promises, and balance.</p>

      <div style={cardGrid}>
        <Card title="Customer" value={deal.customers?.customer_name || "—"} />
        <Card title="Phone" value={deal.customers?.phone || "—"} />
        <Card title="Deal Type" value={deal.deal_type || "—"} />
        <Card title="Sub Type" value={deal.deal_subtype || "—"} />
        <Card title="Truck" value={`${deal.year || ""} ${deal.truck || ""}`} />
        <Card title="VIN" value={deal.vin || "—"} />
        <Card title="Deal Status" value={deal.status || "—"} />
        <Card title="Total Amount" value={formatMoney(totalAmount)} />
        <Card title="Total Paid" value={formatMoney(totalPaid)} />
        <Card title="Balance" value={formatMoney(balance)} />
        <Card title="Monthly Payment" value={formatMoney(deal.monthly_payment)} />
        <Card title="Pending Promises" value={pendingPromises.length} />
        <Card title="Broken Promises" value={brokenPromises.length} />
      </div>

      <div style={notesBox}>
        <h2>Deal Notes</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>
          {deal.notes || "No notes added."}
        </p>
      </div>

      <DueSchedule deal={deal} payments={activePayments} promises={promises} />

      <PaymentHistory
        payments={payments}
        onPaymentUpdated={loadCustomerDetail}
      />

      <PromiseHistory
        promises={promises}
        onPromiseUpdated={loadCustomerDetail}
      />
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, color: "#667085" }}>{title}</p>
      <h3 style={{ marginTop: "10px" }}>{value}</h3>
    </div>
  );
}

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginTop: "25px",
};

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const notesBox = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginTop: "25px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const paidOffBadge = {
  display: "inline-block",
  background: "#16a34a",
  color: "white",
  padding: "10px 18px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "16px",
  marginBottom: "15px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
};

const topActionBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const rightActions = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const editButtonStyle = {
  display: "inline-block",
  background: "#0A1A2F",
  color: "white",
  padding: "8px 12px",
  borderRadius: "8px",
  textDecoration: "none",
};

export default CustomerDetail;