import { useEffect, useState } from "react";
import { getDeals } from "../api/dealsApi";
import { getPayments } from "../api/paymentsApi";
import { addPayment } from "../api/paymentsApi";
import { getDealDueSchedule } from "../utils/duePaymentsUtils";
import { formatMoney } from "../utils/moneyUtils";
import PaymentReceipt from "./PaymentReceipt";

function PaymentForm() {
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);

  const [receipt, setReceipt] = useState(null);

  const [formData, setFormData] = useState({
    dealId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    amountDue: "",
    amountPaid: "",
    paymentMethod: "Cash",
    promisedDate: "",
    notes: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const dealsData = await getDeals();
    const paymentsData = await getPayments();

    setDeals(dealsData);
    setPayments(paymentsData);
  };

  const selectedDeal = deals.find((deal) => deal.id === formData.dealId);

  const installmentOptions = selectedDeal
    ? getInstallmentOptions(selectedDeal, payments)
    : [];

  const amountDue = Number(formData.amountDue || 0);
  const amountPaid = Number(formData.amountPaid || 0);
  const remainingAmount = Math.max(amountDue - amountPaid, 0);

  const handleDealChange = (e) => {
    const dealId = e.target.value;

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

    setFormData((prev) => ({
      ...prev,
      dueDate: selectedDueDate,
      amountDue: installment ? installment.remainingForDueDate : "",
      amountPaid: installment ? installment.remainingForDueDate : "",
    }));
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!formData.dealId) {
        setMessage("Please select a deal.");
        return;
      }

      if (!formData.dueDate) {
        setMessage("Please select a due installment.");
        return;
      }

      await addPayment(formData);

      setMessage("Payment saved successfully.");

      const selectedDealData = deals.find((deal) => deal.id === formData.dealId);

      const totalPaidForDeal = payments
        .filter(
          (payment) =>
            payment.deal_id === formData.dealId &&
            payment.payment_status !== "Voided"
        )
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

      setFormData({
        dealId: "",
        paymentDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        amountDue: "",
        amountPaid: "",
        paymentMethod: "Cash",
        promisedDate: "",
        notes: "",
      });

      await loadData();
    } catch (error) {
      setMessage(`Failed to save payment: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={grid}>
        <div>
          <label>Deal / Customer</label>
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
                {deal.deal_tag} - {deal.customers?.customer_name} - {deal.status}
              </option>
            ))}
          </select>
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
          <label>Select Due Installment</label>
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
                {item.installmentNumber} - Due {formatMoney(item.amountDue)} -
                Remaining {formatMoney(item.remainingForDueDate)}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Amount Due"
          name="amountDue"
          type="number"
          value={formData.amountDue}
          onChange={handleChange}
          required
        />

        <Input
          label="Amount Paid Today"
          name="amountPaid"
          type="number"
          value={formData.amountPaid}
          onChange={handleChange}
          required
        />

        <div>
          <label>Payment Method</label>
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
        />
      </div>

      {selectedDeal && (
        <div style={summaryBox}>
          <strong>Selected Customer:</strong>{" "}
          {selectedDeal.customers?.customer_name}
          <br />
          <strong>Deal Type:</strong> {selectedDeal.deal_type}
          {selectedDeal.deal_subtype && (
            <>
              <br />
              <strong>Sub Type:</strong> {selectedDeal.deal_subtype}
            </>
          )}
          <br />
          <strong>Truck:</strong> {selectedDeal.year} {selectedDeal.truck}
          <br />
          <strong>Start Date:</strong> {selectedDeal.start_date || "—"}
          <br />
          <strong>Term:</strong> {selectedDeal.term || "—"}
          <br />
          <strong>Monthly Payment:</strong>{" "}
          {formatMoney(selectedDeal.monthly_payment)}
        </div>
      )}

      <div style={{ marginTop: "15px" }}>
        <label>Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          style={{
            ...inputStyle,
            height: "90px",
            resize: "vertical",
          }}
        />
      </div>

      <div style={summaryBox}>
        <strong>Remaining Amount After This Payment:</strong>{" "}
        {formatMoney(remainingAmount)}

        {remainingAmount > 0 && formData.promisedDate && (
          <p style={{ marginBottom: 0 }}>
            This will create a payment promise for the remaining amount.
          </p>
        )}
      </div>

      <button type="submit" style={buttonStyle}>
        Save Payment
      </button>

      {message && <p>{message}</p>}
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

function formatDisplayDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");

  return `${month}/${day}/${year}`;
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

const summaryBox = {
  background: "#f9fafb",
  padding: "15px",
  borderRadius: "10px",
  marginTop: "20px",
};

const buttonStyle = {
  marginTop: "20px",
  background: "#0A1A2F",
  color: "white",
  padding: "12px 20px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

export default PaymentForm;