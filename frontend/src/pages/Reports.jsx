import { useEffect, useMemo, useState } from "react";
import { getDeals } from "../api/dealsApi";
import { getPayments } from "../api/paymentsApi";
import { getPromises } from "../api/promisesApi";
import {
  calculateMaintenanceTotals,
  getMaintenanceJobs,
  updateBrokenMaintenancePromises,
} from "../api/maintenanceApi";
import { exportToCsv } from "../utils/exportUtils";
import { formatMoney } from "../utils/moneyUtils";
import {
  getDueDealsForDate,
  getPastDueScheduledPayments,
} from "../utils/duePaymentsUtils";
import LoadingSpinner from "../components/LoadingSpinner";

function Reports() {
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingReport, setLoadingReport] = useState("");
  const [error, setError] = useState("");

  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);
  const [maintenanceJobs, setMaintenanceJobs] = useState([]);

  const [reportMonth, setReportMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [reportSearch, setReportSearch] = useState("");
  const [reportCategory, setReportCategory] = useState("All");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadReportDashboard();
  }, []);

  const loadReportDashboard = async () => {
    try {
      setLoadingPage(true);
      setError("");

      await updateBrokenMaintenancePromises();

      const dealsData = await getDeals();
      const paymentsData = await getPayments();
      const promisesData = await getPromises();
      const maintenanceData = await getMaintenanceJobs();

      setDeals(dealsData || []);
      setPayments(paymentsData || []);
      setPromises(promisesData || []);
      setMaintenanceJobs(maintenanceData || []);
      setLastRefreshedAt(new Date());
    } catch (error) {
      setError(error.message || "Unable to load reports.");
    } finally {
      setLoadingPage(false);
    }
  };

  const activePayments = useMemo(() => {
    return payments.filter((payment) => payment.payment_status !== "Voided");
  }, [payments]);

  const enrichedMaintenanceJobs = useMemo(() => {
    return maintenanceJobs.map((job) => ({
      ...job,
      totals: calculateMaintenanceTotals(job),
    }));
  }, [maintenanceJobs]);

  const activeMaintenancePayments = useMemo(() => {
    return enrichedMaintenanceJobs.flatMap((job) =>
      (job.maintenance_payments || [])
        .filter((payment) => payment.payment_status !== "Voided")
        .map((payment) => ({
          ...payment,
          job,
        }))
    );
  }, [enrichedMaintenanceJobs]);

  const getDealBalanceInfo = (deal, activePaymentList = activePayments) => {
    const dealPayments = activePaymentList.filter(
      (payment) => payment.deal_id === deal.id
    );

    const totalPaid = dealPayments.reduce(
      (sum, payment) => sum + Number(payment.amount_paid || 0),
      0
    );

    const totalAmount = Number(deal.total_amount || 0);
    const balance = Math.max(totalAmount - totalPaid, 0);

    return {
      dealPayments,
      totalAmount,
      totalPaid,
      balance,
    };
  };

  const totalReceivable = deals.reduce(
    (sum, deal) => sum + Number(deal.total_amount || 0),
    0
  );

  const totalCollected = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  const totalBalance = Math.max(totalReceivable - totalCollected, 0);

  const maintenanceTotalAmount = enrichedMaintenanceJobs.reduce(
    (sum, job) => sum + Number(job.totals.totalAmount || 0),
    0
  );

  const maintenanceTotalPaid = enrichedMaintenanceJobs.reduce(
    (sum, job) => sum + Number(job.totals.totalPaid || 0),
    0
  );

  const maintenanceOpenBalance = enrichedMaintenanceJobs.reduce(
    (sum, job) => sum + Number(job.totals.balance || 0),
    0
  );

  const grandOpenBalance = totalBalance + maintenanceOpenBalance;
  const grandCollected = totalCollected + maintenanceTotalPaid;

  const activeDeals = deals.filter((deal) => deal.status === "Active");
  const paidOffDeals = deals.filter((deal) => deal.status === "Paid Off");
  const defaultedDeals = deals.filter((deal) => deal.status === "Defaulted");

  const pastDueScheduled = getPastDueScheduledPayments(
    deals,
    activePayments,
    today
  );

  const dueToday = getDueDealsForDate(deals, activePayments, today).filter(
    (item) => item.status === "Due" || item.status === "Partial"
  );

  const brokenPromises = promises.filter(
    (promise) => promise.promise_status === "Broken"
  );

  const maintenanceDueToday = enrichedMaintenanceJobs.filter(
    (job) => Number(job.totals.balance || 0) > 0 && job.due_date === today
  );

  const maintenancePastDue = enrichedMaintenanceJobs.filter(
    (job) =>
      Number(job.totals.balance || 0) > 0 &&
      job.due_date &&
      job.due_date < today
  );

  const maintenanceBrokenPromises = enrichedMaintenanceJobs.flatMap((job) =>
    (job.maintenance_promises || [])
      .filter((promise) => promise.promise_status === "Broken")
      .map((promise) => ({
        ...promise,
        job,
      }))
  );

  const completedNotPaid = enrichedMaintenanceJobs.filter(
    (job) =>
      job.work_status === "Completed" && Number(job.totals.balance || 0) > 0
  );

  const topDealBalances = useMemo(() => {
    return deals
      .map((deal) => ({
        deal,
        ...getDealBalanceInfo(deal),
      }))
      .filter((item) => Number(item.balance || 0) > 0)
      .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
      .slice(0, 5);
  }, [deals, activePayments]);

  const topMaintenanceBalances = useMemo(() => {
    return enrichedMaintenanceJobs
      .filter((job) => Number(job.totals.balance || 0) > 0)
      .sort(
        (a, b) =>
          Number(b.totals.balance || 0) - Number(a.totals.balance || 0)
      )
      .slice(0, 5);
  }, [enrichedMaintenanceJobs]);

  const monthlyCollectionData = getMonthlyCollectionData(
    activePayments,
    activeMaintenancePayments
  );

  const dealStatusData = getDealStatusData(deals);

  const maintenanceStatusData = getMaintenanceStatusData(
    enrichedMaintenanceJobs
  );

  const balanceByDealTypeData = getBalanceByDealTypeData(
    deals,
    activePayments,
    getDealBalanceInfo
  );

  const agingReportData = getAgingReportData(pastDueScheduled);

  const paymentMethodData = getPaymentMethodData(
    activePayments,
    activeMaintenancePayments,
    reportMonth
  );

  const portfolioBalanceData = [
    {
      label: "Deal Balances",
      amount: totalBalance,
    },
    {
      label: "Maintenance Balances",
      amount: maintenanceOpenBalance,
    },
  ];

  const customerBalanceRows = buildCustomerBalanceRows(
    deals,
    activePayments,
    enrichedMaintenanceJobs,
    getDealBalanceInfo
  );

  const exportFullDealsReport = async () => {
    try {
      setLoadingReport("Full Deals Report");
      setError("");

      const rows = deals.map((deal) => {
        const { dealPayments, totalAmount, totalPaid, balance } =
          getDealBalanceInfo(deal);

        const dealPromises = promises.filter(
          (promise) => promise.deal_id === deal.id
        );

        const sortedPayments = [...dealPayments].sort((a, b) =>
          String(b.payment_date || "").localeCompare(
            String(a.payment_date || "")
          )
        );

        const lastPayment = sortedPayments[0];

        const paymentHistory = sortedPayments
          .map((payment) => {
            return `${payment.payment_date || "No Date"} - ${
              payment.amount_paid || 0
            } - ${payment.payment_method || "Other"} - Due: ${
              payment.due_date || ""
            } - ${payment.payment_type || ""}`;
          })
          .join(" | ");

        const activeDealPromises = dealPromises.filter(
          (promise) =>
            promise.promise_status !== "Paid" &&
            promise.promise_status !== "Cancelled" &&
            promise.promise_status !== "Rescheduled"
        );

        const activePromiseAmount = activeDealPromises.reduce(
          (sum, promise) => sum + Number(promise.remaining_amount || 0),
          0
        );

        const promiseHistory = dealPromises
          .map((promise) => {
            return `${promise.promise_status || ""} - Original Due: ${
              promise.original_due_date || ""
            } - Promised: ${promise.promised_date || ""} - Remaining: ${
              promise.remaining_amount || 0
            }`;
          })
          .join(" | ");

        return {
          Deal_Tag: deal.deal_tag || "",
          Customer: deal.customers?.customer_name || "",
          Phone: deal.customers?.phone || "",
          Email: deal.customers?.email || "",
          Address: deal.customers?.address || "",
          Status: deal.status || "Active",
          Deal_Type: deal.deal_type || "",
          Deal_Sub_Type: deal.deal_subtype || "",
          Year: deal.year || "",
          Truck: deal.truck || "",
          VIN: deal.vin || "",
          Start_Date: deal.start_date || "",
          Due_Day: deal.due_day || "",
          Monthly_Payment: deal.monthly_payment || 0,
          Term: deal.term || "",
          Maturity_Date: deal.maturity_date || "",
          Total_Amount: totalAmount,
          Total_Paid: totalPaid,
          Balance: balance,
          Last_Payment_Date: lastPayment?.payment_date || "",
          Last_Payment_Amount: lastPayment?.amount_paid || "",
          Last_Payment_Method: lastPayment?.payment_method || "",
          Payment_Count: dealPayments.length,
          Payment_History: paymentHistory,
          Active_Promise_Count: activeDealPromises.length,
          Active_Promise_Amount: activePromiseAmount,
          Promise_History: promiseHistory,
          Notes: deal.notes || "",
        };
      });

      exportToCsv(`rk-paytrack-full-deals-report-${today}.csv`, rows);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const exportPastDueScheduledPaymentsReport = async () => {
    try {
      setLoadingReport("Past Due Scheduled Payments");
      setError("");

      const rows = pastDueScheduled.map((item) => ({
        Source: "Deal Scheduled Payment",
        Deal_Tag: item.deal?.deal_tag || "",
        Customer: item.deal?.customers?.customer_name || "",
        Phone: item.deal?.customers?.phone || "",
        Deal_Type: item.deal?.deal_type || "",
        Truck: `${item.deal?.year || ""} ${item.deal?.truck || ""}`,
        Due_Date: item.dueDate || "",
        Installment: item.installmentNumber || "",
        Amount_Due: item.amountDue || 0,
        Paid: item.paidForDueDate || 0,
        Remaining: item.remainingForDueDate || 0,
        Status: item.status || "",
        Days_Past_Due: item.daysPastDue || "",
      }));

      exportToCsv(`rk-paytrack-past-due-scheduled-${today}.csv`, rows);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const exportDueTodayReport = async () => {
    try {
      setLoadingReport("Due Today");
      setError("");

      const dealRows = dueToday.map((item) => ({
        Source: "Deal Payment",
        Reference: item.deal?.deal_tag || "",
        Customer: item.deal?.customers?.customer_name || "",
        Phone: item.deal?.customers?.phone || "",
        Type: item.deal?.deal_type || "",
        Truck: `${item.deal?.year || ""} ${item.deal?.truck || ""}`,
        Due_Date: item.dueDate || "",
        Amount_Due: item.amountDue || 0,
        Paid: item.paidForDueDate || 0,
        Remaining: item.remainingForDueDate || 0,
        Status: item.status || "",
      }));

      const maintenanceRows = maintenanceDueToday.map((job) => ({
        Source: "Maintenance Invoice",
        Reference: job.invoice_no || "",
        Customer: job.customer_name || "",
        Phone: job.phone || "",
        Type: job.job_title || "",
        Truck: `${job.year || ""} ${job.truck || ""}`,
        Due_Date: job.due_date || "",
        Amount_Due: job.totals.totalAmount || 0,
        Paid: job.totals.totalPaid || 0,
        Remaining: job.totals.balance || 0,
        Status: job.work_status || "",
      }));

      exportToCsv(`rk-paytrack-due-today-${today}.csv`, [
        ...dealRows,
        ...maintenanceRows,
      ]);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const exportPastDuePromisesReport = async () => {
    try {
      setLoadingReport("Past Due Promises");
      setError("");

      const dealPromiseRows = promises
        .filter(
          (promise) =>
            promise.promise_status !== "Paid" &&
            promise.promise_status !== "Cancelled" &&
            promise.promise_status !== "Rescheduled" &&
            promise.promised_date < today
        )
        .map((promise) => ({
          Source: "Deal Promise",
          Reference: promise.deals?.deal_tag || "",
          Customer: promise.deals?.customers?.customer_name || "",
          Phone: promise.deals?.customers?.phone || "",
          Original_Due_Date: promise.original_due_date || "",
          Promised_Date: promise.promised_date || "",
          Amount_Due: promise.amount_due || 0,
          Paid_Now: promise.amount_paid_now || 0,
          Remaining: promise.remaining_amount || 0,
          Status: promise.promise_status || "",
          Notes: promise.notes || "",
        }));

      const maintenancePromiseRows = enrichedMaintenanceJobs.flatMap((job) =>
        (job.maintenance_promises || [])
          .filter(
            (promise) =>
              promise.promise_status !== "Paid" &&
              promise.promise_status !== "Cancelled" &&
              promise.promise_status !== "Rescheduled" &&
              promise.promised_date < today
          )
          .map((promise) => ({
            Source: "Maintenance Promise",
            Reference: job.invoice_no || "",
            Customer: job.customer_name || "",
            Phone: job.phone || "",
            Original_Due_Date: job.due_date || "",
            Promised_Date: promise.promised_date || "",
            Amount_Due: promise.promised_amount || 0,
            Paid_Now: "",
            Remaining: promise.promised_amount || 0,
            Status: promise.promise_status || "",
            Notes: promise.notes || "",
          }))
      );

      exportToCsv(`rk-paytrack-past-due-promises-${today}.csv`, [
        ...dealPromiseRows,
        ...maintenancePromiseRows,
      ]);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const exportPaidOffDealsReport = async () => {
    try {
      setLoadingReport("Paid Off Deals");
      setError("");

      const rows = deals
        .filter((deal) => deal.status === "Paid Off")
        .map((deal) => {
          const { dealPayments, totalAmount, totalPaid, balance } =
            getDealBalanceInfo(deal);

          const sortedPayments = [...dealPayments].sort((a, b) =>
            String(b.payment_date || "").localeCompare(
              String(a.payment_date || "")
            )
          );

          const lastPayment = sortedPayments[0];

          return {
            Deal_Tag: deal.deal_tag || "",
            Customer: deal.customers?.customer_name || "",
            Phone: deal.customers?.phone || "",
            Deal_Type: deal.deal_type || "",
            Truck: `${deal.year || ""} ${deal.truck || ""}`,
            VIN: deal.vin || "",
            Total_Amount: totalAmount,
            Total_Paid: totalPaid,
            Balance: balance,
            Last_Payment_Date: lastPayment?.payment_date || "",
            Last_Payment_Amount: lastPayment?.amount_paid || "",
            Maturity_Date: deal.maturity_date || "",
            Notes: deal.notes || "",
          };
        });

      exportToCsv(`rk-paytrack-paid-off-deals-${today}.csv`, rows);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const exportDefaultedDealsReport = async () => {
    try {
      setLoadingReport("Defaulted Deals");
      setError("");

      const rows = deals
        .filter((deal) => deal.status === "Defaulted")
        .map((deal) => {
          const { totalAmount, totalPaid, balance } = getDealBalanceInfo(deal);

          return {
            Deal_Tag: deal.deal_tag || "",
            Customer: deal.customers?.customer_name || "",
            Phone: deal.customers?.phone || "",
            Deal_Type: deal.deal_type || "",
            Truck: `${deal.year || ""} ${deal.truck || ""}`,
            VIN: deal.vin || "",
            Total_Amount: totalAmount,
            Total_Paid: totalPaid,
            Balance: balance,
            Monthly_Payment: deal.monthly_payment || 0,
            Start_Date: deal.start_date || "",
            Due_Day: deal.due_day || "",
            Term: deal.term || "",
            Maturity_Date: deal.maturity_date || "",
            Notes: deal.notes || "",
          };
        });

      exportToCsv(`rk-paytrack-defaulted-deals-${today}.csv`, rows);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const exportRegistrationMoneyReport = async () => {
    try {
      setLoadingReport("Registration Money");
      setError("");

      const rows = deals
        .filter((deal) => deal.deal_type === "Registration Money")
        .map((deal) => {
          const { totalAmount, totalPaid, balance } = getDealBalanceInfo(deal);

          return {
            Deal_Tag: deal.deal_tag || "",
            Customer: deal.customers?.customer_name || "",
            Phone: deal.customers?.phone || "",
            Status: deal.status || "",
            Truck: `${deal.year || ""} ${deal.truck || ""}`,
            VIN: deal.vin || "",
            Tentative_Due_Date: deal.start_date || "",
            Amount: totalAmount,
            Paid: totalPaid,
            Balance: balance,
            Notes: deal.notes || "",
          };
        });

      exportToCsv(`rk-paytrack-registration-money-${today}.csv`, rows);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const exportMonthlyCollectionReport = async () => {
    try {
      setLoadingReport("Monthly Collection");
      setError("");

      const dealRows = activePayments
        .filter((payment) =>
          String(payment.payment_date || "").startsWith(reportMonth)
        )
        .map((payment) => ({
          Source: "Deal Payment",
          Payment_Date: payment.payment_date || "",
          Reference: payment.deals?.deal_tag || "",
          Customer: payment.deals?.customers?.customer_name || "",
          Phone: payment.deals?.customers?.phone || "",
          Truck: `${payment.deals?.year || ""} ${payment.deals?.truck || ""}`,
          Amount_Due: payment.amount_due || 0,
          Amount_Paid: payment.amount_paid || 0,
          Remaining: payment.remaining_amount || 0,
          Method: payment.payment_method || "",
          Type: payment.payment_type || "",
          Due_Date: payment.due_date || "",
          Notes: payment.notes || "",
        }));

      const maintenanceRows = activeMaintenancePayments
        .filter((payment) =>
          String(payment.payment_date || "").startsWith(reportMonth)
        )
        .map((payment) => ({
          Source: "Maintenance Payment",
          Payment_Date: payment.payment_date || "",
          Reference: payment.job?.invoice_no || "",
          Customer: payment.job?.customer_name || "",
          Phone: payment.job?.phone || "",
          Truck: `${payment.job?.year || ""} ${payment.job?.truck || ""}`,
          Amount_Due: payment.job?.totals?.totalAmount || 0,
          Amount_Paid: payment.amount_paid || 0,
          Remaining: "",
          Method: payment.payment_method || "",
          Type: payment.payment_status || "",
          Due_Date: payment.job?.due_date || "",
          Notes: payment.notes || "",
        }));

      exportToCsv(`rk-paytrack-monthly-collection-${reportMonth}.csv`, [
        ...dealRows,
        ...maintenanceRows,
      ]);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const exportMaintenanceBalancesReport = async () => {
    try {
      setLoadingReport("Maintenance Balances");
      setError("");

      const rows = enrichedMaintenanceJobs.map((job) => ({
        Invoice_No: job.invoice_no || "",
        Customer: job.customer_name || "",
        Phone: job.phone || "",
        Email: job.email || "",
        Customer_Type: job.customer_type || "",
        Work_Status: job.work_status || "",
        Balance_Status: job.totals.balanceStatus || "",
        Job_Title: job.job_title || "",
        Technician: job.technician || "",
        Truck: `${job.year || ""} ${job.truck || ""}`,
        VIN: job.vin || "",
        Start_Date: job.start_date || "",
        Due_Date: job.due_date || "",
        Completed_Date: job.completed_date || "",
        Labor: job.labor_amount || 0,
        Parts: job.parts_amount || 0,
        Tax: job.tax_amount || 0,
        Discount: job.discount_amount || 0,
        Total_Amount: job.totals.totalAmount || 0,
        Total_Paid: job.totals.totalPaid || 0,
        Balance: job.totals.balance || 0,
        Notes: job.notes || "",
      }));

      exportToCsv(`rk-paytrack-maintenance-balances-${today}.csv`, rows);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const exportCustomerBalanceReport = async () => {
    try {
      setLoadingReport("Customer Balance Report");
      setError("");

      exportToCsv(
        `rk-paytrack-customer-balance-report-${today}.csv`,
        customerBalanceRows
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const exportCollectionPriorityReport = async () => {
    try {
      setLoadingReport("Collection Priority");
      setError("");

      const rows = buildCollectionPriorityRows({
        pastDueScheduled,
        brokenPromises,
        maintenancePastDue,
        maintenanceBrokenPromises,
        today,
      });

      exportToCsv(`rk-paytrack-collection-priority-${today}.csv`, rows);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const exportCollectionSummaryByDayReport = async () => {
    try {
      setLoadingReport("Daily Collection Summary");
      setError("");

      const rows = buildDailyCollectionSummaryRows(
        activePayments,
        activeMaintenancePayments,
        reportMonth
      );

      exportToCsv(
        `rk-paytrack-daily-collection-summary-${reportMonth}.csv`,
        rows
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  const reportCards = [
    {
      category: "Deals",
      title: "Full Deals Report",
      description:
        "All deals with customer info, maturity date, total paid, balance, payment history, promise history, and notes.",
      buttonText: "Export Full Deals",
      loadingKey: "Full Deals Report",
      onClick: exportFullDealsReport,
      count: deals.length,
    },
    {
      category: "Collections",
      title: "Collection Priority",
      description:
        "High-priority follow-up list combining past-due installments, broken promises, maintenance past due, and broken maintenance promises.",
      buttonText: "Export Priority List",
      loadingKey: "Collection Priority",
      onClick: exportCollectionPriorityReport,
      count:
        pastDueScheduled.length +
        brokenPromises.length +
        maintenancePastDue.length +
        maintenanceBrokenPromises.length,
    },
    {
      category: "Customers",
      title: "Customer Balance Report",
      description:
        "Customer-level balance report combining deal balances and maintenance balances into one management view.",
      buttonText: "Export Customer Balances",
      loadingKey: "Customer Balance Report",
      onClick: exportCustomerBalanceReport,
      count: customerBalanceRows.length,
    },
    {
      category: "Deals",
      title: "Past Due Scheduled Payments",
      description:
        "Scheduled installments that are past due and still unpaid or partially paid.",
      buttonText: "Export Past Due Scheduled",
      loadingKey: "Past Due Scheduled Payments",
      onClick: exportPastDueScheduledPaymentsReport,
      count: pastDueScheduled.length,
    },
    {
      category: "Collections",
      title: "Due Today",
      description:
        "Deal payments and maintenance invoices due today for same-day follow-up.",
      buttonText: "Export Due Today",
      loadingKey: "Due Today",
      onClick: exportDueTodayReport,
      count: dueToday.length + maintenanceDueToday.length,
    },
    {
      category: "Promises",
      title: "Past Due Promises",
      description:
        "Deal and maintenance promises where the promised date has passed and the promise is still unpaid or active.",
      buttonText: "Export Past Due Promises",
      loadingKey: "Past Due Promises",
      onClick: exportPastDuePromisesReport,
      count: brokenPromises.length + maintenanceBrokenPromises.length,
    },
    {
      category: "Maintenance",
      title: "Maintenance Balances",
      description:
        "All maintenance records with invoice number, work status, total, paid, balance, due date, and technician.",
      buttonText: "Export Maintenance",
      loadingKey: "Maintenance Balances",
      onClick: exportMaintenanceBalancesReport,
      count: enrichedMaintenanceJobs.length,
    },
    {
      category: "Collections",
      title: "Monthly Collection",
      description:
        "All deal and maintenance payments collected in the selected month with method, date, customer, and notes.",
      buttonText: `Export ${reportMonth}`,
      loadingKey: "Monthly Collection",
      onClick: exportMonthlyCollectionReport,
      count:
        activePayments.filter((payment) =>
          String(payment.payment_date || "").startsWith(reportMonth)
        ).length +
        activeMaintenancePayments.filter((payment) =>
          String(payment.payment_date || "").startsWith(reportMonth)
        ).length,
    },
    {
      category: "Collections",
      title: "Daily Collection Summary",
      description:
        "Daily summary of deal payments, maintenance payments, and total collected for the selected month.",
      buttonText: "Export Daily Summary",
      loadingKey: "Daily Collection Summary",
      onClick: exportCollectionSummaryByDayReport,
      count: reportMonth,
    },
    {
      category: "Deals",
      title: "Paid Off Deals",
      description:
        "Deals marked Paid Off with total paid, final balance, and last payment information.",
      buttonText: "Export Paid Off",
      loadingKey: "Paid Off Deals",
      onClick: exportPaidOffDealsReport,
      count: paidOffDeals.length,
    },
    {
      category: "Deals",
      title: "Defaulted Deals",
      description:
        "Deals currently marked Defaulted for collection or management review.",
      buttonText: "Export Defaulted",
      loadingKey: "Defaulted Deals",
      onClick: exportDefaultedDealsReport,
      count: defaultedDeals.length,
    },
    {
      category: "Deals",
      title: "Registration Money",
      description:
        "Registration money deals with tentative due date, amount, paid amount, balance, and notes.",
      buttonText: "Export Registration",
      loadingKey: "Registration Money",
      onClick: exportRegistrationMoneyReport,
      count: deals.filter((deal) => deal.deal_type === "Registration Money")
        .length,
    },
  ];

  const reportCategories = [
    "All",
    ...new Set(reportCards.map((card) => card.category)),
  ];

  const filteredReportCards = reportCards.filter((card) => {
    const matchesCategory =
      reportCategory === "All" || card.category === reportCategory;

    const text = reportSearch.trim().toLowerCase();

    const matchesSearch =
      !text ||
      `${card.title} ${card.description} ${card.category}`
        .toLowerCase()
        .includes(text);

    return matchesCategory && matchesSearch;
  });

  if (loadingPage) {
    return (
      <div style={pageWrapper}>
        <LoadingSpinner message="Loading report dashboard..." height="420px" />
      </div>
    );
  }

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Business Intelligence</div>
          <h1 style={pageTitle}>Reports</h1>
          <p style={pageDescription}>
            Review collections, open balances, past due accounts, promises,
            maintenance invoices, and export reports for management and
            accounting.
          </p>

          {lastRefreshedAt && (
            <p style={lastRefreshedText}>
              Last refreshed: {lastRefreshedAt.toLocaleString()}
            </p>
          )}
        </div>

        <div style={heroActions}>
          <button
            type="button"
            onClick={loadReportDashboard}
            style={refreshButton}
          >
            ↻ Refresh Reports
          </button>
        </div>
      </div>

      {error && <div style={errorBox}>Report failed: {error}</div>}

      <div style={summaryGrid}>
        <SummaryCard
          title="Total Receivable"
          value={formatMoney(totalReceivable)}
        />
        <SummaryCard
          title="Deal Collected"
          value={formatMoney(totalCollected)}
          tone="success"
        />
        <SummaryCard
          title="Deal Open Balance"
          value={formatMoney(totalBalance)}
          tone="danger"
        />
        <SummaryCard
          title="Maintenance Balance"
          value={formatMoney(maintenanceOpenBalance)}
          tone="warning"
        />
        <SummaryCard
          title="Grand Open Balance"
          value={formatMoney(grandOpenBalance)}
          tone="danger"
        />
        <SummaryCard
          title="Grand Collected"
          value={formatMoney(grandCollected)}
          tone="success"
        />
        <SummaryCard title="Active Deals" value={activeDeals.length} />
        <SummaryCard title="Paid Off" value={paidOffDeals.length} tone="success" />
        <SummaryCard
          title="Due Today"
          value={dueToday.length + maintenanceDueToday.length}
          tone="warning"
        />
        <SummaryCard
          title="Past Due"
          value={pastDueScheduled.length + maintenancePastDue.length}
          tone="danger"
        />
        <SummaryCard
          title="Broken Promises"
          value={brokenPromises.length + maintenanceBrokenPromises.length}
          tone="danger"
        />
        <SummaryCard title="Defaulted" value={defaultedDeals.length} tone="dark" />
      </div>

      <div style={attentionGrid}>
        <InsightCard
          title="Collection Priority"
          value={
            pastDueScheduled.length +
            brokenPromises.length +
            maintenancePastDue.length +
            maintenanceBrokenPromises.length
          }
          description="Accounts that need follow-up because they are past due, broken promise, or unpaid maintenance."
          tone="danger"
        />

        <InsightCard
          title="Completed Not Paid"
          value={completedNotPaid.length}
          description="Maintenance jobs marked completed but still carrying an open balance."
          tone="warning"
        />

        <InsightCard
          title="Top Deal Balance"
          value={
            topDealBalances[0]
              ? formatMoney(topDealBalances[0].balance)
              : formatMoney(0)
          }
          description={
            topDealBalances[0]
              ? `${topDealBalances[0].deal?.deal_tag || ""} - ${
                  topDealBalances[0].deal?.customers?.customer_name || ""
                }`
              : "No open deal balance."
          }
          tone="info"
        />

        <InsightCard
          title="Top Maintenance Balance"
          value={
            topMaintenanceBalances[0]
              ? formatMoney(topMaintenanceBalances[0].totals.balance)
              : formatMoney(0)
          }
          description={
            topMaintenanceBalances[0]
              ? `${topMaintenanceBalances[0].invoice_no || ""} - ${
                  topMaintenanceBalances[0].customer_name || ""
                }`
              : "No open maintenance balance."
          }
          tone="info"
        />
      </div>

      <div style={chartGrid}>
        <ChartCard title="Monthly Collection - Last 6 Months">
          <BarChart
            data={monthlyCollectionData}
            labelKey="month"
            valueKey="total"
            formatValue={formatMoney}
          />
        </ChartCard>

        <ChartCard title="Deal Status Breakdown">
          <DonutChart data={dealStatusData} centerLabel="Deals" />
        </ChartCard>

        <ChartCard title="Maintenance Work Status">
          <DonutChart data={maintenanceStatusData} centerLabel="Jobs" />
        </ChartCard>

        <ChartCard title="Portfolio Open Balance">
          <HorizontalBarChart
            data={portfolioBalanceData}
            labelKey="label"
            valueKey="amount"
            formatValue={formatMoney}
          />
        </ChartCard>

        <ChartCard title="Balance by Deal Type">
          <HorizontalBarChart
            data={balanceByDealTypeData}
            labelKey="dealType"
            valueKey="balance"
            formatValue={formatMoney}
          />
        </ChartCard>

        <ChartCard title="Aging Report">
          <HorizontalBarChart
            data={agingReportData}
            labelKey="bucket"
            valueKey="amount"
            formatValue={formatMoney}
          />
        </ChartCard>

        <ChartCard title={`Payment Method Breakdown - ${reportMonth}`}>
          <HorizontalBarChart
            data={paymentMethodData}
            labelKey="method"
            valueKey="amount"
            formatValue={formatMoney}
          />
        </ChartCard>
      </div>

      <div style={exportsSection}>
        <div style={sectionHeader}>
          <div>
            <div style={sectionEyebrow}>CSV Exports</div>
            <h2 style={sectionTitle}>Export Reports</h2>
            <p style={sectionDescription}>
              Export reports for management review, collections, accounting,
              maintenance billing, and customer follow-up.
            </p>
          </div>
        </div>

        <div style={toolbar}>
          <div style={monthFilterBox}>
            <label style={labelStyle}>Monthly Collection Month</label>
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              style={monthInput}
            />
          </div>

          <input
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
            placeholder="Search reports..."
            style={searchInput}
          />

          <select
            value={reportCategory}
            onChange={(e) => setReportCategory(e.target.value)}
            style={selectStyle}
          >
            {reportCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setReportSearch("");
              setReportCategory("All");
            }}
            style={clearButton}
          >
            Clear
          </button>
        </div>

        <div style={reportGrid}>
          {filteredReportCards.map((card) => (
            <ReportCard
              key={card.title}
              title={card.title}
              category={card.category}
              count={card.count}
              description={card.description}
              buttonText={card.buttonText}
              onClick={card.onClick}
              loading={loadingReport === card.loadingKey}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, tone = "default" }) {
  return (
    <div style={{ ...summaryCard, ...getSummaryTone(tone) }}>
      <p style={summaryCardTitle}>{title}</p>
      <h2 style={summaryCardValue}>{value}</h2>
    </div>
  );
}

function InsightCard({ title, value, description, tone = "default" }) {
  return (
    <div style={{ ...insightCard, ...getInsightTone(tone) }}>
      <span style={insightLabel}>{title}</span>
      <strong style={insightValue}>{value}</strong>
      <p style={insightDescription}>{description}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={chartCard}>
      <h2 style={chartTitle}>{title}</h2>
      {children}
    </div>
  );
}

function ReportCard({
  title,
  category,
  count,
  description,
  buttonText,
  onClick,
  loading,
}) {
  return (
    <div style={cardStyle}>
      <div style={reportCardTop}>
        <span style={categoryBadge}>{category}</span>
        <span style={countBadge}>{count}</span>
      </div>

      <h2 style={cardTitle}>{title}</h2>
      <p style={cardDescription}>{description}</p>

      <button
        type="button"
        onClick={onClick}
        style={{
          ...exportButton,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? "not-allowed" : "pointer",
        }}
        disabled={loading}
      >
        {loading ? "Exporting..." : buttonText}
      </button>
    </div>
  );
}

function BarChart({ data, labelKey, valueKey, formatValue }) {
  const maxValue = Math.max(
    ...data.map((item) => Number(item[valueKey] || 0)),
    1
  );

  return (
    <div style={barChartBox}>
      {data.map((item) => {
        const value = Number(item[valueKey] || 0);
        const height = Math.max((value / maxValue) * 180, value > 0 ? 10 : 2);

        return (
          <div key={item[labelKey]} style={verticalBarItem}>
            <div style={barValue}>{formatValue(value)}</div>
            <div style={verticalBarTrack}>
              <div style={{ ...verticalBar, height: `${height}px` }} />
            </div>
            <div style={barLabel}>{item[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBarChart({ data, labelKey, valueKey, formatValue }) {
  const maxValue = Math.max(
    ...data.map((item) => Number(item[valueKey] || 0)),
    1
  );

  return (
    <div style={horizontalChartBox}>
      {data.length === 0 ? (
        <p style={emptyText}>No data available.</p>
      ) : (
        data.map((item) => {
          const value = Number(item[valueKey] || 0);
          const width = Math.max((value / maxValue) * 100, value > 0 ? 5 : 1);

          return (
            <div key={item[labelKey]} style={horizontalItem}>
              <div style={horizontalLabelRow}>
                <strong>{item[labelKey]}</strong>
                <span>{formatValue(value)}</span>
              </div>

              <div style={horizontalTrack}>
                <div style={{ ...horizontalBar, width: `${width}%` }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function DonutChart({ data, centerLabel = "Total" }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  if (total === 0) {
    return <p style={emptyText}>No data available.</p>;
  }

  let cumulative = 0;

  return (
    <div style={donutWrapper}>
      <svg width="190" height="190" viewBox="0 0 42 42">
        <circle
          cx="21"
          cy="21"
          r="15.915"
          fill="transparent"
          stroke="#e5e7eb"
          strokeWidth="6"
        />

        {data.map((item) => {
          const percent = (item.value / total) * 100;
          const dashArray = `${percent} ${100 - percent}`;
          const dashOffset = 25 - cumulative;
          cumulative += percent;

          return (
            <circle
              key={item.label}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={item.color}
              strokeWidth="6"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
            />
          );
        })}

        <text x="21" y="20" textAnchor="middle" fontSize="4" fontWeight="bold">
          {total}
        </text>
        <text x="21" y="25" textAnchor="middle" fontSize="3" fill="#667085">
          {centerLabel}
        </text>
      </svg>

      <div style={legendBox}>
        {data.map((item) => (
          <div key={item.label} style={legendItem}>
            <span style={{ ...legendDot, background: item.color }} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function getMonthlyCollectionData(dealPayments, maintenancePayments) {
  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toISOString().slice(0, 7);
    const label = date.toLocaleString("default", {
      month: "short",
      year: "2-digit",
    });

    months.push({
      key,
      month: label,
      dealAmount: 0,
      maintenanceAmount: 0,
      total: 0,
    });
  }

  dealPayments.forEach((payment) => {
    const paymentMonth = String(payment.payment_date || "").slice(0, 7);
    const monthItem = months.find((item) => item.key === paymentMonth);

    if (monthItem) {
      monthItem.dealAmount += Number(payment.amount_paid || 0);
      monthItem.total += Number(payment.amount_paid || 0);
    }
  });

  maintenancePayments.forEach((payment) => {
    const paymentMonth = String(payment.payment_date || "").slice(0, 7);
    const monthItem = months.find((item) => item.key === paymentMonth);

    if (monthItem) {
      monthItem.maintenanceAmount += Number(payment.amount_paid || 0);
      monthItem.total += Number(payment.amount_paid || 0);
    }
  });

  return months;
}

function getDealStatusData(deals) {
  const colors = {
    Active: "#2563eb",
    "Paid Off": "#16a34a",
    Defaulted: "#111827",
    Repo: "#991b1b",
    Closed: "#6b7280",
    Cancelled: "#9ca3af",
  };

  const statusCounts = {};

  deals.forEach((deal) => {
    const status = deal.status || "Active";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  return Object.entries(statusCounts).map(([label, value]) => ({
    label,
    value,
    color: colors[label] || "#64748b",
  }));
}

function getMaintenanceStatusData(jobs) {
  const colors = {
    Open: "#991b1b",
    "In Progress": "#92400e",
    Completed: "#2563eb",
    Closed: "#16a34a",
    Cancelled: "#6b7280",
  };

  const statusCounts = {};

  jobs.forEach((job) => {
    const status = job.work_status || "Open";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  return Object.entries(statusCounts).map(([label, value]) => ({
    label,
    value,
    color: colors[label] || "#64748b",
  }));
}

function getBalanceByDealTypeData(deals, activePayments, getDealBalanceInfo) {
  const balanceMap = {};

  deals.forEach((deal) => {
    const dealType = deal.deal_type || "Unknown";
    const { balance } = getDealBalanceInfo(deal, activePayments);

    balanceMap[dealType] = (balanceMap[dealType] || 0) + balance;
  });

  return Object.entries(balanceMap)
    .map(([dealType, balance]) => ({
      dealType,
      balance,
    }))
    .sort((a, b) => b.balance - a.balance);
}

function getAgingReportData(pastDueScheduled) {
  const agingBuckets = {
    "1-7 Days": 0,
    "8-15 Days": 0,
    "16-30 Days": 0,
    "31+ Days": 0,
  };

  pastDueScheduled.forEach((item) => {
    const daysPastDue = Number(item.daysPastDue || 0);
    const remaining = Number(item.remainingForDueDate || 0);

    if (daysPastDue >= 1 && daysPastDue <= 7) {
      agingBuckets["1-7 Days"] += remaining;
    } else if (daysPastDue >= 8 && daysPastDue <= 15) {
      agingBuckets["8-15 Days"] += remaining;
    } else if (daysPastDue >= 16 && daysPastDue <= 30) {
      agingBuckets["16-30 Days"] += remaining;
    } else if (daysPastDue >= 31) {
      agingBuckets["31+ Days"] += remaining;
    }
  });

  return Object.entries(agingBuckets).map(([bucket, amount]) => ({
    bucket,
    amount,
  }));
}

function getPaymentMethodData(dealPayments, maintenancePayments, reportMonth) {
  const methodMap = {};

  dealPayments
    .filter((payment) =>
      String(payment.payment_date || "").startsWith(reportMonth)
    )
    .forEach((payment) => {
      const method = payment.payment_method || "Other";
      methodMap[method] =
        (methodMap[method] || 0) + Number(payment.amount_paid || 0);
    });

  maintenancePayments
    .filter((payment) =>
      String(payment.payment_date || "").startsWith(reportMonth)
    )
    .forEach((payment) => {
      const method = payment.payment_method || "Other";
      methodMap[method] =
        (methodMap[method] || 0) + Number(payment.amount_paid || 0);
    });

  return Object.entries(methodMap)
    .map(([method, amount]) => ({
      method,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildCustomerBalanceRows(
  deals,
  activePayments,
  maintenanceJobs,
  getDealBalanceInfo
) {
  const customerMap = new Map();

  const getKey = ({ id, name, phone }) => {
    return id || `${String(name || "").toLowerCase()}-${phone || ""}`;
  };

  const ensureCustomer = ({ id, name, phone, email, address }) => {
    const key = getKey({ id, name, phone });

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        Customer: name || "",
        Phone: phone || "",
        Email: email || "",
        Address: address || "",
        Deal_Count: 0,
        Deal_Total: 0,
        Deal_Paid: 0,
        Deal_Balance: 0,
        Maintenance_Count: 0,
        Maintenance_Total: 0,
        Maintenance_Paid: 0,
        Maintenance_Balance: 0,
        Total_Balance: 0,
      });
    }

    return customerMap.get(key);
  };

  deals.forEach((deal) => {
    const { totalAmount, totalPaid, balance } = getDealBalanceInfo(
      deal,
      activePayments
    );

    const customer = ensureCustomer({
      id: deal.customer_id || deal.customers?.id,
      name: deal.customers?.customer_name,
      phone: deal.customers?.phone,
      email: deal.customers?.email,
      address: deal.customers?.address,
    });

    customer.Deal_Count += 1;
    customer.Deal_Total += totalAmount;
    customer.Deal_Paid += totalPaid;
    customer.Deal_Balance += balance;
    customer.Total_Balance += balance;
  });

  maintenanceJobs.forEach((job) => {
    const customer = ensureCustomer({
      id: job.customer_id,
      name: job.customer_name,
      phone: job.phone,
      email: job.email,
      address: job.address,
    });

    customer.Maintenance_Count += 1;
    customer.Maintenance_Total += Number(job.totals.totalAmount || 0);
    customer.Maintenance_Paid += Number(job.totals.totalPaid || 0);
    customer.Maintenance_Balance += Number(job.totals.balance || 0);
    customer.Total_Balance += Number(job.totals.balance || 0);
  });

  return Array.from(customerMap.values()).sort(
    (a, b) => Number(b.Total_Balance || 0) - Number(a.Total_Balance || 0)
  );
}

function buildCollectionPriorityRows({
  pastDueScheduled,
  brokenPromises,
  maintenancePastDue,
  maintenanceBrokenPromises,
  today,
}) {
  const rows = [];

  pastDueScheduled.forEach((item) => {
    rows.push({
      Priority_Type: "Past Due Deal Installment",
      Customer: item.deal?.customers?.customer_name || "",
      Phone: item.deal?.customers?.phone || "",
      Reference: item.deal?.deal_tag || "",
      Date: item.dueDate || "",
      Days_Past_Due: item.daysPastDue || "",
      Amount: item.remainingForDueDate || 0,
      Status: item.status || "",
      Notes: "Scheduled installment is past due.",
    });
  });

  brokenPromises.forEach((promise) => {
    rows.push({
      Priority_Type: "Broken Deal Promise",
      Customer: promise.deals?.customers?.customer_name || "",
      Phone: promise.deals?.customers?.phone || "",
      Reference: promise.deals?.deal_tag || "",
      Date: promise.promised_date || "",
      Days_Past_Due: daysBetween(promise.promised_date, today),
      Amount: promise.remaining_amount || 0,
      Status: promise.promise_status || "",
      Notes: promise.notes || "",
    });
  });

  maintenancePastDue.forEach((job) => {
    rows.push({
      Priority_Type: "Past Due Maintenance Invoice",
      Customer: job.customer_name || "",
      Phone: job.phone || "",
      Reference: job.invoice_no || "",
      Date: job.due_date || "",
      Days_Past_Due: daysBetween(job.due_date, today),
      Amount: job.totals.balance || 0,
      Status: job.work_status || "",
      Notes: job.notes || "",
    });
  });

  maintenanceBrokenPromises.forEach((promise) => {
    rows.push({
      Priority_Type: "Broken Maintenance Promise",
      Customer: promise.job?.customer_name || "",
      Phone: promise.job?.phone || "",
      Reference: promise.job?.invoice_no || "",
      Date: promise.promised_date || "",
      Days_Past_Due: daysBetween(promise.promised_date, today),
      Amount: promise.promised_amount || 0,
      Status: promise.promise_status || "",
      Notes: promise.notes || "",
    });
  });

  return rows.sort(
    (a, b) => Number(b.Days_Past_Due || 0) - Number(a.Days_Past_Due || 0)
  );
}

function buildDailyCollectionSummaryRows(
  dealPayments,
  maintenancePayments,
  reportMonth
) {
  const dayMap = new Map();

  const ensureDay = (date) => {
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        Payment_Date: date,
        Deal_Collection: 0,
        Maintenance_Collection: 0,
        Total_Collection: 0,
        Payment_Count: 0,
      });
    }

    return dayMap.get(date);
  };

  dealPayments
    .filter((payment) =>
      String(payment.payment_date || "").startsWith(reportMonth)
    )
    .forEach((payment) => {
      const row = ensureDay(payment.payment_date || "");
      row.Deal_Collection += Number(payment.amount_paid || 0);
      row.Total_Collection += Number(payment.amount_paid || 0);
      row.Payment_Count += 1;
    });

  maintenancePayments
    .filter((payment) =>
      String(payment.payment_date || "").startsWith(reportMonth)
    )
    .forEach((payment) => {
      const row = ensureDay(payment.payment_date || "");
      row.Maintenance_Collection += Number(payment.amount_paid || 0);
      row.Total_Collection += Number(payment.amount_paid || 0);
      row.Payment_Count += 1;
    });

  return Array.from(dayMap.values()).sort((a, b) =>
    String(a.Payment_Date).localeCompare(String(b.Payment_Date))
  );
}

function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return "";

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  const difference = end.getTime() - start.getTime();
  return Math.max(Math.floor(difference / (1000 * 60 * 60 * 24)), 0);
}

function getSummaryTone(tone) {
  if (tone === "danger") return { borderLeft: "5px solid #991b1b" };
  if (tone === "dark") return { borderLeft: "5px solid #111827" };
  if (tone === "success") return { borderLeft: "5px solid #16a34a" };
  if (tone === "warning") return { borderLeft: "5px solid #f59e0b" };
  return { borderLeft: "5px solid #2563eb" };
}

function getInsightTone(tone) {
  if (tone === "danger") {
    return {
      background: "#fef2f2",
      borderColor: "#fecaca",
    };
  }

  if (tone === "warning") {
    return {
      background: "#fffbeb",
      borderColor: "#fde68a",
    };
  }

  if (tone === "info") {
    return {
      background: "#eff6ff",
      borderColor: "#bfdbfe",
    };
  }

  return {
    background: "#ffffff",
    borderColor: "#e5e7eb",
  };
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

const lastRefreshedText = {
  marginTop: "10px",
  color: "#bbf7d0",
  fontSize: "13px",
  fontWeight: "900",
};

const heroActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const refreshButton = {
  background: "white",
  color: "#0A1A2F",
  border: "none",
  borderRadius: "999px",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: "900",
  boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "14px",
};

const summaryCard = {
  background: "white",
  padding: "15px",
  borderRadius: "16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
  border: "1px solid #e5e7eb",
};

const summaryCardTitle = {
  margin: 0,
  color: "#667085",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const summaryCardValue = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#111827",
  fontSize: "22px",
};

const attentionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "14px",
};

const insightCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  display: "grid",
  gap: "6px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
};

const insightLabel = {
  color: "#667085",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const insightValue = {
  color: "#111827",
  fontSize: "24px",
};

const insightDescription = {
  margin: 0,
  color: "#475569",
  fontSize: "13px",
  lineHeight: "1.45",
};

const chartGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "16px",
};

const chartCard = {
  background: "white",
  padding: "18px",
  borderRadius: "18px",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.07)",
  border: "1px solid #e5e7eb",
  minHeight: "320px",
};

const chartTitle = {
  margin: 0,
  marginBottom: "16px",
  color: "#111827",
  fontSize: "18px",
};

const barChartBox = {
  height: "250px",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "10px",
};

const verticalBarItem = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
};

const barValue = {
  fontSize: "11px",
  color: "#374151",
  marginBottom: "6px",
  whiteSpace: "nowrap",
};

const verticalBarTrack = {
  height: "190px",
  width: "100%",
  maxWidth: "42px",
  display: "flex",
  alignItems: "flex-end",
  background: "#f3f4f6",
  borderRadius: "8px",
  overflow: "hidden",
};

const verticalBar = {
  width: "100%",
  background: "linear-gradient(180deg, #2563eb, #0A1A2F)",
  borderRadius: "8px 8px 0 0",
};

const barLabel = {
  marginTop: "8px",
  fontSize: "12px",
  color: "#667085",
};

const horizontalChartBox = {
  display: "grid",
  gap: "14px",
};

const horizontalItem = {
  display: "grid",
  gap: "6px",
};

const horizontalLabelRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  fontSize: "13px",
};

const horizontalTrack = {
  height: "14px",
  background: "#f3f4f6",
  borderRadius: "999px",
  overflow: "hidden",
};

const horizontalBar = {
  height: "100%",
  background: "linear-gradient(90deg, #166534, #22c55e)",
  borderRadius: "999px",
};

const donutWrapper = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "24px",
  flexWrap: "wrap",
};

const legendBox = {
  display: "grid",
  gap: "9px",
  minWidth: "160px",
};

const legendItem = {
  display: "grid",
  gridTemplateColumns: "14px 1fr auto",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
};

const legendDot = {
  width: "12px",
  height: "12px",
  borderRadius: "999px",
};

const emptyText = {
  color: "#667085",
};

const exportsSection = {
  background: "white",
  padding: "18px",
  borderRadius: "22px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const sectionHeader = {
  marginBottom: "16px",
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
};

const sectionDescription = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#667085",
  fontSize: "14px",
  lineHeight: "1.45",
};

const toolbar = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const monthFilterBox = {
  minWidth: "230px",
};

const labelStyle = {
  display: "block",
  fontWeight: "900",
  color: "#374151",
  marginBottom: "8px",
  fontSize: "13px",
};

const monthInput = {
  width: "100%",
  padding: "11px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  boxSizing: "border-box",
};

const searchInput = {
  flex: "1 1 260px",
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

const reportGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px",
};

const cardStyle = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "18px",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e5e7eb",
  display: "flex",
  flexDirection: "column",
};

const reportCardTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "12px",
};

const categoryBadge = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const countBadge = {
  background: "#f8fafc",
  color: "#475569",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const cardTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "17px",
};

const cardDescription = {
  color: "#667085",
  lineHeight: "1.5",
  minHeight: "92px",
  flex: 1,
};

const exportButton = {
  background: "#166534",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "11px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "12px",
  borderRadius: "14px",
  fontWeight: "900",
};

export default Reports;