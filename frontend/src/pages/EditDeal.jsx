import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getDealById, updateDeal } from "../api/dealsApi";
import { updateCustomer } from "../api/customersApi";

function EditDeal() {
  const { dealId } = useParams();
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState("");
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    dealTag: "",
    dealType: "In-house",
    dealSubtype: "",
    startDate: "",
    truck: "",
    year: "",
    vin: "",
    totalAmount: "",
    monthlyPayment: "",
    dueDay: "",
    term: "",
    maturityDate: "",
    status: "Active",
    notes: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDeal();
  }, [dealId]);

  const loadDeal = async () => {
    try {
      const deal = await getDealById(dealId);

      setCustomerId(deal.customer_id);

      setFormData({
        customerName: deal.customers?.customer_name || "",
        phone: deal.customers?.phone || "",
        email: deal.customers?.email || "",
        address: deal.customers?.address || "",
        dealTag: deal.deal_tag || "",
        dealType: deal.deal_type || "In-house",
        dealSubtype: deal.deal_subtype || "",
        startDate: deal.start_date || "",
        truck: deal.truck || "",
        year: deal.year || "",
        vin: deal.vin || "",
        totalAmount: deal.total_amount || "",
        monthlyPayment: deal.monthly_payment || "",
        dueDay: deal.due_day || "",
        term: deal.term || "",
        maturityDate: deal.maturity_date || "",
        status: deal.status || "Active",
        notes: deal.notes || "",
      });
    } catch (error) {
      setMessage(`Failed to load deal: ${error.message}`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "dealType" && value !== "In-house") {
        updated.dealSubtype = "";
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const scheduleChangingFields = [
      "totalAmount",
      "monthlyPayment",
      "term",
      "dueDay",
      "startDate",
    ];
    
    const confirmed = window.confirm(
      "Are you sure you want to save these changes? If you changed total amount, monthly payment, term, due day, or start date, this may affect the payment schedule and balance."
    );
    
    if (!confirmed) return;

    try {
      await updateCustomer(customerId, {
        customerName: formData.customerName,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
      });

      await updateDeal(dealId, {
        dealTag: formData.dealTag,
        dealType: formData.dealType,
        dealSubtype: formData.dealSubtype,
        startDate: formData.startDate,
        truck: formData.truck,
        year: formData.year,
        vin: formData.vin,
        totalAmount: formData.totalAmount,
        monthlyPayment: formData.monthlyPayment,
        dueDay: formData.dueDay,
        term: formData.term,
        maturityDate: formData.maturityDate,
        status: formData.status,
        notes: formData.notes,
      });

      setMessage("Deal updated successfully.");

      setTimeout(() => {
        navigate(`/deals/${dealId}`);
      }, 700);
    } catch (error) {
      setMessage(`Failed to update deal: ${error.message}`);
    }
  };

  return (
    <div>
      <Link to={`/deals/${dealId}`} style={{ color: "#0A1A2F" }}>
        ← Back to Customer
      </Link>

      <h1>Edit Deal</h1>
      <p>Update customer and deal information.</p>

      <form onSubmit={handleSubmit} style={formStyle}>
        <h2>Customer Information</h2>

        <div style={grid}>
          <Input
            label="Customer Name"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            required
          />

          <Input
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />

          <Input
            label="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />

          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <h2 style={{ marginTop: "30px" }}>Deal Information</h2>

        <div style={grid}>
          <Input
            label="Deal Tag"
            name="dealTag"
            value={formData.dealTag}
            onChange={handleChange}
            required
          />

          <div>
            <label>Deal Type</label>
            <select
              name="dealType"
              value={formData.dealType}
              onChange={handleChange}
              style={inputStyle}
            >
              <option>In-house</option>
              <option>Down Finance</option>
              <option>Borrow Money</option>
              <option>Motor Finance</option>
              <option>Cash</option>
            </select>
          </div>

          {formData.dealType === "In-house" && (
            <div>
              <label>Deal Sub Type</label>
              <select
                name="dealSubtype"
                value={formData.dealSubtype}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="">Select Sub Type</option>
                <option>Regular</option>
                <option>Apportioned</option>
                <option>Combination</option>
              </select>
            </div>
          )}

          <Input
            label="Start Date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
          />

          <Input
            label="Truck"
            name="truck"
            value={formData.truck}
            onChange={handleChange}
          />

          <Input
            label="Year"
            name="year"
            value={formData.year}
            onChange={handleChange}
          />

          <Input
            label="VIN"
            name="vin"
            value={formData.vin}
            onChange={handleChange}
          />

          <Input
            label="Total Amount"
            name="totalAmount"
            type="number"
            value={formData.totalAmount}
            onChange={handleChange}
          />

          <Input
            label="Monthly Payment"
            name="monthlyPayment"
            type="number"
            value={formData.monthlyPayment}
            onChange={handleChange}
          />

          <Input
            label="Due Day"
            name="dueDay"
            type="number"
            value={formData.dueDay}
            onChange={handleChange}
          />

          <Input
            label="Term"
            name="term"
            type="number"
            value={formData.term}
            onChange={handleChange}
          />

          <Input
            label="Maturity Date"
            name="maturityDate"
            type="date"
            value={formData.maturityDate}
            onChange={handleChange}
          />

          <div>
            <label>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              style={inputStyle}
            >
              <option>Active</option>
              <option>Paid Off</option>
              <option>Closed</option>
              <option>Repo</option>
              <option>Cancelled</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          <label>Deal Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            style={{
              ...inputStyle,
              height: "120px",
              resize: "vertical",
            }}
          />
        </div>

        <button type="submit" style={buttonStyle}>
          Save Changes
        </button>

        {message && <p>{message}</p>}
      </form>
    </div>
  );
}

function Input({ label, name, value, onChange, type = "text", required }) {
  return (
    <div>
      <label>{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        style={inputStyle}
      />
    </div>
  );
}

const formStyle = {
  background: "white",
  padding: "25px",
  borderRadius: "12px",
  maxWidth: "900px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "15px",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginTop: "6px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const buttonStyle = {
  marginTop: "25px",
  background: "#0A1A2F",
  color: "white",
  padding: "12px 20px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

export default EditDeal;