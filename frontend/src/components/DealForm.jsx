import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
import LoadingSpinner from "./LoadingSpinner";

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
  paymentFrequency: "Monthly",
  firstPaymentDate: "",
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
  const [successDealLink, setSuccessDealLink] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const messageAreaRef = useRef(null);

  const scrollToMessageArea = () => {
    setTimeout(() => {
      messageAreaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  };

  const isCashDeal = formData.dealType === "Cash";
  const isInHouseDeal = formData.dealType === "In-house";
  const isRegistrationMoneyDeal = formData.dealType === "Registration Money";
  const isMonthlyPayment = formData.paymentFrequency === "Monthly";
  const isBiweeklyPayment = formData.paymentFrequency === "Biweekly";

  const scheduleMath = getScheduleMathCheck(formData);

  const applySuggestedPaymentAmount = () => {
    if (!scheduleMath.suggestedPaymentAmount) return;

    setMessage("");
    setMessageType("");
    setSuccessDealLink(null);

    setFormData((prev) => ({
      ...prev,
      monthlyPayment: String(scheduleMath.suggestedPaymentAmount),
    }));
  };

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
    setSuccessDealLink(null);
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
    setSuccessDealLink(null);

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "customerName") {
        updated.selectedCustomerId = "";
        setCustomerSearchOpen(true);
      }

      if (name === "referralMoneyPaid" && value === "No") {
        updated.referralAmountPaid = "";
      }

      if (name === "dealType") {
        if (value !== "In-house") {
          updated.dealSubtype = "";
        }

        if (value === "Cash") {
          updated.monthlyPayment = "";
          updated.paymentFrequency = "Monthly";
          updated.firstPaymentDate = "";
          updated.dueDay = "";
          updated.term = "";
          updated.maturityDate = "";
        }

        if (value === "Registration Money") {
          updated.paymentFrequency = "Monthly";
          updated.firstPaymentDate = "";
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

        if (value !== "Cash" && value !== "Registration Money") {
          updated.paymentFrequency = updated.paymentFrequency || "Monthly";

          if (updated.startDate && updated.paymentFrequency === "Monthly") {
            const dueDay = getDueDayFromStartDate(updated.startDate);
            updated.dueDay = updated.dueDay || dueDay;

            if (updated.term) {
              updated.maturityDate = calculateMaturityDate(
                updated.startDate,
                updated.dueDay || dueDay,
                updated.term
              );
            }
          }

          if (updated.startDate && updated.paymentFrequency === "Biweekly") {
            updated.firstPaymentDate =
              updated.firstPaymentDate || updated.startDate;
            updated.dueDay = "";

            if (updated.term) {
              updated.maturityDate = calculateBiweeklyMaturityDate(
                updated.firstPaymentDate,
                updated.term
              );
            }
          }
        }
      }

      if (name === "paymentFrequency") {
        if (value === "Monthly") {
          updated.firstPaymentDate = "";

          if (updated.startDate) {
            const dueDay = getDueDayFromStartDate(updated.startDate);
            updated.dueDay = updated.dueDay || dueDay;

            if (updated.term) {
              updated.maturityDate = calculateMaturityDate(
                updated.startDate,
                updated.dueDay || dueDay,
                updated.term
              );
            }
          }
        }

        if (value === "Biweekly") {
          updated.dueDay = "";
          updated.firstPaymentDate =
            updated.firstPaymentDate || updated.startDate || "";

          if (updated.firstPaymentDate && updated.term) {
            updated.maturityDate = calculateBiweeklyMaturityDate(
              updated.firstPaymentDate,
              updated.term
            );
          } else {
            updated.maturityDate = "";
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
        if (updated.paymentFrequency === "Biweekly") {
          updated.firstPaymentDate = updated.firstPaymentDate || value;
          updated.dueDay = "";

          if (updated.term) {
            updated.maturityDate = calculateBiweeklyMaturityDate(
              updated.firstPaymentDate,
              updated.term
            );
          }
        } else {
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
      }

      if (
        name === "firstPaymentDate" &&
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money" &&
        updated.paymentFrequency === "Biweekly"
      ) {
        updated.dueDay = "";

        if (value && updated.term) {
          updated.maturityDate = calculateBiweeklyMaturityDate(
            value,
            updated.term
          );
        } else {
          updated.maturityDate = "";
        }
      }

      if (
        name === "term" &&
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money"
      ) {
        if (updated.paymentFrequency === "Biweekly") {
          updated.dueDay = "";

          if (updated.firstPaymentDate && value) {
            updated.maturityDate = calculateBiweeklyMaturityDate(
              updated.firstPaymentDate,
              value
            );
          } else {
            updated.maturityDate = "";
          }
        } else {
          updated.maturityDate = calculateMaturityDate(
            updated.startDate,
            updated.dueDay,
            value
          );
        }
      }

      if (
        name === "dueDay" &&
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money" &&
        updated.paymentFrequency === "Monthly"
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
      paymentFrequency: formData.paymentFrequency || "Monthly",
      firstPaymentDate: formData.firstPaymentDate || "",
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

    if (data.referralAmountPaid && Number(data.referralAmountPaid) < 0) {
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

      if (!data.paymentFrequency) {
        return "Payment frequency is required.";
      }

      if (!["Monthly", "Biweekly"].includes(data.paymentFrequency)) {
        return "Payment frequency must be Monthly or Biweekly.";
      }

      if (!data.monthlyPayment || Number(data.monthlyPayment) <= 0) {
        return "Payment amount must be greater than 0.";
      }

      if (!data.term || Number(data.term) <= 0) {
        return "Term must be greater than 0.";
      }

      if (!Number.isInteger(Number(data.term))) {
        return "Term must be a whole number.";
      }

      if (data.paymentFrequency === "Monthly") {
        if (!data.dueDay || Number(data.dueDay) <= 0) {
          return "Due day is required for monthly deals.";
        }

        if (Number(data.dueDay) < 1 || Number(data.dueDay) > 31) {
          return "Due day must be between 1 and 31.";
        }
      }

      if (data.paymentFrequency === "Biweekly") {
        if (!data.firstPaymentDate) {
          return "First payment date is required for biweekly deals.";
        }

        if (data.firstPaymentDate < data.startDate) {
          return "First payment date cannot be before the start date.";
        }
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
    setSuccessDealLink(null);

    const validationError = validateDealForm();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      scrollToMessageArea();
      return;
    }

    const data = cleanFormData();

    const savedPaymentFrequency = getSavedPaymentFrequency(data);
    const savedPaymentAmount = getSavedPaymentAmount(data);
    const savedDueDay = getSavedDueDay(data);
    const savedTerm = getSavedTerm(data);
    const savedFirstPaymentDate = getSavedFirstPaymentDate(data);
    const savedMaturityDate = getSavedMaturityDate(data);

    const scheduleCheckForConfirm = getScheduleMathCheck(data);

    const scheduleWarningText = scheduleCheckForConfirm.hasWarning
      ? `\n\nSchedule Math Warning:\n${scheduleCheckForConfirm.warningText}\n\nContinue only if this difference is intentional.`
      : "";

    const confirmed = window.confirm(
      `${
        data.selectedCustomerId
          ? "Are you sure you want to add this new deal to the selected existing customer?"
          : "Are you sure you want to create this customer and deal?"
      }${scheduleWarningText}`
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);

      const existingDeal = await checkDealTagExists(data.dealTag);

      if (existingDeal) {
        setMessage(`Deal tag ${data.dealTag} already exists.`);
        setMessageType("error");
        scrollToMessageArea();
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
        monthlyPayment: savedPaymentAmount,
        paymentFrequency: savedPaymentFrequency,
        firstPaymentDate: savedFirstPaymentDate,
        dueDay: savedDueDay,
        term: savedTerm,
        maturityDate: savedMaturityDate,
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
          monthly_payment: savedPaymentAmount,
          payment_frequency: savedPaymentFrequency,
          first_payment_date: savedFirstPaymentDate,
          due_day: savedDueDay,
          term: savedTerm,
          start_date: data.startDate || null,
          maturity_date: savedMaturityDate,
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
      setSuccessDealLink({
        id: savedDeal?.id || "",
        dealTag: savedDeal?.deal_tag || data.dealTag || "",
      });
      scrollToMessageArea();

      setFormData(initialFormData);
      setCustomerSearchOpen(false);
      await loadCustomers();
    } catch (error) {
      setMessage(`Failed to create deal: ${error.message}`);
      setMessageType("error");
      scrollToMessageArea();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      {isSaving && (
        <div style={savingOverlay}>
          <div style={savingCard}>
            <LoadingSpinner
              message="Creating deal..."
              height="160px"
              size={46}
            />

            <p style={savingText}>
              Please wait. The customer and deal are being saved.
            </p>
          </div>
        </div>
      )}
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

      <div ref={messageAreaRef} />

      {message && (
        <div
          style={{
            ...messageBox,
            ...(messageType === "success" ? successMessage : errorMessage),
          }}
        >
          <div>{message}</div>

          {messageType === "success" && successDealLink?.id && (
            <Link to={`/deals/${successDealLink.id}`} style={goToDealButton}>
              Open Deal{" "}
              {successDealLink.dealTag ? `#${successDealLink.dealTag}` : ""}
            </Link>
          )}
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
            ? "Cash deals do not require a payment schedule."
            : isRegistrationMoneyDeal
            ? "Registration Money is treated as a one-time scheduled receivable."
            : isBiweeklyPayment
            ? "Biweekly schedule is calculated from the first payment date, payment amount, and number of payments."
            : "Monthly schedule is calculated from start date, due day, term, and payment amount."
        }
      >
        {isCashDeal && (
          <div style={infoBox}>
            Cash deal selected. Payment amount, frequency, due day, term, and
            maturity date are not required.
          </div>
        )}

        {isRegistrationMoneyDeal && (
          <div style={infoBox}>
            Registration Money selected. Use the tentative due date as the date
            the customer is expected to pay title or registration money. Term
            will stay 1 and payment amount will match the total amount.
          </div>
        )}

        {!isCashDeal && !isRegistrationMoneyDeal && isBiweeklyPayment && (
          <div style={biweeklyInfoBox}>
            Biweekly selected. The app will create one installment every 14 days
            starting from the first payment date. Term means number of biweekly
            payments.
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
                : isRegistrationMoneyDeal
                ? "This is the one-time expected payment date."
                : isBiweeklyPayment
                ? "Deal start date. First payment date below controls the biweekly schedule."
                : "Due day will auto-fill from this date."
            }
          />

          {!isCashDeal && !isRegistrationMoneyDeal && (
            <Select
              label="Payment Frequency"
              name="paymentFrequency"
              value={formData.paymentFrequency}
              onChange={handleChange}
              options={["Monthly", "Biweekly"]}
              required
              helperText="Choose Monthly for once per month or Biweekly for every 14 days."
            />
          )}

          <Input
            label={
              isRegistrationMoneyDeal
                ? "One-Time Amount"
                : isBiweeklyPayment
                ? "Biweekly Payment"
                : "Monthly Payment"
            }
            name="monthlyPayment"
            type="number"
            value={formData.monthlyPayment}
            onChange={handleChange}
            required={!isCashDeal}
            disabled={isCashDeal || isRegistrationMoneyDeal}
            placeholder="Example: 500"
            helperText={
              isCashDeal
                ? "Not required for Cash deals."
                : isRegistrationMoneyDeal
                ? "Auto-filled from registration money amount."
                : isBiweeklyPayment
                ? "Amount due every 14 days."
                : "Amount due every month."
            }
          />

          {isMonthlyPayment && !isCashDeal && !isRegistrationMoneyDeal && (
            <Input
              label="Due Day"
              name="dueDay"
              type="number"
              value={formData.dueDay}
              onChange={handleChange}
              required
              placeholder="Auto from start date"
              helperText="Auto-filled from start date but can be edited for monthly payment deals."
            />
          )}

          {isBiweeklyPayment && !isCashDeal && !isRegistrationMoneyDeal && (
            <Input
              label="First Payment Date"
              name="firstPaymentDate"
              type="date"
              value={formData.firstPaymentDate}
              onChange={handleChange}
              required
              helperText="First installment due date. Future payments repeat every 14 days."
            />
          )}

          <Input
            label={
              isBiweeklyPayment && !isRegistrationMoneyDeal
                ? "Number of Biweekly Payments"
                : "Term"
            }
            name="term"
            type="number"
            value={formData.term}
            onChange={handleChange}
            required={!isCashDeal}
            disabled={isCashDeal || isRegistrationMoneyDeal}
            placeholder={isBiweeklyPayment ? "Example: 26" : "Example: 5"}
            helperText={
              isBiweeklyPayment && !isRegistrationMoneyDeal
                ? "For biweekly deals, term means total number of 14-day payments."
                : "For monthly deals, term means total number of monthly payments."
            }
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
                : isBiweeklyPayment
                ? "Auto-calculated from first payment date and number of biweekly payments."
                : "Auto-calculated from start date, due day, and term."
            }
          />
        </div>

        {!isCashDeal && (
          <ScheduleMathCard
            scheduleMath={scheduleMath}
            onUseSuggestedPayment={applySuggestedPaymentAmount}
          />
        )}
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
        {isSaving ? "Creating Deal..." : "Create Deal"}
        </button>

        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => {
            setFormData(initialFormData);
            setMessage("");
            setMessageType("");
            setSuccessDealLink(null);
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

function calculateBiweeklyMaturityDate(firstPaymentDate, term) {
  if (!firstPaymentDate || !term || Number(term) <= 0) return "";

  const date = new Date(`${firstPaymentDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  date.setDate(date.getDate() + (Number(term) - 1) * 14);

  return date.toISOString().split("T")[0];
}

function getSavedPaymentFrequency(data) {
  if (data.dealType === "Cash") return null;
  if (data.dealType === "Registration Money") return "One-Time";

  return data.paymentFrequency || "Monthly";
}

function getSavedPaymentAmount(data) {
  if (data.dealType === "Cash") return 0;
  if (data.dealType === "Registration Money") {
    return Number(data.totalAmount || 0);
  }

  return Number(data.monthlyPayment || 0);
}

function getSavedDueDay(data) {
  if (data.dealType === "Cash") return null;
  if (data.paymentFrequency === "Biweekly") return null;

  return Number(data.dueDay || 0);
}

function getSavedTerm(data) {
  if (data.dealType === "Cash") return null;
  if (data.dealType === "Registration Money") return 1;

  return Number(data.term || 0);
}

function getSavedFirstPaymentDate(data) {
  if (data.dealType === "Cash") return null;
  if (data.dealType === "Registration Money") return null;
  if (data.paymentFrequency !== "Biweekly") return null;

  return data.firstPaymentDate || data.startDate || null;
}

function getSavedMaturityDate(data) {
  if (data.dealType === "Cash") return null;
  if (data.dealType === "Registration Money") return data.startDate;

  if (data.paymentFrequency === "Biweekly") {
    return (
      data.maturityDate ||
      calculateBiweeklyMaturityDate(
        data.firstPaymentDate || data.startDate,
        data.term
      )
    );
  }

  return data.maturityDate;
}

function getScheduleMathCheck(data) {
  const totalAmount = Number(data.totalAmount || 0);
  const paymentAmount =
    data.dealType === "Registration Money"
      ? Number(data.totalAmount || 0)
      : Number(data.monthlyPayment || 0);

  const term =
    data.dealType === "Registration Money" ? 1 : Number(data.term || 0);

  const paymentFrequency =
    data.dealType === "Registration Money"
      ? "One-Time"
      : data.paymentFrequency || "Monthly";

  const paymentLabel =
    paymentFrequency === "Biweekly"
      ? "Biweekly Payment"
      : paymentFrequency === "One-Time"
      ? "One-Time Amount"
      : "Monthly Payment";

  const shouldShow =
    data.dealType !== "Cash" &&
    (totalAmount > 0 || paymentAmount > 0 || term > 0);

  const scheduledTotal =
    data.dealType === "Registration Money"
      ? totalAmount
      : paymentAmount * term;

  const difference = Number((scheduledTotal - totalAmount).toFixed(2));
  const absoluteDifference = Math.abs(difference);

  const suggestedPaymentAmount =
    totalAmount > 0 && term > 0
      ? Number((totalAmount / term).toFixed(2))
      : 0;

  const hasWarning =
    shouldShow &&
    data.dealType !== "Registration Money" &&
    totalAmount > 0 &&
    paymentAmount > 0 &&
    term > 0 &&
    absoluteDifference > 1;

  const warningText =
    difference > 0
      ? `Scheduled total is ${formatMoneyLocal(
          absoluteDifference
        )} more than the total amount. Check payment amount or term.`
      : `Scheduled total is ${formatMoneyLocal(
          absoluteDifference
        )} less than the total amount. Check payment amount or term.`;

  return {
    shouldShow,
    hasWarning,
    totalAmount,
    paymentAmount,
    term,
    paymentFrequency,
    paymentLabel,
    scheduledTotal,
    difference,
    suggestedPaymentAmount,
    warningText,
  };
}

function formatMoneyLocal(value) {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function ScheduleMathCard({ scheduleMath, onUseSuggestedPayment }) {
  if (!scheduleMath.shouldShow) return null;

  return (
    <div
      style={{
        ...scheduleMathCard,
        ...(scheduleMath.hasWarning
          ? scheduleMathWarningCard
          : scheduleMathGoodCard),
      }}
    >
      <div style={scheduleMathHeader}>
        <div>
          <strong style={scheduleMathTitle}>Schedule Math Check</strong>
          <p style={scheduleMathDescription}>
            Confirms the payment amount and term match the total deal amount.
          </p>
        </div>

        <span
          style={
            scheduleMath.hasWarning
              ? scheduleMathWarningBadge
              : scheduleMathGoodBadge
          }
        >
          {scheduleMath.hasWarning ? "Check Needed" : "Looks Good"}
        </span>
      </div>

      <div style={scheduleMathGrid}>
        <div style={scheduleMathItem}>
          <span>Total Amount</span>
          <strong>{formatMoneyLocal(scheduleMath.totalAmount)}</strong>
        </div>

        <div style={scheduleMathItem}>
          <span>{scheduleMath.paymentLabel}</span>
          <strong>{formatMoneyLocal(scheduleMath.paymentAmount)}</strong>
        </div>

        <div style={scheduleMathItem}>
          <span>Term</span>
          <strong>{scheduleMath.term || "—"}</strong>
        </div>

        <div style={scheduleMathItem}>
          <span>Scheduled Total</span>
          <strong>{formatMoneyLocal(scheduleMath.scheduledTotal)}</strong>
        </div>

        <div style={scheduleMathItem}>
          <span>Difference</span>
          <strong
            style={{
              color: scheduleMath.hasWarning ? "#991b1b" : "#166534",
            }}
          >
            {formatMoneyLocal(scheduleMath.difference)}
          </strong>
        </div>
      </div>

      {scheduleMath.hasWarning ? (
        <div style={scheduleMathWarningText}>
          {scheduleMath.warningText}

          {scheduleMath.suggestedPaymentAmount > 0 && (
            <button
              type="button"
              onClick={onUseSuggestedPayment}
              style={useSuggestedButton}
            >
              Use Suggested {scheduleMath.paymentLabel}:{" "}
              {formatMoneyLocal(scheduleMath.suggestedPaymentAmount)}
            </button>
          )}
        </div>
      ) : (
        <div style={scheduleMathGoodText}>
          Scheduled total matches the total amount.
        </div>
      )}
    </div>
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
  disabled,
  helperText,
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
        disabled={disabled}
        style={{
          ...inputStyle,
          background: disabled ? "#f3f4f6" : "white",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {helperText && <small style={helperTextStyle}>{helperText}</small>}
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
  display: "grid",
  gap: "9px",
};

const goToDealButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "9px 13px",
  textDecoration: "none",
  fontWeight: "900",
  fontSize: "13px",
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

const biweeklyInfoBox = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  padding: "13px",
  borderRadius: "10px",
  color: "#1d4ed8",
  marginBottom: "16px",
  fontWeight: "800",
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

const scheduleMathCard = {
  marginTop: "16px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
};

const scheduleMathGoodCard = {
  background: "#f0fdf4",
  borderColor: "#bbf7d0",
};

const scheduleMathWarningCard = {
  background: "#fffbeb",
  borderColor: "#fde68a",
};

const scheduleMathHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const scheduleMathTitle = {
  display: "block",
  color: "#111827",
  fontSize: "15px",
};

const scheduleMathDescription = {
  margin: "4px 0 0",
  color: "#667085",
  fontSize: "13px",
};

const scheduleMathGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: "10px",
};

const scheduleMathItem = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "10px",
  display: "grid",
  gap: "4px",
  color: "#111827",
};

const scheduleMathGoodBadge = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const scheduleMathWarningBadge = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const scheduleMathGoodText = {
  marginTop: "12px",
  color: "#166534",
  fontWeight: "900",
  fontSize: "13px",
};

const scheduleMathWarningText = {
  marginTop: "12px",
  color: "#92400e",
  fontWeight: "900",
  fontSize: "13px",
  display: "grid",
  gap: "10px",
};

const useSuggestedButton = {
  width: "fit-content",
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: "900",
};

const savingOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.48)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const savingCard = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  width: "100%",
  maxWidth: "420px",
  boxShadow: "0 20px 55px rgba(15, 23, 42, 0.30)",
  color: "#111827",
  textAlign: "center",
};

const savingText = {
  margin: "10px 0 0",
  color: "#667085",
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: "1.45",
};

export default DealForm;