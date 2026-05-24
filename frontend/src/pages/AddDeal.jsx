import { Link } from "react-router-dom";
import DealForm from "../components/DealForm";

function AddDeal() {
  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Create New Record</div>
          <h1 style={pageTitle}>Add Customer / Deal</h1>
          <p style={pageDescription}>
            Create a new customer profile, deal record, and payment schedule in
            RK PayTrack.
          </p>
        </div>

        <div style={heroActions}>
          <Link to="/deals" style={backButton}>
            ← Back to Deals
          </Link>
        </div>
      </div>

      <div style={infoGrid}>
        <InfoCard
          icon="👤"
          title="Customer Details"
          description="Enter customer name, phone, email, and address."
        />

        <InfoCard
          icon="🚚"
          title="Truck Information"
          description="Add truck year, make/model, VIN, and deal details."
        />

        <InfoCard
          icon="💰"
          title="Payment Schedule"
          description="Set total amount, monthly payment, due day, term, and maturity."
        />
      </div>

      <div style={formCard}>
        <div style={formHeader}>
          <div>
            <h2 style={sectionTitle}>New Deal Form</h2>
            <p style={sectionDescription}>
              Complete the form carefully. This information will be used for
              schedules, payments, promises, receipts, and reports.
            </p>
          </div>

          <span style={requiredBadge}>Required fields</span>
        </div>

        <DealForm />
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

const backButton = {
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
  maxWidth: "760px",
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

export default AddDeal;