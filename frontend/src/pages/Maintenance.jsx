import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { logActivity } from "../api/activityLogsApi";
import { exportToCsv } from "../utils/exportUtils";
import { formatMoney } from "../utils/moneyUtils";
import LoadingSpinner from "../components/LoadingSpinner";

const todayString = new Date().toISOString().split("T")[0];

const emptyForm = {
  invoice_no: "",
  customer_id: null,
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

const quickFilters = [
  "All",
  "Open Balance",
  "Due Today",
  "Past Due",
  "Promises",
  "Broken Promises",
  "Completed Not Paid",
  "Closed/Paid",
];

const workStatuses = ["Open", "In Progress", "Completed", "Closed", "Cancelled"];

function Maintenance() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [quickFilter, setQuickFilter] = useState("All");
  const [sortBy, setSortBy] = useState("due_date");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [viewJob, setViewJob] = useState(null);
  const [paymentJob, setPaymentJob] = useState(null);
  const [promiseJob, setPromiseJob] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    loadMaintenance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, quickFilter, sortBy, sortDirection, pageSize]);

  const loadMaintenance = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      await updateBrokenMaintenancePromises();

      const data = await getMaintenanceJobs();
      setJobs(data || []);
    } catch (error) {
      setMessage(error.message || "Unable to load maintenance records.");
      setMessageType("error");
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

  const stats = useMemo(() => {
    const activeJobs = enrichedJobs.filter(
      (job) => job.work_status !== "Closed" && job.work_status !== "Cancelled"
    );

    const dueToday = enrichedJobs.filter(
      (job) =>
        Number(job.totals.balance || 0) > 0 && job.due_date === todayString
    );

    const pastDue = enrichedJobs.filter(
      (job) =>
        Number(job.totals.balance || 0) > 0 &&
        job.due_date &&
        job.due_date < todayString
    );

    const pendingPromises = enrichedJobs.flatMap((job) =>
      getActiveMaintenancePromises(job).filter(
        (promise) => promise.promise_status === "Pending"
      )
    );

    const brokenPromises = enrichedJobs.flatMap((job) =>
      (job.maintenance_promises || []).filter(
        (promise) => promise.promise_status === "Broken"
      )
    );

    const completedNotPaid = enrichedJobs.filter(
      (job) =>
        job.work_status === "Completed" && Number(job.totals.balance || 0) > 0
    );

    return {
      totalAmount: enrichedJobs.reduce(
        (sum, job) => sum + Number(job.totals.totalAmount || 0),
        0
      ),
      totalPaid: enrichedJobs.reduce(
        (sum, job) => sum + Number(job.totals.totalPaid || 0),
        0
      ),
      totalBalance: enrichedJobs.reduce(
        (sum, job) => sum + Number(job.totals.balance || 0),
        0
      ),
      activeJobs,
      dueToday,
      pastDue,
      pendingPromises,
      brokenPromises,
      completedNotPaid,
    };
  }, [enrichedJobs]);

  const filteredJobs = useMemo(() => {
    const text = search.trim().toLowerCase();

    const filtered = enrichedJobs.filter((job) => {
      const companyName = getCompanyName(job);

      const matchesSearch =
        !text ||
        [
          job.invoice_no,
          job.customer_name,
          companyName,
          job.phone,
          job.email,
          job.address,
          job.truck,
          job.year,
          job.vin,
          job.technician,
          job.job_title,
          job.job_description,
          job.work_status,
          job.customer_type,
          job.notes,
          job.totals.balanceStatus,
        ]
          .join(" ")
          .toLowerCase()
          .includes(text);

      const matchesStatus =
        statusFilter === "All" || job.work_status === statusFilter;

      const matchesQuickFilter = applyQuickFilter(job, quickFilter);

      return matchesSearch && matchesStatus && matchesQuickFilter;
    });

    return sortMaintenanceJobs(filtered, sortBy, sortDirection);
  }, [enrichedJobs, search, statusFilter, quickFilter, sortBy, sortDirection]);

  const filteredStats = useMemo(() => {
    return {
      totalAmount: filteredJobs.reduce(
        (sum, job) => sum + Number(job.totals.totalAmount || 0),
        0
      ),
      totalPaid: filteredJobs.reduce(
        (sum, job) => sum + Number(job.totals.totalPaid || 0),
        0
      ),
      totalBalance: filteredJobs.reduce(
        (sum, job) => sum + Number(job.totals.balance || 0),
        0
      ),
    };
  }, [filteredJobs]);

  const totalPages = Math.max(Math.ceil(filteredJobs.length / pageSize), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pageStart =
    filteredJobs.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;

  const pageEnd = Math.min(safeCurrentPage * pageSize, filteredJobs.length);

  const paginatedJobs = filteredJobs.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const updateFilter = (setter, value) => {
    setter(value);
    setMessage("");
    setMessageType("");
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setQuickFilter("All");
    setSortBy("due_date");
    setSortDirection("asc");
    setCurrentPage(1);
  };

  const showSuccess = (text) => {
    setMessage(text);
    setMessageType("success");
  };

  const exportFilteredMaintenance = () => {
    const rows = filteredJobs.map((job) => {
      const latestPromise = getLatestPromise(job);

      return {
        Invoice_No: job.invoice_no || "",
        Customer: job.customer_name || "",
        Company_Name: getCompanyName(job),
        Phone: job.phone || "",
        Email: job.email || "",
        Address: job.address || "",
        Customer_Type: job.customer_type || "",
        Work_Status: job.work_status || "",
        Balance_Status: job.totals.balanceStatus || "",
        Job_Title: job.job_title || "",
        Technician: job.technician || "",
        Truck: `${job.year || ""} ${job.truck || ""}`.trim(),
        VIN: job.vin || "",
        Start_Date: job.start_date || "",
        Due_Date: job.due_date || "",
        Completed_Date: job.completed_date || "",
        Labor: Number(job.labor_amount || 0),
        Parts: Number(job.parts_amount || 0),
        Tax: Number(job.tax_amount || 0),
        Discount: Number(job.discount_amount || 0),
        Total_Amount: Number(job.totals.totalAmount || 0),
        Total_Paid: Number(job.totals.totalPaid || 0),
        Balance: Number(job.totals.balance || 0),
        Latest_Promise_Date: latestPromise?.promised_date || "",
        Latest_Promise_Amount: latestPromise?.promised_amount || "",
        Latest_Promise_Status: latestPromise?.promise_status || "",
        Notes: job.notes || "",
      };
    });

    exportToCsv(`rk-paytrack-maintenance-records-${todayString}.csv`, rows);
  };

  const handlePrintMaintenanceInvoice = (job) => {
    const totals = calculateMaintenanceTotals(job);

    printMaintenanceInvoice(job);

    void logActivity({
      action: "PRINT",
      module: "Maintenance",
      entity_type: "maintenance_invoice",
      entity_id: job?.id,
      entity_label:
        job?.invoice_no || job?.customer_name || "Maintenance Invoice",
      description: `Maintenance invoice ${
        job?.invoice_no || "—"
      } printed for ${job?.customer_name || "customer"}.`,
      metadata: {
        maintenance_job_id: job?.id || null,
        invoice_no: job?.invoice_no || "",
        customer_id: job?.customer_id || null,
        customer_name: job?.customer_name || "",
        company_name: getCompanyName(job),
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

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Service & Repair Ledger</div>
          <h1 style={pageTitle}>Maintenance</h1>
          <p style={pageDescription}>
            Track repair invoices, customer balances, technician work, payments,
            scheduled promises, receipts, and open service balances.
          </p>

          <div style={heroPills}>
            <span style={heroPill}>Invoices</span>
            <span style={heroPill}>Payments</span>
            <span style={heroPill}>Promises</span>
            <span style={heroPill}>Receipts</span>
            <span style={heroPill}>Reports</span>
          </div>
        </div>

        <div style={heroActions}>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={primaryButton}
          >
            + Add Record
          </button>

          <button
            type="button"
            onClick={loadMaintenance}
            style={secondaryButton}
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            onClick={exportFilteredMaintenance}
            style={secondaryButton}
          >
            Export CSV
          </button>
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

      <div style={metricGrid}>
        <MetricCard
          label="Total Maintenance"
          value={formatMoney(stats.totalAmount)}
        />
        <MetricCard
          label="Total Paid"
          value={formatMoney(stats.totalPaid)}
          tone="success"
        />
        <MetricCard
          label="Open Balance"
          value={formatMoney(stats.totalBalance)}
          tone="danger"
        />
        <MetricCard
          label="Active Jobs"
          value={stats.activeJobs.length}
          tone="info"
        />
        <MetricCard
          label="Due Today"
          value={stats.dueToday.length}
          tone="warning"
        />
        <MetricCard
          label="Past Due"
          value={stats.pastDue.length}
          tone="danger"
        />
        <MetricCard
          label="Scheduled Promises"
          value={stats.pendingPromises.length}
          tone="warning"
        />
        <MetricCard
          label="Broken Promises"
          value={stats.brokenPromises.length}
          tone="danger"
        />
        <MetricCard
          label="Completed Not Paid"
          value={stats.completedNotPaid.length}
          tone="danger"
        />
      </div>

      <div style={quickFilterBar}>
        {quickFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => updateFilter(setQuickFilter, filter)}
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
          onChange={(e) => updateFilter(setSearch, e.target.value)}
          placeholder="Search invoice, customer, company, phone, truck, VIN, technician, work title..."
          style={searchInput}
        />

        <select
          value={statusFilter}
          onChange={(e) => updateFilter(setStatusFilter, e.target.value)}
          style={selectStyle}
        >
          <option value="All">All Work Statuses</option>
          {workStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => updateFilter(setSortBy, e.target.value)}
          style={selectStyle}
        >
          <option value="due_date">Sort by Due Date</option>
          <option value="invoice_no">Sort by Invoice</option>
          <option value="customer_name">Sort by Customer</option>
          <option value="balance">Sort by Balance</option>
          <option value="total">Sort by Total</option>
          <option value="created_at">Sort by Created Date</option>
          <option value="work_status">Sort by Work Status</option>
        </select>

        <select
          value={sortDirection}
          onChange={(e) => updateFilter(setSortDirection, e.target.value)}
          style={selectStyle}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>

        <button type="button" onClick={clearFilters} style={clearButton}>
          Clear
        </button>
      </div>

      <div style={filteredSummaryBar}>
        <span>
          Filtered Total: <strong>{formatMoney(filteredStats.totalAmount)}</strong>
        </span>
        <span>
          Filtered Paid: <strong>{formatMoney(filteredStats.totalPaid)}</strong>
        </span>
        <span>
          Filtered Balance:{" "}
          <strong style={filteredStats.totalBalance > 0 ? dangerText : successText}>
            {formatMoney(filteredStats.totalBalance)}
          </strong>
        </span>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading maintenance records..." />
      ) : (
        <div style={tableCard}>
          <div style={tableHeader}>
            <div>
              <h2 style={sectionTitle}>Maintenance Records</h2>
              <p style={sectionDescription}>
                Showing {pageStart}-{pageEnd} of {filteredJobs.length} filtered
                records. Total records: {jobs.length}.
              </p>
            </div>

            <PaginationControls
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageSizeChange={(value) => setPageSize(Number(value))}
              onPageChange={(page) => setCurrentPage(page)}
            />
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
                {paginatedJobs.length === 0 ? (
                  <tr>
                    <td style={emptyCell} colSpan="12">
                      No maintenance records found.
                    </td>
                  </tr>
                ) : (
                  paginatedJobs.map((job, index) => {
                    const latestPromise = getLatestPromise(job);
                    const balance = Number(job.totals.balance || 0);
                    const rowBackground =
                      index % 2 === 0 ? "#ffffff" : "#f8fafc";

                    return (
                      <tr
                        key={job.id}
                        style={{ background: rowBackground }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#eef2ff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = rowBackground;
                        }}
                      >
                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => setViewJob(job)}
                            style={invoiceLinkButton}
                            title="Open maintenance details"
                          >
                            {job.invoice_no || "View Invoice"}
                          </button>

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

                          {getCompanyName(job) && (
                            <div style={companyPill}>
                              🏢 {getCompanyName(job)}
                            </div>
                          )}

                          <div style={smallText}>{job.phone || "No phone"}</div>
                        </td>

                        <td style={tdStyle}>
                          {`${job.year || ""} ${job.truck || ""}`.trim() || "—"}
                          <div style={smallText}>{job.vin || ""}</div>
                        </td>

                        <td style={tdStyle}>
                          <strong>{job.job_title || "—"}</strong>
                          <div style={smallText}>
                            {truncateText(job.job_description || "", 82)}
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

                          {isPastDue(job) && (
                            <div style={pastDueText}>
                              Past due {daysBetween(job.due_date, todayString)}{" "}
                              days
                            </div>
                          )}

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
                              style={{
                                ...paymentButton,
                                ...(balance <= 0 ? disabledButton : {}),
                              }}
                              disabled={balance <= 0}
                            >
                              Payment
                            </button>

                            <button
                              type="button"
                              onClick={() => setPromiseJob(job)}
                              style={{
                                ...scheduleButton,
                                ...(balance <= 0 ? disabledButton : {}),
                              }}
                              disabled={balance <= 0}
                            >
                              Schedule
                            </button>

                            <button
                              type="button"
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

          <div style={tableFooter}>
            <PaginationControls
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageSizeChange={(value) => setPageSize(Number(value))}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>
      )}

      {showAddModal && (
        <MaintenanceFormModal
          title="Add Maintenance Record"
          initialData={emptyForm}
          onClose={() => setShowAddModal(false)}
          onSubmit={async (form) => {
            const cleanedForm = cleanMaintenanceForm(form);
            const savedJob = await createMaintenanceJob(cleanedForm);

            await logActivity({
              action: "CREATE",
              module: "Maintenance",
              entity_type: "maintenance_job",
              entity_id: savedJob?.id || cleanedForm.invoice_no || "",
              entity_label:
                savedJob?.invoice_no ||
                cleanedForm.invoice_no ||
                cleanedForm.customer_name ||
                "Maintenance Record",
              description: `Maintenance record created for ${
                cleanedForm.customer_name || "customer"
              }${
                cleanedForm.invoice_no ? `, invoice ${cleanedForm.invoice_no}` : ""
              }.`,
              metadata: {
                maintenance_job_id: savedJob?.id || null,
                invoice_no: savedJob?.invoice_no || cleanedForm.invoice_no || "",
                customer_id:
                  savedJob?.customer_id || cleanedForm.customer_id || null,
                customer_name: cleanedForm.customer_name || "",
                phone: cleanedForm.phone || "",
                truck: cleanedForm.truck || "",
                year: cleanedForm.year || "",
                vin: cleanedForm.vin || "",
                technician: cleanedForm.technician || "",
                job_title: cleanedForm.job_title || "",
                work_status: cleanedForm.work_status || "",
                labor_amount: Number(cleanedForm.labor_amount || 0),
                parts_amount: Number(cleanedForm.parts_amount || 0),
                tax_amount: Number(cleanedForm.tax_amount || 0),
                discount_amount: Number(cleanedForm.discount_amount || 0),
                start_date: cleanedForm.start_date || "",
                due_date: cleanedForm.due_date || "",
              },
            });

            setShowAddModal(false);
            await loadMaintenance();
            showSuccess("Maintenance record created.");
          }}
        />
      )}

      {editingJob && (
        <MaintenanceFormModal
          title="Edit Maintenance Record"
          initialData={editingJob}
          onClose={() => setEditingJob(null)}
          onSubmit={async (form) => {
            const cleanedForm = cleanMaintenanceForm(form);
            const previousJob = editingJob;
            const previousTotals = calculateMaintenanceTotals(previousJob);

            const updatedJob = await updateMaintenanceJob(
              editingJob.id,
              cleanedForm
            );

            const nextTotals = calculateMaintenanceTotals({
              ...previousJob,
              ...cleanedForm,
              maintenance_payments: previousJob.maintenance_payments || [],
            });

            await logActivity({
              action: "UPDATE",
              module: "Maintenance",
              entity_type: "maintenance_job",
              entity_id: previousJob?.id,
              entity_label:
                cleanedForm.invoice_no ||
                previousJob?.invoice_no ||
                cleanedForm.customer_name ||
                "Maintenance Record",
              description: `Maintenance record ${
                cleanedForm.invoice_no || previousJob?.invoice_no || "—"
              } updated for ${cleanedForm.customer_name || "customer"}.`,
              metadata: {
                maintenance_job_id: previousJob?.id || null,
                invoice_no_before: previousJob?.invoice_no || "",
                invoice_no_after: cleanedForm.invoice_no || "",
                customer_name_before: previousJob?.customer_name || "",
                customer_name_after: cleanedForm.customer_name || "",
                work_status_before: previousJob?.work_status || "",
                work_status_after: cleanedForm.work_status || "",
                job_title_before: previousJob?.job_title || "",
                job_title_after: cleanedForm.job_title || "",
                total_before: previousTotals.totalAmount,
                total_after: nextTotals.totalAmount,
                updated_job_id: updatedJob?.id || previousJob?.id || null,
              },
            });

            setEditingJob(null);
            await loadMaintenance();
            showSuccess("Maintenance record updated.");
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

            const savedPayment = await addMaintenancePayment({
              ...payment,
              payment_status: remainingBalance > 0 ? "Partial" : "Paid",
            });

            await logActivity({
              action: "PAYMENT",
              module: "Maintenance",
              entity_type: "maintenance_payment",
              entity_id: savedPayment?.id || payment.maintenance_job_id,
              entity_label:
                paymentJob?.invoice_no ||
                paymentJob?.customer_name ||
                "Maintenance Payment",
              description: `Maintenance payment of ${formatMoney(
                paidAmount
              )} recorded for ${paymentJob?.customer_name || "customer"} on invoice ${
                paymentJob?.invoice_no || "—"
              }.`,
              metadata: {
                payment_id: savedPayment?.id || null,
                maintenance_job_id: payment.maintenance_job_id,
                customer_id: payment.customer_id || paymentJob?.customer_id || null,
                customer_name: paymentJob?.customer_name || "",
                company_name: getCompanyName(paymentJob),
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
            showSuccess("Maintenance payment recorded.");
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
                company_name: getCompanyName(promiseJob),
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
            showSuccess("Maintenance promise scheduled.");
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
    customer_id: initialData.customer_id || null,
    start_date: initialData.start_date || todayString,
    completed_date: initialData.completed_date || "",
    due_date: initialData.due_date || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);

  const updateField = (field, value) => {
    setError("");

    setForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (
        field === "work_status" &&
        (value === "Completed" || value === "Closed") &&
        !prev.completed_date
      ) {
        next.completed_date = todayString;
      }

      return next;
    });
  };

  const searchCustomers = async (value) => {
    updateField("customer_name", value);

    setForm((prev) => ({
      ...prev,
      customer_id: null,
    }));

    if (!value || value.trim().length < 2) {
      setCustomerSuggestions([]);
      setShowCustomerSuggestions(false);
      return;
    }

    try {
      setCustomerLoading(true);

      const results = await getCustomerSuggestions(value);

      setCustomerSuggestions(results || []);
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

    const validationError = validateMaintenanceForm(form);

    if (validationError) {
      setError(validationError);
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
                        {customer.company_name ? `${customer.company_name} · ` : ""}
                        {customer.phone || "No phone"}
                        {customer.email ? ` · ${customer.email}` : ""}
                      </span>
                    </button>
                  ))
                ) : (
                  <div style={suggestionItem}>
                    No existing customer found. This will be saved as a new
                    maintenance customer.
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
            options={workStatuses}
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

  const amountPaid = Number(form.amount_paid || 0);
  const remainingAfterPayment = Math.max(
    Number(totals.balance || 0) - amountPaid,
    0
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (amountPaid <= 0) {
      setError("Payment amount must be greater than 0.");
      return;
    }

    if (amountPaid > Number(totals.balance || 0)) {
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
          {getCompanyName(job) && <span>{getCompanyName(job)}</span>}
          <span>{job.job_title}</span>
          <span>Current Balance: {formatMoney(totals.balance)}</span>
          {amountPaid > 0 && (
            <span>
              Balance After Payment: {formatMoney(remainingAfterPayment)}
            </span>
          )}
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
            value={remainingAfterPayment > 0 ? "Partial" : "Paid"}
            onChange={() => {}}
            options={[remainingAfterPayment > 0 ? "Partial" : "Paid"]}
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

    if (Number(form.promised_amount || 0) > Number(totals.balance || 0)) {
      setError("Promised amount cannot be more than the current balance.");
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
          {getCompanyName(job) && <span>{getCompanyName(job)}</span>}
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
  const balance = Number(totals.balance || 0);

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
          {getCompanyName(job) && (
            <div style={companyPill}>{getCompanyName(job)}</div>
          )}
        </div>

        <div style={detailBalanceBox}>
          <span>Balance</span>
          <strong style={balance > 0 ? dangerText : successText}>
            {formatMoney(balance)}
          </strong>
          <span style={getBalanceStatusBadge(totals.balanceStatus)}>
            {totals.balanceStatus}
          </span>
        </div>
      </div>

      <div style={detailActionRow}>
        <button
          type="button"
          onClick={onPayment}
          style={{
            ...paymentButton,
            ...(balance <= 0 ? disabledButton : {}),
          }}
          disabled={balance <= 0}
        >
          Take Payment
        </button>

        <button
          type="button"
          onClick={onSchedule}
          style={{
            ...scheduleButton,
            ...(balance <= 0 ? disabledButton : {}),
          }}
          disabled={balance <= 0}
        >
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
        <DetailItem label="Start Date" value={formatDate(job.start_date)} />
        <DetailItem label="Due Date" value={formatDate(job.due_date)} />
        <DetailItem
          label="Completed Date"
          value={formatDate(job.completed_date)}
        />
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
        <h3 style={detailTitle}>Notes</h3>
        <p style={detailText}>{job.notes || "No notes added."}</p>
      </div>

      <div style={detailSection}>
        <h3 style={detailTitle}>Payment History</h3>
        <MiniTable
          columns={["Date", "Amount", "Method", "Status", "Notes"]}
          rows={(job.maintenance_payments || [])
            .slice()
            .sort((a, b) =>
              String(b.payment_date || "").localeCompare(
                String(a.payment_date || "")
              )
            )
            .map((payment) => [
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
          rows={(job.maintenance_promises || [])
            .slice()
            .sort((a, b) =>
              String(b.promised_date || "").localeCompare(
                String(a.promised_date || "")
              )
            )
            .map((promise) => [
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
        company_name: getCompanyName(job),
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
          <DetailItem label="Company" value={getCompanyName(job)} />
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

function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  onPageSizeChange,
  onPageChange,
}) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <div style={paginationWrapper}>
      <select
        value={pageSize}
        onChange={(event) => onPageSizeChange(event.target.value)}
        style={pageSizeSelect}
      >
        <option value={10}>10 / page</option>
        <option value={25}>25 / page</option>
        <option value={50}>50 / page</option>
        <option value={100}>100 / page</option>
      </select>

      <button
        type="button"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={isFirstPage}
        style={{
          ...pageButton,
          ...(isFirstPage ? disabledButton : {}),
        }}
      >
        Prev
      </button>

      <span style={pageBadge}>
        {currentPage} / {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={isLastPage}
        style={{
          ...pageButton,
          ...(isLastPage ? disabledButton : {}),
        }}
      >
        Next
      </button>
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
      <span style={labelStyle}>
        {label} {required && <span style={requiredMark}>*</span>}
      </span>
      <input
        type={type}
        value={value || ""}
        required={required}
        placeholder={placeholder}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
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
        style={{ ...inputStyle, resize: "vertical", lineHeight: "1.45" }}
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

function cleanMaintenanceForm(form) {
  return {
    ...form,
    invoice_no: String(form.invoice_no || "").trim(),
    customer_id: form.customer_id || null,
    customer_type: String(form.customer_type || "Maintenance Only").trim(),
    customer_name: String(form.customer_name || "").trim(),
    phone: String(form.phone || "").trim(),
    email: String(form.email || "").trim(),
    address: String(form.address || "").trim(),
    truck: String(form.truck || "").trim(),
    year: String(form.year || "").trim(),
    vin: String(form.vin || "").trim(),
    technician: String(form.technician || "").trim(),
    job_title: String(form.job_title || "").trim(),
    job_description: String(form.job_description || "").trim(),
    work_status: String(form.work_status || "Open").trim(),
    labor_amount: Number(form.labor_amount || 0),
    parts_amount: Number(form.parts_amount || 0),
    tax_amount: Number(form.tax_amount || 0),
    discount_amount: Number(form.discount_amount || 0),
    start_date: form.start_date || todayString,
    completed_date: form.completed_date || null,
    due_date: form.due_date || null,
    notes: String(form.notes || "").trim(),
  };
}

function validateMaintenanceForm(form) {
  if (!String(form.customer_name || "").trim()) {
    return "Customer name is required.";
  }

  if (!String(form.job_title || "").trim()) {
    return "Work title is required.";
  }

  const moneyFields = [
    "labor_amount",
    "parts_amount",
    "tax_amount",
    "discount_amount",
  ];

  const hasNegativeAmount = moneyFields.some(
    (field) => Number(form[field] || 0) < 0
  );

  if (hasNegativeAmount) {
    return "Amounts cannot be negative.";
  }

  const total =
    Number(form.labor_amount || 0) +
    Number(form.parts_amount || 0) +
    Number(form.tax_amount || 0) -
    Number(form.discount_amount || 0);

  if (total < 0) {
    return "Discount cannot be greater than labor, parts, and tax combined.";
  }

  if (
    form.completed_date &&
    form.start_date &&
    String(form.completed_date) < String(form.start_date)
  ) {
    return "Completed date cannot be before start date.";
  }

  return "";
}

function applyQuickFilter(job, filter) {
  const balance = Number(job.totals.balance || 0);

  const hasPendingPromise = getActiveMaintenancePromises(job).some(
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
  if (filter === "Closed/Paid") {
    return job.work_status === "Closed" || balance <= 0;
  }

  return true;
}

function sortMaintenanceJobs(list, sortBy, direction) {
  const multiplier = direction === "desc" ? -1 : 1;

  return [...list].sort((a, b) => {
    let aValue = "";
    let bValue = "";

    if (sortBy === "balance") {
      aValue = Number(a.totals.balance || 0);
      bValue = Number(b.totals.balance || 0);
    } else if (sortBy === "total") {
      aValue = Number(a.totals.totalAmount || 0);
      bValue = Number(b.totals.totalAmount || 0);
    } else {
      aValue = String(a[sortBy] || "");
      bValue = String(b[sortBy] || "");
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * multiplier;
    }

    return String(aValue).localeCompare(String(bValue)) * multiplier;
  });
}

function getCompanyName(job) {
  return (
    job?.company_name ||
    job?.customers?.company_name ||
    job?.customer?.company_name ||
    ""
  );
}

function getActiveMaintenancePromises(job) {
  return (job.maintenance_promises || []).filter(
    (promise) =>
      promise.promise_status !== "Paid" &&
      promise.promise_status !== "Cancelled" &&
      promise.promise_status !== "Rescheduled"
  );
}

function getLatestPromise(job) {
  const promises = job.maintenance_promises || [];

  if (promises.length === 0) return null;

  return [...promises].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  )[0];
}

function isPastDue(job) {
  return (
    Number(job.totals.balance || 0) > 0 &&
    job.due_date &&
    String(job.due_date) < todayString
  );
}

function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const difference = end.getTime() - start.getTime();
  return Math.max(Math.floor(difference / (1000 * 60 * 60 * 24)), 0);
}

function truncateText(value, maxLength) {
  const text = String(value || "");

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength)}...`;
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
        <title>${escapeHtml(title)}</title>
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
          <span class="badge">${escapeHtml(
            job.customer_type || "Maintenance Only"
          )}</span>
        </div>

        <div class="meta">
          <h2>MAINTENANCE INVOICE</h2>
          <p><strong>Invoice:</strong> ${escapeHtml(job.invoice_no || "—")}</p>
          <p><strong>Date:</strong> ${escapeHtml(formatDate(job.start_date))}</p>
          <p><strong>Due:</strong> ${escapeHtml(formatDate(job.due_date))}</p>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="label">Customer</div>
          <div class="value">${escapeHtml(job.customer_name || "—")}</div>
        </div>
        <div class="box">
          <div class="label">Company</div>
          <div class="value">${escapeHtml(getCompanyName(job) || "—")}</div>
        </div>
        <div class="box">
          <div class="label">Phone</div>
          <div class="value">${escapeHtml(job.phone || "—")}</div>
        </div>
        <div class="box">
          <div class="label">Truck</div>
          <div class="value">${escapeHtml(
            `${job.year || ""} ${job.truck || ""}`.trim() || "—"
          )}</div>
        </div>
        <div class="box">
          <div class="label">VIN</div>
          <div class="value">${escapeHtml(job.vin || "—")}</div>
        </div>
        <div class="box">
          <div class="label">Technician</div>
          <div class="value">${escapeHtml(job.technician || "—")}</div>
        </div>
        <div class="box">
          <div class="label">Work Status</div>
          <div class="value">${escapeHtml(job.work_status || "Open")}</div>
        </div>
        <div class="box">
          <div class="label">Completed Date</div>
          <div class="value">${escapeHtml(formatDate(job.completed_date))}</div>
        </div>
      </div>

      <div class="box">
        <div class="label">Work Performed</div>
        <div class="value">${escapeHtml(job.job_title || "—")}</div>
        <p>${escapeHtml(job.job_description || "")}</p>
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
          <tr class="total"><td>Total</td><td>${formatMoney(
            totals.totalAmount
          )}</td></tr>
          <tr><td>Paid</td><td>${formatMoney(totals.totalPaid)}</td></tr>
          <tr class="total"><td>Balance</td><td>${formatMoney(
            totals.balance
          )}</td></tr>
        </tbody>
      </table>

      <div class="${totals.balance <= 0 ? "amount-due paid-box" : "amount-due"}">
        ${totals.balance <= 0 ? "PAID IN FULL" : "BALANCE DUE"}
        <strong>${formatMoney(totals.balance)}</strong>
      </div>

      <div class="notes">
        <strong>Notes:</strong><br />
        ${escapeHtml(job.notes || "No notes added.")}
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
          <p><strong>Invoice:</strong> ${escapeHtml(job.invoice_no || "—")}</p>
          <p><strong>Payment Date:</strong> ${escapeHtml(
            formatDate(payment.payment_date)
          )}</p>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="label">Customer</div>
          <div class="value">${escapeHtml(job.customer_name || "—")}</div>
        </div>
        <div class="box">
          <div class="label">Company</div>
          <div class="value">${escapeHtml(getCompanyName(job) || "—")}</div>
        </div>
        <div class="box">
          <div class="label">Phone</div>
          <div class="value">${escapeHtml(job.phone || "—")}</div>
        </div>
        <div class="box">
          <div class="label">Work</div>
          <div class="value">${escapeHtml(job.job_title || "—")}</div>
        </div>
        <div class="box">
          <div class="label">Payment Method</div>
          <div class="value">${escapeHtml(payment.payment_method || "—")}</div>
        </div>
        <div class="box">
          <div class="label">Receipt Status</div>
          <div class="value">Payment Recorded</div>
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
          <tr class="total"><td>Remaining Balance</td><td>${formatMoney(
            remainingBalance
          )}</td></tr>
        </tbody>
      </table>

      <div class="notes">
        <strong>Payment Notes:</strong><br />
        ${escapeHtml(payment.notes || "No notes added.")}
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

const messageBox = {
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
};

const successMessage = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
};

const errorMessage = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
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

const filteredSummaryBar = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "11px 13px",
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
  color: "#475569",
  fontSize: "13px",
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

const tableFooter = {
  padding: "12px 16px",
  borderTop: "1px solid #e5e7eb",
  background: "#f8fafc",
  display: "flex",
  justifyContent: "flex-end",
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
  minWidth: "1500px",
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
  lineHeight: "1.35",
};

const companyPill = {
  marginTop: "5px",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: "900",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "4px 8px",
  display: "inline-flex",
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const pastDueText = {
  marginTop: "4px",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: "900",
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

const disabledButton = {
  opacity: 0.45,
  cursor: "not-allowed",
};

const paginationWrapper = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  flexWrap: "wrap",
};

const pageSizeSelect = {
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "7px 9px",
  background: "white",
  color: "#334155",
  fontSize: "12px",
  fontWeight: "800",
};

const pageButton = {
  background: "white",
  color: "#0A1A2F",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "12px",
};

const pageBadge = {
  background: "#0A1A2F",
  color: "white",
  borderRadius: "8px",
  padding: "7px 10px",
  fontSize: "12px",
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

const requiredMark = {
  color: "#dc2626",
};

const inputStyle = {
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "10px 11px",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  background: "white",
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

const invoiceLinkButton = {
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  color: "#0A1A2F",
  fontWeight: "900",
  fontSize: "13px",
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  textAlign: "left",
};

export default Maintenance;