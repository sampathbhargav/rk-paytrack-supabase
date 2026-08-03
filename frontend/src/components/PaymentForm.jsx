import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getDeals } from "../api/dealsApi";
import { getPayments, addPayment } from "../api/paymentsApi";
import { getDealDueSchedule } from "../utils/duePaymentsUtils";
import { formatMoney } from "../utils/moneyUtils";
import { logActivity } from "../api/activityLogsApi";
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
  const [receiptPrompt, setReceiptPrompt] = useState(null);
  const [successDealLink, setSuccessDealLink] = useState(null);

  const [formData, setFormData] = useState(initialFormData);
  const [dealSearchText, setDealSearchText] = useState("");
  const [dealSearchOpen, setDealSearchOpen] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const messageAreaRef = useRef(null);
  const dealSearchWrapperRef = useRef(null);

  const location = useLocation();
  const [searchParams] = useSearchParams();

  const preselectedDealId =
    searchParams.get("dealId") || location.state?.preselectedDealId || "";

  const [preselectApplied, setPreselectApplied] = useState(false);

  const scrollToMessageArea = () => {
    setTimeout(() => {
      messageAreaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dealSearchWrapperRef.current &&
        !dealSearchWrapperRef.current.contains(event.target)
      ) {
        setDealSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (preselectApplied || !preselectedDealId || deals.length === 0) return;

    const matchingDeal = deals.find(
      (deal) => String(deal.id) === String(preselectedDealId)
    );

    if (!matchingDeal) return;

    setFormData((prev) => ({
      ...prev,
      dealId: matchingDeal.id,
      dueDate: "",
      amountDue: "",
      amountPaid: "",
      promisedDate: "",
      notes: "",
    }));

    setDealSearchText(getDealSearchLabel(matchingDeal));
    setDealSearchOpen(false);
    setPreselectApplied(true);
  }, [preselectApplied, preselectedDealId, deals]);

  const loadData = async ({ clearMessages = true } = {}) => {
    try {
      if (clearMessages) {
        setMessage("");
        setMessageType("");
        setReceiptPrompt(null);
        setSuccessDealLink(null);
      }

      const dealsData = await getDeals();
      const paymentsData = await getPayments();

      setDeals(dealsData || []);
      setPayments(paymentsData || []);
    } catch (error) {
      setMessage(`Failed to load payment form data: ${error.message}`);
      setMessageType("error");
      setSuccessDealLink(null);
      scrollToMessageArea();
    }
  };

  const selectedDeal = deals.find(
    (deal) => String(deal.id) === String(formData.dealId)
  );

  const filteredDealOptions = getFilteredDealOptions(deals, dealSearchText);

  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const installmentOptions = selectedDeal
    ? getInstallmentOptions(selectedDeal, activePayments)
    : [];

    const selectedInstallment = installmentOptions.find(
      (item) => item.dueDate === formData.dueDate
    );
  
    const selectedDealTotalPaid = selectedDeal
      ? activePayments
          .filter((payment) => String(payment.deal_id) === String(selectedDeal.id))
          .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0)
      : 0;
  
    const selectedDealRemainingBalance = selectedDeal
      ? Math.max(
          Number(selectedDeal.total_amount || 0) - selectedDealTotalPaid,
          0
        )
      : 0;
  
    const amountDue = Number(formData.amountDue || 0);
    const amountPaid = Number(formData.amountPaid || 0);

  const totalOpenFromSelected = getTotalOpenFromSelectedInstallment(
    installmentOptions,
    formData.dueDate
  );

  const paymentAllocations =
    selectedDeal && formData.dueDate && amountPaid > 0
      ? buildPaymentAllocations(installmentOptions, formData.dueDate, amountPaid)
      : [];

  const selectedInstallmentRemainingAfterPayment = Math.max(
    amountDue - amountPaid,
    0
  );

  const totalRemainingAfterPayment = Math.max(
    totalOpenFromSelected - amountPaid,
    0
  );

  const extraPaymentAmount = Math.max(amountPaid - amountDue, 0);

  const overpaymentAmount = Math.max(amountPaid - totalOpenFromSelected, 0);

  const isOverpayingDealBalance =
    selectedDeal &&
    formData.dueDate &&
    amountPaid > totalOpenFromSelected;

  const isExtraAppliedToFutureInstallments =
    selectedDeal &&
    formData.dueDate &&
    amountPaid > amountDue &&
    amountPaid <= totalOpenFromSelected;

  const clearStatusMessages = () => {
    setMessage("");
    setMessageType("");
    setReceiptPrompt(null);
    setSuccessDealLink(null);
  };

  const resetDealPaymentFields = () => {
    setFormData((prev) => ({
      ...prev,
      dealId: "",
      dueDate: "",
      amountDue: "",
      amountPaid: "",
      promisedDate: "",
      notes: "",
    }));
  };

  const handleDealSearchChange = (e) => {
    const value = e.target.value;

    clearStatusMessages();
    setDealSearchText(value);
    setDealSearchOpen(true);
    resetDealPaymentFields();
  };

  const handleSelectDeal = (deal) => {
    clearStatusMessages();

    setFormData((prev) => ({
      ...prev,
      dealId: deal.id,
      dueDate: "",
      amountDue: "",
      amountPaid: "",
      promisedDate: "",
      notes: "",
    }));

    setDealSearchText(getDealSearchLabel(deal));
    setDealSearchOpen(false);
  };

  const handleClearSelectedDeal = () => {
    clearStatusMessages();
    setDealSearchText("");
    setDealSearchOpen(false);
    resetDealPaymentFields();
  };

  const handleInstallmentChange = (e) => {
    const selectedDueDate = e.target.value;

    const installment = installmentOptions.find(
      (item) => item.dueDate === selectedDueDate
    );

    clearStatusMessages();

    setFormData((prev) => ({
      ...prev,
      dueDate: selectedDueDate,
      amountDue: installment ? installment.remainingForDueDate : "",
      amountPaid: installment ? installment.remainingForDueDate : "",
      promisedDate: "",
    }));
  };

  const handleChange = (e) => {
    clearStatusMessages();

    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validatePaymentForm = () => {
    if (!formData.dealId) {
      return "Please search and select a deal.";
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

    if (Number(formData.amountPaid) > Number(totalOpenFromSelected || 0)) {
      return `Overpayment not allowed. Customer is trying to pay ${formatMoney(
        Number(formData.amountPaid || 0)
      )}, but the remaining open balance from this installment forward is only ${formatMoney(
        totalOpenFromSelected
      )}. Extra amount: ${formatMoney(
        overpaymentAmount
      )}. Record only ${formatMoney(
        totalOpenFromSelected
      )} or refund/handle the extra amount outside this payment.`;
    }

    if (!formData.paymentMethod) {
      return "Payment method is required.";
    }

    if (amountPaid < amountDue && !formData.promisedDate) {
      return "Promised date is required when the customer pays a partial amount on the selected installment.";
    }

    if (formData.promisedDate && formData.promisedDate < formData.paymentDate) {
      return "Promised date cannot be before the payment date.";
    }

    if (paymentAllocations.length === 0) {
      return "Unable to apply this payment to the selected installment.";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");
    setReceiptPrompt(null);
    setSuccessDealLink(null);
    setReceipt(null);

    const validationError = validatePaymentForm();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      scrollToMessageArea();
      return;
    }

    const allocationText = paymentAllocations
      .map(
        (allocation) =>
          `Installment ${allocation.installmentNumber} (${formatDisplayDate(
            allocation.dueDate
          )}) - ${formatMoney(allocation.amountApplied)}`
      )
      .join("\n");

    const confirmed = window.confirm(
      `Are you sure you want to save this payment?\n\nThis payment will be applied like this:\n\n${allocationText}`
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);

      const selectedDealData = deals.find(
        (deal) => String(deal.id) === String(formData.dealId)
      );

      const selectedDealPaymentFrequency = getPaymentFrequency(selectedDealData);

      const savedPaymentRecords = [];

      for (const allocation of paymentAllocations) {
        const isSelectedInstallment = allocation.dueDate === formData.dueDate;
        const isPartialSelectedInstallment =
          isSelectedInstallment && amountPaid < amountDue;

        const allocationPaymentFrequency =
          allocation.paymentFrequency || selectedDealPaymentFrequency;

        const paymentPayload = {
          ...formData,
          paymentFrequency: allocationPaymentFrequency,
          payment_frequency: allocationPaymentFrequency,
          dueDate: allocation.dueDate,
          amountDue: allocation.remainingForDueDate,
          amountPaid: allocation.amountApplied,
          promisedDate: isPartialSelectedInstallment
            ? formData.promisedDate
            : "",
          notes: buildAllocationNote({
            originalNotes: formData.notes,
            allocation,
            totalPayment: amountPaid,
            isSplitPayment: paymentAllocations.length > 1,
          }),
        };

        const savedPayment = await addPayment(paymentPayload);
        const savedPaymentRecord = Array.isArray(savedPayment)
          ? savedPayment[0]
          : savedPayment;

        if (savedPaymentRecord) {
          savedPaymentRecords.push(savedPaymentRecord);
        }
      }

      const firstSavedPayment = savedPaymentRecords[0] || null;

      const totalPaidForDealBeforeThisPayment = activePayments
        .filter((payment) => String(payment.deal_id) === String(formData.dealId))
        .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);

      const newTotalPaid =
        totalPaidForDealBeforeThisPayment + Number(formData.amountPaid || 0);

      const remainingBalance = Math.max(
        Number(selectedDealData?.total_amount || 0) - newTotalPaid,
        0
      );

      const paymentType =
        paymentAllocations.length > 1
          ? `Split ${selectedDealPaymentFrequency} Payment`
          : getReceiptPaymentType({
              amountDue: formData.amountDue,
              amountPaid: formData.amountPaid,
              paymentFrequency: selectedDealPaymentFrequency,
            });

      const receiptData = {
        paymentId: firstSavedPayment?.id || "",
        customerName: selectedDealData?.customers?.customer_name || "",
        phone: selectedDealData?.customers?.phone || "",
        dealTag: selectedDealData?.deal_tag || "",
        dealType: selectedDealData?.deal_type || "",
        paymentFrequency: selectedDealPaymentFrequency,
        truck: `${selectedDealData?.year || ""} ${
          selectedDealData?.truck || ""
        }`.trim(),
        vin: selectedDealData?.vin || "",
        amountPaid: Number(formData.amountPaid || 0),
        paymentMethod: formData.paymentMethod || "Other",
        paymentDate: formData.paymentDate || "",
        dueDate: formData.dueDate || "",
        paymentType,
        paymentStatus: "Active",
        remainingBalance,
        notes:
          paymentAllocations.length > 1
            ? `Payment was automatically applied across ${
                paymentAllocations.length
              } installments:\n${allocationText}\n\n${formData.notes || ""}`
            : formData.notes || "",
      };

      await logActivity({
        action: "PAYMENT",
        module: "Payments",
        entity_type: "deal_payment",
        entity_id: firstSavedPayment?.id || formData.dealId,
        entity_label:
          selectedDealData?.deal_tag ||
          selectedDealData?.customers?.customer_name ||
          "Deal Payment",
        description: `${selectedDealPaymentFrequency} deal payment of ${formatMoney(
          Number(formData.amountPaid || 0)
        )} recorded for ${
          selectedDealData?.customers?.customer_name || "customer"
        } on deal ${selectedDealData?.deal_tag || "—"}. ${
          paymentAllocations.length > 1
            ? "Extra payment was automatically applied to next installment(s)."
            : ""
        }`,
        metadata: {
          payment_id: firstSavedPayment?.id || null,
          payment_ids: savedPaymentRecords.map((payment) => payment.id),
          deal_id: formData.dealId,
          customer_id: selectedDealData?.customer_id || null,
          customer_name: selectedDealData?.customers?.customer_name || "",
          phone: selectedDealData?.customers?.phone || "",
          deal_tag: selectedDealData?.deal_tag || "",
          deal_type: selectedDealData?.deal_type || "",
          deal_subtype: selectedDealData?.deal_subtype || "",
          payment_frequency: selectedDealPaymentFrequency,
          truck: selectedDealData?.truck || "",
          year: selectedDealData?.year || "",
          vin: selectedDealData?.vin || "",
          amount_due: Number(formData.amountDue || 0),
          amount_paid: Number(formData.amountPaid || 0),
          extra_payment_amount: extraPaymentAmount,
          selected_installment_remaining_after_payment:
            selectedInstallmentRemainingAfterPayment,
          total_open_from_selected: totalOpenFromSelected,
          total_remaining_after_payment: totalRemainingAfterPayment,
          remaining_deal_balance: remainingBalance,
          payment_date: formData.paymentDate,
          due_date: formData.dueDate,
          payment_method: formData.paymentMethod,
          payment_type: paymentType,
          promised_date: formData.promisedDate || "",
          notes: formData.notes || "",
          allocations: paymentAllocations.map((allocation) => ({
            due_date: allocation.dueDate,
            installment_number: allocation.installmentNumber,
            payment_frequency:
              allocation.paymentFrequency || selectedDealPaymentFrequency,
            installment_remaining_before_payment:
              allocation.remainingForDueDate,
            amount_applied: allocation.amountApplied,
            remaining_after_payment: allocation.remainingAfterPayment,
          })),
        },
      });

      setReceiptPrompt(receiptData);

      setSuccessDealLink({
        id: selectedDealData?.id || formData.dealId,
        dealTag: selectedDealData?.deal_tag || "",
      });

      setMessage(
        `Payment saved successfully. ${formatMoney(
          Number(formData.amountPaid || 0)
        )} was recorded for ${
          selectedDealData?.customers?.customer_name || "customer"
        }. ${
          paymentAllocations.length > 1
            ? "Extra payment was applied to the next installment(s)."
            : ""
        }`
      );

      setMessageType("success");
      scrollToMessageArea();

      setFormData(initialFormData);
      setDealSearchText("");
      setDealSearchOpen(false);

      await loadData({ clearMessages: false });
    } catch (error) {
      setMessage(`Failed to save payment: ${error.message}`);
      setMessageType("error");
      setSuccessDealLink(null);
      scrollToMessageArea();
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
            Record customer payments, partial payments, promised remaining
            amounts, and extra payments applied to future installments.
          </p>
        </div>

        {selectedDeal ? (
          <span style={getDealStatusBadgeStyle(selectedDeal.status)}>
            {selectedDeal.status || "Active"}
          </span>
        ) : (
          <span style={neutralBadge}>Search Deal</span>
        )}
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

      {receiptPrompt && (
        <div style={receiptPromptBox}>
          <div>
            <strong style={receiptPromptTitle}>
              Payment recorded successfully.
            </strong>
            <p style={receiptPromptText}>
              Do you want to print or view the payment receipt now?
            </p>
          </div>

          <div style={receiptPromptActions}>
            <button
              type="button"
              style={printReceiptButton}
              onClick={() => setReceipt(receiptPrompt)}
            >
              Print / View Receipt
            </button>

            <button
              type="button"
              style={skipReceiptButton}
              onClick={() => setReceiptPrompt(null)}
            >
              Not Now
            </button>
          </div>
        </div>
      )}

      <Section
        title="Payment Selection"
        description="Search by deal tag, customer name, company, phone, truck, VIN, type, or status."
      >
        <div style={grid}>
          <div style={dealSearchWrapper} ref={dealSearchWrapperRef}>
            <label style={labelStyle}>
              Search Deal / Customer <span style={requiredMark}>*</span>
            </label>

            <input
              type="text"
              value={dealSearchText}
              onChange={handleDealSearchChange}
              onFocus={() => setDealSearchOpen(true)}
              style={{
                ...inputStyle,
                ...(selectedDeal ? selectedDealInputStyle : {}),
              }}
              placeholder="Type deal #, customer, company, phone, VIN, or truck..."
              autoComplete="off"
            />

            {selectedDeal && (
              <div style={selectedSearchDealCard}>
                <div>
                  <strong>
                    Deal #{selectedDeal.deal_tag || "—"} ·{" "}
                    {selectedDeal.customers?.customer_name || "Customer"}
                  </strong>
                  <p>
                    {selectedDeal.customers?.company_name
                      ? `${selectedDeal.customers.company_name} · `
                      : ""}
                    {getPaymentFrequency(selectedDeal)} ·{" "}
                    {selectedDeal.status || "Active"} · Balance schedule ready
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClearSelectedDeal}
                  style={clearSelectedDealButton}
                >
                  Change
                </button>
              </div>
            )}

            {dealSearchOpen && (
              <div style={dealDropdown}>
                {dealSearchText.trim().length === 0 ? (
                  <div style={dealDropdownEmpty}>
                    Start typing to search deals.
                  </div>
                ) : filteredDealOptions.length === 0 ? (
                  <div style={dealDropdownEmpty}>
                    No matching deals found.
                  </div>
                ) : (
                  filteredDealOptions.map((deal) => (
                    <button
                      type="button"
                      key={deal.id}
                      onClick={() => handleSelectDeal(deal)}
                      style={dealDropdownItem}
                    >
                      <div style={dealOptionTopRow}>
                        <strong style={dealOptionTitle}>
                          #{deal.deal_tag || "—"} ·{" "}
                          {deal.customers?.customer_name || "Customer"}
                        </strong>

                        <span style={getDealStatusBadgeStyle(deal.status)}>
                          {deal.status || "Active"}
                        </span>
                      </div>

                      <div style={dealOptionMeta}>
                        <span>{getPaymentFrequency(deal)}</span>
                        <span>{deal.deal_type || "No Type"}</span>
                        {deal.customers?.company_name && (
                          <span>🏢 {deal.customers.company_name}</span>
                        )}
                        {deal.customers?.phone && (
                          <span>📞 {deal.customers.phone}</span>
                        )}
                      </div>

                      <div style={dealOptionSubText}>
                        {`${deal.year || ""} ${deal.truck || ""}`.trim() ||
                          "No truck listed"}
                        {deal.vin ? ` · VIN ${deal.vin}` : ""}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* <small style={helperTextStyle}>
              This is faster than scrolling through every deal in a dropdown.
            </small> */}
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
                  {formatDisplayDate(item.dueDate)} -{" "}
                  {item.paymentFrequency || getPaymentFrequency(selectedDeal)}{" "}
                  Installment {item.installmentNumber} - Remaining{" "}
                  {formatMoney(item.remainingForDueDate)}
                </option>
              ))}
            </select>

            <small style={helperTextStyle}>
              After selecting a deal, choose the installment where this payment
              starts.
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
              label="Payment Frequency"
              value={getPaymentFrequency(selectedDeal)}
            />

            <InfoItem
              label={getPaymentAmountLabel(selectedDeal)}
              value={formatMoney(selectedDeal.monthly_payment)}
            />

            <InfoItem
              label="Total Remaining Balance"
              value={formatMoney(selectedDealRemainingBalance)}
            />

            <InfoItem
              label={
                getPaymentFrequency(selectedDeal) === "Biweekly"
                  ? "First Payment Date"
                  : "Start Date"
              }
              value={formatDisplayDate(getScheduleStartDate(selectedDeal))}
            />

            {getPaymentFrequency(selectedDeal) === "Monthly" && (
              <InfoItem label="Due Day" value={selectedDeal.due_day || "—"} />
            )}

            <InfoItem
              label={
                getPaymentFrequency(selectedDeal) === "Biweekly"
                  ? "Biweekly Payments"
                  : "Term"
              }
              value={selectedDeal.term || "—"}
            />

            <InfoItem
              label="Truck"
              value={`${selectedDeal.year || ""} ${selectedDeal.truck || ""}`}
            />
          </div>

          <div style={scheduleInfoBox}>
            {getPaymentFrequency(selectedDeal) === "Biweekly"
              ? "This is a biweekly deal. Due installments are generated every 14 days from the first payment date."
              : getPaymentFrequency(selectedDeal) === "Monthly"
              ? "This is a monthly deal. Due installments are generated from the start date, due day, and term."
              : "This deal uses its saved payment schedule."}
          </div>
        </div>
      )}

      <Section
        title="Payment Details"
        description="Enter the total amount received. Extra money is automatically applied to the next installment."
      >
        <div style={grid}>
          <Input
            label="Selected Installment Balance"
            name="amountDue"
            type="number"
            value={formData.amountDue}
            onChange={handleChange}
            required
            readOnly
            helperText="Auto-filled from the selected installment."
          />

          <Input
            label={
              formData.paymentMethod === "Referral Credit"
                ? "Referral Credit Applied"
                : "Amount Paid Today"
            }
            name="amountPaid"
            type="number"
            value={formData.amountPaid}
            onChange={handleChange}
            required
            helperText={
              selectedInstallment
                ? `Maximum allowed from this installment forward: ${formatMoney(
                    totalOpenFromSelected
                  )}`
                : "Select an installment first."
            }
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
              <option>Cash App</option>
              <option>Apple Pay</option>
              <option>Card</option>
              <option>Check</option>
              <option>ACH</option>
              <option>Referral Credit</option>
              <option>Other</option>
            </select>
          </div>

          <Input
            label="Promised Date"
            name="promisedDate"
            type="date"
            value={formData.promisedDate}
            onChange={handleChange}
            required={amountPaid > 0 && amountPaid < amountDue}
            helperText={
              amountPaid > 0 && amountPaid < amountDue
                ? "Required because the selected installment still has a balance."
                : "Not needed when extra payment is applied to future installments."
            }
          />
        </div>

        {selectedInstallment && (
          <div style={installmentSummaryBox}>
            <strong>Selected Installment:</strong>{" "}
            {formatDisplayDate(selectedInstallment.dueDate)} |{" "}
            {selectedInstallment.paymentFrequency ||
              getPaymentFrequency(selectedDeal)}{" "}
            Installment {selectedInstallment.installmentNumber} | Remaining{" "}
            {formatMoney(selectedInstallment.remainingForDueDate)}
          </div>
        )}
      </Section>

      {paymentAllocations.length > 0 && (
        <Section
          title="Payment Allocation Preview"
          description="This shows exactly how the payment will be applied before saving."
        >
          <div style={allocationTableWrapper}>
            <table style={allocationTable}>
              <thead>
                <tr>
                  <th style={allocationTh}>Installment</th>
                  <th style={allocationTh}>Frequency</th>
                  <th style={allocationTh}>Due Date</th>
                  <th style={allocationTh}>Current Remaining</th>
                  <th style={allocationTh}>Payment Applied</th>
                  <th style={allocationTh}>Remaining After</th>
                </tr>
              </thead>

              <tbody>
                {paymentAllocations.map((allocation) => (
                  <tr key={allocation.dueDate}>
                    <td style={allocationTd}>
                      Installment {allocation.installmentNumber}
                    </td>

                    <td style={allocationTd}>
                      {allocation.paymentFrequency ||
                        getPaymentFrequency(selectedDeal)}
                    </td>

                    <td style={allocationTd}>
                      {formatDisplayDate(allocation.dueDate)}
                    </td>

                    <td style={allocationTd}>
                      {formatMoney(allocation.remainingForDueDate)}
                    </td>

                    <td style={allocationTd}>
                      <strong>{formatMoney(allocation.amountApplied)}</strong>
                    </td>

                    <td style={allocationTd}>
                      <strong
                        style={{
                          color:
                            allocation.remainingAfterPayment > 0
                              ? "#991b1b"
                              : "#166534",
                        }}
                      >
                        {formatMoney(allocation.remainingAfterPayment)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isExtraAppliedToFutureInstallments && (
            <div style={extraPaymentBox}>
              Extra payment detected: {formatMoney(extraPaymentAmount)} will be
              applied toward the next unpaid installment(s).
            </div>
          )}

          {isOverpayingDealBalance && (
            <div style={overpaymentWarningBox}>
              Overpayment detected: {formatMoney(overpaymentAmount)} is above
              the remaining open balance and will not be saved.
            </div>
          )}
        </Section>
      )}

      <Section
        title="Payment Notes"
        description="Optional notes about this payment, promise, method, or customer conversation."
      >
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder={
            formData.paymentMethod === "Referral Credit"
              ? "Example: Referral bonus applied as payment for referring customer John Smith / Deal #1728."
              : "Example: Customer paid extra, and the extra amount was applied to the next installment."
          }
          style={notesInput}
        />
      </Section>

      <div style={paymentSummaryBox}>
        <div>
          <span style={summaryLabel}>Selected Installment Balance</span>
          <strong>{formatMoney(amountDue)}</strong>
        </div>

        <div>
          <span style={summaryLabel}>Paid Today</span>
          <strong>{formatMoney(amountPaid)}</strong>
        </div>

        <div>
          <span style={summaryLabel}>Total Remaining After Payment</span>
          <strong
            style={{
              color: totalRemainingAfterPayment > 0 ? "#991b1b" : "#166534",
            }}
          >
            {formatMoney(totalRemainingAfterPayment)}
          </strong>
        </div>
      </div>

      {amountPaid > 0 && amountPaid < amountDue && (
        <div style={partialWarningBox}>
          This is a partial payment. A promise will be created for the remaining
          amount when a promised date is entered.
        </div>
      )}

      {isExtraAppliedToFutureInstallments && (
        <div style={extraPaymentBox}>
          This payment is more than the selected installment. Extra amount{" "}
          {formatMoney(extraPaymentAmount)} will automatically go toward the
          next unpaid installment(s).
        </div>
      )}

      {isOverpayingDealBalance && (
        <div style={overpaymentWarningBox}>
          Overpayment detected. The customer is trying to pay{" "}
          {formatMoney(amountPaid)}, but only {formatMoney(totalOpenFromSelected)}{" "}
          is still open from this installment forward. Extra amount{" "}
          {formatMoney(overpaymentAmount)} should not be recorded as a normal
          payment.
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
            setDealSearchText("");
            setDealSearchOpen(false);
            setMessage("");
            setMessageType("");
            setReceiptPrompt(null);
            setSuccessDealLink(null);
            setReceipt(null);
          }}
        >
          Clear Form
        </button>
      </div>

      <PaymentReceipt receipt={receipt} onClose={() => setReceipt(null)} />
    </form>
  );
}

function getFilteredDealOptions(deals, searchText) {
  const query = String(searchText || "").trim().toLowerCase();

  if (!query) return [];

  return (deals || [])
    .filter((deal) => getDealSearchText(deal).includes(query))
    .slice(0, 12);
}

function getDealSearchText(deal) {
  return [
    deal?.deal_tag,
    deal?.deal_type,
    deal?.deal_subtype,
    deal?.status,
    deal?.truck,
    deal?.year,
    deal?.vin,
    deal?.customers?.customer_name,
    deal?.customers?.company_name,
    deal?.customers?.phone,
    deal?.customers?.email,
    getPaymentFrequency(deal),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getDealSearchLabel(deal) {
  if (!deal) return "";

  const customerName = deal.customers?.customer_name || "Customer";
  const companyName = deal.customers?.company_name
    ? ` · ${deal.customers.company_name}`
    : "";

  return `#${deal.deal_tag || "—"} · ${customerName}${companyName}`;
}

function getInstallmentOptions(deal, payments) {
  const schedule = getDealDueSchedule(deal);
  const dealPaymentFrequency = getPaymentFrequency(deal);

  return schedule
    .map((installment) => {
      const paidForDueDate = payments
        .filter(
          (payment) =>
            String(payment.deal_id) === String(deal.id) &&
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
        paymentFrequency: installment.paymentFrequency || dealPaymentFrequency,
        paidForDueDate,
        remainingForDueDate,
        status,
      };
    })
    .filter((item) => Number(item.remainingForDueDate || 0) > 0)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
}

function getTotalOpenFromSelectedInstallment(installmentOptions, selectedDueDate) {
  const selectedIndex = installmentOptions.findIndex(
    (item) => item.dueDate === selectedDueDate
  );

  if (selectedIndex === -1) return 0;

  return installmentOptions
    .slice(selectedIndex)
    .reduce((sum, item) => sum + Number(item.remainingForDueDate || 0), 0);
}

function buildPaymentAllocations(
  installmentOptions,
  selectedDueDate,
  amountPaid
) {
  const selectedIndex = installmentOptions.findIndex(
    (item) => item.dueDate === selectedDueDate
  );

  if (selectedIndex === -1) return [];

  let remainingPayment = Number(amountPaid || 0);
  const allocations = [];

  installmentOptions.slice(selectedIndex).forEach((installment) => {
    if (remainingPayment <= 0) return;

    const installmentRemaining = Number(installment.remainingForDueDate || 0);
    const amountApplied = Math.min(installmentRemaining, remainingPayment);

    if (amountApplied > 0) {
      allocations.push({
        ...installment,
        amountApplied: Number(amountApplied.toFixed(2)),
        remainingAfterPayment: Number(
          Math.max(installmentRemaining - amountApplied, 0).toFixed(2)
        ),
      });
    }

    remainingPayment = Number(
      Math.max(remainingPayment - amountApplied, 0).toFixed(2)
    );
  });

  return allocations;
}

function buildAllocationNote({
  originalNotes,
  allocation,
  totalPayment,
  isSplitPayment,
}) {
  const allocationNote = isSplitPayment
    ? `Auto-applied from total customer payment of ${formatMoney(
        totalPayment
      )}. Applied ${formatMoney(allocation.amountApplied)} to ${
        allocation.paymentFrequency || "scheduled"
      } installment ${allocation.installmentNumber} due ${formatDisplayDate(
        allocation.dueDate
      )}.`
    : "";

  return [allocationNote, originalNotes].filter(Boolean).join("\n");
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

function getPaymentFrequency(deal) {
  if (!deal) return "Monthly";

  if (deal.deal_type === "Cash") return "Cash";

  if (deal.deal_type === "Registration Money") return "One-Time";

  return deal.payment_frequency || deal.paymentFrequency || "Monthly";
}

function getPaymentAmountLabel(deal) {
  const frequency = getPaymentFrequency(deal);

  if (frequency === "Biweekly") return "Biweekly Payment";
  if (frequency === "One-Time") return "One-Time Amount";
  if (frequency === "Cash") return "Cash Amount";

  return "Monthly Payment";
}

function getScheduleStartDate(deal) {
  const frequency = getPaymentFrequency(deal);

  if (frequency === "Biweekly") {
    return deal?.first_payment_date || deal?.firstPaymentDate || deal?.start_date;
  }

  return deal?.start_date;
}

function getReceiptPaymentType({ amountDue, amountPaid, paymentFrequency }) {
  const due = Number(amountDue || 0);
  const paid = Number(amountPaid || 0);

  if (paymentFrequency === "Biweekly") {
    return paid >= due ? "Full Biweekly Payment" : "Partial Biweekly Payment";
  }

  if (paymentFrequency === "One-Time") {
    return paid >= due ? "Full One-Time Payment" : "Partial One-Time Payment";
  }

  if (paymentFrequency === "Cash") {
    return "Cash Payment";
  }

  return paid >= due ? "Full Payment" : "Partial Payment";
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

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

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

const selectedDealInputStyle = {
  borderColor: "#16a34a",
  background: "#f0fdf4",
};

const helperTextStyle = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  marginTop: "5px",
};

const dealSearchWrapper = {
  position: "relative",
  zIndex: 30,
};

const dealDropdown = {
  position: "absolute",
  top: "74px",
  left: 0,
  right: 0,
  background: "white",
  border: "1px solid #d1d5db",
  borderRadius: "14px",
  boxShadow: "0 16px 35px rgba(15, 23, 42, 0.18)",
  zIndex: 100,
  overflow: "hidden",
  maxHeight: "360px",
  overflowY: "auto",
};

const dealDropdownItem = {
  width: "100%",
  background: "white",
  border: "none",
  borderBottom: "1px solid #f1f5f9",
  padding: "12px",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: "6px",
  color: "#111827",
};

const dealDropdownEmpty = {
  padding: "13px",
  color: "#667085",
  fontSize: "13px",
  fontWeight: "800",
  background: "#f8fafc",
};

const dealOptionTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const dealOptionTitle = {
  color: "#0A1A2F",
  fontSize: "14px",
  overflowWrap: "anywhere",
};

const dealOptionMeta = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "800",
};

const dealOptionSubText = {
  color: "#667085",
  fontSize: "12px",
  lineHeight: "1.35",
  overflowWrap: "anywhere",
};

const selectedSearchDealCard = {
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

const clearSelectedDealButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: "900",
  whiteSpace: "nowrap",
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

const scheduleInfoBox = {
  marginTop: "13px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  padding: "11px",
  borderRadius: "10px",
  fontSize: "13px",
  fontWeight: "800",
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

const allocationTableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
};

const allocationTable = {
  width: "100%",
  minWidth: "860px",
  borderCollapse: "collapse",
};

const allocationTh = {
  textAlign: "left",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  padding: "11px",
  color: "#334155",
  fontSize: "12px",
  textTransform: "uppercase",
};

const allocationTd = {
  borderBottom: "1px solid #f1f5f9",
  padding: "11px",
  color: "#111827",
  fontSize: "13px",
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

const extraPaymentBox = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  padding: "12px",
  borderRadius: "10px",
  marginTop: "14px",
  fontWeight: "800",
};

const overpaymentWarningBox = {
  background: "#fee2e2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: "12px",
  borderRadius: "10px",
  marginTop: "14px",
  fontWeight: "900",
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
  gap: "8px",
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
  marginTop: "2px",
};

const receiptPromptBox = {
  background: "#f0fdf4",
  border: "1px solid #86efac",
  color: "#166534",
  borderRadius: "14px",
  padding: "15px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
};

const receiptPromptTitle = {
  display: "block",
  fontSize: "15px",
  marginBottom: "4px",
};

const receiptPromptText = {
  margin: 0,
  color: "#166534",
  fontSize: "13px",
};

const receiptPromptActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const printReceiptButton = {
  background: "#166534",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "10px 13px",
  cursor: "pointer",
  fontWeight: "900",
};

const skipReceiptButton = {
  background: "white",
  color: "#166534",
  border: "1px solid #86efac",
  borderRadius: "10px",
  padding: "10px 13px",
  cursor: "pointer",
  fontWeight: "900",
};

export default PaymentForm;