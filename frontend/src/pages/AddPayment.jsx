import { Link } from "react-router-dom";
import PaymentForm from "../components/PaymentForm";

function AddPayment() {
  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Payment Entry</div>
          <h1 style={pageTitle}>Add Payment</h1>
          <p style={pageDescription}>
            Record full payments, partial payments, deferred payments, and
            customer installment activity in RK PayTrack.
          </p>
        </div>

        <div style={heroActions}>
          <Link to="/due-payments" style={secondaryButton}>
            View Due Payments
          </Link>

          <Link to="/deals" style={primaryButton}>
            Back to Deals
          </Link>
        </div>
      </div>

      <div style={infoGrid}>
        <InfoCard
          icon="💵"
          title="Full Payment"
          description="Use this when the customer pays the complete installment amount."
        />

        <InfoCard
          icon="🧾"
          title="Partial Payment"
          description="Record smaller payments and keep the remaining balance open."
        />

        <InfoCard
          icon="📅"
          title="Deferred Payment"
          description="Track payment changes when the customer needs more time."
        />
      </div>

      <div style={formCard}>
        <div style={formHeader}>
          <div>
            <h2 style={sectionTitle}>Payment Form</h2>
            <p style={sectionDescription}>
              Select the customer deal, choose the installment, enter payment
              details, and save the transaction. This will update the due
              schedule, receipts, reports, and customer balance.
            </p>
          </div>

          <span style={requiredBadge}>Verify before saving</span>
        </div>

        <PaymentForm />
      </div>
    </div>
  );
}

function InfoCard({ icon, title, description }) {
  return (
    <div style={infoCard}>
      <div style={infoIcon}>{icon}</div>
      <div>
        <h3 style={infoTitle}>{title}</h3>
        <p style={infoDescription}>{description}</p>
      </div>
    </div>
  );
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const heroCard = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #102A4C 55%, #1d4ed8 100%)",
  borderRadius: "18px",
  padding: "24px",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  boxShadow: "0 14px 35px rgba(15, 23, 42, 0.22)",
  marginBottom: "18px",
};

const eyebrow = {
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#bfdbfe",
  marginBottom: "8px",
};

const pageTitle = {
  margin: 0,
  fontSize: "30px",
  lineHeight: "1.1",
  color: "white",
};

const pageDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#dbeafe",
  maxWidth: "720px",
  lineHeight: "1.5",
};

const heroActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const primaryButton = {
  background: "white",
  color: "#0A1A2F",
  border: "none",
  borderRadius: "12px",
  padding: "11px 15px",
  cursor: "pointer",
  fontWeight: "900",
  textDecoration: "none",
  boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
};

const secondaryButton = {
  background: "rgba(255,255,255,0.12)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: "12px",
  padding: "11px 15px",
  cursor: "pointer",
  fontWeight: "900",
  textDecoration: "none",
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const infoCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "16px",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.07)",
};

const infoIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "21px",
  flexShrink: 0,
};

const infoTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "16px",
};

const infoDescription = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "13px",
  lineHeight: "1.45",
};

const formCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "18px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
  maxWidth: "100%",
  overflow: "hidden",
  boxSizing: "border-box",
};

const formHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap",
  paddingBottom: "14px",
  marginBottom: "16px",
  borderBottom: "1px solid #e5e7eb",
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
  maxWidth: "780px",
};

const requiredBadge = {
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fde68a",
  borderRadius: "999px",
  padding: "7px 11px",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

export default AddPayment;