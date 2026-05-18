import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getDealById, updateDeal } from "../api/dealsApi";
import { updateCustomer } from "../api/customersApi";
import {
  getDueDayFromStartDate,
  calculateMaturityDate,
} from "../utils/dealDateUtils";

function EditDeal() {
  const { dealId } = useParams();
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState("");
  const [originalFormData, setOriginalFormData] = useState(null);

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
  const [messageType, setMessageType] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isCashDeal = formData.dealType === "Cash";
  const isInHouseDeal = formData.dealType === "In-house";
  const isRegistrationMoneyDeal = formData.dealType === "Registration Money";

  useEffect(() => {
    loadDeal();
  }, [dealId]);

  const loadDeal = async () => {
    try {
      setMessage("");
      setMessageType("");

      const deal = await getDealById(dealId);

      setCustomerId(deal.customer_id);

      const loadedData = {
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
      };

      setFormData(loadedData);
      setOriginalFormData(loadedData);
    } catch (error) {
      setMessage(`Failed to load deal: ${error.message}`);
      setMessageType("error");
    }
  };

  const cleanFormData = (data) => {
    return {
      ...data,
      customerName: data.customerName.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      address: data.address.trim(),
      dealTag: data.dealTag.trim(),
      truck: data.truck.trim(),
      year: data.year.trim(),
      vin: data.vin.trim().toUpperCase(),
      notes: data.notes.trim(),
    };
  };

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

        if (updated.startDate) {
          updated.maturityDate = updated.startDate;
        }
      }

      if (name === "startDate" && value && updated.dealType === "Registration Money") {
        const dueDay = getDueDayFromStartDate(value);
        updated.dueDay = dueDay;
        updated.term = "1";
        updated.maturityDate = value;
      }

      if (
        name === "startDate" &&
        value &&
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money"
      ) {
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

      if (
        name === "term" &&
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money"
      ) {
        updated.maturityDate = calculateMaturityDate(
          updated.startDate,
          updated.dueDay,
          value
        );
      }

      if (
        name === "dueDay" &&
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money"
      ) {
        updated.maturityDate = calculateMaturityDate(
          updated.startDate,
          value,
          updated.term
        );
      }

      return updated;
    });
  };

  const validateForm = () => {
    const data = cleanFormData(formData);

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

    if (!data.totalAmount || Number(data.totalAmount) < 0) {
      return "Total amount is required and cannot be negative.";
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

      if (!data.dueDay || Number(data.dueDay) < 1 || Number(data.dueDay) > 31) {
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

  const didScheduleChange = () => {
    if (!originalFormData) return true;

    const scheduleFields = [
      "totalAmount",
      "monthlyPayment",
      "term",
      "dueDay",
      "startDate",
      "maturityDate",
      "status",
    ];

    return scheduleFields.some(
      (field) =>
        String(originalFormData[field] || "") !== String(formData[field] || "")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    const validationError = validateForm();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      return;
    }

    const data = cleanFormData(formData);

    const confirmationMessage = didScheduleChange()
      ? "Are you sure you want to save these changes? You changed important deal or schedule information. This may affect the payment schedule, balance, due payments, and paid-off status."
      : "Are you sure you want to save these changes?";

    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) return;

    try {
      setIsSaving(true);

      await updateCustomer(customerId, {
        customerName: data.customerName,
        phone: data.phone,
        email: data.email,
        address: data.address,
      });

      const finalDueDay =
        data.dealType === "Cash"
          ? null
          : data.dueDay
          ? Number(data.dueDay)
          : data.startDate
          ? Number(getDueDayFromStartDate(data.startDate))
          : null;

      const finalTerm =
        data.dealType === "Cash"
          ? null
          : data.dealType === "Registration Money"
          ? 1
          : Number(data.term || 0);

      const finalMonthlyPayment =
        data.dealType === "Cash"
          ? 0
          : data.dealType === "Registration Money"
          ? Number(data.totalAmount || 0)
          : Number(data.monthlyPayment || 0);

      const finalMaturityDate =
        data.dealType === "Cash"
          ? null
          : data.dealType === "Registration Money"
          ? data.startDate
          : data.maturityDate ||
            calculateMaturityDate(data.startDate, finalDueDay, finalTerm);

      await updateDeal(dealId, {
        dealTag: data.dealTag,
        dealType: data.dealType,
        dealSubtype: data.dealType === "In-house" ? data.dealSubtype : null,
        startDate: data.startDate || null,
        truck: data.truck,
        year: data.year,
        vin: data.vin,
        totalAmount: Number(data.totalAmount || 0),
        monthlyPayment: finalMonthlyPayment,
        dueDay: finalDueDay,
        term: finalTerm,
        maturityDate: finalMaturityDate,
        status: data.status,
        notes: data.notes,
      });

      setMessage("Deal updated successfully.");
      setMessageType("success");

      setTimeout(() => {
        navigate(`/deals/${dealId}`);
      }, 700);
    } catch (error) {
      setMessage(`Failed to update deal: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!originalFormData && !message) {
    return (
      <div style={pageWrapper}>
        <p>Loading deal...</p>
      </div>
    );
  }

  return (
    <div style={pageWrapper}>
      <div style={topActionBar}>
        <Link to={`/deals/${dealId}`} style={backLink}>
          ← Back to Customer
        </Link>

        <button
          type="button"
          onClick={loadDeal}
          style={secondaryButtonStyle}
          disabled={isSaving}
        >
          Reload
        </button>
      </div>

      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>Edit Deal</h1>
          <p style={pageDescription}>
            Update customer information, deal details, schedule fields, status,
            and internal notes.
          </p>
        </div>

        <div style={getStatusBadgeStyle(formData.status)}>
          {formData.status || "Active"}
        </div>
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

      <form onSubmit={handleSubmit} style={formStyle}>
        <Section
          title="Customer Information"
          description="Basic customer contact details used for follow-up and records."
        >
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
              type="email"
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
        </Section>

        <Section
          title="Deal Information"
          description="Truck, deal type, amount, and current deal status."
        >
          <div style={grid}>
            <Input
              label="Deal Tag"
              name="dealTag"
              value={formData.dealTag}
              onChange={handleChange}
              required
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

            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                "Active",
                "Paid Off",
                "Closed",
                "Repo",
                "Cancelled",
                "Defaulted",
              ]}
              required
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
              maxLength={4}
            />

            <Input
              label="VIN"
              name="vin"
              value={formData.vin}
              onChange={handleChange}
              maxLength={17}
            />

            <Input
              label={
                isRegistrationMoneyDeal
                  ? "Registration Money Amount"
                  : "Total Amount"
              }
              name="totalAmount"
              type="number"
              value={formData.totalAmount}
              onChange={handleChange}
              required
              helperText="Changing this may affect balance and paid-off status."
            />
          </div>
        </Section>

        <Section
          title="Payment Schedule"
          description={
            isCashDeal
              ? "Cash deals do not need monthly schedule fields."
              : isRegistrationMoneyDeal
              ? "Registration Money is treated as a one-time scheduled receivable."
              : "Schedule is calculated from start date, due day, term, and monthly payment."
          }
        >
          {isCashDeal && (
            <div style={infoBox}>
              Cash deal selected. Monthly payment, due day, term, and maturity
              date are not required.
            </div>
          )}

          {isRegistrationMoneyDeal && (
            <div style={infoBox}>
              Registration Money selected. Use the tentative due date as the
              date the customer is expected to pay title/registration money.
              Term will stay 1 and monthly payment will match the total amount.
            </div>
          )}

          <div style={grid}>
            <Input
              label={
                isRegistrationMoneyDeal ? "Tentative Due Date" : "Start Date"
              }
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              disabled={isCashDeal}
              required={!isCashDeal}
              helperText={
                isRegistrationMoneyDeal
                  ? "This is the expected sticker pickup / registration money due date."
                  : "Due day will auto-fill from this date."
              }
            />

            <Input
              label={
                isRegistrationMoneyDeal
                  ? "One-Time Amount"
                  : "Monthly Payment"
              }
              name="monthlyPayment"
              type="number"
              value={formData.monthlyPayment}
              onChange={handleChange}
              disabled={isCashDeal || isRegistrationMoneyDeal}
              required={!isCashDeal}
            />

            <Input
              label="Due Day"
              name="dueDay"
              type="number"
              value={formData.dueDay}
              onChange={handleChange}
              disabled={isCashDeal || isRegistrationMoneyDeal}
              required={!isCashDeal}
              helperText="Auto-filled from start date, but can be edited for normal payment deals."
            />

            <Input
              label="Term"
              name="term"
              type="number"
              value={formData.term}
              onChange={handleChange}
              disabled={isCashDeal || isRegistrationMoneyDeal}
              required={!isCashDeal}
            />

            <Input
              label="Maturity Date"
              name="maturityDate"
              type="date"
              value={formData.maturityDate}
              onChange={handleChange}
              disabled={isCashDeal || isRegistrationMoneyDeal}
              readOnly
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
          description="Special terms, title notes, payment notes, customer agreements, or internal dealership notes."
        >
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add internal notes for this deal..."
            style={notesInput}
          />
        </Section>

        <div style={buttonRow}>
          <button type="submit" style={buttonStyle} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>

          <Link to={`/deals/${dealId}`} style={cancelButtonStyle}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section style={sectionBox}>
      <div style={sectionHeader}>
        <h2 style={sectionTitle}>{title}</h2>
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
  disabled,
  readOnly,
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
        disabled={disabled}
        readOnly={readOnly}
        maxLength={maxLength}
        style={{
          ...inputStyle,
          background: disabled || readOnly ? "#f3f4f6" : "white",
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

function getStatusBadgeStyle(status) {
  const base = {
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px",
    whiteSpace: "nowrap",
  };

  if (status === "Paid Off") {
    return { ...base, background: "#dcfce7", color: "#166534" };
  }

  if (status === "Defaulted") {
    return { ...base, background: "#111827", color: "white" };
  }

  if (status === "Repo") {
    return { ...base, background: "#fee2e2", color: "#991b1b" };
  }

  if (status === "Closed") {
    return { ...base, background: "#e5e7eb", color: "#374151" };
  }

  if (status === "Cancelled") {
    return { ...base, background: "#f3f4f6", color: "#6b7280" };
  }

  return { ...base, background: "#dbeafe", color: "#1d4ed8" };
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
  marginBottom: "18px",
  flexWrap: "wrap",
};

const backLink = {
  color: "#0A1A2F",
  textDecoration: "none",
  fontWeight: "bold",
};

const pageHeader = {
  background: "white",
  padding: "20px",
  borderRadius: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  marginBottom: "20px",
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

const formStyle = {
  background: "white",
  padding: "22px",
  borderRadius: "14px",
  maxWidth: "100%",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  boxSizing: "border-box",
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
  minHeight: "130px",
  resize: "vertical",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  lineHeight: "1.5",
};

const infoBox = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  padding: "13px",
  borderRadius: "10px",
  color: "#475569",
  marginBottom: "16px",
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

const cancelButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "12px 20px",
  borderRadius: "9px",
  textDecoration: "none",
  fontWeight: "bold",
};

const secondaryButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "9px 13px",
  borderRadius: "8px",
  border: "none",
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

export default EditDeal;