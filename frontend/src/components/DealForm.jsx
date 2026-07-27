import { useEffect, useMemo, useState } from "react";
import {
  createCustomer,
  getCustomers,
  updateCustomer,
} from "../api/customersApi";
import { createDeal, checkDealTagExists } from "../api/dealsApi";
import { logActivity } from "../api/activityLogsApi";
import {
  getDueDayFromStartDate,
  calculateMaturityDate,
} from "../utils/dealDateUtils";

const initialFormData = {
  selectedCustomerId: "",
  customerName: "",
  companyName: "",
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
  referredByName: "",
  referredByPhone: "",
  referralMoneyPaid: "No",
  referralAmountPaid: "",
  notes: "",
};

function DealForm() {
  const [formData, setFormData] = useState(initialFormData);
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isCashDeal = formData.dealType === "Cash";
  const isInHouseDeal = formData.dealType === "In-house";
  const isRegistrationMoneyDeal = formData.dealType === "Registration Money";

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const customers = await getCustomers();
      setAllCustomers(customers || []);
    } catch (error) {
      console.warn("Unable to load existing customers:", error.message);
    }
  };

  const selectedCustomer = useMemo(() => {
    if (!formData.selectedCustomerId) return null;

    return allCustomers.find(
      (customer) => customer.id === formData.selectedCustomerId
    );
  }, [allCustomers, formData.selectedCustomerId]);

  const customerMatches = useMemo(() => {
    const searchText = formData.customerName.trim().toLowerCase();

    if (searchText.length < 2) return [];

    return (allCustomers || [])
      .filter((customer) => {
        const haystack = [
          customer.customer_name,
          customer.company_name,
          customer.phone,
          customer.email,
          customer.address,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchText);
      })
      .slice(0, 8);
  }, [allCustomers, formData.customerName]);

  const handleSelectExistingCustomer = (customer) => {
    setFormData((prev) => ({
      ...prev,
      selectedCustomerId: customer.id,
      customerName: customer.customer_name || "",
      companyName: customer.company_name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    }));

    setCustomerSearchOpen(false);
    setMessage("");
    setMessageType("");
  };

  const clearSelectedCustomer = () => {
    setFormData((prev) => ({
      ...prev,
      selectedCustomerId: "",
      customerName: "",
      companyName: "",
      phone: "",
      email: "",
      address: "",
    }));

    setCustomerSearchOpen(false);
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

      if (name === "customerName") {
        updated.selectedCustomerId = "";
        setCustomerSearchOpen(true);
      }

      if (name === "referralMoneyPaid") {
        if (value === "No") {
          updated.referralAmountPaid = "";
        }
      }

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

      if (
        name === "startDate" &&
        value &&
        updated.dealType === "Registration Money"
      ) {
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

  const cleanFormData = () => {
    return {
      ...formData,
      customerName: formData.customerName.trim(),
      companyName: formData.companyName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      dealTag: formData.dealTag.trim(),
      truck: formData.truck.trim(),
      year: formData.year.trim(),
      vin: formData.vin.trim().toUpperCase(),
      referredByName: formData.referredByName.trim(),
      referredByPhone: formData.referredByPhone.trim(),
      referralMoneyPaid: formData.referralMoneyPaid,
      referralAmountPaid: formData.referralAmountPaid,
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

    if (
      data.referralAmountPaid &&
      Number(data.referralAmountPaid) < 0
    ) {
      return "Referral amount paid cannot be negative.";
    }

    if (
      data.referralMoneyPaid === "Yes" &&
      (!data.referralAmountPaid || Number(data.referralAmountPaid) <= 0)
    ) {
      return "Referral amount paid is required when referral money is marked as paid.";
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
      data.selectedCustomerId
        ? "Are you sure you want to add this new deal to the selected existing customer?"
        : "Are you sure you want to create this customer and deal?"
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

      let customer;

      if (data.selectedCustomerId) {
        customer = await updateCustomer(data.selectedCustomerId, {
          customerName: data.customerName,
          companyName: data.companyName,
          phone: data.phone,
          email: data.email,
          address: data.address,
        });
      } else {
        customer = await createCustomer({
          customerName: data.customerName,
          companyName: data.companyName,
          phone: data.phone,
          email: data.email,
          address: data.address,
        });
      }

      const savedDeal = await createDeal({
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
        dueDay: data.dealType === "Cash" ? null : Number(data.dueDay || 0),
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
        referredByName: data.referredByName,
        referredByPhone: data.referredByPhone,
        referralMoneyPaid: data.referralMoneyPaid === "Yes",
        referralAmountPaid:
          data.referralMoneyPaid === "Yes"
            ? Number(data.referralAmountPaid || 0)
            : 0,
        notes: data.notes,
      });

      await logActivity({
        action: "CREATE",
        module: "Deals",
        entity_type: "deal",
        entity_id: savedDeal?.id || data.dealTag,
        entity_label: data.dealTag || data.customerName || "New Deal",
        description: data.selectedCustomerId
          ? `Deal ${data.dealTag} added to existing customer ${data.customerName}.`
          : `Deal ${data.dealTag} created for new customer ${data.customerName}.`,
        metadata: {
          deal_id: savedDeal?.id || null,
          customer_id: customer?.id || null,
          used_existing_customer: Boolean(data.selectedCustomerId),
          customer_name: data.customerName,
          company_name: data.companyName || "",
          phone: data.phone,
          email: data.email,
          address: data.address,
          deal_tag: data.dealTag,
          deal_type: data.dealType,
          deal_subtype: data.dealType === "In-house" ? data.dealSubtype : null,
          truck: data.truck,
          year: data.year,
          vin: data.vin,
          total_amount: Number(data.totalAmount || 0),
          monthly_payment:
            data.dealType === "Cash"
              ? 0
              : data.dealType === "Registration Money"
              ? Number(data.totalAmount || 0)
              : Number(data.monthlyPayment || 0),
          due_day: data.dealType === "Cash" ? null : Number(data.dueDay || 0),
          term:
            data.dealType === "Cash"
              ? null
              : data.dealType === "Registration Money"
              ? 1
              : Number(data.term || 0),
          start_date: data.startDate || null,
          maturity_date:
            data.dealType === "Cash"
              ? null
              : data.dealType === "Registration Money"
              ? data.startDate
              : data.maturityDate,
          referred_by_name: data.referredByName || "",
          referred_by_phone: data.referredByPhone || "",
          referral_money_paid: data.referralMoneyPaid === "Yes",
          referral_amount_paid:
            data.referralMoneyPaid === "Yes"
              ? Number(data.referralAmountPaid || 0)
              : 0,
          notes: data.notes,
        },
      });

      setMessage(
        data.selectedCustomerId
          ? "New deal added to existing customer successfully."
          : "Customer and deal created successfully."
      );

      setMessageType("success");
      setFormData(initialFormData);
      setCustomerSearchOpen(false);
      await loadCustomers();
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
            Search for an existing customer or type a new customer name. If you
            select an existing customer, phone, email, company name, and address
            will auto-fill.
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
        description="Search existing customers or create a new customer profile."
      >
        <div style={grid}>
          <div style={customerSearchWrapper}>
            <label style={labelStyle}>
              Customer Name / Search Customer{" "}
              <span style={requiredMark}>*</span>
            </label>

            <input
              name="customerName"
              type="text"
              value={formData.customerName}
              onChange={handleChange}
              onFocus={() => setCustomerSearchOpen(true)}
              required
              placeholder="Start typing customer name, company, phone, or email..."
              style={inputStyle}
              autoComplete="off"
            />

            {selectedCustomer && (
              <div style={selectedCustomerBox}>
                <div>
                  <strong>Using existing customer</strong>
                  <p>
                    {selectedCustomer.customer_name}
                    {selectedCustomer.company_name
                      ? ` · ${selectedCustomer.company_name}`
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearSelectedCustomer}
                  style={clearCustomerButton}
                >
                  Change
                </button>
              </div>
            )}

            {customerSearchOpen &&
              !formData.selectedCustomerId &&
              customerMatches.length > 0 && (
                <div style={customerDropdown}>
                  {customerMatches.map((customer) => (
                    <button
                      type="button"
                      key={customer.id}
                      style={customerDropdownItem}
                      onClick={() => handleSelectExistingCustomer(customer)}
                    >
                      <strong>{customer.customer_name || "Unnamed"}</strong>

                      <span>
                        {customer.company_name
                          ? `${customer.company_name} · `
                          : ""}
                        {customer.phone || "No phone"}
                        {customer.email ? ` · ${customer.email}` : ""}
                      </span>

                      {customer.address && <small>{customer.address}</small>}
                    </button>
                  ))}
                </div>
              )}

            {customerSearchOpen &&
              !formData.selectedCustomerId &&
              formData.customerName.trim().length >= 2 &&
              customerMatches.length === 0 && (
                <div style={noCustomerMatchBox}>
                  No existing customer found. A new customer will be created.
                </div>
              )}
          </div>

          <Input
            label="Company Name"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="Example: RK Logistics LLC"
            helperText="Optional"
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
            placeholder="Example: 25000"
            helperText="Total financed or deal amount."
          />
        </div>
      </Section>

      <Section
        title="Referral Information"
        description="Optional referral tracking for who referred this customer and whether referral money was paid."
      >
        <div style={referralInfoBox}>
          Add referral information only if this customer or deal came from a
          referral. Leave it blank if there is no referral.
        </div>

        <div style={grid}>
          <Input
            label="Referred By Name"
            name="referredByName"
            value={formData.referredByName}
            onChange={handleChange}
            placeholder="Example: John Smith"
            helperText="Optional"
          />

          <Input
            label="Referred By Phone"
            name="referredByPhone"
            value={formData.referredByPhone}
            onChange={handleChange}
            placeholder="Example: 2145551111"
            helperText="Optional"
          />

          <Select
            label="Referral Money Paid?"
            name="referralMoneyPaid"
            value={formData.referralMoneyPaid}
            onChange={handleChange}
            options={["No", "Yes"]}
            required
          />

          <Input
            label="Referral Amount Paid"
            name="referralAmountPaid"
            type="number"
            value={formData.referralAmountPaid}
            onChange={handleChange}
            placeholder="Example: 500"
            disabled={formData.referralMoneyPaid === "No"}
            helperText={
              formData.referralMoneyPaid === "Yes"
                ? "Required when referral money is marked paid."
                : "Disabled unless referral money is paid."
            }
          />
        </div>
      </Section>

      <Section
        title="Payment Schedule"
        description={
          isCashDeal
            ? "Cash deals do not require a monthly schedule."
            : isRegistrationMoneyDeal
            ? "Registration Money is treated as a one-time scheduled receivable."
            : "Schedule is calculated from start date, due day, term, and monthly payment."
        }
      >
        {isCashDeal && (
          <div style={infoBox}>
            Cash deal selected. Monthly payment, due day, term, and maturity date
            are not required.
          </div>
        )}

        {isRegistrationMoneyDeal && (
          <div style={infoBox}>
            Registration Money selected. Use the tentative due date as the date
            the customer is expected to pay title or registration money. Term
            will stay 1 and monthly payment will match the total amount.
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
            label={
              isRegistrationMoneyDeal ? "One-Time Amount" : "Monthly Payment"
            }
            name="monthlyPayment"
            type="number"
            value={formData.monthlyPayment}
            onChange={handleChange}
            required={!isCashDeal}
            disabled={isCashDeal || isRegistrationMoneyDeal}
            placeholder="Example: 500"
          />

          <Input
            label="Due Day"
            name="dueDay"
            type="number"
            value={formData.dueDay}
            onChange={handleChange}
            required={!isCashDeal}
            disabled={isCashDeal || isRegistrationMoneyDeal}
            placeholder="Auto from start date"
            helperText="Auto-filled from start date but can be edited for normal payment deals."
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
            disabled={isCashDeal || isRegistrationMoneyDeal}
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
        description="Special agreements, title notes, tax/title details, down payment details, referral notes, or internal comments."
      >
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Example: Customer paid $2,500 cash for tax/title. Referral paid $500 to John Smith..."
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
            setCustomerSearchOpen(false);
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

const customerSearchWrapper = {
  position: "relative",
  zIndex: 5,
};

const selectedCustomerBox = {
  marginTop: "8px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  borderRadius: "12px",
  padding: "10px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const clearCustomerButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: "900",
};

const customerDropdown = {
  position: "absolute",
  top: "74px",
  left: 0,
  right: 0,
  background: "white",
  border: "1px solid #d1d5db",
  borderRadius: "14px",
  boxShadow: "0 16px 35px rgba(15, 23, 42, 0.18)",
  zIndex: 50,
  overflow: "hidden",
};

const customerDropdownItem = {
  width: "100%",
  background: "white",
  border: "none",
  borderBottom: "1px solid #f1f5f9",
  padding: "12px",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: "4px",
  color: "#111827",
};

const noCustomerMatchBox = {
  marginTop: "8px",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#92400e",
  borderRadius: "12px",
  padding: "10px",
  fontSize: "12px",
  fontWeight: "800",
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

const referralInfoBox = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  padding: "13px",
  borderRadius: "10px",
  color: "#1d4ed8",
  marginBottom: "16px",
  fontWeight: "800",
};

export default DealForm;