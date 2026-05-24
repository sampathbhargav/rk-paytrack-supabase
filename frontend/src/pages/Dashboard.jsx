import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDeals } from "../api/dealsApi";
import { getPayments } from "../api/paymentsApi";
import { getPromises, updateBrokenPromises } from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";
import {
  getDueDealsForDate,
  getPastDueScheduledPayments,
} from "../utils/duePaymentsUtils";

function Dashboard() {
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      await updateBrokenPromises();

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
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const dueToday = getDueDealsForDate(deals, activePayments, today);

  const scheduledDueToday = dueToday.filter(
    (item) => item.status === "Due" || item.status === "Partial"
  );

  const promisesDueToday = promises.filter((promise) => {
    return (
      promise.promised_date === today &&
      promise.promise_status !== "Paid" &&
      promise.promise_status !== "Rescheduled" &&
      promise.promise_status !== "Cancelled" &&
      promise.promise_status !== "Partial Paid"
    );
  });

  const pastDuePromises = promises.filter(
    (promise) => promise.promise_status === "Broken"
  );

  const brokenPromises = pastDuePromises;

  const pastDueScheduled = getPastDueScheduledPayments(
    deals,
    activePayments,
    today
  );

  const totalPastDueScheduled = pastDueScheduled.reduce(
    (sum, item) => sum + Number(item.remainingForDueDate || 0),
    0
  );

  const totalPromisesDueToday = promisesDueToday.reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  const totalPastDuePromiseAmount = pastDuePromises.reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  const totalRemainingToday = scheduledDueToday.reduce(
    (sum, item) => sum + Number(item.remainingForDueDate || 0),
    0
  );

  const totalFinanced = deals.reduce(
    (sum, deal) => sum + Number(deal.total_amount || 0),
    0
  );

  const totalCollected = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  const pendingBalance = totalFinanced - totalCollected;

  const pendingPromises = promises.filter(
    (promise) => promise.promise_status === "Pending"
  );

  const balanceByDealType = deals.reduce((acc, deal) => {
    const dealPayments = activePayments.filter(
      (payment) => payment.deal_id === deal.id
    );

    const totalPaidForDeal = dealPayments.reduce(
      (sum, payment) => sum + Number(payment.amount_paid || 0),
      0
    );

    const balance = Math.max(
      Number(deal.total_amount || 0) - totalPaidForDeal,
      0
    );

    const type = deal.deal_type || "Other";

    acc[type] = (acc[type] || 0) + balance;

    return acc;
  }, {});

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>RK PayTrack Overview</div>
          <h1 style={pageTitle}>Dashboard</h1>
          <p style={pageDescription}>
            Daily customer payment follow-up, collection priorities, promises,
            and finance balance summary.
          </p>

          {lastRefreshedAt && (
            <p style={lastRefreshedText}>
              Last Refreshed: {lastRefreshedAt.toLocaleString()}
            </p>
          )}
        </div>

        <div style={heroActions}>
          <div style={todayBadge}>
            <span style={todayBadgeLabel}>Today</span>
            <strong>{formatDisplayDate(today)}</strong>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            style={{
              ...refreshButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={prioritySection}>
        <div style={sectionHeaderRow}>
          <div>
            <h2 style={sectionTitle}>Today’s Collection Priorities</h2>
            <p style={sectionDescription}>
              High-priority follow-ups that need attention today.
            </p>
          </div>
        </div>

        <div style={priorityCardGrid}>
          <MetricCard
            icon="🚨"
            title="Past Due Customers"
            value={pastDueScheduled.length}
            subtitle="Scheduled payments late"
            tone="danger"
          />

          <MetricCard
            icon="💰"
            title="Past Due Amount"
            value={formatMoney(totalPastDueScheduled)}
            subtitle="Remaining scheduled balance"
            tone="danger"
          />

          <MetricCard
            icon="📅"
            title="Due Today"
            value={scheduledDueToday.length}
            subtitle={formatMoney(totalRemainingToday)}
            tone="warning"
          />

          <MetricCard
            icon="🤝"
            title="Promises Due Today"
            value={promisesDueToday.length}
            subtitle={formatMoney(totalPromisesDueToday)}
            tone="info"
          />

          <MetricCard
            icon="⚠️"
            title="Broken Promises"
            value={brokenPromises.length}
            subtitle="Promise date missed"
            tone="danger"
          />

          <MetricCard
            icon="📌"
            title="Past Due Promise Amount"
            value={formatMoney(totalPastDuePromiseAmount)}
            subtitle="Broken promise balance"
            tone="danger"
          />
        </div>
      </div>

      <div style={summaryStrip}>
        <SummaryItem label="Active Deals" value={deals.length} />
        <SummaryItem label="Total Financed" value={formatMoney(totalFinanced)} />
        <SummaryItem label="Total Collected" value={formatMoney(totalCollected)} />
        <SummaryItem label="Pending Balance" value={formatMoney(pendingBalance)} />
        <SummaryItem label="Pending Promises" value={pendingPromises.length} />
      </div>

      <DashboardSection
        title="Past Due Customers"
        description="Scheduled installments before today that still have remaining balance."
        count={pastDueScheduled.length}
        tone="danger"
      >
        {pastDueScheduled.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No past due customers."
            message="There are no unpaid scheduled installments before today."
          />
        ) : (
          <PastDueTable items={pastDueScheduled} />
        )}
      </DashboardSection>

      <div style={twoColumnGrid}>
        <DashboardSection
          title="Due Today"
          description="Scheduled installments due today that are unpaid or partially paid."
          count={scheduledDueToday.length}
          tone="warning"
        >
          {scheduledDueToday.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No scheduled payments due today."
              message="There are no active scheduled installments due today."
            />
          ) : (
            <FollowUpTable items={scheduledDueToday} />
          )}
        </DashboardSection>

        <DashboardSection
          title="Promises Due Today"
          description="Customer promises that need follow-up today."
          count={promisesDueToday.length}
          tone="info"
        >
          {promisesDueToday.length === 0 ? (
            <EmptyState
              icon="🤝"
              title="No promises due today."
              message="There are no active customer promises due today."
            />
          ) : (
            <PromiseFollowUpTable promises={promisesDueToday} />
          )}
        </DashboardSection>
      </div>

      <DashboardSection
        title="Past Due Promises"
        description="Customer promises where the promised date has passed and payment was not completed."
        count={pastDuePromises.length}
        tone="danger"
      >
        {pastDuePromises.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No past due promises."
            message="There are no broken customer promises at this time."
          />
        ) : (
          <PromiseFollowUpTable promises={pastDuePromises} />
        )}
      </DashboardSection>

      <div style={twoColumnGrid}>
        <div style={financeCard}>
          <div style={sectionHeaderRow}>
            <div>
              <h2 style={sectionTitle}>Financial Summary</h2>
              <p style={sectionDescription}>
                Overall collection and balance snapshot.
              </p>
            </div>
          </div>

          <div style={smallMetricGrid}>
            <MiniCard title="Active Deals" value={deals.length} />
            <MiniCard title="Total Financed" value={formatMoney(totalFinanced)} />
            <MiniCard title="Total Collected" value={formatMoney(totalCollected)} />
            <MiniCard title="Pending Balance" value={formatMoney(pendingBalance)} />
            <MiniCard title="Pending Promises" value={pendingPromises.length} />
            <MiniCard
              title="Promise Amount Due Today"
              value={formatMoney(totalPromisesDueToday)}
            />
            <MiniCard
              title="Remaining Due Today"
              value={formatMoney(totalRemainingToday)}
            />
          </div>
        </div>

        <div style={financeCard}>
          <div style={sectionHeaderRow}>
            <div>
              <h2 style={sectionTitle}>Balance by Deal Type</h2>
              <p style={sectionDescription}>
                Current outstanding balance by finance category.
              </p>
            </div>
          </div>

          <div style={dealTypeList}>
            <DealTypeRow
              label="In-house"
              value={balanceByDealType["In-house"] || 0}
            />
            <DealTypeRow
              label="Down Finance"
              value={balanceByDealType["Down Finance"] || 0}
            />
            <DealTypeRow
              label="Borrow Money"
              value={balanceByDealType["Borrow Money"] || 0}
            />
            <DealTypeRow
              label="Motor Finance"
              value={balanceByDealType["Motor Finance"] || 0}
            />
            <DealTypeRow
              label="Registration Money"
              value={balanceByDealType["Registration Money"] || 0}
            />
            <DealTypeRow label="Cash" value={balanceByDealType["Cash"] || 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSection({ title, description, count, tone, children }) {
  return (
    <div style={tableBox}>
      <div style={sectionHeaderRow}>
        <div>
          <h2 style={sectionTitle}>{title}</h2>
          <p style={sectionDescription}>{description}</p>
        </div>

        <span style={getSectionBadgeStyle(tone)}>{count}</span>
      </div>

      {children}
    </div>
  );
}

function PastDueTable({ items }) {
  return (
    <div style={tableScroll}>
      <table style={pastDueTableStyle}>
        <thead>
          <tr>
            <th style={stickyTh}>Deal Tag</th>
            <th style={{ ...th, width: "180px" }}>Customer</th>
            <th style={{ ...th, width: "120px" }}>Original Due</th>
            <th style={{ ...th, width: "100px" }}>Installment</th>
            <th style={{ ...th, width: "115px" }}>Amount Due</th>
            <th style={{ ...th, width: "105px" }}>Paid</th>
            <th style={{ ...th, width: "115px" }}>Remaining</th>
            <th style={{ ...th, width: "95px" }}>Days Late</th>
            <th style={{ ...th, width: "145px" }}>Status</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr
              key={`${item.deal.id}-${item.dueDate}`}
              style={{
                background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
              }}
            >
              <td
                style={{
                  ...stickyTd,
                  background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                }}
              >
                <Link to={`/deals/${item.deal.id}`} style={dealLink}>
                  {item.deal.deal_tag}
                </Link>
              </td>

              <td style={customerCell}>
                {item.deal.customers?.customer_name || "—"}
              </td>

              <td style={td}>{formatDisplayDate(item.dueDate)}</td>
              <td style={td}>{item.installmentNumber}</td>
              <td style={moneyDueCell}>{formatMoney(item.amountDue)}</td>
              <td style={moneyDueCell}>{formatMoney(item.paidForDueDate)}</td>
              <td style={dangerMoneyCell}>
                {formatMoney(item.remainingForDueDate)}
              </td>

              <td style={td}>
                <strong>{item.daysLate}</strong> days
              </td>

              <td style={td}>
                <span style={getPastDueStatusStyle(item.status)}>
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FollowUpTable({ items }) {
  return (
    <div style={tableScroll}>
      <table style={dueTodayTableStyle}>
        <thead>
          <tr>
            <th style={stickyTh}>Deal Tag</th>
            <th style={{ ...th, width: "180px" }}>Customer</th>
            <th style={{ ...th, width: "120px" }}>Due Date</th>
            <th style={{ ...th, width: "100px" }}>Installment</th>
            <th style={{ ...th, width: "110px" }}>Due</th>
            <th style={{ ...th, width: "105px" }}>Paid</th>
            <th style={{ ...th, width: "115px" }}>Remaining</th>
            <th style={{ ...th, width: "120px" }}>Status</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr
              key={`${item.deal.id}-${item.dueDate}`}
              style={{
                background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
              }}
            >
              <td
                style={{
                  ...stickyTd,
                  background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                }}
              >
                <Link to={`/deals/${item.deal.id}`} style={dealLink}>
                  {item.deal.deal_tag}
                </Link>
              </td>

              <td style={customerCell}>
                {item.deal.customers?.customer_name || "—"}
              </td>

              <td style={td}>{formatDisplayDate(item.dueDate)}</td>
              <td style={td}>{item.installmentNumber}</td>
              <td style={moneyDueCell}>{formatMoney(item.amountDue)}</td>
              <td style={moneyDueCell}>{formatMoney(item.paidForDueDate)}</td>
              <td style={warningMoneyCell}>
                {formatMoney(item.remainingForDueDate)}
              </td>

              <td style={td}>
                <span style={getDueStatusStyle(item.status)}>{item.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromiseFollowUpTable({ promises }) {
  return (
    <div style={tableScroll}>
      <table style={promiseTableStyle}>
        <thead>
          <tr>
            <th style={stickyTh}>Deal Tag</th>
            <th style={{ ...th, width: "180px" }}>Customer</th>
            <th style={{ ...th, width: "125px" }}>Phone</th>
            <th style={{ ...th, width: "125px" }}>Original Due</th>
            <th style={{ ...th, width: "130px" }}>Promised Date</th>
            <th style={{ ...th, width: "115px" }}>Amount</th>
            <th style={{ ...th, width: "130px" }}>Status</th>
          </tr>
        </thead>

        <tbody>
          {promises.map((promise, index) => (
            <tr
              key={promise.id}
              style={{
                background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
              }}
            >
              <td
                style={{
                  ...stickyTd,
                  background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                }}
              >
                {promise.deals?.id ? (
                  <Link to={`/deals/${promise.deals.id}`} style={dealLink}>
                    {promise.deals?.deal_tag || "—"}
                  </Link>
                ) : (
                  <span style={missingDealTag}>
                    {promise.deals?.deal_tag || "—"}
                  </span>
                )}
              </td>

              <td style={customerCell}>
                {promise.deals?.customers?.customer_name || "—"}
              </td>

              <td style={td}>{promise.deals?.customers?.phone || "—"}</td>
              <td style={td}>{formatDisplayDate(promise.original_due_date)}</td>
              <td style={td}>{formatDisplayDate(promise.promised_date)}</td>
              <td style={moneyDueCell}>
                {formatMoney(promise.remaining_amount)}
              </td>

              <td style={td}>
                <span style={getPromiseStatusStyle(promise.promise_status)}>
                  {promise.promise_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricCard({ icon, title, value, subtitle, tone = "default" }) {
  return (
    <div style={{ ...metricCard, ...getMetricToneStyle(tone) }}>
      <div style={metricTop}>
        <span style={metricIcon}>{icon}</span>
        <span style={getMetricBadgeStyle(tone)}>{title}</span>
      </div>
      <div style={metricValue}>{value}</div>
      <div style={metricSubtitle}>{subtitle}</div>
    </div>
  );
}

function MiniCard({ title, value }) {
  return (
    <div style={miniCard}>
      <p style={miniTitle}>{title}</p>
      <h3 style={miniValue}>{value}</h3>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={summaryItem}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
  );
}

function DealTypeRow({ label, value }) {
  return (
    <div style={dealTypeRow}>
      <span style={dealTypeName}>{label}</span>
      <strong style={dealTypeAmount}>{formatMoney(value)}</strong>
    </div>
  );
}

function EmptyState({ icon, title, message }) {
  return (
    <div style={emptyState}>
      <div style={emptyIcon}>{icon}</div>
      <strong>{title}</strong>
      <p style={{ margin: "6px 0 0" }}>{message}</p>
    </div>
  );
}

function getMetricToneStyle(tone) {
  if (tone === "danger") {
    return {
      borderTop: "4px solid #991b1b",
    };
  }

  if (tone === "warning") {
    return {
      borderTop: "4px solid #f59e0b",
    };
  }

  if (tone === "info") {
    return {
      borderTop: "4px solid #2563eb",
    };
  }

  return {
    borderTop: "4px solid transparent",
  };
}

function getMetricBadgeStyle(tone) {
  const base = {
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
    whiteSpace: "nowrap",
  };

  if (tone === "danger") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (tone === "warning") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (tone === "info") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
  };
}

function getSectionBadgeStyle(tone) {
  const base = {
    minWidth: "36px",
    height: "32px",
    padding: "0 10px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "14px",
  };

  if (tone === "danger") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (tone === "warning") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (tone === "info") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
  };
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
}

function getPastDueStatusStyle(status) {
  const base = {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap",
    display: "inline-block",
  };

  if (status === "Past Due - Partial") {
    return {
      ...base,
      background: "#fef9c3",
      color: "#854d0e",
      border: "1px solid #fde68a",
    };
  }

  return {
    ...base,
    background: "#7f1d1d",
    color: "#ffffff",
    border: "1px solid #7f1d1d",
  };
}

function getDueStatusStyle(status) {
  const base = {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap",
    display: "inline-block",
  };

  if (status === "Partial") {
    return {
      ...base,
      background: "#fef9c3",
      color: "#854d0e",
      border: "1px solid #fde68a",
    };
  }

  return {
    ...base,
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  };
}

function getPromiseStatusStyle(status) {
  const base = {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap",
    display: "inline-block",
  };

  if (status === "Broken") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    };
  }

  if (status === "Rescheduled") {
    return {
      ...base,
      background: "#e0e7ff",
      color: "#3730a3",
      border: "1px solid #c7d2fe",
    };
  }

  if (status === "Partial Paid") {
    return {
      ...base,
      background: "#fef9c3",
      color: "#854d0e",
      border: "1px solid #fde68a",
    };
  }

  if (status === "Paid") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  return {
    ...base,
    background: "#dbeafe",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
  };
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const heroCard = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #102A4C 55%, #1d4ed8 100%)",
  borderRadius: "18px",
  padding: "24px",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  boxShadow: "0 14px 35px rgba(15, 23, 42, 0.22)",
  marginBottom: "18px",
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
  fontSize: "30px",
  lineHeight: "1.1",
  color: "white",
};

const pageDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#dbeafe",
  maxWidth: "720px",
  lineHeight: "1.5",
};

const lastRefreshedText = {
  marginTop: "10px",
  marginBottom: 0,
  color: "#bbf7d0",
  fontSize: "13px",
  fontWeight: "800",
};

const heroActions = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const todayBadge = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.24)",
  borderRadius: "14px",
  padding: "10px 14px",
  minWidth: "130px",
};

const todayBadgeLabel = {
  display: "block",
  fontSize: "11px",
  color: "#bfdbfe",
  marginBottom: "4px",
  fontWeight: "800",
  textTransform: "uppercase",
};

const refreshButton = {
  background: "white",
  color: "#0A1A2F",
  border: "none",
  borderRadius: "12px",
  padding: "11px 15px",
  cursor: "pointer",
  fontWeight: "900",
  boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
};

const prioritySection = {
  marginBottom: "18px",
};

const priorityCardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "14px",
  marginTop: "14px",
  maxWidth: "100%",
};

const metricCard = {
  background: "white",
  padding: "16px",
  borderRadius: "16px",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.07)",
  border: "1px solid #e5e7eb",
};

const metricTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "14px",
};

const metricIcon = {
  fontSize: "22px",
};

const metricValue = {
  fontSize: "25px",
  fontWeight: "900",
  color: "#111827",
  lineHeight: "1.1",
};

const metricSubtitle = {
  marginTop: "6px",
  color: "#667085",
  fontSize: "13px",
  fontWeight: "700",
};

const summaryStrip = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
  marginBottom: "18px",
};

const summaryItem = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
};

const summaryLabel = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  marginBottom: "5px",
  fontWeight: "700",
};

const summaryValue = {
  color: "#111827",
  fontSize: "15px",
};

const tableBox = {
  background: "white",
  padding: "16px",
  borderRadius: "16px",
  marginTop: "18px",
  width: "100%",
  maxWidth: "100%",
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
  border: "1px solid #e5e7eb",
  boxSizing: "border-box",
};

const twoColumnGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "18px",
  alignItems: "flex-start",
};

const sectionHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  marginBottom: "14px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "19px",
};

const sectionDescription = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#667085",
  fontSize: "14px",
  lineHeight: "1.45",
};

const tableScroll = {
  width: "100%",
  maxWidth: "100%",
  height: "390px",
  overflowX: "auto",
  overflowY: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  boxSizing: "border-box",
};

const pastDueTableStyle = {
  width: "100%",
  minWidth: "1160px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const dueTodayTableStyle = {
  width: "100%",
  minWidth: "950px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const promiseTableStyle = {
  width: "100%",
  minWidth: "1000px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const th = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #d1d5db",
  background: "#f1f5f9",
  color: "#334155",
  whiteSpace: "normal",
  fontSize: "12px",
  lineHeight: "1.25",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const stickyTh = {
  ...th,
  left: 0,
  width: "100px",
  zIndex: 5,
  background: "#e0e7ff",
  color: "#1e1b4b",
  boxShadow: "3px 0 8px rgba(0,0,0,0.08)",
};

const td = {
  padding: "11px 12px",
  borderBottom: "1px solid #edf2f7",
  whiteSpace: "nowrap",
  fontSize: "12px",
  background: "transparent",
  verticalAlign: "middle",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: "#374151",
};

const stickyTd = {
  ...td,
  position: "sticky",
  left: 0,
  zIndex: 4,
  width: "100px",
  boxShadow: "3px 0 8px rgba(0,0,0,0.06)",
};

const customerCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
  color: "#111827",
  fontWeight: "700",
};

const moneyDueCell = {
  ...td,
  fontWeight: "900",
  color: "#111827",
};

const dangerMoneyCell = {
  ...moneyDueCell,
  color: "#991b1b",
};

const warningMoneyCell = {
  ...moneyDueCell,
  color: "#92400e",
};

const dealLink = {
  color: "#1d4ed8",
  fontWeight: "900",
  textDecoration: "none",
  cursor: "pointer",
};

const missingDealTag = {
  color: "#374151",
  fontWeight: "bold",
};

const emptyState = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  padding: "24px",
  borderRadius: "14px",
  color: "#475569",
  textAlign: "center",
};

const emptyIcon = {
  fontSize: "28px",
  marginBottom: "8px",
};

const financeCard = {
  background: "white",
  padding: "16px",
  borderRadius: "16px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
  border: "1px solid #e5e7eb",
  marginTop: "18px",
};

const smallMetricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "12px",
};

const miniCard = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
};

const miniTitle = {
  margin: 0,
  color: "#667085",
  fontSize: "12px",
  fontWeight: "700",
};

const miniValue = {
  marginTop: "6px",
  marginBottom: 0,
  fontSize: "17px",
  color: "#111827",
};

const dealTypeList = {
  display: "grid",
  gap: "10px",
};

const dealTypeRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
};

const dealTypeName = {
  color: "#374151",
  fontWeight: "800",
};

const dealTypeAmount = {
  color: "#111827",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "13px",
  borderRadius: "12px",
  marginBottom: "15px",
  fontWeight: "bold",
};

export default Dashboard;