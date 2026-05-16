import DealForm from "../components/DealForm";

function AddDeal() {
  return (
    <div style={pageWrapper}>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>Add Customer / Deal</h1>
          <p style={pageDescription}>
            Create a new customer, deal record, and payment schedule.
          </p>
        </div>
      </div>

      <DealForm />
    </div>
  );
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const pageHeader = {
  background: "white",
  padding: "20px",
  borderRadius: "14px",
  marginBottom: "20px",
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

export default AddDeal;