import { useEffect, useState } from "react";
import { getDeals } from "../api/dealsApi";
import { getPayments, addPayment } from "../api/paymentsApi";
import { getDealDueSchedule } from "../utils/duePaymentsUtils";
import { formatMoney } from "../utils/moneyUtils";
import PaymentReceipt from "./PaymentReceipt";

const initialFormData = {
  dealId: "",
  paymentDate: new Date().toISOString().split("T")[0],
  dueDate: "",
  amountDue: "",
  amountPaid: "",
  paymentMethod: "Cash",
  promisedDate: "",
  notes: "",
};

function PaymentForm() {
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [receipt, setReceipt] = useState(null);

  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setMessage("");
      setMessageType("");

      const dealsData = await getDeals();
      const paymentsData = await getPayments();

      setDeals(dealsData);
      setPayments(paymentsData);
    } catch (error) {
      setMessage(`Failed to load payment form data: ${error.message}`);
      setMessageType("error");
    }
  };

  const selectedDeal = deals.find((deal) => deal.id === formData.dealId);

  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const installmentOptions = selectedDeal
    ? getInstallmentOptions(selectedDeal, activePayments)
    : [];

  const selectedInstallment = installmentOptions.find(
    (item) => item.dueDate === formData.dueDate
  );

  const amountDue = Number(formData.amountDue || 0);
  const amountPaid = Number(formData.amountPaid || 0);
  const remainingAmount = Math.max(amountDue - amountPaid, 0);

  const handleDealChange = (e) => {
    const dealId = e.target.value;

    setMessage("");
    setMessageType("");

    setFormData((prev) => ({
      ...prev,
      dealId,
      dueDate: "",
      amountDue: "",
      amountPaid: "",
      promisedDate: "",
      notes: "",
    }));
  };

  const handleInstallmentChange = (e) => {
    const selectedDueDate = e.target.value;

    const installment = installmentOptions.find(
      (item) => item.dueDate === selectedDueDate
    );

    setMessage("");
    setMessageType("");

    setFormData((prev) => ({
      ...prev,
      dueDate: selectedDueDate,
      amountDue: installment ? installment.remainingForDueDate : "",
      amountPaid: installment ? installment.remainingForDueDate : "",
      promisedDate: "",
    }));
  };

  const handleChange = (e) => {
    setMessage("");
    setMessageType("");

    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validatePaymentForm = () => {
    if (!formData.dealId) {
      return "Please select a deal.";
    }

    if (!formData.paymentDate) {
      return "Payment date is required.";
    }

    if (!formData.dueDate) {
      return "Please select a due installment.";
    }

    if (!formData.amountDue || Number(formData.amountDue) <= 0) {
      return "Amount due must be greater than 0.";
    }

    if (!formData.amountPaid || Number(formData.amountPaid) <= 0) {
      return "Amount paid must be greater than 0.";
    }

    if (Number(formData.amountPaid) > Number(formData.amountDue)) {
      return "Amount paid cannot be greater than the remaining amount for this installment.";
    }

    if (!formData.paymentMethod) {
      return "Payment method is required.";
    }

    if (remainingAmount > 0 && !formData.promisedDate) {
      return "Promised date is required when the customer pays partial amount.";
    }

    if (formData.promisedDate && formData.promisedDate < formData.paymentDate) {
      return "Promised date cannot be before the payment date.";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    const validationError = validatePaymentForm();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to save this payment? This will affect the balance and payment schedule."
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);

      await addPayment(formData);

      const selectedDealData = deals.find((deal) => deal.id === formData.dealId);

      const totalPaidForDeal = activePayments
        .filter((payment) => payment.deal_id === formData.dealId)
        .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);

      const newTotalPaid = totalPaidForDeal + Number(formData.amountPaid || 0);

      const remainingBalance = Math.max(
        Number(selectedDealData?.total_amount || 0) - newTotalPaid,
        0
      );

      setReceipt({
        customerName: selectedDealData?.customers?.customer_name || "",
        dealTag: selectedDealData?.deal_tag || "",
        amountPaid: Number(formData.amountPaid || 0),
        paymentMethod: formData.paymentMethod,
        paymentDate: formData.paymentDate,
        dueDate: formData.dueDate,
        remainingBalance,
      });

      setMessage("Payment saved successfully.");
      setMessageType("success");

      setFormData(initialFormData);

      await loadData();
    } catch (error) {
      setMessage(`Failed to save payment: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={formHeader}>
        <div>
          <h2 style={formTitle}>Payment Entry Form</h2>
          <p style={formDescription}>
            Record customer payments, partial payments, and promised remaining amounts.
          </p>
        </div>

        {selectedDeal ? (
          <span style={getDealStatusBadgeStyle(selectedDeal.status)}>
            {selectedDeal.status || "Active"}
          </span>
        ) : (
          <span style={neutralBadge}>Select Deal</span>
        )}
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
        title="Payment Selection"
        description="Choose the customer deal and the correct installment being paid."
      >
        <div style={grid}>
          <div>
            <label style={labelStyle}>
              Deal / Customer <span style={requiredMark}>*</span>
            </label>

            <select
              name="dealId"
              value={formData.dealId}
              onChange={handleDealChange}
              style={inputStyle}
              required
            >
              <option value="">Select Deal</option>

              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.deal_tag} - {deal.customers?.customer_name} -{" "}
                  {deal.status || "Active"}
                </option>
              ))}
            </select>

            <small style={helperTextStyle}>
              Defaulted deals are still available for manual payment entry.
            </small>
          </div>

          <Input
            label="Payment Date"
            name="paymentDate"
            type="date"
            value={formData.paymentDate}
            onChange={handleChange}
            required
          />

          <div>
            <label style={labelStyle}>
              Select Due Installment <span style={requiredMark}>*</span>
            </label>

            <select
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInstallmentChange}
              style={inputStyle}
              required
              disabled={!selectedDeal}
            >
              <option value="">
                {selectedDeal ? "Select Due Installment" : "Select deal first"}
              </option>

              {installmentOptions.map((item) => (
                <option key={item.dueDate} value={item.dueDate}>
                  {formatDisplayDate(item.dueDate)} - Installment{" "}
                  {item.installmentNumber} - Remaining{" "}
                  {formatMoney(item.remainingForDueDate)}
                </option>
              ))}
            </select>

            <small style={helperTextStyle}>
              Only unpaid or partially paid installments are shown.
            </small>
          </div>
        </div>
      </Section>

      {selectedDeal && (
        <div style={selectedDealBox}>
          <div style={selectedDealHeader}>
            <strong>
              {selectedDeal.deal_tag} - {selectedDeal.customers?.customer_name}
            </strong>

            <span style={getDealStatusBadgeStyle(selectedDeal.status)}>
              {selectedDeal.status || "Active"}
            </span>
          </div>

          <div style={selectedDealGrid}>
            <InfoItem label="Deal Type" value={selectedDeal.deal_type || "—"} />
            <InfoItem
              label="Sub Type"
              value={selectedDeal.deal_subtype || "—"}
            />
            <InfoItem
              label="Truck"
              value={`${selectedDeal.year || ""} ${selectedDeal.truck || ""}`}
            />
            <InfoItem
              label="Monthly Payment"
              value={formatMoney(selectedDeal.monthly_payment)}
            />
            <InfoItem
              label="Start Date"
              value={formatDisplayDate(selectedDeal.start_date)}
            />
            <InfoItem label="Term" value={selectedDeal.term || "—"} />
          </div>
        </div>
      )}

      <Section
        title="Payment Details"
        description="Confirm amount paid, method, and promise date if payment is partial."
      >
        <div style={grid}>
          <Input
            label="Amount Due"
            name="amountDue"
            type="number"
            value={formData.amountDue}
            onChange={handleChange}
            required
            readOnly
            helperText="Auto-filled from the selected installment."
          />

          <Input
            label="Amount Paid Today"
            name="amountPaid"
            type="number"
            value={formData.amountPaid}
            onChange={handleChange}
            required
            helperText="Cannot be greater than the remaining installment amount."
          />

          <div>
            <label style={labelStyle}>
              Payment Method <span style={requiredMark}>*</span>
            </label>

            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              style={inputStyle}
            >
              <option>Cash</option>
              <option>Zelle</option>
              <option>Card</option>
              <option>Check</option>
              <option>ACH</option>
              <option>Other</option>
            </select>
          </div>

          <Input
            label="Promised Date"
            name="promisedDate"
            type="date"
            value={formData.promisedDate}
            onChange={handleChange}
            required={remainingAmount > 0}
            helperText={
              remainingAmount > 0
                ? "Required because this is a partial payment."
                : "Only needed if customer leaves a balance on this installment."
            }
          />
        </div>

        {selectedInstallment && (
          <div style={installmentSummaryBox}>
            <strong>Selected Installment:</strong>{" "}
            {formatDisplayDate(selectedInstallment.dueDate)} | Installment{" "}
            {selectedInstallment.installmentNumber} | Remaining{" "}
            {formatMoney(selectedInstallment.remainingForDueDate)}
          </div>
        )}
      </Section>

      <Section
        title="Payment Notes"
        description="Optional notes about this payment, promise, method, or customer conversation."
      >
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Example: Customer paid partial amount and promised remaining next Friday."
          style={notesInput}
        />
      </Section>

      <div style={paymentSummaryBox}>
        <div>
          <span style={summaryLabel}>Amount Due</span>
          <strong>{formatMoney(amountDue)}</strong>
        </div>

        <div>
          <span style={summaryLabel}>Paid Today</span>
          <strong>{formatMoney(amountPaid)}</strong>
        </div>

        <div>
          <span style={summaryLabel}>Remaining After Payment</span>
          <strong style={{ color: remainingAmount > 0 ? "#991b1b" : "#166534" }}>
            {formatMoney(remainingAmount)}
          </strong>
        </div>
      </div>

      {remainingAmount > 0 && (
        <div style={partialWarningBox}>
          This is a partial payment. A promise will be created for the remaining
          amount when a promised date is entered.
        </div>
      )}

      <div style={buttonRow}>
        <button type="submit" style={buttonStyle} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Payment"}
        </button>

        <button
          type="button"
          style={secondaryButtonStyle}
          disabled={isSaving}
          onClick={() => {
            setFormData(initialFormData);
            setMessage("");
            setMessageType("");
          }}
        >
          Clear Form
        </button>
      </div>

      <PaymentReceipt receipt={receipt} onClose={() => setReceipt(null)} />
    </form>
  );
}

function getInstallmentOptions(deal, payments) {
  const schedule = getDealDueSchedule(deal);

  return schedule
    .map((installment) => {
      const paidForDueDate = payments
        .filter(
          (payment) =>
            payment.deal_id === deal.id &&
            payment.due_date === installment.dueDate &&
            payment.payment_status !== "Voided"
        )
        .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);

      const remainingForDueDate = Math.max(
        Number(installment.amountDue || 0) - paidForDueDate,
        0
      );

      let status = "Due";

      if (paidForDueDate >= installment.amountDue) {
        status = "Paid";
      } else if (paidForDueDate > 0) {
        status = "Partial";
      }

      return {
        ...installment,
        paidForDueDate,
        remainingForDueDate,
        status,
      };
    })
    .filter((item) => item.remainingForDueDate > 0);
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
  helperText,
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
        style={{
          ...inputStyle,
          background: readOnly ? "#f3f4f6" : "white",
          cursor: readOnly ? "not-allowed" : "text",
        }}
      />

      {helperText && <small style={helperTextStyle}>{helperText}</small>}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <span style={infoLabel}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getDealStatusBadgeStyle(status) {
  const base = {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  };

  if (status === "Paid Off") {
    return { ...base, background: "#dcfce7", color: "#166534" };
  }

  if (status === "Defaulted") {
    return { ...base, background: "#111827", color: "#ffffff" };
  }

  if (status === "Repo") {
    return { ...base, background: "#fee2e2", color: "#991b1b" };
  }

  if (status === "Cancelled" || status === "Closed") {
    return { ...base, background: "#e5e7eb", color: "#374151" };
  }

  return { ...base, background: "#dbeafe", color: "#1d4ed8" };
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
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

const neutralBadge = {
  background: "#e5e7eb",
  color: "#374151",
  padding: "5px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
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

const selectedDealBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  padding: "16px",
  borderRadius: "12px",
  marginTop: "20px",
};

const selectedDealHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
  flexWrap: "wrap",
};

const selectedDealGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
};

const infoLabel = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  marginBottom: "4px",
};

const installmentSummaryBox = {
  marginTop: "16px",
  background: "#f9fafb",
  border: "1px dashed #cbd5e1",
  padding: "13px",
  borderRadius: "10px",
  color: "#475569",
};

const notesInput = {
  ...inputStyle,
  minHeight: "100px",
  resize: "vertical",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  lineHeight: "1.5",
};

const paymentSummaryBox = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  background: "#f9fafb",
  padding: "16px",
  borderRadius: "12px",
  marginTop: "22px",
  border: "1px solid #e5e7eb",
};

const summaryLabel = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  marginBottom: "5px",
};

const partialWarningBox = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  padding: "12px",
  borderRadius: "10px",
  marginTop: "14px",
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

export default PaymentForm;