import { useState } from "react";
import { createCustomer } from "../api/customersApi";
import { createDeal } from "../api/dealsApi";

function DealForm() {
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
        notes: "",
      });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const customer = await createCustomer({
        customerName: formData.customerName,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
      });

      await createDeal({
        customerId: customer.id,
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
        notes: formData.notes,
      });

      setMessage("Customer and deal created successfully.");

      setFormData({
        customerName: "",
        phone: "",
        email: "",
        address: "",
        dealTag: "",
        truck: "",
        year: "",
        vin: "",
        totalAmount: "",
        monthlyPayment: "",
        dueDay: "",
        term: "",
        maturityDate: "",
        dealType: "In-house",
        startDate: "",
        notes: "",
      });
    } catch (error) {
      setMessage(`Failed to create deal: ${error.message}`);
    }
  };

  return (
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
      </div>

      <div style={{ marginTop: "20px" }}>
        <label>Deal Notes</label>
        <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Example: Customer promised extra payment, title issue, special agreement, down payment details..."
            style={{
            ...inputStyle,
            height: "100px",
            resize: "vertical",
            }}
        />
        </div>

      <button type="submit" style={buttonStyle}>
        Create Deal
      </button>

      {message && <p>{message}</p>}
    </form>
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
  maxWidth: "850px",
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

export default DealForm;