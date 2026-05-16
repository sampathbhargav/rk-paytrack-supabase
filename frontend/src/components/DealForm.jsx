import { useState } from "react";
import { createCustomer } from "../api/customersApi";
import { createDeal, checkDealTagExists } from "../api/dealsApi";
import {
  getDueDayFromStartDate,
  calculateMaturityDate,
} from "../utils/dealDateUtils";

const initialFormData = {
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
};

function DealForm() {
  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isCashDeal = formData.dealType === "Cash";
  const isInHouseDeal = formData.dealType === "In-house";

  const isRegistrationMoneyDeal = formData.dealType === "Registration Money";
  const isOneTimeScheduledDeal = isRegistrationMoneyDeal;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setMessage("");
    setMessageType("");

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "dealType") {
        if (value !== "In-house") {
          updated.dealSubtype = "";
        }
      
        if (value === "Cash") {
          updated.monthlyPayment = "";
          updated.dueDay = "";
          updated.term = "";
          updated.maturityDate = "";
        }
      
        if (value === "Registration Money") {
          updated.term = "1";
      
          if (updated.totalAmount) {
            updated.monthlyPayment = updated.totalAmount;
          }
      
          if (updated.startDate) {
            const dueDay = getDueDayFromStartDate(updated.startDate);
            updated.dueDay = dueDay;
            updated.maturityDate = updated.startDate;
          }
        }
      }

      if (name === "totalAmount" && updated.dealType === "Registration Money") {
        updated.monthlyPayment = value;
        updated.term = "1";
      }
      
      if (name === "startDate" && value && updated.dealType === "Registration Money") {
        const dueDay = getDueDayFromStartDate(value);
        updated.dueDay = dueDay;
        updated.term = "1";
        updated.maturityDate = value;
      }

      if (name === "startDate" && value && updated.dealType !== "Cash") {
        const dueDay = getDueDayFromStartDate(value);
        updated.dueDay = dueDay;

        if (updated.term) {
          updated.maturityDate = calculateMaturityDate(
            value,
            dueDay,
            updated.term
          );
        }
      }

      if (name === "term" && updated.dealType !== "Cash") {
        updated.maturityDate = calculateMaturityDate(
          updated.startDate,
          updated.dueDay,
          value
        );
      }

      if (name === "dueDay" && updated.dealType !== "Cash") {
        updated.maturityDate = calculateMaturityDate(
          updated.startDate,
          value,
          updated.term
        );
      }

      return updated;
    });
  };

  const cleanFormData = () => {
    return {
      ...formData,
      customerName: formData.customerName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      dealTag: formData.dealTag.trim(),
      truck: formData.truck.trim(),
      year: formData.year.trim(),
      vin: formData.vin.trim().toUpperCase(),
      notes: formData.notes.trim(),
    };
  };

  const validateDealForm = () => {
    const data = cleanFormData();

    if (!data.customerName) {
      return "Customer name is required.";
    }

    if (!data.dealTag) {
      return "Deal tag is required.";
    }

    if (!data.dealType) {
      return "Deal type is required.";
    }

    if (data.dealType === "In-house" && !data.dealSubtype) {
      return "Deal sub type is required for In-house deals.";
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return "Please enter a valid email address.";
    }

    if (data.year && !/^\d{4}$/.test(data.year)) {
      return "Year must be a 4-digit year, for example 2022.";
    }

    if (data.vin && data.vin.length > 17) {
      return "VIN cannot be more than 17 characters.";
    }

    if (!data.totalAmount || Number(data.totalAmount) <= 0) {
      return "Total amount must be greater than 0.";
    }

    if (data.dealType === "Registration Money") {
      if (!data.startDate) {
        return "Tentative due date is required for Registration Money deals.";
      }
    
      if (!data.totalAmount || Number(data.totalAmount) <= 0) {
        return "Registration money amount must be greater than 0.";
      }
    
      return "";
    }

    if (data.dealType !== "Cash") {
      if (!data.startDate) {
        return "Start date is required for payment deals.";
      }

      if (!data.monthlyPayment || Number(data.monthlyPayment) <= 0) {
        return "Monthly payment must be greater than 0.";
      }

      if (!data.dueDay || Number(data.dueDay) <= 0) {
        return "Due day is required.";
      }

      if (Number(data.dueDay) < 1 || Number(data.dueDay) > 31) {
        return "Due day must be between 1 and 31.";
      }

      if (!data.term || Number(data.term) <= 0) {
        return "Term must be greater than 0.";
      }

      if (!Number.isInteger(Number(data.term))) {
        return "Term must be a whole number.";
      }

      if (!data.maturityDate) {
        return "Maturity date is required.";
      }
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    const validationError = validateDealForm();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      return;
    }

    const data = cleanFormData();

    const confirmed = window.confirm(
      "Are you sure you want to create this customer and deal?"
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);

      const existingDeal = await checkDealTagExists(data.dealTag);

      if (existingDeal) {
        setMessage(`Deal tag ${data.dealTag} already exists.`);
        setMessageType("error");
        return;
      }

      const customer = await createCustomer({
        customerName: data.customerName,
        phone: data.phone,
        email: data.email,
        address: data.address,
      });

      await createDeal({
        customerId: customer.id,
        dealTag: data.dealTag,
        dealType: data.dealType,
        dealSubtype: data.dealType === "In-house" ? data.dealSubtype : null,
        startDate: data.startDate || null,
        truck: data.truck,
        year: data.year,
        vin: data.vin,
        totalAmount: Number(data.totalAmount || 0),
        monthlyPayment:
        data.dealType === "Cash"
          ? 0
          : data.dealType === "Registration Money"
          ? Number(data.totalAmount || 0)
          : Number(data.monthlyPayment || 0),

      dueDay:
        data.dealType === "Cash" ? null : Number(data.dueDay || 0),

      term:
        data.dealType === "Cash"
          ? null
          : data.dealType === "Registration Money"
          ? 1
          : Number(data.term || 0),

      maturityDate:
        data.dealType === "Cash"
          ? null
          : data.dealType === "Registration Money"
          ? data.startDate
          : data.maturityDate,
        notes: data.notes,
      });

      setMessage("Customer and deal created successfully.");
      setMessageType("success");
      setFormData(initialFormData);
    } catch (error) {
      setMessage(`Failed to create deal: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={formHeader}>
        <div>
          <h2 style={formTitle}>Deal Entry Form</h2>
          <p style={formDescription}>
            Enter customer details, deal information, and payment schedule setup.
          </p>
        </div>

        <div style={dealTypeBadge}>{formData.dealType}</div>
      </div>

      {message && (
        <div
          style={{
            ...messageBox,
            ...(messageType === "success" ? successMessage : errorMessage),
          }}
        >
          {message}
        </div>
      )}

      <Section
        title="Customer Information"
        description="Basic customer contact details used for payment follow-up."
      >
        <div style={grid}>
          <Input
            label="Customer Name"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            required
            placeholder="Example: Rohit Kapoor"
          />

          <Input
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Example: 1234567890"
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="customer@email.com"
          />

          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Customer address"
          />
        </div>
      </Section>

      <Section
        title="Deal Information"
        description="Deal type, truck information, amount, and financing details."
      >
        <div style={grid}>
          <Input
            label="Deal Tag"
            name="dealTag"
            value={formData.dealTag}
            onChange={handleChange}
            required
            placeholder="Example: 1723"
          />

          <Select
            label="Deal Type"
            name="dealType"
            value={formData.dealType}
            onChange={handleChange}
            options={[
              "In-house",
              "Down Finance",
              "Borrow Money",
              "Motor Finance",
              "Registration Money",
              "Cash",
            ]}
            required
          />

          {isInHouseDeal && (
            <Select
              label="Deal Sub Type"
              name="dealSubtype"
              value={formData.dealSubtype}
              onChange={handleChange}
              options={["Regular", "Apportioned", "Combination"]}
              placeholder="Select Sub Type"
              required
            />
          )}

          <Input
            label="Truck"
            name="truck"
            value={formData.truck}
            onChange={handleChange}
            placeholder="Example: FREIGHTLINER"
          />

          <Input
            label="Year"
            name="year"
            value={formData.year}
            onChange={handleChange}
            placeholder="Example: 2022"
            maxLength={4}
          />

          <Input
            label="VIN"
            name="vin"
            value={formData.vin}
            onChange={handleChange}
            placeholder="VIN"
            maxLength={17}
          />

          <Input
            label="Total Amount"
            name="totalAmount"
            type="number"
            value={formData.totalAmount}
            onChange={handleChange}
            required
            placeholder="Example: 25000"
            helperText="Total financed or deal amount."
          />
        </div>
      </Section>

      <Section
        title="Payment Schedule"
        description={
          isCashDeal
            ? "Cash deals do not require a monthly schedule."
            : "Schedule is calculated from start date, due day, term, and monthly payment."
        }
      >
        {isCashDeal && (
          <div style={infoBox}>
            Cash deal selected. Monthly payment, due day, term, and maturity date
            are not required.
          </div>
        )}

        <div style={grid}>
          <Input
            label={isRegistrationMoneyDeal ? "Tentative Due Date" : "Start Date"}
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            required={!isCashDeal}
            disabled={isCashDeal}
            helperText={
              isCashDeal
                ? "Not required for Cash deals."
                : "Due day will auto-fill from this date."
            }
          />

          <Input
            label={isRegistrationMoneyDeal ? "One-Time Amount" : "Monthly Payment"}
            name="monthlyPayment"
            type="number"
            value={formData.monthlyPayment}
            onChange={handleChange}
            required={!isCashDeal}
            disabled={isCashDeal}
            placeholder="Example: 500"
          />

          <Input
            label="Due Day"
            name="dueDay"
            type="number"
            value={formData.dueDay}
            onChange={handleChange}
            required={!isCashDeal}
            disabled={isCashDeal}
            placeholder="Auto from start date"
            helperText="Auto-filled from start date but can be edited."
          />

          <Input
            label="Term"
            name="term"
            type="number"
            value={formData.term}
            onChange={handleChange}
            required={!isCashDeal}
            disabled={isCashDeal || isRegistrationMoneyDeal}
            placeholder="Example: 5"
          />

          <Input
            label="Maturity Date"
            name="maturityDate"
            type="date"
            value={formData.maturityDate}
            onChange={handleChange}
            readOnly
            disabled={isCashDeal}
            helperText={
              isRegistrationMoneyDeal
                ? "Same as tentative due date for Registration Money."
                : "Auto-calculated from start date, due day, and term."
            }
          />
        </div>
      </Section>

      <Section
        title="Internal Deal Notes"
        description="Special agreements, title notes, tax/title details, down payment details, or internal comments."
      >
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Example: Customer paid $2,500 cash for tax/title. Remaining amount financed over 7 months..."
          style={notesInput}
        />
      </Section>

      <div style={buttonRow}>
        <button type="submit" style={buttonStyle} disabled={isSaving}>
          {isSaving ? "Saving..." : "Create Deal"}
        </button>

        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => {
            setFormData(initialFormData);
            setMessage("");
            setMessageType("");
          }}
          disabled={isSaving}
        >
          Clear Form
        </button>
      </div>
    </form>
  );
}

function Section({ title, description, children }) {
  return (
    <section style={sectionBox}>
      <div style={sectionHeader}>
        <h3 style={sectionTitle}>{title}</h3>
        <p style={sectionDescription}>{description}</p>
      </div>

      {children}
    </section>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
  readOnly,
  disabled,
  placeholder,
  helperText,
  maxLength,
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={requiredMark}>*</span>}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          ...inputStyle,
          background: readOnly || disabled ? "#f3f4f6" : "white",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />

      {helperText && <small style={helperTextStyle}>{helperText}</small>}
    </div>
  );
}

function Select({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required,
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={requiredMark}>*</span>}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={inputStyle}
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

const formStyle = {
  background: "white",
  padding: "22px",
  borderRadius: "14px",
  width: "100%",
  maxWidth: "100%",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  boxSizing: "border-box",
};

const formHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "20px",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "18px",
  flexWrap: "wrap",
};

const formTitle = {
  margin: 0,
  color: "#111827",
};

const formDescription = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#667085",
};

const dealTypeBadge = {
  background: "#dbeafe",
  color: "#1d4ed8",
  padding: "7px 12px",
  borderRadius: "999px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
  fontSize: "13px",
};

const sectionBox = {
  marginTop: "22px",
  padding: "18px",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  background: "#ffffff",
};

const sectionHeader = {
  marginBottom: "16px",
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

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "16px",
};

const labelStyle = {
  display: "block",
  fontWeight: "bold",
  color: "#374151",
  marginBottom: "6px",
};

const requiredMark = {
  color: "#dc2626",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  boxSizing: "border-box",
  fontSize: "14px",
};

const helperTextStyle = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  marginTop: "5px",
};

const notesInput = {
  ...inputStyle,
  minHeight: "120px",
  resize: "vertical",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  lineHeight: "1.5",
};

const buttonRow = {
  display: "flex",
  gap: "12px",
  marginTop: "24px",
  flexWrap: "wrap",
};

const buttonStyle = {
  background: "#0A1A2F",
  color: "white",
  padding: "12px 20px",
  border: "none",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "12px 20px",
  border: "none",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "bold",
};

const messageBox = {
  padding: "12px 14px",
  borderRadius: "10px",
  marginBottom: "18px",
  fontWeight: "bold",
};

const successMessage = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
};

const errorMessage = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};

const infoBox = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  padding: "13px",
  borderRadius: "10px",
  color: "#475569",
  marginBottom: "16px",
};

export default DealForm;