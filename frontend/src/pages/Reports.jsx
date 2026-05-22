import { useEffect, useState } from "react";
import { getDeals } from "../api/dealsApi";
import { getPayments } from "../api/paymentsApi";
import { getPromises } from "../api/promisesApi";
import { exportToCsv } from "../utils/exportUtils";
import { formatMoney } from "../utils/moneyUtils";
import {
  getDueDealsForDate,
  getPastDueScheduledPayments,
} from "../utils/duePaymentsUtils";

function Reports() {
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingReport, setLoadingReport] = useState("");
  const [error, setError] = useState("");

  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);

  const [reportMonth, setReportMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadReportDashboard();
  }, []);

  const loadReportDashboard = async () => {
    try {
      setLoadingPage(true);
      setError("");

      const dealsData = await getDeals();
      const paymentsData = await getPayments();
      const promisesData = await getPromises();

      setDeals(dealsData || []);
      setPayments(paymentsData || []);
      setPromises(promisesData || []);
      setLastRefreshedAt(new Date());
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingPage(false);
    }
  };

  const getActivePayments = (paymentList = payments) => {
    return paymentList.filter((payment) => payment.payment_status !== "Voided");
  };

  const activePayments = getActivePayments();

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

  const monthlyCollectionData = getMonthlyCollectionData(activePayments);
  const dealStatusData = getDealStatusData(deals);
  const balanceByDealTypeData = getBalanceByDealTypeData(
    deals,
    activePayments,
    getDealBalanceInfo
  );
  const agingReportData = getAgingReportData(pastDueScheduled);
  const paymentMethodData = getPaymentMethodData(activePayments, reportMonth);

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

      const rows = dueToday.map((item) => ({
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
      }));

      exportToCsv(`rk-paytrack-due-today-${today}.csv`, rows);
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

      const rows = promises
        .filter(
          (promise) =>
            promise.promise_status !== "Paid" &&
            promise.promise_status !== "Cancelled" &&
            promise.promise_status !== "Rescheduled" &&
            promise.promised_date < today
        )
        .map((promise) => ({
          Deal_Tag: promise.deals?.deal_tag || "",
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

      exportToCsv(`rk-paytrack-past-due-promises-${today}.csv`, rows);
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

      const rows = activePayments
        .filter((payment) =>
          String(payment.payment_date || "").startsWith(reportMonth)
        )
        .map((payment) => ({
          Payment_Date: payment.payment_date || "",
          Deal_Tag: payment.deals?.deal_tag || "",
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

      exportToCsv(`rk-paytrack-monthly-collection-${reportMonth}.csv`, rows);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingReport("");
    }
  };

  if (loadingPage) {
    return (
      <div style={pageWrapper}>
        <h1 style={pageTitle}>Reports</h1>
        <p style={pageDescription}>Loading report dashboard...</p>
      </div>
    );
  }

  return (
    <div style={pageWrapper}>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>Reports</h1>
          <p style={pageDescription}>
            Review portfolio performance, collections, balances, due items, and
            export dealership reports.
          </p>

          {lastRefreshedAt && (
            <p style={lastRefreshedText}>
              Last Refreshed: {lastRefreshedAt.toLocaleString()}
            </p>
          )}
        </div>

        <button type="button" onClick={loadReportDashboard} style={refreshButton}>
          Refresh
        </button>
      </div>

      {error && <div style={errorBox}>Report failed: {error}</div>}

      <div style={summaryGrid}>
        <SummaryCard title="Total Receivable" value={formatMoney(totalReceivable)} />
        <SummaryCard title="Total Collected" value={formatMoney(totalCollected)} />
        <SummaryCard title="Open Balance" value={formatMoney(totalBalance)} />
        <SummaryCard title="Active Deals" value={activeDeals.length} />
        <SummaryCard title="Paid Off" value={paidOffDeals.length} tone="success" />
        <SummaryCard title="Due Today" value={dueToday.length} />
        <SummaryCard title="Past Due" value={pastDueScheduled.length} tone="danger" />
        <SummaryCard title="Broken Promises" value={brokenPromises.length} tone="danger" />
        <SummaryCard title="Defaulted" value={defaultedDeals.length} tone="dark" />
      </div>

      <div style={chartGrid}>
        <ChartCard title="Monthly Collection">
          <BarChart
            data={monthlyCollectionData}
            labelKey="month"
            valueKey="amount"
            formatValue={formatMoney}
          />
        </ChartCard>

        <ChartCard title="Deal Status Breakdown">
          <DonutChart data={dealStatusData} />
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
          <h2 style={sectionTitle}>Export Reports</h2>
          <p style={sectionDescription}>
            Export CSV reports for management review, collections, accounting,
            and customer follow-up.
          </p>
        </div>

        <div style={monthFilterBox}>
          <label style={labelStyle}>Monthly Collection Month</label>
          <input
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            style={monthInput}
          />
        </div>

        <div style={reportGrid}>
          <ReportCard
            title="Full Deals Report"
            description="All deals with customer info, maturity date, total paid, balance, payment history, promise history, and notes."
            buttonText="Export Full Deals"
            onClick={exportFullDealsReport}
            loading={loadingReport === "Full Deals Report"}
          />

          <ReportCard
            title="Past Due Scheduled Payments"
            description="Scheduled installments that are past due and still unpaid or partially paid."
            buttonText="Export Past Due Scheduled"
            onClick={exportPastDueScheduledPaymentsReport}
            loading={loadingReport === "Past Due Scheduled Payments"}
          />

          <ReportCard
            title="Due Today"
            description="Scheduled payments due today, including due and partial installments."
            buttonText="Export Due Today"
            onClick={exportDueTodayReport}
            loading={loadingReport === "Due Today"}
          />

          <ReportCard
            title="Past Due Promises"
            description="Promises where the promised date has passed and the promise is still unpaid or active."
            buttonText="Export Past Due Promises"
            onClick={exportPastDuePromisesReport}
            loading={loadingReport === "Past Due Promises"}
          />

          <ReportCard
            title="Paid Off Deals"
            description="Deals marked Paid Off with total paid, final balance, and last payment information."
            buttonText="Export Paid Off Deals"
            onClick={exportPaidOffDealsReport}
            loading={loadingReport === "Paid Off Deals"}
          />

          <ReportCard
            title="Defaulted Deals"
            description="Deals currently marked Defaulted for collection or management review."
            buttonText="Export Defaulted Deals"
            onClick={exportDefaultedDealsReport}
            loading={loadingReport === "Defaulted Deals"}
          />

          <ReportCard
            title="Registration Money"
            description="Registration money deals with tentative due date, amount, paid amount, balance, and notes."
            buttonText="Export Registration Money"
            onClick={exportRegistrationMoneyReport}
            loading={loadingReport === "Registration Money"}
          />

          <ReportCard
            title="Monthly Collection"
            description="All active payments collected in the selected month with method, type, due date, and notes."
            buttonText={`Export ${reportMonth}`}
            onClick={exportMonthlyCollectionReport}
            loading={loadingReport === "Monthly Collection"}
          />
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

function ChartCard({ title, children }) {
  return (
    <div style={chartCard}>
      <h2 style={chartTitle}>{title}</h2>
      {children}
    </div>
  );
}

function ReportCard({ title, description, buttonText, onClick, loading }) {
  return (
    <div style={cardStyle}>
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

function DonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  if (total === 0) {
    return <p style={emptyText}>No deal status data available.</p>;
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
          Deals
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

function getMonthlyCollectionData(activePayments) {
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
      amount: 0,
    });
  }

  activePayments.forEach((payment) => {
    const paymentMonth = String(payment.payment_date || "").slice(0, 7);
    const monthItem = months.find((item) => item.key === paymentMonth);

    if (monthItem) {
      monthItem.amount += Number(payment.amount_paid || 0);
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

function getPaymentMethodData(activePayments, reportMonth) {
  const methodMap = {};

  activePayments
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

function getSummaryTone(tone) {
  if (tone === "danger") return { borderLeft: "5px solid #991b1b" };
  if (tone === "dark") return { borderLeft: "5px solid #111827" };
  if (tone === "success") return { borderLeft: "5px solid #16a34a" };
  return { borderLeft: "5px solid #2563eb" };
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const pageTitle = {
  margin: 0,
  color: "#111827",
};

const pageDescription = {
  marginTop: "6px",
  color: "#667085",
  lineHeight: "1.5",
};

const lastRefreshedText = {
  marginTop: "6px",
  color: "#166534",
  fontSize: "13px",
  fontWeight: "bold",
};

const refreshButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const summaryCard = {
  background: "white",
  padding: "14px",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
};

const summaryCardTitle = {
  margin: 0,
  color: "#667085",
  fontSize: "13px",
};

const summaryCardValue = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#111827",
  fontSize: "22px",
};

const chartGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const chartCard = {
  background: "white",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
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
  background: "#2563eb",
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
  background: "#166534",
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
  borderRadius: "14px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
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

const monthFilterBox = {
  background: "#f8fafc",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  marginBottom: "18px",
  maxWidth: "360px",
};

const labelStyle = {
  display: "block",
  fontWeight: "bold",
  color: "#374151",
  marginBottom: "8px",
};

const monthInput = {
  width: "100%",
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const reportGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "16px",
};

const cardStyle = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 1px 5px rgba(0,0,0,0.05)",
  border: "1px solid #e5e7eb",
};

const cardTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "17px",
};

const cardDescription = {
  color: "#667085",
  lineHeight: "1.5",
  minHeight: "88px",
};

const exportButton = {
  background: "#166534",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "12px",
  borderRadius: "10px",
  marginBottom: "15px",
  fontWeight: "bold",
};

export default Reports;