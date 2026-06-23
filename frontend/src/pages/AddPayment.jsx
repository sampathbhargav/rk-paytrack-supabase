import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PaymentForm from "../components/PaymentForm";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  addMaintenancePayment,
  addMaintenancePaymentBatch,
  calculateMaintenanceTotals,
  getMaintenanceJobs,
  updateBrokenMaintenancePromises,
} from "../api/maintenanceApi";
import { formatMoney } from "../utils/moneyUtils";
import { logActivity } from "../api/activityLogsApi";

const todayString = new Date().toISOString().split("T")[0];

const initialMaintenancePaymentForm = {
  maintenance_job_id: "",
  customer_id: null,
  payment_date: todayString,
  amount_paid: "",
  payment_method: "Cash",
  payment_status: "Paid",
  notes: "",
};

const initialBatchPaymentForm = {
  customer_id: null,
  customer_name: "",
  phone: "",
  payment_date: todayString,
  amount_paid: "",
  payment_method: "Cash",
  notes: "",
};

function AddPayment() {
  const [activeTab, setActiveTab] = useState("deal");

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Payment Center</div>
          <h1 style={pageTitle}>Add Payment</h1>
          <p style={pageDescription}>
            Record deal installment payments, single maintenance invoice payments,
            and one customer payment across multiple maintenance invoices.
          </p>

          <div style={heroPills}>
            <span style={heroPill}>Deal Payments</span>
            <span style={heroPill}>Single Invoice</span>
            <span style={heroPill}>Multi-Invoice</span>
            <span style={heroPill}>Receipts</span>
          </div>
        </div>

        <div style={heroActions}>
          <Link to="/due-payments" style={secondaryButton}>
            View Due Payments
          </Link>

          <Link to="/maintenance" style={secondaryButton}>
            Maintenance
          </Link>

          <Link to="/deals" style={primaryButton}>
            Back to Deals
          </Link>
        </div>
      </div>

      <div style={paymentModeCard}>
        <div>
          <h2 style={modeTitle}>What payment are you taking?</h2>
          <p style={modeDescription}>
            Choose deal payment or maintenance payment. Maintenance supports
            both single invoice and multi-invoice customer payments.
          </p>
        </div>

        <div style={tabGroup}>
          <button
            type="button"
            onClick={() => setActiveTab("deal")}
            style={{
              ...tabButton,
              ...(activeTab === "deal" ? activeTabButton : {}),
            }}
          >
            <span style={tabIcon}>🚛</span>
            Deal / Installment Payment
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("maintenance")}
            style={{
              ...tabButton,
              ...(activeTab === "maintenance" ? activeTabButton : {}),
            }}
          >
            <span style={tabIcon}>🛠️</span>
            Maintenance Payment
          </button>
        </div>
      </div>

      <div style={infoGrid}>
        <InfoCard
          icon="💵"
          title="Full Payment"
          description="Use this when the customer pays the complete installment or invoice balance."
        />

        <InfoCard
          icon="🧾"
          title="Partial Payment"
          description="Record smaller payments and keep the remaining balance open."
        />

        <InfoCard
          icon="📦"
          title="Multi-Invoice"
          description="Apply one customer payment across multiple maintenance invoices."
        />

        <InfoCard
          icon="🖨️"
          title="Receipt Ready"
          description="After saving, you can view and print a receipt for the customer."
        />
      </div>

      {activeTab === "deal" ? (
        <div style={formCard}>
          <div style={formHeader}>
            <div>
              <div style={sectionEyebrow}>Deal Payment</div>
              <h2 style={sectionTitle}>Installment Payment Form</h2>
              <p style={sectionDescription}>
                Select the customer deal, choose the installment, enter payment
                details, and save the transaction.
              </p>
            </div>

            <span style={requiredBadge}>Verify before saving</span>
          </div>

          <PaymentForm />
        </div>
      ) : (
        <MaintenancePaymentPanel />
      )}
    </div>
  );
}

function MaintenancePaymentPanel() {
  const [jobs, setJobs] = useState([]);
  const [maintenanceMode, setMaintenanceMode] = useState("single");

  const [form, setForm] = useState(initialMaintenancePaymentForm);
  const [batchForm, setBatchForm] = useState(initialBatchPaymentForm);

  const [search, setSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCustomerGroup, setSelectedCustomerGroup] = useState(null);
  const [allocations, setAllocations] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [receiptPrompt, setReceiptPrompt] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const messageRef = useRef(null);

  const scrollToMessage = () => {
    setTimeout(() => {
      messageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  };

  useEffect(() => {
    loadMaintenanceJobs();
  }, []);

  const loadMaintenanceJobs = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      await updateBrokenMaintenancePromises();

      const data = await getMaintenanceJobs();
      setJobs(data || []);
    } catch (error) {
      setMessage(error.message || "Unable to load maintenance invoices.");
      setMessageType("error");
      scrollToMessage();
    } finally {
      setLoading(false);
    }
  };

  const enrichedJobs = useMemo(() => {
    return jobs.map((job) => ({
      ...job,
      totals: calculateMaintenanceTotals(job),
    }));
  }, [jobs]);

  const openBalanceJobs = useMemo(() => {
    return enrichedJobs
      .filter((job) => Number(job.totals.balance || 0) > 0)
      .sort((a, b) => {
        const customerCompare = String(a.customer_name || "").localeCompare(
          String(b.customer_name || "")
        );

        if (customerCompare !== 0) return customerCompare;

        return String(a.due_date || a.created_at || "").localeCompare(
          String(b.due_date || b.created_at || "")
        );
      });
  }, [enrichedJobs]);

  const customerGroups = useMemo(() => {
    const groupMap = new Map();

    openBalanceJobs.forEach((job) => {
      const key =
        job.customer_id ||
        `${String(job.customer_name || "").toLowerCase()}-${String(
          job.phone || ""
        ).replace(/\D/g, "")}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          customerKey: key,
          customer_id: job.customer_id || null,
          customer_name: job.customer_name || "",
          phone: job.phone || "",
          email: job.email || "",
          address: job.address || "",
          invoices: [],
          totalBalance: 0,
        });
      }

      const group = groupMap.get(key);

      group.invoices.push(job);
      group.totalBalance += Number(job.totals.balance || 0);
    });

    return Array.from(groupMap.values())
      .map((group) => ({
        ...group,
        invoices: group.invoices.sort((a, b) =>
          String(a.due_date || a.created_at || "").localeCompare(
            String(b.due_date || b.created_at || "")
          )
        ),
      }))
      .sort((a, b) => Number(b.totalBalance || 0) - Number(a.totalBalance || 0));
  }, [openBalanceJobs]);

  const filteredJobs = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return openBalanceJobs.slice(0, 12);

    return openBalanceJobs
      .filter(
        (job) =>
          String(job.invoice_no || "").toLowerCase().includes(text) ||
          String(job.customer_name || "").toLowerCase().includes(text) ||
          String(job.phone || "").toLowerCase().includes(text) ||
          String(job.truck || "").toLowerCase().includes(text) ||
          String(job.year || "").toLowerCase().includes(text) ||
          String(job.vin || "").toLowerCase().includes(text) ||
          String(job.job_title || "").toLowerCase().includes(text)
      )
      .slice(0, 20);
  }, [openBalanceJobs, search]);

  const filteredCustomerGroups = useMemo(() => {
    const text = customerSearch.trim().toLowerCase();

    if (!text) return customerGroups.slice(0, 12);

    return customerGroups
      .filter((group) => {
        const invoiceText = group.invoices
          .map(
            (job) =>
              `${job.invoice_no || ""} ${job.job_title || ""} ${
                job.truck || ""
              } ${job.year || ""} ${job.vin || ""}`
          )
          .join(" ")
          .toLowerCase();

        return (
          String(group.customer_name || "").toLowerCase().includes(text) ||
          String(group.phone || "").toLowerCase().includes(text) ||
          String(group.email || "").toLowerCase().includes(text) ||
          invoiceText.includes(text)
        );
      })
      .slice(0, 20);
  }, [customerGroups, customerSearch]);

  const totalOpenMaintenanceBalance = openBalanceJobs.reduce(
    (sum, job) => sum + Number(job.totals.balance || 0),
    0
  );

  const selectedTotals = selectedJob
    ? calculateMaintenanceTotals(selectedJob)
    : null;

  const amountPaid = Number(form.amount_paid || 0);

  const remainingAfterPayment = selectedTotals
    ? Math.max(Number(selectedTotals.balance || 0) - amountPaid, 0)
    : 0;

  const batchAmountPaid = Number(batchForm.amount_paid || 0);

  const allocationRows = selectedCustomerGroup
    ? selectedCustomerGroup.invoices.map((job) => {
        const allocatedAmount = Number(allocations[job.id] || 0);
        const balance = Number(job.totals.balance || 0);

        return {
          job,
          balance,
          allocatedAmount,
          remainingAfterAllocation: Math.max(balance - allocatedAmount, 0),
        };
      })
    : [];

  const totalAllocated = allocationRows.reduce(
    (sum, row) => sum + Number(row.allocatedAmount || 0),
    0
  );

  const batchRemainingAfterPayment = selectedCustomerGroup
    ? Math.max(Number(selectedCustomerGroup.totalBalance || 0) - totalAllocated, 0)
    : 0;

  const updateForm = (field, value) => {
    setMessage("");
    setMessageType("");
    setReceiptPrompt(null);

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateBatchForm = (field, value) => {
    setMessage("");
    setMessageType("");
    setReceiptPrompt(null);

    setBatchForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "amount_paid" && selectedCustomerGroup) {
      autoAllocatePayment(Number(value || 0), selectedCustomerGroup.invoices);
    }
  };

  const handleSelectJob = (job) => {
    const totals = calculateMaintenanceTotals(job);

    setSelectedJob(job);
    setSearch(
      `${job.invoice_no || "Invoice"} - ${job.customer_name || "Customer"}`
    );

    setMessage("");
    setMessageType("");
    setReceiptPrompt(null);
    setReceiptData(null);

    setForm({
      maintenance_job_id: job.id,
      customer_id: job.customer_id || null,
      payment_date: todayString,
      amount_paid: totals.balance || "",
      payment_method: "Cash",
      payment_status: "Paid",
      notes: "",
    });
  };

  const handleSelectCustomerGroup = (group) => {
    setSelectedCustomerGroup(group);
    setCustomerSearch(
      `${group.customer_name || "Customer"} - ${group.phone || "No phone"}`
    );

    setMessage("");
    setMessageType("");
    setReceiptPrompt(null);
    setReceiptData(null);
    setAllocations({});

    setBatchForm({
      customer_id: group.customer_id || null,
      customer_name: group.customer_name || "",
      phone: group.phone || "",
      payment_date: todayString,
      amount_paid: "",
      payment_method: "Cash",
      notes: "",
    });
  };

  const autoAllocatePayment = (amount, invoices = selectedCustomerGroup?.invoices || []) => {
    let remaining = Number(amount || 0);
    const nextAllocations = {};

    invoices.forEach((job) => {
      const balance = Number(job.totals.balance || 0);
      const payAmount = Math.min(balance, remaining);

      nextAllocations[job.id] = payAmount > 0 ? Number(payAmount.toFixed(2)) : "";
      remaining -= payAmount;
    });

    setAllocations(nextAllocations);
  };

  const updateAllocation = (jobId, value) => {
    setReceiptPrompt(null);
    setMessage("");
    setMessageType("");

    const cleanValue = value === "" ? "" : Math.max(Number(value || 0), 0);

    setAllocations((prev) => ({
      ...prev,
      [jobId]: cleanValue,
    }));
  };

  const clearMaintenanceForm = () => {
    setSelectedJob(null);
    setSelectedCustomerGroup(null);
    setSearch("");
    setCustomerSearch("");
    setForm(initialMaintenancePaymentForm);
    setBatchForm(initialBatchPaymentForm);
    setAllocations({});
    setMessage("");
    setMessageType("");
    setReceiptPrompt(null);
    setReceiptData(null);
  };

  const validateMaintenancePayment = () => {
    if (!selectedJob || !form.maintenance_job_id) {
      return "Please select a maintenance invoice.";
    }

    if (!form.payment_date) {
      return "Payment date is required.";
    }

    if (!form.amount_paid || Number(form.amount_paid) <= 0) {
      return "Amount paid must be greater than 0.";
    }

    if (Number(form.amount_paid) > Number(selectedTotals?.balance || 0)) {
      return "Amount paid cannot be more than the current maintenance balance.";
    }

    if (!form.payment_method) {
      return "Payment method is required.";
    }

    return "";
  };

  const validateBatchPayment = () => {
    if (!selectedCustomerGroup) {
      return "Please select a customer with open maintenance invoices.";
    }

    if (!batchForm.payment_date) {
      return "Payment date is required.";
    }

    if (!batchForm.amount_paid || Number(batchForm.amount_paid) <= 0) {
      return "Amount paid must be greater than 0.";
    }

    if (Number(batchForm.amount_paid) > Number(selectedCustomerGroup.totalBalance || 0)) {
      return "Amount paid cannot be greater than the customer's total open maintenance balance.";
    }

    if (!batchForm.payment_method) {
      return "Payment method is required.";
    }

    if (Number(totalAllocated.toFixed(2)) !== Number(batchAmountPaid.toFixed(2))) {
      return "Allocated amount must match the total amount paid.";
    }

    const invalidRow = allocationRows.find(
      (row) => Number(row.allocatedAmount || 0) > Number(row.balance || 0)
    );

    if (invalidRow) {
      return `Allocation for invoice ${
        invalidRow.job.invoice_no || "selected invoice"
      } cannot be more than its balance.`;
    }

    if (allocationRows.every((row) => Number(row.allocatedAmount || 0) <= 0)) {
      return "Please allocate payment to at least one invoice.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");
    setReceiptPrompt(null);
    setReceiptData(null);

    const validationError = validateMaintenancePayment();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      scrollToMessage();
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to record this maintenance payment?"
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const previousBalance = Number(selectedTotals?.balance || 0);
const paidAmount = Number(form.amount_paid || 0);
const remainingBalance = Math.max(previousBalance - paidAmount, 0);

const savedPayment = await addMaintenancePayment(form);

await logActivity({
  action: "PAYMENT",
  module: "Maintenance",
  entity_type: "maintenance_payment",
  entity_id: savedPayment?.id || form.maintenance_job_id,
  entity_label:
    selectedJob?.invoice_no ||
    selectedJob?.customer_name ||
    "Maintenance Payment",
  description: `Maintenance payment of ${formatMoney(paidAmount)} recorded for ${
    selectedJob?.customer_name || "customer"
  } on invoice ${selectedJob?.invoice_no || "—"}.`,
  metadata: {
    payment_id: savedPayment?.id || null,
    maintenance_job_id: form.maintenance_job_id,
    customer_id: form.customer_id || null,
    customer_name: selectedJob?.customer_name || "",
    phone: selectedJob?.phone || "",
    invoice_no: selectedJob?.invoice_no || "",
    job_title: selectedJob?.job_title || "",
    truck: selectedJob?.truck || "",
    year: selectedJob?.year || "",
    vin: selectedJob?.vin || "",
    amount_paid: paidAmount,
    previous_balance: previousBalance,
    remaining_balance: remainingBalance,
    payment_date: form.payment_date,
    payment_method: form.payment_method,
    payment_status: remainingBalance > 0 ? "Partial" : "Paid",
  },
});

const receipt = {
  type: "single",
  job: selectedJob,
  payment: savedPayment || {
    ...form,
    amount_paid: paidAmount,
  },
  previousBalance,
  remainingBalance,
};

      setReceiptPrompt(receipt);

      setMessage(
        `Maintenance payment saved successfully. ${formatMoney(
          Number(form.amount_paid || 0)
        )} was recorded for ${selectedJob.customer_name || "customer"}.`
      );
      setMessageType("success");
      scrollToMessage();

      setSelectedJob(null);
      setSearch("");
      setForm(initialMaintenancePaymentForm);

      await loadMaintenanceJobs();
    } catch (error) {
      setMessage(`Failed to save maintenance payment: ${error.message}`);
      setMessageType("error");
      scrollToMessage();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitBatch = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");
    setReceiptPrompt(null);
    setReceiptData(null);

    const validationError = validateBatchPayment();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      scrollToMessage();
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to record this payment across multiple maintenance invoices?"
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const previousBalance = Number(selectedCustomerGroup.totalBalance || 0);

      const allocationPayload = allocationRows
        .filter((row) => Number(row.allocatedAmount || 0) > 0)
        .map((row) => ({
          maintenance_job_id: row.job.id,
          amount_paid: Number(row.allocatedAmount || 0),
          remaining_after_payment: row.remainingAfterAllocation,
        }));

      const savedBatch = await addMaintenancePaymentBatch(
        {
          customer_id: selectedCustomerGroup.customer_id || null,
          customer_name: selectedCustomerGroup.customer_name || "",
          phone: selectedCustomerGroup.phone || "",
          payment_date: batchForm.payment_date,
          total_amount: Number(batchForm.amount_paid || 0),
          payment_method: batchForm.payment_method,
          notes: batchForm.notes || "",
        },
        allocationPayload
      );

      await logActivity({
        action: "PAYMENT",
        module: "Maintenance",
        entity_type: "maintenance_payment_batch",
        entity_id: savedBatch?.batch?.id,
        entity_label:
          savedBatch?.batch?.receipt_no ||
          selectedCustomerGroup?.customer_name ||
          "Multi-Invoice Payment",
        description: `Multi-invoice maintenance payment of ${formatMoney(
          Number(batchForm.amount_paid || 0)
        )} applied to ${allocationPayload.length} invoice(s) for ${
          selectedCustomerGroup?.customer_name || "customer"
        }.`,
        metadata: {
          batch_id: savedBatch?.batch?.id || null,
          receipt_no: savedBatch?.batch?.receipt_no || "",
          customer_id: selectedCustomerGroup?.customer_id || null,
          customer_name: selectedCustomerGroup?.customer_name || "",
          phone: selectedCustomerGroup?.phone || "",
          total_amount_paid: Number(batchForm.amount_paid || 0),
          previous_balance: previousBalance,
          remaining_balance: Math.max(
            previousBalance - Number(batchForm.amount_paid || 0),
            0
          ),
          payment_date: batchForm.payment_date,
          payment_method: batchForm.payment_method,
          invoice_count: allocationPayload.length,
          allocations: allocationRows
            .filter((row) => Number(row.allocatedAmount || 0) > 0)
            .map((row) => ({
              maintenance_job_id: row.job.id,
              invoice_no: row.job.invoice_no || "",
              job_title: row.job.job_title || "",
              invoice_balance: row.balance,
              amount_paid: row.allocatedAmount,
              remaining_after_payment: row.remainingAfterAllocation,
            })),
        },
      });

      const receipt = {
        type: "batch",
        batch: savedBatch.batch,
        payments: savedBatch.payments || [],
        customer: selectedCustomerGroup,
        payment_date: batchForm.payment_date,
        payment_method: batchForm.payment_method,
        amount_paid: Number(batchForm.amount_paid || 0),
        notes: batchForm.notes || "",
        previousBalance,
        remainingBalance: Math.max(previousBalance - Number(batchForm.amount_paid), 0),
        allocations: allocationRows
          .filter((row) => Number(row.allocatedAmount || 0) > 0)
          .map((row) => ({
            job: row.job,
            balance: row.balance,
            amount_paid: row.allocatedAmount,
            remaining_after_payment: row.remainingAfterAllocation,
          })),
      };

      setReceiptPrompt(receipt);

      setMessage(
        `Multi-invoice maintenance payment saved successfully. ${formatMoney(
          Number(batchForm.amount_paid || 0)
        )} was applied to ${
          allocationPayload.length
        } invoice(s) for ${selectedCustomerGroup.customer_name || "customer"}.`
      );
      setMessageType("success");
      scrollToMessage();

      setSelectedCustomerGroup(null);
      setCustomerSearch("");
      setBatchForm(initialBatchPaymentForm);
      setAllocations({});

      await loadMaintenanceJobs();
    } catch (error) {
      setMessage(`Failed to save multi-invoice payment: ${error.message}`);
      setMessageType("error");
      scrollToMessage();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={formCard}>
      <div style={formHeader}>
        <div>
          <div style={sectionEyebrow}>Maintenance Payment</div>
          <h2 style={sectionTitle}>Maintenance Invoice Payment</h2>
          <p style={sectionDescription}>
            Take payment for one maintenance invoice or apply one customer payment
            across multiple open invoices.
          </p>
        </div>

        <div style={maintenanceSummaryPill}>
          Open Maintenance Balance:{" "}
          <strong>{formatMoney(totalOpenMaintenanceBalance)}</strong>
        </div>
      </div>

      <div style={subTabBar}>
        <button
          type="button"
          onClick={() => {
            setMaintenanceMode("single");
            clearMaintenanceForm();
          }}
          style={{
            ...subTabButton,
            ...(maintenanceMode === "single" ? subTabButtonActive : {}),
          }}
        >
          Single Invoice
        </button>

        <button
          type="button"
          onClick={() => {
            setMaintenanceMode("batch");
            clearMaintenanceForm();
          }}
          style={{
            ...subTabButton,
            ...(maintenanceMode === "batch" ? subTabButtonActive : {}),
          }}
        >
          Multi-Invoice Customer Payment
        </button>
      </div>

      <div ref={messageRef} />

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

      {receiptPrompt && (
        <div style={receiptPromptBox}>
          <div>
            <strong style={receiptPromptTitle}>
              {receiptPrompt.type === "batch"
                ? "Multi-invoice maintenance payment recorded."
                : "Maintenance payment recorded."}
            </strong>
            <p style={receiptPromptText}>
              Do you want to print or view the receipt now?
            </p>
          </div>

          <div style={receiptPromptActions}>
            <button
              type="button"
              style={printReceiptButton}
              onClick={() => setReceiptData(receiptPrompt)}
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

      {loading ? (
        <LoadingSpinner message="Loading maintenance invoices..." height="420px" />
      ) : maintenanceMode === "single" ? (
        <SingleInvoicePaymentForm
          search={search}
          setSearch={setSearch}
          filteredJobs={filteredJobs}
          selectedJob={selectedJob}
          selectedTotals={selectedTotals}
          form={form}
          amountPaid={amountPaid}
          remainingAfterPayment={remainingAfterPayment}
          saving={saving}
          handleSelectJob={handleSelectJob}
          updateForm={updateForm}
          handleSubmit={handleSubmit}
          clearMaintenanceForm={clearMaintenanceForm}
        />
      ) : (
        <MultiInvoicePaymentForm
          customerSearch={customerSearch}
          setCustomerSearch={setCustomerSearch}
          filteredCustomerGroups={filteredCustomerGroups}
          selectedCustomerGroup={selectedCustomerGroup}
          batchForm={batchForm}
          batchAmountPaid={batchAmountPaid}
          allocationRows={allocationRows}
          totalAllocated={totalAllocated}
          batchRemainingAfterPayment={batchRemainingAfterPayment}
          saving={saving}
          handleSelectCustomerGroup={handleSelectCustomerGroup}
          updateBatchForm={updateBatchForm}
          updateAllocation={updateAllocation}
          autoAllocatePayment={autoAllocatePayment}
          handleSubmitBatch={handleSubmitBatch}
          clearMaintenanceForm={clearMaintenanceForm}
        />
      )}

      {receiptData && (
        <MaintenanceReceiptModal
          receiptData={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}
    </div>
  );
}

function SingleInvoicePaymentForm({
  search,
  setSearch,
  filteredJobs,
  selectedJob,
  selectedTotals,
  form,
  amountPaid,
  remainingAfterPayment,
  saving,
  handleSelectJob,
  updateForm,
  handleSubmit,
  clearMaintenanceForm,
}) {
  return (
    <form onSubmit={handleSubmit}>
      <div style={maintenanceLayout}>
        <div style={invoiceSearchPanel}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Find Invoice</h3>
            <p style={panelDescription}>
              Search by invoice, customer, phone, truck, VIN, or work title.
            </p>
          </div>

          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!e.target.value) clearMaintenanceForm();
            }}
            placeholder="Search maintenance invoice..."
            style={searchInput}
          />

          <div style={invoiceList}>
            {filteredJobs.length === 0 ? (
              <div style={emptyInvoiceState}>No open maintenance invoices found.</div>
            ) : (
              filteredJobs.map((job) => {
                const totals = calculateMaintenanceTotals(job);
                const isSelected = selectedJob?.id === job.id;

                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => handleSelectJob(job)}
                    style={{
                      ...invoiceOption,
                      ...(isSelected ? invoiceOptionActive : {}),
                    }}
                  >
                    <div>
                      <strong>
                        {job.invoice_no || "No Invoice"} ·{" "}
                        {job.customer_name || "Customer"}
                      </strong>
                      <span style={invoiceSubText}>
                        {job.phone || "No phone"} ·{" "}
                        {`${job.year || ""} ${job.truck || ""}`.trim() ||
                          "Truck"}{" "}
                        · {job.job_title || "Maintenance"}
                      </span>
                    </div>

                    <span
                      style={{
                        ...invoiceBalanceBadge,
                        ...(isSelected ? invoiceBalanceBadgeActive : {}),
                      }}
                    >
                      {formatMoney(totals.balance)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div style={paymentEntryPanel}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Payment Details</h3>
            <p style={panelDescription}>
              Confirm the invoice, amount, method, and receipt details.
            </p>
          </div>

          {selectedJob ? (
            <SelectedInvoiceCard selectedJob={selectedJob} selectedTotals={selectedTotals} />
          ) : (
            <div style={selectInvoiceHint}>
              Select a maintenance invoice from the left side to start taking payment.
            </div>
          )}

          <div style={formGrid}>
            <Input
              label="Payment Date"
              name="payment_date"
              type="date"
              value={form.payment_date}
              onChange={(e) => updateForm("payment_date", e.target.value)}
              required
            />

            <Input
              label="Amount Paid"
              name="amount_paid"
              type="number"
              value={form.amount_paid}
              onChange={(e) => updateForm("amount_paid", e.target.value)}
              required
              disabled={!selectedJob}
            />

            <SelectField
              label="Payment Method"
              value={form.payment_method}
              onChange={(value) => updateForm("payment_method", value)}
              disabled={!selectedJob}
              options={["Cash", "Zelle", "Card", "Check", "ACH", "Wire", "Other"]}
            />

            <SelectField
              label="Payment Status"
              value={form.payment_status}
              onChange={(value) => updateForm("payment_status", value)}
              disabled={!selectedJob}
              options={["Paid", "Partial"]}
            />
          </div>

          <div style={maintenancePaymentSummary}>
            <SummaryMini label="Current Balance" value={formatMoney(selectedTotals?.balance || 0)} />
            <SummaryMini label="Paid Today" value={formatMoney(amountPaid)} />
            <SummaryMini
              label="Remaining After Payment"
              value={formatMoney(remainingAfterPayment)}
              tone={remainingAfterPayment > 0 ? "danger" : "success"}
            />
          </div>

          {remainingAfterPayment > 0 && selectedJob && (
            <div style={partialWarningBox}>
              This is a partial maintenance payment. The remaining balance will
              stay open on this invoice.
            </div>
          )}

          <div style={{ marginTop: "16px" }}>
            <label style={labelStyle}>Payment Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              placeholder="Example: Customer paid partial maintenance balance by cash."
              style={notesInput}
              disabled={!selectedJob}
            />
          </div>

          <div style={buttonRow}>
            <button
              type="submit"
              style={{
                ...buttonStyle,
                opacity: saving || !selectedJob ? 0.7 : 1,
                cursor: saving || !selectedJob ? "not-allowed" : "pointer",
              }}
              disabled={saving || !selectedJob}
            >
              {saving ? "Saving..." : "Save Maintenance Payment"}
            </button>

            <button
              type="button"
              style={secondaryButtonStyle}
              disabled={saving}
              onClick={clearMaintenanceForm}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function MultiInvoicePaymentForm({
  customerSearch,
  setCustomerSearch,
  filteredCustomerGroups,
  selectedCustomerGroup,
  batchForm,
  batchAmountPaid,
  allocationRows,
  totalAllocated,
  batchRemainingAfterPayment,
  saving,
  handleSelectCustomerGroup,
  updateBatchForm,
  updateAllocation,
  autoAllocatePayment,
  handleSubmitBatch,
  clearMaintenanceForm,
}) {
  return (
    <form onSubmit={handleSubmitBatch}>
      <div style={maintenanceLayout}>
        <div style={invoiceSearchPanel}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Find Customer</h3>
            <p style={panelDescription}>
              Search a customer with multiple unpaid maintenance invoices.
            </p>
          </div>

          <input
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              if (!e.target.value) clearMaintenanceForm();
            }}
            placeholder="Search customer, phone, invoice, truck..."
            style={searchInput}
          />

          <div style={invoiceList}>
            {filteredCustomerGroups.length === 0 ? (
              <div style={emptyInvoiceState}>
                No customers with open maintenance balance found.
              </div>
            ) : (
              filteredCustomerGroups.map((group) => {
                const isSelected =
                  selectedCustomerGroup?.customerKey === group.customerKey;

                return (
                  <button
                    key={group.customerKey}
                    type="button"
                    onClick={() => handleSelectCustomerGroup(group)}
                    style={{
                      ...invoiceOption,
                      ...(isSelected ? invoiceOptionActive : {}),
                    }}
                  >
                    <div>
                      <strong>{group.customer_name || "Customer"}</strong>
                      <span style={invoiceSubText}>
                        {group.phone || "No phone"} · {group.invoices.length} open
                        invoice(s)
                      </span>
                    </div>

                    <span
                      style={{
                        ...invoiceBalanceBadge,
                        ...(isSelected ? invoiceBalanceBadgeActive : {}),
                      }}
                    >
                      {formatMoney(group.totalBalance)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div style={paymentEntryPanel}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Multi-Invoice Payment</h3>
            <p style={panelDescription}>
              Enter the total amount received. The app auto-applies it to the
              oldest open invoices first. You can manually adjust allocation.
            </p>
          </div>

          {selectedCustomerGroup ? (
            <div style={selectedInvoiceCard}>
              <div style={selectedInvoiceTop}>
                <div>
                  <span style={selectedLabel}>Selected Customer</span>
                  <strong style={selectedTitle}>
                    {selectedCustomerGroup.customer_name || "Customer"}
                  </strong>
                </div>

                <span style={selectedBalanceBadge}>
                  Total Balance {formatMoney(selectedCustomerGroup.totalBalance)}
                </span>
              </div>

              <div style={selectedGrid}>
                <InfoMini label="Phone" value={selectedCustomerGroup.phone || "—"} />
                <InfoMini label="Open Invoices" value={selectedCustomerGroup.invoices.length} />
                <InfoMini label="Total Balance" value={formatMoney(selectedCustomerGroup.totalBalance)} />
              </div>
            </div>
          ) : (
            <div style={selectInvoiceHint}>
              Select a customer from the left side to apply one payment across
              multiple invoices.
            </div>
          )}

          <div style={formGrid}>
            <Input
              label="Payment Date"
              name="payment_date"
              type="date"
              value={batchForm.payment_date}
              onChange={(e) => updateBatchForm("payment_date", e.target.value)}
              required
            />

            <Input
              label="Total Amount Paid"
              name="amount_paid"
              type="number"
              value={batchForm.amount_paid}
              onChange={(e) => updateBatchForm("amount_paid", e.target.value)}
              required
              disabled={!selectedCustomerGroup}
            />

            <SelectField
              label="Payment Method"
              value={batchForm.payment_method}
              onChange={(value) => updateBatchForm("payment_method", value)}
              disabled={!selectedCustomerGroup}
              options={["Cash", "Zelle", "Card", "Check", "ACH", "Wire", "Other"]}
            />
          </div>

          <div style={maintenancePaymentSummary}>
            <SummaryMini
              label="Customer Open Balance"
              value={formatMoney(selectedCustomerGroup?.totalBalance || 0)}
            />
            <SummaryMini label="Paid Today" value={formatMoney(batchAmountPaid)} />
            <SummaryMini label="Allocated" value={formatMoney(totalAllocated)} />
            <SummaryMini
              label="Remaining After Payment"
              value={formatMoney(batchRemainingAfterPayment)}
              tone={batchRemainingAfterPayment > 0 ? "danger" : "success"}
            />
          </div>

          {selectedCustomerGroup && (
            <div style={allocationBox}>
              <div style={allocationHeader}>
                <div>
                  <h3 style={allocationTitle}>Invoice Allocation</h3>
                  <p style={allocationDescription}>
                    Payment is applied oldest due first. Adjust amounts only if
                    needed.
                  </p>
                </div>

                <button
                  type="button"
                  style={autoApplyButton}
                  onClick={() =>
                    autoAllocatePayment(
                      Number(batchForm.amount_paid || 0),
                      selectedCustomerGroup.invoices
                    )
                  }
                >
                  Auto Apply Oldest First
                </button>
              </div>

              <div style={allocationTableWrapper}>
                <table style={allocationTable}>
                  <thead>
                    <tr>
                      <th style={allocationTh}>Invoice</th>
                      <th style={allocationTh}>Due Date</th>
                      <th style={allocationTh}>Work</th>
                      <th style={allocationTh}>Balance</th>
                      <th style={allocationTh}>Apply Payment</th>
                      <th style={allocationTh}>Remaining</th>
                    </tr>
                  </thead>

                  <tbody>
                    {allocationRows.map((row) => (
                      <tr key={row.job.id}>
                        <td style={allocationTd}>
                          <strong>{row.job.invoice_no || "—"}</strong>
                        </td>
                        <td style={allocationTd}>{formatDisplayDate(row.job.due_date)}</td>
                        <td style={allocationTd}>{row.job.job_title || "—"}</td>
                        <td style={allocationTd}>{formatMoney(row.balance)}</td>
                        <td style={allocationTd}>
                          <input
                            type="number"
                            value={allocationsValue(row.allocatedAmount)}
                            onChange={(e) =>
                              updateAllocation(row.job.id, e.target.value)
                            }
                            style={allocationInput}
                          />
                        </td>
                        <td style={allocationTd}>
                          <strong
                            style={{
                              color:
                                row.remainingAfterAllocation > 0
                                  ? "#991b1b"
                                  : "#166534",
                            }}
                          >
                            {formatMoney(row.remainingAfterAllocation)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {Number(totalAllocated.toFixed(2)) !==
                Number(batchAmountPaid.toFixed(2)) && (
                <div style={partialWarningBox}>
                  Total allocated must match amount paid. Amount paid is{" "}
                  {formatMoney(batchAmountPaid)} but allocated amount is{" "}
                  {formatMoney(totalAllocated)}.
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: "16px" }}>
            <label style={labelStyle}>Payment Notes</label>
            <textarea
              value={batchForm.notes}
              onChange={(e) => updateBatchForm("notes", e.target.value)}
              placeholder="Example: Customer paid $1,000 toward multiple maintenance invoices."
              style={notesInput}
              disabled={!selectedCustomerGroup}
            />
          </div>

          <div style={buttonRow}>
            <button
              type="submit"
              style={{
                ...buttonStyle,
                opacity: saving || !selectedCustomerGroup ? 0.7 : 1,
                cursor: saving || !selectedCustomerGroup ? "not-allowed" : "pointer",
              }}
              disabled={saving || !selectedCustomerGroup}
            >
              {saving ? "Saving..." : "Save Multi-Invoice Payment"}
            </button>

            <button
              type="button"
              style={secondaryButtonStyle}
              disabled={saving}
              onClick={clearMaintenanceForm}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function SelectedInvoiceCard({ selectedJob, selectedTotals }) {
  return (
    <div style={selectedInvoiceCard}>
      <div style={selectedInvoiceTop}>
        <div>
          <span style={selectedLabel}>Selected Invoice</span>
          <strong style={selectedTitle}>
            {selectedJob.invoice_no || "No Invoice"} · {selectedJob.customer_name}
          </strong>
        </div>

        <span style={selectedBalanceBadge}>
          Balance {formatMoney(selectedTotals?.balance)}
        </span>
      </div>

      <div style={selectedGrid}>
        <InfoMini label="Work" value={selectedJob.job_title || "—"} />
        <InfoMini
          label="Truck"
          value={`${selectedJob.year || ""} ${selectedJob.truck || ""}`.trim() || "—"}
        />
        <InfoMini label="VIN" value={selectedJob.vin || "—"} />
        <InfoMini label="Status" value={selectedJob.work_status || "Open"} />
        <InfoMini label="Total" value={formatMoney(selectedTotals?.totalAmount)} />
        <InfoMini label="Paid" value={formatMoney(selectedTotals?.totalPaid)} />
      </div>
    </div>
  );
}

function MaintenanceReceiptModal({ receiptData, onClose }) {
  const isBatch = receiptData.type === "batch";

  const printReceipt = () => {
    const html = isBatch
      ? buildMaintenanceBatchReceiptHtml(receiptData)
      : buildMaintenanceReceiptHtml(receiptData);

    printHtmlWithIframe(
      html,
      isBatch ? "Maintenance Multi-Invoice Receipt" : "Maintenance Payment Receipt"
    );
  };

  return (
    <div style={modalOverlay}>
      <div style={receiptModalBox}>
        <div style={modalHeader}>
          <div>
            <h2 style={modalTitle}>
              {isBatch
                ? "Maintenance Multi-Invoice Receipt"
                : "Maintenance Payment Receipt"}
            </h2>
            <p style={modalSubtitle}>
              {isBatch
                ? `Receipt for ${receiptData.customer?.customer_name || "customer"}`
                : `Receipt for ${receiptData.job.customer_name} · Invoice ${
                    receiptData.job.invoice_no || "—"
                  }`}
            </p>
          </div>

          <button type="button" onClick={onClose} style={modalCloseButton}>
            ×
          </button>
        </div>

        {isBatch ? (
          <BatchReceiptPreview receiptData={receiptData} />
        ) : (
          <SingleReceiptPreview receiptData={receiptData} />
        )}

        <div style={modalActions}>
          <button type="button" onClick={printReceipt} style={printReceiptButton}>
            Print Receipt
          </button>

          <button type="button" onClick={onClose} style={skipReceiptButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SingleReceiptPreview({ receiptData }) {
  const { job, payment, previousBalance, remainingBalance } = receiptData;

  return (
    <div style={receiptPreview}>
      <div style={receiptBrandRow}>
        <div>
          <h2 style={receiptBrand}>RK Truck & Trailer Sales</h2>
          <p style={receiptMuted}>Maintenance Payment Receipt</p>
        </div>

        <div style={receiptAmountBox}>
          <span>Amount Paid</span>
          <strong>{formatMoney(payment.amount_paid)}</strong>
        </div>
      </div>

      <div style={receiptGrid}>
        <InfoMini label="Customer" value={job.customer_name} />
        <InfoMini label="Phone" value={job.phone || "—"} />
        <InfoMini label="Invoice" value={job.invoice_no || "—"} />
        <InfoMini label="Work" value={job.job_title || "—"} />
        <InfoMini label="Payment Date" value={formatDisplayDate(payment.payment_date)} />
        <InfoMini label="Payment Method" value={payment.payment_method || "—"} />
        <InfoMini label="Previous Balance" value={formatMoney(previousBalance)} />
        <InfoMini label="Remaining Balance" value={formatMoney(remainingBalance)} />
      </div>

      {payment.notes && (
        <div style={receiptNotes}>
          <strong>Notes:</strong> {payment.notes}
        </div>
      )}
    </div>
  );
}

function BatchReceiptPreview({ receiptData }) {
  return (
    <div style={receiptPreview}>
      <div style={receiptBrandRow}>
        <div>
          <h2 style={receiptBrand}>RK Truck & Trailer Sales</h2>
          <p style={receiptMuted}>
            Multi-Invoice Maintenance Receipt ·{" "}
            {receiptData.batch?.receipt_no || "Receipt"}
          </p>
        </div>

        <div style={receiptAmountBox}>
          <span>Total Paid</span>
          <strong>{formatMoney(receiptData.amount_paid)}</strong>
        </div>
      </div>

      <div style={receiptGrid}>
        <InfoMini label="Customer" value={receiptData.customer?.customer_name} />
        <InfoMini label="Phone" value={receiptData.customer?.phone || "—"} />
        <InfoMini label="Payment Date" value={formatDisplayDate(receiptData.payment_date)} />
        <InfoMini label="Payment Method" value={receiptData.payment_method || "—"} />
        <InfoMini label="Previous Balance" value={formatMoney(receiptData.previousBalance)} />
        <InfoMini label="Remaining Balance" value={formatMoney(receiptData.remainingBalance)} />
      </div>

      <div style={receiptTableWrapper}>
        <table style={receiptTable}>
          <thead>
            <tr>
              <th style={receiptTh}>Invoice</th>
              <th style={receiptTh}>Work</th>
              <th style={receiptTh}>Invoice Balance</th>
              <th style={receiptTh}>Paid</th>
              <th style={receiptTh}>Remaining</th>
            </tr>
          </thead>

          <tbody>
            {receiptData.allocations.map((item) => (
              <tr key={item.job.id}>
                <td style={receiptTd}>{item.job.invoice_no || "—"}</td>
                <td style={receiptTd}>{item.job.job_title || "—"}</td>
                <td style={receiptTd}>{formatMoney(item.balance)}</td>
                <td style={receiptTd}>{formatMoney(item.amount_paid)}</td>
                <td style={receiptTd}>{formatMoney(item.remaining_after_payment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receiptData.notes && (
        <div style={receiptNotes}>
          <strong>Notes:</strong> {receiptData.notes}
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, title, description }) {
  return (
    <div style={infoCard}>
      <div style={infoIcon}>{icon}</div>
      <div>
        <h3 style={infoTitle}>{title}</h3>
        <p style={infoDescription}>{description}</p>
      </div>
    </div>
  );
}

function InfoMini({ label, value }) {
  return (
    <div style={infoMini}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function SummaryMini({ label, value, tone = "default" }) {
  return (
    <div>
      <span style={summaryLabel}>{label}</span>
      <strong
        style={{
          color:
            tone === "danger"
              ? "#991b1b"
              : tone === "success"
              ? "#166534"
              : "#111827",
        }}
      >
        {value}
      </strong>
    </div>
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
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={requiredMark}>*</span>}
      </label>

      <input
        name={name}
        type={type}
        value={value || ""}
        onChange={onChange}
        required={required}
        disabled={disabled}
        style={{
          ...inputStyle,
          background: disabled ? "#f3f4f6" : "white",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, disabled, options }) {
  return (
    <div>
      <label style={labelStyle}>
        {label} <span style={requiredMark}>*</span>
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function allocationsValue(value) {
  if (value === "" || value === null || value === undefined) return "";
  return value;
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  return `${month}/${day}/${year}`;
}

function printHtmlWithIframe(html, title) {
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";

  document.body.appendChild(iframe);

  const iframeWindow = iframe.contentWindow;
  const iframeDocument = iframeWindow.document;

  iframeDocument.open();
  iframeDocument.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: white;
            padding: 28px;
            font-size: 13px;
          }
          .doc {
            max-width: 850px;
            margin: 0 auto;
            border: 1px solid #d1d5db;
            border-radius: 14px;
            padding: 26px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            border-bottom: 4px solid #0A1A2F;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand h1 {
            margin: 0;
            color: #0A1A2F;
            font-size: 26px;
          }
          .brand p,
          .meta p {
            margin: 5px 0;
            color: #475569;
          }
          .meta {
            text-align: right;
          }
          .meta h2 {
            margin: 0;
            color: #0A1A2F;
            font-size: 22px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 18px;
          }
          .box {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px;
          }
          .label {
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .value {
            font-weight: bold;
            color: #111827;
          }
          .amount-paid {
            margin-top: 18px;
            background: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
          }
          .amount-paid strong {
            display: block;
            font-size: 28px;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 10px;
            text-align: left;
          }
          th {
            background: #f8fafc;
          }
          .total {
            background: #f8fafc;
            font-weight: bold;
          }
          .notes {
            margin-top: 18px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px;
            white-space: pre-wrap;
          }
          .signature-row {
            margin-top: 38px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 42px;
          }
          .signature-line {
            border-top: 1px solid #111827;
            padding-top: 8px;
            color: #475569;
          }
          .footer {
            margin-top: 28px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
            color: #64748b;
            font-size: 11px;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);

  iframeDocument.close();

  setTimeout(() => {
    iframeWindow.focus();
    iframeWindow.print();

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 500);
}

function buildMaintenanceReceiptHtml({
  job,
  payment,
  previousBalance,
  remainingBalance,
}) {
  return `
    <div class="doc">
      <div class="header">
        <div class="brand">
          <h1>RK Truck & Trailer Sales</h1>
          <p>2727 Willowbrook Rd, Dallas, TX 75220</p>
          <p>Phone: 469-880-2222</p>
        </div>

        <div class="meta">
          <h2>PAYMENT RECEIPT</h2>
          <p><strong>Invoice:</strong> ${job.invoice_no || "—"}</p>
          <p><strong>Payment Date:</strong> ${formatDisplayDate(payment.payment_date)}</p>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="label">Customer</div>
          <div class="value">${job.customer_name || "—"}</div>
        </div>
        <div class="box">
          <div class="label">Phone</div>
          <div class="value">${job.phone || "—"}</div>
        </div>
        <div class="box">
          <div class="label">Work</div>
          <div class="value">${job.job_title || "—"}</div>
        </div>
        <div class="box">
          <div class="label">Payment Method</div>
          <div class="value">${payment.payment_method || "—"}</div>
        </div>
      </div>

      <div class="amount-paid">
        AMOUNT PAID
        <strong>${formatMoney(payment.amount_paid)}</strong>
      </div>

      <table>
        <tbody>
          <tr><td>Previous Balance</td><td>${formatMoney(previousBalance)}</td></tr>
          <tr><td>Amount Paid</td><td>${formatMoney(payment.amount_paid)}</td></tr>
          <tr class="total"><td>Remaining Balance</td><td>${formatMoney(remainingBalance)}</td></tr>
        </tbody>
      </table>

      <div class="notes">
        <strong>Payment Notes:</strong><br />
        ${payment.notes || "No notes added."}
      </div>

      <div class="signature-row">
        <div class="signature-line">Customer Signature</div>
        <div class="signature-line">Authorized Representative</div>
      </div>

      <div class="footer">
        <span>RK PayTrack Maintenance Receipt</span>
        <span>Generated ${new Date().toLocaleString()}</span>
      </div>
    </div>
  `;
}

function buildMaintenanceBatchReceiptHtml(receiptData) {
  const rows = receiptData.allocations
    .map(
      (item) => `
        <tr>
          <td>${item.job.invoice_no || "—"}</td>
          <td>${item.job.job_title || "—"}</td>
          <td>${formatMoney(item.balance)}</td>
          <td>${formatMoney(item.amount_paid)}</td>
          <td>${formatMoney(item.remaining_after_payment)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="doc">
      <div class="header">
        <div class="brand">
          <h1>RK Truck & Trailer Sales</h1>
          <p>2727 Willowbrook Rd, Dallas, TX 75220</p>
          <p>Phone: 469-880-2222</p>
        </div>

        <div class="meta">
          <h2>MULTI-INVOICE RECEIPT</h2>
          <p><strong>Receipt:</strong> ${receiptData.batch?.receipt_no || "—"}</p>
          <p><strong>Payment Date:</strong> ${formatDisplayDate(receiptData.payment_date)}</p>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="label">Customer</div>
          <div class="value">${receiptData.customer?.customer_name || "—"}</div>
        </div>
        <div class="box">
          <div class="label">Phone</div>
          <div class="value">${receiptData.customer?.phone || "—"}</div>
        </div>
        <div class="box">
          <div class="label">Payment Method</div>
          <div class="value">${receiptData.payment_method || "—"}</div>
        </div>
        <div class="box">
          <div class="label">Invoices Paid</div>
          <div class="value">${receiptData.allocations.length}</div>
        </div>
      </div>

      <div class="amount-paid">
        TOTAL AMOUNT PAID
        <strong>${formatMoney(receiptData.amount_paid)}</strong>
      </div>

      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Work</th>
            <th>Invoice Balance</th>
            <th>Paid</th>
            <th>Remaining</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total">
            <td colspan="3">Total Paid</td>
            <td colspan="2">${formatMoney(receiptData.amount_paid)}</td>
          </tr>
          <tr class="total">
            <td colspan="3">Remaining Customer Maintenance Balance</td>
            <td colspan="2">${formatMoney(receiptData.remainingBalance)}</td>
          </tr>
        </tbody>
      </table>

      <div class="notes">
        <strong>Payment Notes:</strong><br />
        ${receiptData.notes || "No notes added."}
      </div>

      <div class="signature-row">
        <div class="signature-line">Customer Signature</div>
        <div class="signature-line">Authorized Representative</div>
      </div>

      <div class="footer">
        <span>RK PayTrack Maintenance Multi-Invoice Receipt</span>
        <span>Generated ${new Date().toLocaleString()}</span>
      </div>
    </div>
  `;
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
  display: "grid",
  gap: "18px",
};

const heroCard = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #102A4C 55%, #1d4ed8 100%)",
  borderRadius: "22px",
  padding: "26px",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.24)",
};

const eyebrow = {
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#bfdbfe",
  marginBottom: "8px",
};

const pageTitle = {
  margin: 0,
  fontSize: "32px",
  lineHeight: "1.1",
  color: "white",
};

const pageDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#dbeafe",
  maxWidth: "760px",
  lineHeight: "1.5",
};

const heroPills = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const heroPill = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "#e0f2fe",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const heroActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const primaryButton = {
  background: "white",
  color: "#0A1A2F",
  border: "none",
  borderRadius: "999px",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: "900",
  textDecoration: "none",
  boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
};

const secondaryButton = {
  background: "rgba(255,255,255,0.12)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: "999px",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: "900",
  textDecoration: "none",
};

const paymentModeCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.07)",
};

const modeTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "19px",
};

const modeDescription = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "14px",
};

const tabGroup = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const tabButton = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #d1d5db",
  borderRadius: "999px",
  padding: "11px 14px",
  cursor: "pointer",
  fontWeight: "900",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
};

const activeTabButton = {
  background: "#0A1A2F",
  color: "white",
  borderColor: "#0A1A2F",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.18)",
};

const tabIcon = {
  fontSize: "18px",
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "14px",
};

const infoCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
};

const infoIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "14px",
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "21px",
  flexShrink: 0,
};

const infoTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "16px",
};

const infoDescription = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "13px",
  lineHeight: "1.45",
};

const formCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "18px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  maxWidth: "100%",
  overflow: "hidden",
  boxSizing: "border-box",
};

const formHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap",
  paddingBottom: "14px",
  marginBottom: "16px",
  borderBottom: "1px solid #e5e7eb",
};

const sectionEyebrow = {
  color: "#2563eb",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "6px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "21px",
};

const sectionDescription = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#667085",
  fontSize: "14px",
  lineHeight: "1.45",
  maxWidth: "780px",
};

const requiredBadge = {
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fde68a",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const maintenanceSummaryPill = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "9px 13px",
  fontSize: "13px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const subTabBar = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "16px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "10px",
};

const subTabButton = {
  background: "white",
  color: "#334155",
  border: "1px solid #d1d5db",
  borderRadius: "999px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const subTabButtonActive = {
  background: "#0A1A2F",
  color: "white",
  borderColor: "#0A1A2F",
};

const maintenanceLayout = {
  display: "grid",
  gridTemplateColumns: "minmax(300px, 410px) minmax(0, 1fr)",
  gap: "16px",
  alignItems: "start",
};

const invoiceSearchPanel = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "15px",
};

const paymentEntryPanel = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "15px",
};

const panelHeader = {
  marginBottom: "12px",
};

const panelTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "17px",
};

const panelDescription = {
  margin: "5px 0 0",
  color: "#667085",
  fontSize: "13px",
  lineHeight: "1.4",
};

const searchInput = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "11px 13px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const invoiceList = {
  display: "grid",
  gap: "8px",
  marginTop: "12px",
  maxHeight: "520px",
  overflowY: "auto",
  paddingRight: "3px",
};

const invoiceOption = {
  width: "100%",
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "12px",
  cursor: "pointer",
  textAlign: "left",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
};

const invoiceOptionActive = {
  borderColor: "#1d4ed8",
  background: "#eff6ff",
  boxShadow: "0 8px 18px rgba(29, 78, 216, 0.12)",
};

const invoiceSubText = {
  display: "block",
  marginTop: "5px",
  color: "#667085",
  fontSize: "12px",
  lineHeight: "1.35",
};

const invoiceBalanceBadge = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const invoiceBalanceBadgeActive = {
  background: "#0A1A2F",
  color: "white",
  borderColor: "#0A1A2F",
};

const emptyInvoiceState = {
  background: "white",
  border: "1px dashed #cbd5e1",
  color: "#667085",
  borderRadius: "14px",
  padding: "18px",
  textAlign: "center",
};

const selectedInvoiceCard = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #1d4ed8 100%)",
  color: "white",
  borderRadius: "18px",
  padding: "16px",
  marginBottom: "16px",
};

const selectedInvoiceTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const selectedLabel = {
  display: "block",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  marginBottom: "5px",
};

const selectedTitle = {
  fontSize: "18px",
  color: "white",
};

const selectedBalanceBadge = {
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "white",
  borderRadius: "999px",
  padding: "8px 11px",
  fontSize: "13px",
  fontWeight: "900",
};

const selectedGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
  gap: "10px",
};

const infoMini = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "11px",
  display: "grid",
  gap: "4px",
  color: "#111827",
};

const selectInvoiceHint = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  color: "#667085",
  borderRadius: "14px",
  padding: "18px",
  marginBottom: "16px",
  textAlign: "center",
  fontWeight: "800",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "14px",
};

const labelStyle = {
  display: "block",
  fontWeight: "900",
  color: "#374151",
  marginBottom: "6px",
  fontSize: "13px",
};

const requiredMark = {
  color: "#dc2626",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  boxSizing: "border-box",
  fontSize: "14px",
};

const maintenancePaymentSummary = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
  background: "#f8fafc",
  padding: "15px",
  borderRadius: "14px",
  marginTop: "16px",
  border: "1px solid #e5e7eb",
};

const summaryLabel = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  marginBottom: "5px",
  fontWeight: "800",
};

const notesInput = {
  ...inputStyle,
  minHeight: "95px",
  resize: "vertical",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  lineHeight: "1.5",
};

const partialWarningBox = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  padding: "12px",
  borderRadius: "12px",
  marginTop: "14px",
  fontWeight: "800",
};

const buttonRow = {
  display: "flex",
  gap: "12px",
  marginTop: "22px",
  flexWrap: "wrap",
};

const buttonStyle = {
  background: "#0A1A2F",
  color: "white",
  padding: "12px 18px",
  border: "none",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: "900",
};

const secondaryButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "12px 18px",
  border: "none",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: "900",
};

const messageBox = {
  padding: "13px 14px",
  borderRadius: "12px",
  marginBottom: "16px",
  fontWeight: "900",
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
  borderRadius: "999px",
  padding: "10px 13px",
  cursor: "pointer",
  fontWeight: "900",
};

const skipReceiptButton = {
  background: "white",
  color: "#166534",
  border: "1px solid #86efac",
  borderRadius: "999px",
  padding: "10px 13px",
  cursor: "pointer",
  fontWeight: "900",
};

const allocationBox = {
  marginTop: "16px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
};

const allocationHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const allocationTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "17px",
};

const allocationDescription = {
  margin: "5px 0 0",
  color: "#667085",
  fontSize: "13px",
};

const autoApplyButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: "900",
};

const allocationTableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "white",
};

const allocationTable = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "850px",
};

const allocationTh = {
  background: "#f1f5f9",
  color: "#334155",
  textAlign: "left",
  padding: "11px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const allocationTd = {
  padding: "11px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  fontSize: "13px",
};

const allocationInput = {
  width: "120px",
  padding: "9px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "20px",
};

const receiptModalBox = {
  background: "white",
  borderRadius: "20px",
  maxWidth: "760px",
  width: "96vw",
  maxHeight: "92vh",
  overflowY: "auto",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.28)",
  padding: "18px",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "12px",
  marginBottom: "16px",
};

const modalTitle = {
  margin: 0,
  color: "#111827",
};

const modalSubtitle = {
  margin: "5px 0 0",
  color: "#667085",
};

const modalCloseButton = {
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  border: "none",
  background: "#e5e7eb",
  color: "#111827",
  cursor: "pointer",
  fontSize: "20px",
  fontWeight: "900",
};

const receiptPreview = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "16px",
};

const receiptBrandRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const receiptBrand = {
  margin: 0,
  color: "#0A1A2F",
};

const receiptMuted = {
  margin: "5px 0 0",
  color: "#667085",
};

const receiptAmountBox = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: "14px",
  padding: "12px 16px",
  display: "grid",
  gap: "5px",
  textAlign: "center",
};

const receiptGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
};

const receiptNotes = {
  marginTop: "12px",
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  color: "#374151",
};

const receiptTableWrapper = {
  width: "100%",
  overflowX: "auto",
  marginTop: "14px",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
};

const receiptTable = {
  width: "100%",
  borderCollapse: "collapse",
  background: "white",
};

const receiptTh = {
  background: "#f1f5f9",
  color: "#334155",
  padding: "10px",
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "12px",
};

const receiptTd = {
  padding: "10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  fontSize: "13px",
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "16px",
  flexWrap: "wrap",
};


export default AddPayment;