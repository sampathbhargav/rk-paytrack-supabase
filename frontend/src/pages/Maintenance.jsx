import { useEffect, useMemo, useState } from "react";
import {
  addMaintenancePayment,
  addMaintenancePromise,
  calculateMaintenanceTotals,
  createMaintenanceJob,
  getCustomerSuggestions,
  getMaintenanceJobs,
  updateBrokenMaintenancePromises,
  updateMaintenanceJob,
} from "../api/maintenanceApi";
import { formatMoney } from "../utils/moneyUtils";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { logActivity } from "../api/activityLogsApi";

const todayString = new Date().toISOString().split("T")[0];

const emptyForm = {
  invoice_no: "",
  customer_type: "Maintenance Only",
  customer_name: "",
  phone: "",
  email: "",
  address: "",
  truck: "",
  year: "",
  vin: "",
  technician: "",
  job_title: "",
  job_description: "",
  work_status: "Open",
  labor_amount: "",
  parts_amount: "",
  tax_amount: "",
  discount_amount: "",
  start_date: todayString,
  completed_date: "",
  due_date: "",
  notes: "",
};

function Maintenance() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [quickFilter, setQuickFilter] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [viewJob, setViewJob] = useState(null);
  const [paymentJob, setPaymentJob] = useState(null);
  const [promiseJob, setPromiseJob] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    loadMaintenance();
  }, []);

  const loadMaintenance = async () => {
    try {
      setLoading(true);
      setError("");

      await updateBrokenMaintenancePromises();

      const data = await getMaintenanceJobs();
      setJobs(data || []);
    } catch (error) {
      setError(error.message || "Unable to load maintenance records.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintMaintenanceInvoice = (job) => {
    const totals = calculateMaintenanceTotals(job);

    printMaintenanceInvoice(job);

    void logActivity({
      action: "PRINT",
      module: "Maintenance",
      entity_type: "maintenance_invoice",
      entity_id: job?.id,
      entity_label: job?.invoice_no || job?.customer_name || "Maintenance Invoice",
      description: `Maintenance invoice ${
        job?.invoice_no || "—"
      } printed for ${job?.customer_name || "customer"}.`,
      metadata: {
        maintenance_job_id: job?.id || null,
        invoice_no: job?.invoice_no || "",
        customer_id: job?.customer_id || null,
        customer_name: job?.customer_name || "",
        phone: job?.phone || "",
        job_title: job?.job_title || "",
        truck: job?.truck || "",
        year: job?.year || "",
        vin: job?.vin || "",
        total_amount: totals.totalAmount,
        total_paid: totals.totalPaid,
        balance: totals.balance,
        balance_status: totals.balanceStatus,
      },
    });
  };

  const enrichedJobs = useMemo(() => {
    return jobs.map((job) => ({
      ...job,
      totals: calculateMaintenanceTotals(job),
    }));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const text = search.trim().toLowerCase();

    return enrichedJobs.filter((job) => {
      const matchesSearch =
        !text ||
        String(job.invoice_no || "").toLowerCase().includes(text) ||
        String(job.customer_name || "").toLowerCase().includes(text) ||
        String(job.phone || "").toLowerCase().includes(text) ||
        String(job.truck || "").toLowerCase().includes(text) ||
        String(job.year || "").toLowerCase().includes(text) ||
        String(job.vin || "").toLowerCase().includes(text) ||
        String(job.technician || "").toLowerCase().includes(text) ||
        String(job.job_title || "").toLowerCase().includes(text) ||
        String(job.work_status || "").toLowerCase().includes(text) ||
        String(job.totals.balanceStatus || "").toLowerCase().includes(text);

      const matchesStatus =
        statusFilter === "All" || job.work_status === statusFilter;

      const matchesQuickFilter = applyQuickFilter(job, quickFilter);

      return matchesSearch && matchesStatus && matchesQuickFilter;
    });
  }, [enrichedJobs, search, statusFilter, quickFilter]);

  const totalBalance = enrichedJobs.reduce(
    (sum, job) => sum + Number(job.totals.balance || 0),
    0
  );

  const totalAmount = enrichedJobs.reduce(
    (sum, job) => sum + Number(job.totals.totalAmount || 0),
    0
  );

  const totalPaid = enrichedJobs.reduce(
    (sum, job) => sum + Number(job.totals.totalPaid || 0),
    0
  );

  const openJobs = enrichedJobs.filter(
    (job) => job.work_status !== "Closed" && job.work_status !== "Cancelled"
  );

  const brokenPromises = enrichedJobs.flatMap((job) =>
    (job.maintenance_promises || []).filter(
      (promise) => promise.promise_status === "Broken"
    )
  );

  const dueToday = enrichedJobs.filter(
    (job) => Number(job.totals.balance || 0) > 0 && job.due_date === todayString
  );

  const pendingPromises = enrichedJobs.flatMap((job) =>
    (job.maintenance_promises || []).filter(
      (promise) => promise.promise_status === "Pending"
    )
  );

  const completedNotPaid = enrichedJobs.filter(
    (job) =>
      job.work_status === "Completed" && Number(job.totals.balance || 0) > 0
  );

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Service & Repair Ledger</div>
          <h1 style={pageTitle}>Maintenance</h1>
          <p style={pageDescription}>
            Track maintenance invoices, technician work, customer balances,
            scheduled payments, receipts, and open repair balances.
          </p>
        </div>

        <div style={heroActions}>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={primaryButton}
          >
            + Add Maintenance Record
          </button>

          <button type="button" onClick={loadMaintenance} style={secondaryButton}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={metricGrid}>
        <MetricCard label="Total Maintenance" value={formatMoney(totalAmount)} />
        <MetricCard
          label="Total Paid"
          value={formatMoney(totalPaid)}
          tone="success"
        />
        <MetricCard
          label="Open Balance"
          value={formatMoney(totalBalance)}
          tone="danger"
        />
        <MetricCard label="Open Jobs" value={openJobs.length} tone="info" />
        <MetricCard label="Due Today" value={dueToday.length} tone="warning" />
        <MetricCard
          label="Scheduled Payments"
          value={pendingPromises.length}
          tone="warning"
        />
        <MetricCard
          label="Broken Promises"
          value={brokenPromises.length}
          tone="danger"
        />
        <MetricCard
          label="Completed Not Paid"
          value={completedNotPaid.length}
          tone="danger"
        />
      </div>

      <div style={quickFilterBar}>
        {[
          "All",
          "Open Balance",
          "Due Today",
          "Past Due",
          "Promises",
          "Broken Promises",
          "Completed Not Paid",
          "Closed/Paid",
        ].map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setQuickFilter(filter)}
            style={{
              ...quickFilterButton,
              ...(quickFilter === filter ? quickFilterButtonActive : {}),
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      <div style={filterBar}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice, customer, phone, truck, VIN, technician, work title..."
          style={searchInput}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="All">All Work Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Closed">Closed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setStatusFilter("All");
            setQuickFilter("All");
          }}
          style={clearButton}
        >
          Clear
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading maintenance records..." />
      ) : (
        <div style={tableCard}>
          <div style={tableHeader}>
            <div>
              <h2 style={sectionTitle}>Maintenance Records</h2>
              <p style={sectionDescription}>
                Showing {filteredJobs.length} of {jobs.length} maintenance
                records.
              </p>
            </div>

            {loading && <span style={loadingBadge}>Loading...</span>}
          </div>

          <div style={tableWrapper}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Invoice</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Truck</th>
                  <th style={thStyle}>Work</th>
                  <th style={thStyle}>Technician</th>
                  <th style={thStyle}>Work Status</th>
                  <th style={thStyle}>Balance Status</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Paid</th>
                  <th style={thStyle}>Balance</th>
                  <th style={thStyle}>Due / Promise</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td style={emptyCell} colSpan="12">
                      No maintenance records found.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job, index) => {
                    const latestPromise = getLatestPromise(job);
                    const balance = Number(job.totals.balance || 0);
                    const rowBackground =
                      index % 2 === 0 ? "#ffffff" : "#f8fafc";

                    return (
                      <tr
                        key={job.id}
                        style={{
                          background: rowBackground,
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#eef2ff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = rowBackground;
                        }}
                      >
                        <td style={tdStyle}>
                          <strong>{job.invoice_no || "—"}</strong>
                          <div style={smallText}>
                            {job.customer_type || "Maintenance Only"}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          {job.customer_id ? (
                            <Link
                              to={`/customers/${job.customer_id}`}
                              style={customerLinkStyle}
                            >
                              {job.customer_name || "—"}
                            </Link>
                          ) : (
                            <strong>{job.customer_name || "—"}</strong>
                          )}

                          <div style={smallText}>{job.phone || "No phone"}</div>
                        </td>

                        <td style={tdStyle}>
                          {`${job.year || ""} ${job.truck || ""}`.trim() ||
                            "—"}
                          <div style={smallText}>{job.vin || ""}</div>
                        </td>

                        <td style={tdStyle}>
                          <strong>{job.job_title || "—"}</strong>
                          <div style={smallText}>
                            {job.job_description || ""}
                          </div>
                        </td>

                        <td style={tdStyle}>{job.technician || "—"}</td>

                        <td style={tdStyle}>
                          <span style={getStatusBadge(job.work_status)}>
                            {job.work_status || "Open"}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={getBalanceStatusBadge(
                              job.totals.balanceStatus
                            )}
                          >
                            {job.totals.balanceStatus}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          {formatMoney(job.totals.totalAmount)}
                        </td>

                        <td style={tdStyle}>
                          {formatMoney(job.totals.totalPaid)}
                        </td>

                        <td style={tdStyle}>
                          <strong style={balance > 0 ? dangerText : successText}>
                            {formatMoney(balance)}
                          </strong>
                        </td>

                        <td style={tdStyle}>
                          <strong>{formatDate(job.due_date)}</strong>
                          {latestPromise && (
                            <div style={smallText}>
                              Promise: {formatDate(latestPromise.promised_date)} ·{" "}
                              {formatMoney(latestPromise.promised_amount)} ·{" "}
                              {latestPromise.promise_status}
                            </div>
                          )}
                        </td>

                        <td style={tdStyle}>
                          <div style={actionGroup}>
                            <button
                              type="button"
                              onClick={() => setViewJob(job)}
                              style={smallActionButton}
                            >
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() => setPaymentJob(job)}
                              style={paymentButton}
                            >
                              Payment
                            </button>

                            <button
                              type="button"
                              onClick={() => setPromiseJob(job)}
                              style={scheduleButton}
                            >
                              Schedule
                            </button>

                            <button
                              type="button"
                              // onClick={() => printMaintenanceInvoice(job)}
                              onClick={() => handlePrintMaintenanceInvoice(job)}
                              style={printButton}
                            >
                              Invoice
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingJob(job)}
                              style={editButton}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <MaintenanceFormModal
          title="Add Maintenance Record"
          initialData={emptyForm}
          onClose={() => setShowAddModal(false)}
          onSubmit={async (form) => {
            const savedJob = await createMaintenanceJob(form);
          
            await logActivity({
              action: "CREATE",
              module: "Maintenance",
              entity_type: "maintenance_job",
              entity_id: savedJob?.id || form.invoice_no || "",
              entity_label:
                savedJob?.invoice_no ||
                form.invoice_no ||
                form.customer_name ||
                "Maintenance Record",
              description: `Maintenance record created for ${
                form.customer_name || "customer"
              }${form.invoice_no ? `, invoice ${form.invoice_no}` : ""}.`,
              metadata: {
                maintenance_job_id: savedJob?.id || null,
                invoice_no: savedJob?.invoice_no || form.invoice_no || "",
                customer_id: savedJob?.customer_id || form.customer_id || null,
                customer_name: form.customer_name || "",
                phone: form.phone || "",
                truck: form.truck || "",
                year: form.year || "",
                vin: form.vin || "",
                technician: form.technician || "",
                job_title: form.job_title || "",
                work_status: form.work_status || "",
                labor_amount: Number(form.labor_amount || 0),
                parts_amount: Number(form.parts_amount || 0),
                tax_amount: Number(form.tax_amount || 0),
                discount_amount: Number(form.discount_amount || 0),
                start_date: form.start_date || "",
                due_date: form.due_date || "",
              },
            });
          
            setShowAddModal(false);
            await loadMaintenance();
          }}
        />
      )}

      {editingJob && (
        <MaintenanceFormModal
          title="Edit Maintenance Record"
          initialData={editingJob}
          onClose={() => setEditingJob(null)}
          onSubmit={async (form) => {
            const previousJob = editingJob;
            const previousTotals = calculateMaintenanceTotals(previousJob);
          
            const updatedJob = await updateMaintenanceJob(editingJob.id, form);
          
            const newTotal =
              Number(form.labor_amount || 0) +
              Number(form.parts_amount || 0) +
              Number(form.tax_amount || 0) -
              Number(form.discount_amount || 0);
          
            await logActivity({
              action: "UPDATE",
              module: "Maintenance",
              entity_type: "maintenance_job",
              entity_id: previousJob?.id,
              entity_label:
                form.invoice_no ||
                previousJob?.invoice_no ||
                form.customer_name ||
                "Maintenance Record",
              description: `Maintenance record ${
                form.invoice_no || previousJob?.invoice_no || "—"
              } updated for ${form.customer_name || "customer"}.`,
              metadata: {
                maintenance_job_id: previousJob?.id || null,
                invoice_no_before: previousJob?.invoice_no || "",
                invoice_no_after: form.invoice_no || "",
                customer_name_before: previousJob?.customer_name || "",
                customer_name_after: form.customer_name || "",
                work_status_before: previousJob?.work_status || "",
                work_status_after: form.work_status || "",
                job_title_before: previousJob?.job_title || "",
                job_title_after: form.job_title || "",
                total_before: previousTotals.totalAmount,
                total_after: Math.max(newTotal, 0),
                updated_job_id: updatedJob?.id || previousJob?.id || null,
              },
            });
          
            setEditingJob(null);
            await loadMaintenance();
          }}
        />
      )}

      {paymentJob && (
        <PaymentModal
          job={paymentJob}
          onClose={() => setPaymentJob(null)}
          onSubmit={async (payment) => {
            const previousBalance = calculateMaintenanceTotals(paymentJob).balance;
            const paidAmount = Number(payment.amount_paid || 0);
            const remainingBalance = Math.max(previousBalance - paidAmount, 0);
          
            const savedPayment = await addMaintenancePayment(payment);
          
            await logActivity({
              action: "PAYMENT",
              module: "Maintenance",
              entity_type: "maintenance_payment",
              entity_id: savedPayment?.id || payment.maintenance_job_id,
              entity_label:
                paymentJob?.invoice_no ||
                paymentJob?.customer_name ||
                "Maintenance Payment",
              description: `Maintenance payment of ${formatMoney(paidAmount)} recorded for ${
                paymentJob?.customer_name || "customer"
              } on invoice ${paymentJob?.invoice_no || "—"}.`,
              metadata: {
                payment_id: savedPayment?.id || null,
                maintenance_job_id: payment.maintenance_job_id,
                customer_id: payment.customer_id || paymentJob?.customer_id || null,
                customer_name: paymentJob?.customer_name || "",
                phone: paymentJob?.phone || "",
                invoice_no: paymentJob?.invoice_no || "",
                job_title: paymentJob?.job_title || "",
                truck: paymentJob?.truck || "",
                year: paymentJob?.year || "",
                vin: paymentJob?.vin || "",
                amount_paid: paidAmount,
                previous_balance: previousBalance,
                remaining_balance: remainingBalance,
                payment_date: payment.payment_date,
                payment_method: payment.payment_method,
                payment_status: remainingBalance > 0 ? "Partial" : "Paid",
              },
            });
          
            setReceiptData({
              job: paymentJob,
              payment: savedPayment,
              previousBalance,
            });
          
            setPaymentJob(null);
            await loadMaintenance();
          }}
        />
      )}

      {promiseJob && (
        <PromiseModal
          job={promiseJob}
          onClose={() => setPromiseJob(null)}
          onSubmit={async (promise) => {
            const savedPromise = await addMaintenancePromise(promise);
          
            await logActivity({
              action: "CREATE",
              module: "Maintenance",
              entity_type: "maintenance_promise",
              entity_id: savedPromise?.id || promise.maintenance_job_id,
              entity_label:
                promiseJob?.invoice_no ||
                promiseJob?.customer_name ||
                "Maintenance Promise",
              description: `Maintenance payment promise scheduled for ${
                promiseJob?.customer_name || "customer"
              } on ${formatDate(promise.promised_date)} for ${formatMoney(
                Number(promise.promised_amount || 0)
              )}.`,
              metadata: {
                promise_id: savedPromise?.id || null,
                maintenance_job_id: promise.maintenance_job_id,
                customer_id: promise.customer_id || promiseJob?.customer_id || null,
                customer_name: promiseJob?.customer_name || "",
                phone: promiseJob?.phone || "",
                invoice_no: promiseJob?.invoice_no || "",
                job_title: promiseJob?.job_title || "",
                promised_date: promise.promised_date,
                promised_amount: Number(promise.promised_amount || 0),
                promise_status: promise.promise_status,
                notes: promise.notes || "",
              },
            });
          
            setPromiseJob(null);
            await loadMaintenance();
          }}
        />
      )}

      {viewJob && (
        <DetailModal
          job={viewJob}
          onClose={() => setViewJob(null)}
          onPayment={() => {
            setPaymentJob(viewJob);
            setViewJob(null);
          }}
          onSchedule={() => {
            setPromiseJob(viewJob);
            setViewJob(null);
          }}
          // onPrintInvoice={() => printMaintenanceInvoice(viewJob)}
          onPrintInvoice={() => handlePrintMaintenanceInvoice(viewJob)}
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

function MaintenanceFormModal({ title, initialData, onClose, onSubmit }) {
  const [form, setForm] = useState({
    ...emptyForm,
    ...initialData,
    start_date:
      initialData.start_date || new Date().toISOString().split("T")[0],
    completed_date: initialData.completed_date || "",
    due_date: initialData.due_date || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const searchCustomers = async (value) => {
    updateField("customer_name", value);

    if (!value || value.trim().length < 2) {
      setCustomerSuggestions([]);
      setShowCustomerSuggestions(false);
      return;
    }

    try {
      setCustomerLoading(true);

      const results = await getCustomerSuggestions(value);

      setCustomerSuggestions(results);
      setShowCustomerSuggestions(true);
    } catch (error) {
      console.error("Customer search error:", error.message);
    } finally {
      setCustomerLoading(false);
    }
  };

  const selectCustomer = (customer) => {
    setForm((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.customer_name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      customer_type: prev.customer_type || "Maintenance Only",
    }));

    setCustomerSuggestions([]);
    setShowCustomerSuggestions(false);
  };

  const calculatedTotal =
    Number(form.labor_amount || 0) +
    Number(form.parts_amount || 0) +
    Number(form.tax_amount || 0) -
    Number(form.discount_amount || 0);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.customer_name.trim()) {
      setError("Customer name is required.");
      return;
    }

    if (!form.job_title.trim()) {
      setError("Work title is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onSubmit(form);
    } catch (error) {
      setError(error.message || "Unable to save maintenance record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} width="980px">
      <form onSubmit={handleSubmit}>
        {error && <div style={errorBox}>{error}</div>}

        <div style={formGrid}>
          <Input
            label="Invoice No"
            value={form.invoice_no}
            onChange={(v) => updateField("invoice_no", v)}
            placeholder="Auto generated if empty"
          />

          <Select
            label="Customer Type"
            value={form.customer_type}
            onChange={(v) => updateField("customer_type", v)}
            options={["Deal Customer", "Maintenance Only", "Outside Customer"]}
          />

          <div style={{ position: "relative" }}>
            <Input
              label="Customer Name"
              value={form.customer_name}
              onChange={searchCustomers}
              required
              placeholder="Start typing customer name..."
            />

            {showCustomerSuggestions && (
              <div style={suggestionBox}>
                {customerLoading ? (
                  <div style={suggestionItem}>Searching...</div>
                ) : customerSuggestions.length > 0 ? (
                  customerSuggestions.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      style={suggestionButton}
                    >
                      <strong>{customer.customer_name}</strong>
                      <span>
                        {customer.phone || "No phone"}{" "}
                        {customer.email ? `· ${customer.email}` : ""}
                      </span>
                    </button>
                  ))
                ) : (
                  <div style={suggestionItem}>
                    No existing customer found. This will be saved as a new
                    customer.
                  </div>
                )}
              </div>
            )}
          </div>

          <Input
            label="Phone"
            value={form.phone}
            onChange={(v) => updateField("phone", v)}
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(v) => updateField("email", v)}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(v) => updateField("address", v)}
          />

          <Input
            label="Year"
            value={form.year}
            onChange={(v) => updateField("year", v)}
          />
          <Input
            label="Truck"
            value={form.truck}
            onChange={(v) => updateField("truck", v)}
          />
          <Input
            label="VIN"
            value={form.vin}
            onChange={(v) => updateField("vin", v)}
          />
          <Input
            label="Technician"
            value={form.technician}
            onChange={(v) => updateField("technician", v)}
          />

          <Input
            label="Work Title"
            value={form.job_title}
            onChange={(v) => updateField("job_title", v)}
            required
          />

          <Select
            label="Work Status"
            value={form.work_status}
            onChange={(v) => updateField("work_status", v)}
            options={["Open", "In Progress", "Completed", "Closed", "Cancelled"]}
          />

          <Input
            label="Start Date"
            type="date"
            value={form.start_date}
            onChange={(v) => updateField("start_date", v)}
          />
          <Input
            label="Due Date"
            type="date"
            value={form.due_date}
            onChange={(v) => updateField("due_date", v)}
          />
          <Input
            label="Completed Date"
            type="date"
            value={form.completed_date}
            onChange={(v) => updateField("completed_date", v)}
          />

          <Input
            label="Labor Amount"
            type="number"
            value={form.labor_amount}
            onChange={(v) => updateField("labor_amount", v)}
          />
          <Input
            label="Parts Amount"
            type="number"
            value={form.parts_amount}
            onChange={(v) => updateField("parts_amount", v)}
          />
          <Input
            label="Tax Amount"
            type="number"
            value={form.tax_amount}
            onChange={(v) => updateField("tax_amount", v)}
          />
          <Input
            label="Discount Amount"
            type="number"
            value={form.discount_amount}
            onChange={(v) => updateField("discount_amount", v)}
          />
        </div>

        <div style={totalPreview}>
          Calculated Total:{" "}
          <strong>{formatMoney(Math.max(calculatedTotal, 0))}</strong>
        </div>

        <TextArea
          label="Work Description"
          value={form.job_description}
          onChange={(v) => updateField("job_description", v)}
        />

        <TextArea
          label="Notes"
          value={form.notes}
          onChange={(v) => updateField("notes", v)}
        />

        <div style={modalActions}>
          <button type="button" onClick={onClose} style={cancelButton}>
            Cancel
          </button>

          <button type="submit" disabled={saving} style={saveButton}>
            {saving ? "Saving..." : "Save Maintenance Record"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({ job, onClose, onSubmit }) {
  const totals = calculateMaintenanceTotals(job);

  const [form, setForm] = useState({
    maintenance_job_id: job.id,
    customer_id: job.customer_id || null,
    payment_date: todayString,
    amount_paid: totals.balance || "",
    payment_method: "Cash",
    payment_status: "Paid",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (Number(form.amount_paid || 0) <= 0) {
      setError("Payment amount must be greater than 0.");
      return;
    }

    if (Number(form.amount_paid || 0) > Number(totals.balance || 0)) {
      setError("Payment amount cannot be more than the current balance.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onSubmit(form);
    } catch (error) {
      setError(error.message || "Unable to record payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Maintenance Payment" onClose={onClose} width="620px">
      <form onSubmit={handleSubmit}>
        {error && <div style={errorBox}>{error}</div>}

        <div style={customerSummaryBox}>
          <strong>
            {job.invoice_no || "—"} · {job.customer_name}
          </strong>
          <span>{job.job_title}</span>
          <span>Current Balance: {formatMoney(totals.balance)}</span>
        </div>

        <div style={formGridTwo}>
          <Input
            label="Payment Date"
            type="date"
            value={form.payment_date}
            onChange={(v) => setForm((prev) => ({ ...prev, payment_date: v }))}
          />

          <Input
            label="Amount Paid"
            type="number"
            value={form.amount_paid}
            onChange={(v) => setForm((prev) => ({ ...prev, amount_paid: v }))}
          />

          <Select
            label="Payment Method"
            value={form.payment_method}
            onChange={(v) =>
              setForm((prev) => ({ ...prev, payment_method: v }))
            }
            options={["Cash", "Card", "Check", "Zelle", "ACH", "Wire", "Other"]}
          />

          <Select
            label="Payment Status"
            value={form.payment_status}
            onChange={(v) =>
              setForm((prev) => ({ ...prev, payment_status: v }))
            }
            options={["Paid", "Partial", "Voided"]}
          />
        </div>

        <TextArea
          label="Payment Notes"
          value={form.notes}
          onChange={(v) => setForm((prev) => ({ ...prev, notes: v }))}
        />

        <div style={modalActions}>
          <button type="button" onClick={onClose} style={cancelButton}>
            Cancel
          </button>

          <button type="submit" disabled={saving} style={saveButton}>
            {saving ? "Recording..." : "Record Payment & Receipt"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PromiseModal({ job, onClose, onSubmit }) {
  const totals = calculateMaintenanceTotals(job);

  const [form, setForm] = useState({
    maintenance_job_id: job.id,
    customer_id: job.customer_id || null,
    promised_date: "",
    promised_amount: totals.balance || "",
    promise_status: "Pending",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.promised_date) {
      setError("Promised date is required.");
      return;
    }

    if (Number(form.promised_amount || 0) <= 0) {
      setError("Promised amount must be greater than 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onSubmit(form);
    } catch (error) {
      setError(error.message || "Unable to schedule payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Schedule Maintenance Payment" onClose={onClose} width="620px">
      <form onSubmit={handleSubmit}>
        {error && <div style={errorBox}>{error}</div>}

        <div style={customerSummaryBox}>
          <strong>
            {job.invoice_no || "—"} · {job.customer_name}
          </strong>
          <span>{job.job_title}</span>
          <span>Balance: {formatMoney(totals.balance)}</span>
        </div>

        <div style={formGridTwo}>
          <Input
            label="Promised Date"
            type="date"
            value={form.promised_date}
            onChange={(v) =>
              setForm((prev) => ({ ...prev, promised_date: v }))
            }
          />

          <Input
            label="Promised Amount"
            type="number"
            value={form.promised_amount}
            onChange={(v) =>
              setForm((prev) => ({ ...prev, promised_amount: v }))
            }
          />

          <Select
            label="Promise Status"
            value={form.promise_status}
            onChange={(v) =>
              setForm((prev) => ({ ...prev, promise_status: v }))
            }
            options={[
              "Pending",
              "Paid",
              "Partial Paid",
              "Broken",
              "Rescheduled",
              "Cancelled",
            ]}
          />
        </div>

        <TextArea
          label="Promise Notes"
          value={form.notes}
          onChange={(v) => setForm((prev) => ({ ...prev, notes: v }))}
        />

        <div style={modalActions}>
          <button type="button" onClick={onClose} style={cancelButton}>
            Cancel
          </button>

          <button type="submit" disabled={saving} style={saveButton}>
            {saving ? "Scheduling..." : "Schedule Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DetailModal({ job, onClose, onPayment, onSchedule, onPrintInvoice }) {
  const totals = calculateMaintenanceTotals(job);

  return (
    <Modal title="Maintenance Detail" onClose={onClose} width="940px">
      <div style={detailHeader}>
        <div>
          <h2 style={{ margin: 0 }}>
            {job.invoice_no || "—"} · {job.customer_name}
          </h2>
          <p style={{ margin: "6px 0 0", color: "#667085" }}>
            {job.phone || "No phone"} · {job.job_title}
          </p>
        </div>

        <div style={detailBalanceBox}>
          <span>Balance</span>
          <strong>{formatMoney(totals.balance)}</strong>
          <span style={getBalanceStatusBadge(totals.balanceStatus)}>
            {totals.balanceStatus}
          </span>
        </div>
      </div>

      <div style={detailActionRow}>
        <button type="button" onClick={onPayment} style={paymentButton}>
          Take Payment
        </button>
        <button type="button" onClick={onSchedule} style={scheduleButton}>
          Schedule Payment
        </button>
        <button type="button" onClick={onPrintInvoice} style={printButton}>
          Print Invoice
        </button>
      </div>

      <div style={detailGrid}>
        <DetailItem label="Customer Type" value={job.customer_type} />
        <DetailItem
          label="Truck"
          value={`${job.year || ""} ${job.truck || ""}`.trim()}
        />
        <DetailItem label="VIN" value={job.vin} />
        <DetailItem label="Technician" value={job.technician} />
        <DetailItem label="Work Status" value={job.work_status} />
        <DetailItem label="Due Date" value={formatDate(job.due_date)} />
        <DetailItem label="Labor" value={formatMoney(job.labor_amount)} />
        <DetailItem label="Parts" value={formatMoney(job.parts_amount)} />
        <DetailItem label="Tax" value={formatMoney(job.tax_amount)} />
        <DetailItem label="Discount" value={formatMoney(job.discount_amount)} />
        <DetailItem label="Total" value={formatMoney(totals.totalAmount)} />
        <DetailItem label="Paid" value={formatMoney(totals.totalPaid)} />
      </div>

      <div style={detailSection}>
        <h3 style={detailTitle}>Work Description</h3>
        <p style={detailText}>{job.job_description || "No description added."}</p>
      </div>

      <div style={detailSection}>
        <h3 style={detailTitle}>Payment History</h3>
        <MiniTable
          columns={["Date", "Amount", "Method", "Status", "Notes"]}
          rows={(job.maintenance_payments || []).map((payment) => [
            formatDate(payment.payment_date),
            formatMoney(payment.amount_paid),
            payment.payment_method || "—",
            payment.payment_status || "Paid",
            payment.notes || "—",
          ])}
          empty="No maintenance payments recorded."
        />
      </div>

      <div style={detailSection}>
        <h3 style={detailTitle}>Scheduled Payments / Promises</h3>
        <MiniTable
          columns={["Promised Date", "Amount", "Status", "Notes"]}
          rows={(job.maintenance_promises || []).map((promise) => [
            formatDate(promise.promised_date),
            formatMoney(promise.promised_amount),
            promise.promise_status || "Pending",
            promise.notes || "—",
          ])}
          empty="No scheduled payments recorded."
        />
      </div>

      <div style={modalActions}>
        <button type="button" onClick={onClose} style={saveButton}>
          Close
        </button>
      </div>
    </Modal>
  );
}

function MaintenanceReceiptModal({ receiptData, onClose }) {
  const { job, payment, previousBalance } = receiptData;

  const remainingBalance = Math.max(
    Number(previousBalance || 0) - Number(payment.amount_paid || 0),
    0
  );

  const printReceipt = () => {
    const html = buildMaintenanceReceiptHtml({
      job,
      payment,
      previousBalance,
      remainingBalance,
    });

    printHtmlWithIframe(html, "Maintenance Payment Receipt");

    void logActivity({
      action: "PRINT",
      module: "Receipts",
      entity_type: "maintenance_receipt",
      entity_id: payment?.id || job?.id,
      entity_label:
        job?.invoice_no ||
        job?.customer_name ||
        "Maintenance Payment Receipt",
      description: `Maintenance payment receipt printed for ${
        job?.customer_name || "customer"
      }, invoice ${job?.invoice_no || "—"}.`,
      metadata: {
        payment_id: payment?.id || null,
        maintenance_job_id: job?.id || null,
        invoice_no: job?.invoice_no || "",
        customer_id: job?.customer_id || null,
        customer_name: job?.customer_name || "",
        phone: job?.phone || "",
        amount_paid: Number(payment?.amount_paid || 0),
        payment_date: payment?.payment_date || "",
        payment_method: payment?.payment_method || "",
        previous_balance: previousBalance,
        remaining_balance: remainingBalance,
      },
    });
  };

  return (
    <Modal title="Maintenance Payment Receipt" onClose={onClose} width="760px">
      <div style={receiptPreview}>
        <h2 style={{ margin: 0, color: "#0A1A2F" }}>Payment Recorded</h2>
        <p style={{ color: "#667085" }}>
          Receipt for {job.customer_name} · Invoice {job.invoice_no || "—"}
        </p>

        <div style={receiptAmountBox}>
          <span>Amount Paid</span>
          <strong>{formatMoney(payment.amount_paid)}</strong>
        </div>

        <div style={detailGrid}>
          <DetailItem label="Customer" value={job.customer_name} />
          <DetailItem label="Invoice No" value={job.invoice_no} />
          <DetailItem
            label="Payment Date"
            value={formatDate(payment.payment_date)}
          />
          <DetailItem label="Payment Method" value={payment.payment_method} />
          <DetailItem
            label="Previous Balance"
            value={formatMoney(previousBalance)}
          />
          <DetailItem
            label="Remaining Balance"
            value={formatMoney(remainingBalance)}
          />
        </div>
      </div>

      <div style={modalActions}>
        <button type="button" onClick={printReceipt} style={printButtonLarge}>
          Print Receipt
        </button>

        <button type="button" onClick={onClose} style={cancelButton}>
          Close
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children, width = "760px" }) {
  return (
    <div style={modalOverlay}>
      <div style={{ ...modalBox, width }}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>{title}</h2>
          <button type="button" onClick={onClose} style={modalCloseButton}>
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone = "default" }) {
  return (
    <div style={{ ...metricCard, ...getMetricTone(tone) }}>
      <span style={metricLabel}>{label}</span>
      <strong style={metricValue}>{value}</strong>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}) {
  return (
    <label style={fieldWrapper}>
      <span style={labelStyle}>{label}</span>
      <input
        type={type}
        value={value || ""}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={fieldWrapper}>
      <span style={labelStyle}>{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label style={{ ...fieldWrapper, marginTop: "14px" }}>
      <span style={labelStyle}>{label}</span>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows="3"
        style={{ ...inputStyle, resize: "vertical" }}
      />
    </label>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={detailItem}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function MiniTable({ columns, rows, empty }) {
  return (
    <div style={miniTableWrapper}>
      <table style={miniTable}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} style={miniTh}>
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={miniEmpty}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} style={miniTd}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function applyQuickFilter(job, filter) {
  const balance = Number(job.totals.balance || 0);

  const hasPendingPromise = (job.maintenance_promises || []).some(
    (promise) => promise.promise_status === "Pending"
  );

  const hasBrokenPromise = (job.maintenance_promises || []).some(
    (promise) => promise.promise_status === "Broken"
  );

  if (filter === "Open Balance") return balance > 0;
  if (filter === "Due Today") return balance > 0 && job.due_date === todayString;
  if (filter === "Past Due") {
    return balance > 0 && job.due_date && job.due_date < todayString;
  }
  if (filter === "Promises") return hasPendingPromise;
  if (filter === "Broken Promises") return hasBrokenPromise;
  if (filter === "Completed Not Paid") {
    return job.work_status === "Completed" && balance > 0;
  }
  if (filter === "Closed/Paid") return job.work_status === "Closed" || balance <= 0;

  return true;
}

function getLatestPromise(job) {
  const promises = job.maintenance_promises || [];

  if (promises.length === 0) return null;

  return [...promises].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  )[0];
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  return `${month}/${day}/${year}`;
}

function printMaintenanceInvoice(job) {
  const totals = calculateMaintenanceTotals(job);
  const html = buildMaintenanceInvoiceHtml(job, totals);
  printHtmlWithIframe(html, "Maintenance Invoice");
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
          .badge {
            display: inline-block;
            padding: 6px 11px;
            border-radius: 999px;
            font-weight: bold;
            font-size: 12px;
            background: #dbeafe;
            color: #1d4ed8;
            margin-top: 8px;
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
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
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
          .amount-due {
            margin-top: 18px;
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fecaca;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
          }
          .amount-due strong {
            display: block;
            font-size: 28px;
            margin-top: 5px;
          }
          .paid-box {
            background: #dcfce7;
            color: #166534;
            border-color: #bbf7d0;
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
          @media print {
            body { padding: 14px; }
            .doc { border: 1px solid #d1d5db; }
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

function buildMaintenanceInvoiceHtml(job, totals) {
  return `
    <div class="doc">
      <div class="header">
        <div class="brand">
          <h1>RK Truck & Trailer Sales</h1>
          <p>2727 Willowbrook Rd, Dallas, TX 75220</p>
          <p>Phone: 469-880-2222</p>
          <span class="badge">${job.customer_type || "Maintenance Only"}</span>
        </div>

        <div class="meta">
          <h2>MAINTENANCE INVOICE</h2>
          <p><strong>Invoice:</strong> ${job.invoice_no || "—"}</p>
          <p><strong>Date:</strong> ${formatDate(job.start_date)}</p>
          <p><strong>Due:</strong> ${formatDate(job.due_date)}</p>
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
          <div class="label">Truck</div>
          <div class="value">${`${job.year || ""} ${job.truck || ""}`.trim() || "—"}</div>
        </div>
        <div class="box">
          <div class="label">VIN</div>
          <div class="value">${job.vin || "—"}</div>
        </div>
        <div class="box">
          <div class="label">Technician</div>
          <div class="value">${job.technician || "—"}</div>
        </div>
        <div class="box">
          <div class="label">Work Status</div>
          <div class="value">${job.work_status || "Open"}</div>
        </div>
      </div>

      <div class="box">
        <div class="label">Work Performed</div>
        <div class="value">${job.job_title || "—"}</div>
        <p>${job.job_description || ""}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Labor</td><td>${formatMoney(job.labor_amount)}</td></tr>
          <tr><td>Parts</td><td>${formatMoney(job.parts_amount)}</td></tr>
          <tr><td>Tax</td><td>${formatMoney(job.tax_amount)}</td></tr>
          <tr><td>Discount</td><td>-${formatMoney(job.discount_amount)}</td></tr>
          <tr class="total"><td>Total</td><td>${formatMoney(totals.totalAmount)}</td></tr>
          <tr><td>Paid</td><td>${formatMoney(totals.totalPaid)}</td></tr>
          <tr class="total"><td>Balance</td><td>${formatMoney(totals.balance)}</td></tr>
        </tbody>
      </table>

      <div class="${totals.balance <= 0 ? "amount-due paid-box" : "amount-due"}">
        ${totals.balance <= 0 ? "PAID IN FULL" : "BALANCE DUE"}
        <strong>${formatMoney(totals.balance)}</strong>
      </div>

      <div class="notes">
        <strong>Notes:</strong><br />
        ${job.notes || "No notes added."}
      </div>

      <div class="signature-row">
        <div class="signature-line">Customer Signature</div>
        <div class="signature-line">Authorized Representative</div>
      </div>

      <div class="footer">
        <span>RK PayTrack Maintenance Invoice</span>
        <span>Generated ${new Date().toLocaleString()}</span>
      </div>
    </div>
  `;
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
          <p><strong>Payment Date:</strong> ${formatDate(payment.payment_date)}</p>
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

      <div class="amount-due paid-box">
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

function getStatusBadge(status) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "900",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };

  if (status === "Closed") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  if (status === "Completed") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
      borderColor: "#bfdbfe",
    };
  }

  if (status === "In Progress") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  if (status === "Cancelled") {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#6b7280",
      borderColor: "#e5e7eb",
    };
  }

  return {
    ...base,
    background: "#fee2e2",
    color: "#991b1b",
    borderColor: "#fecaca",
  };
}

function getBalanceStatusBadge(status) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "900",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };

  if (status === "Paid" || status === "No Charge") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  if (status === "Promised") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
      borderColor: "#bfdbfe",
    };
  }

  if (status === "Partial") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  if (status === "Overdue" || status === "Broken Promise") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }

  return {
    ...base,
    background: "#f3f4f6",
    color: "#374151",
    borderColor: "#d1d5db",
  };
}

function getMetricTone(tone) {
  if (tone === "success") {
    return { background: "#f0fdf4", borderColor: "#bbf7d0" };
  }

  if (tone === "danger") {
    return { background: "#fef2f2", borderColor: "#fecaca" };
  }

  if (tone === "warning") {
    return { background: "#fffbeb", borderColor: "#fde68a" };
  }

  if (tone === "info") {
    return { background: "#eff6ff", borderColor: "#bfdbfe" };
  }

  return { background: "white", borderColor: "#e5e7eb" };
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
  marginBottom: "0",
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
  fontSize: "31px",
  color: "white",
};

const pageDescription = {
  margin: "8px 0 0",
  color: "#dbeafe",
  maxWidth: "720px",
  lineHeight: "1.5",
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
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "14px",
};

const metricCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  display: "grid",
  gap: "7px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
};

const metricLabel = {
  color: "#667085",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const metricValue = {
  color: "#111827",
  fontSize: "20px",
};

const quickFilterBar = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "13px",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
};

const quickFilterButton = {
  border: "1px solid #d1d5db",
  background: "#f8fafc",
  color: "#334155",
  borderRadius: "999px",
  padding: "8px 11px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "12px",
};

const quickFilterButtonActive = {
  background: "#0A1A2F",
  color: "white",
  borderColor: "#0A1A2F",
};

const filterBar = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
};

const searchInput = {
  flex: "1 1 360px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "11px 13px",
  fontSize: "14px",
  outline: "none",
};

const selectStyle = {
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "11px 13px",
  fontSize: "14px",
  outline: "none",
  background: "white",
};

const clearButton = {
  border: "none",
  borderRadius: "12px",
  background: "#e5e7eb",
  color: "#111827",
  padding: "11px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const tableCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
};

const tableHeader = {
  padding: "16px",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
};

const sectionDescription = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "14px",
};

const loadingBadge = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "7px 11px",
  fontSize: "12px",
  fontWeight: "900",
};

const tableWrapper = {
  width: "100%",
  maxHeight: "620px",
  overflowX: "auto",
  overflowY: "auto",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: "1450px",
};

const thStyle = {
  position: "sticky",
  top: 0,
  zIndex: 3,
  background: "#f1f5f9",
  color: "#334155",
  fontSize: "12px",
  textAlign: "left",
  padding: "13px 12px",
  borderBottom: "1px solid #d1d5db",
  whiteSpace: "nowrap",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const tdStyle = {
  padding: "13px 12px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  verticalAlign: "top",
  fontSize: "13px",
  background: "transparent",
};

const emptyCell = {
  padding: "24px",
  textAlign: "center",
  color: "#667085",
};

const smallText = {
  marginTop: "4px",
  color: "#667085",
  fontSize: "12px",
};

const dangerText = {
  color: "#991b1b",
};

const successText = {
  color: "#166534",
};

const actionGroup = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const smallActionButton = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #d1d5db",
  borderRadius: "999px",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "12px",
};

const paymentButton = {
  ...smallActionButton,
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
};

const scheduleButton = {
  ...smallActionButton,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fde68a",
};

const editButton = {
  ...smallActionButton,
  background: "#dbeafe",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
};

const printButton = {
  ...smallActionButton,
  background: "#f3e8ff",
  color: "#6b21a8",
  border: "1px solid #e9d5ff",
};

const printButtonLarge = {
  background: "#6b21a8",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "900",
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

const modalBox = {
  background: "white",
  borderRadius: "18px",
  maxWidth: "96vw",
  maxHeight: "92vh",
  overflowY: "auto",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.28)",
  padding: "18px",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  borderBottom: "1px solid #e5e7eb",
  padding: "4px 4px 14px",
  marginBottom: "16px",
  position: "sticky",
  top: 0,
  background: "white",
  zIndex: 5,
};

const modalTitle = {
  margin: 0,
  color: "#111827",
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

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "12px",
};

const formGridTwo = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
};

const fieldWrapper = {
  display: "grid",
  gap: "6px",
};

const labelStyle = {
  fontSize: "12px",
  color: "#475569",
  fontWeight: "900",
};

const inputStyle = {
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "10px 11px",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const totalPreview = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  marginTop: "14px",
  color: "#111827",
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "18px",
  flexWrap: "wrap",
};

const cancelButton = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const saveButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const customerSummaryBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "14px",
  display: "grid",
  gap: "5px",
  marginBottom: "14px",
  color: "#111827",
};

const detailHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "14px",
  marginBottom: "14px",
};

const detailActionRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const detailBalanceBox = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  display: "grid",
  gap: "6px",
  minWidth: "180px",
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
};

const detailItem = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  display: "grid",
  gap: "5px",
};

const detailSection = {
  marginTop: "16px",
};

const detailTitle = {
  margin: "0 0 8px",
  color: "#111827",
  fontSize: "16px",
};

const detailText = {
  margin: 0,
  color: "#374151",
  lineHeight: "1.5",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  whiteSpace: "pre-wrap",
};

const miniTableWrapper = {
  width: "100%",
  overflowX: "auto",
};

const miniTable = {
  width: "100%",
  borderCollapse: "collapse",
};

const miniTh = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  padding: "9px",
  textAlign: "left",
  fontSize: "12px",
};

const miniTd = {
  border: "1px solid #e5e7eb",
  padding: "9px",
  fontSize: "13px",
};

const miniEmpty = {
  border: "1px solid #e5e7eb",
  padding: "14px",
  textAlign: "center",
  color: "#667085",
};

const receiptPreview = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "16px",
};

const receiptAmountBox = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: "14px",
  padding: "16px",
  display: "grid",
  gap: "5px",
  textAlign: "center",
  marginBottom: "14px",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "12px",
  borderRadius: "12px",
  marginBottom: "14px",
  fontWeight: "800",
};

const suggestionBox = {
  position: "absolute",
  top: "72px",
  left: 0,
  right: 0,
  background: "white",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.18)",
  zIndex: 10000,
  overflow: "hidden",
};

const suggestionButton = {
  width: "100%",
  border: "none",
  background: "white",
  padding: "11px 12px",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: "4px",
  borderBottom: "1px solid #f1f5f9",
};

const suggestionItem = {
  padding: "11px 12px",
  color: "#667085",
  fontSize: "13px",
};

const customerLinkStyle = {
  color: "#0A1A2F",
  fontWeight: "900",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  cursor: "pointer",
};

export default Maintenance;