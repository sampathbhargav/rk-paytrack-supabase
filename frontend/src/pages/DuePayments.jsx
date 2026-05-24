import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDeals } from "../api/dealsApi";
import { getPayments } from "../api/paymentsApi";
import { getPromises, updateBrokenPromises } from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";
import { getDueDealsForDate } from "../utils/duePaymentsUtils";

function DuePayments() {
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const dueDeals = getDueDealsForDate(deals, activePayments, selectedDate);

  const scheduledUnpaidOrPartial = dueDeals.filter(
    (item) => item.status === "Due" || item.status === "Partial"
  );

  const promisesDue = promises.filter((promise) => {
    return (
      promise.promised_date === selectedDate &&
      promise.promise_status !== "Paid" &&
      promise.promise_status !== "Rescheduled" &&
      promise.promise_status !== "Cancelled" &&
      promise.promise_status !== "Partial Paid"
    );
  });

  const brokenPromisesDue = promisesDue.filter(
    (promise) => promise.promise_status === "Broken"
  );

  const pendingPromisesDue = promisesDue.filter(
    (promise) => promise.promise_status === "Pending"
  );

  const missingScheduleDeals = deals.filter((deal) => {
    const isActivePaymentDeal =
      deal.status === "Active" && deal.deal_type !== "Cash";

    const missingSchedule =
      !deal.start_date ||
      !deal.due_day ||
      !deal.monthly_payment ||
      Number(deal.monthly_payment || 0) <= 0 ||
      !deal.term ||
      Number(deal.term || 0) <= 0;

    return isActivePaymentDeal && missingSchedule;
  });

  const totalScheduledDue = scheduledUnpaidOrPartial.reduce(
    (sum, item) => sum + Number(item.remainingForDueDate || 0),
    0
  );

  const totalPromiseDue = promisesDue.reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  const totalDue = totalScheduledDue + totalPromiseDue;

  const isToday = selectedDate === today;
  const pageDateLabel = isToday ? "Today" : formatDisplayDate(selectedDate);
  const totalFollowUps = scheduledUnpaidOrPartial.length + promisesDue.length;

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Collections Follow-Up</div>
          <h1 style={pageTitle}>Due Payments</h1>
          <p style={pageDescription}>
            View scheduled installments, customer promises, and collection
            follow-ups for any selected date.
          </p>

          {lastRefreshedAt && (
            <p style={lastRefreshedText}>
              Last Refreshed: {lastRefreshedAt.toLocaleString()}
            </p>
          )}
        </div>

        <div style={heroActions}>
          <div style={dateBadge}>
            <span style={dateBadgeLabel}>Viewing</span>
            <strong>{pageDateLabel}</strong>
          </div>

          <button
            type="button"
            onClick={loadData}
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

      {missingScheduleDeals.length > 0 && (
        <div style={warningBox}>
          <div style={warningIcon}>⚠️</div>
          <div>
            <strong>
              {missingScheduleDeals.length} active deal(s) missing schedule
              setup.
            </strong>
            <p style={{ margin: "6px 0 0" }}>
              These deals will not show in due payments until Start Date, Due
              Day, Monthly Payment, and Term are completed.
            </p>
          </div>
        </div>
      )}

      <div style={controlPanel}>
        <div>
          <h2 style={controlTitle}>Select Collection Date</h2>
          <p style={controlDescription}>
            Choose a date to view scheduled payments and promises that need
            follow-up.
          </p>
        </div>

        <div style={controlActions}>
          <div>
            <label style={labelStyle}>Due Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={quickDateButtons}>
            <button
              type="button"
              style={secondaryButton}
              onClick={() => setSelectedDate(today)}
            >
              Today
            </button>

            <button
              type="button"
              style={secondaryButton}
              onClick={() => setSelectedDate(getDateOffset(today, 1))}
            >
              Tomorrow
            </button>

            <button
              type="button"
              style={secondaryButton}
              onClick={() => setSelectedDate(getDateOffset(today, -1))}
            >
              Yesterday
            </button>
          </div>
        </div>
      </div>

      <div style={cardGrid}>
        <MetricCard
          icon="📅"
          title="Scheduled Payments"
          value={scheduledUnpaidOrPartial.length}
          subtitle="Unpaid or partial"
          tone="warning"
        />

        <MetricCard
          icon="💵"
          title="Scheduled Amount"
          value={formatMoney(totalScheduledDue)}
          subtitle="Remaining due"
          tone="warning"
        />

        <MetricCard
          icon="🤝"
          title="Promises Due"
          value={promisesDue.length}
          subtitle="Customer promises"
          tone="info"
        />

        <MetricCard
          icon="📌"
          title="Promise Amount"
          value={formatMoney(totalPromiseDue)}
          subtitle="Promise balance"
          tone="info"
        />

        <MetricCard
          icon="🚨"
          title="Total Due"
          value={formatMoney(totalDue)}
          subtitle="Scheduled + promises"
          tone="danger"
        />

        <MetricCard
          icon="⚠️"
          title="Broken Promises"
          value={brokenPromisesDue.length}
          subtitle="Needs attention"
          tone="danger"
        />

        <MetricCard
          icon="🧩"
          title="Missing Schedule"
          value={missingScheduleDeals.length}
          subtitle="Setup incomplete"
          tone="warning"
        />
      </div>

      <div style={summaryStrip}>
        <SummaryItem label="Selected Date" value={formatDisplayDate(selectedDate)} />
        <SummaryItem label="Pending Promises" value={pendingPromisesDue.length} />
        <SummaryItem label="Broken Promises" value={brokenPromisesDue.length} />
        <SummaryItem label="Total Follow-Ups" value={totalFollowUps} />
      </div>

      {missingScheduleDeals.length > 0 && (
        <DashboardSection
          title="Missing Schedule Setup"
          description="These active deals cannot generate due payments until schedule fields are completed."
          count={missingScheduleDeals.length}
          tone="warning"
        >
          <div style={tableScrollSmall}>
            <table style={missingScheduleTableStyle}>
              <thead>
                <tr>
                  <th style={stickyTh}>Deal Tag</th>
                  <th style={{ ...th, width: "190px" }}>Customer</th>
                  <th style={{ ...th, width: "130px" }}>Deal Type</th>
                  <th style={{ ...th, width: "115px" }}>Start Date</th>
                  <th style={{ ...th, width: "90px" }}>Due Day</th>
                  <th style={{ ...th, width: "120px" }}>Monthly</th>
                  <th style={{ ...th, width: "90px" }}>Term</th>
                  <th style={{ ...th, width: "240px" }}>Missing Fields</th>
                </tr>
              </thead>

              <tbody>
                {missingScheduleDeals.map((deal, index) => (
                  <tr
                    key={deal.id}
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
                      <Link to={`/deals/${deal.id}/edit`} style={dealLink}>
                        {deal.deal_tag}
                      </Link>
                    </td>

                    <td style={customerCell}>
                      {deal.customers?.customer_name || "—"}
                    </td>

                    <td style={td}>{deal.deal_type || "—"}</td>
                    <td style={td}>{formatDisplayDate(deal.start_date)}</td>
                    <td style={td}>{deal.due_day || "—"}</td>
                    <td style={moneyCell}>
                      {formatMoney(deal.monthly_payment)}
                    </td>
                    <td style={td}>{deal.term || "—"}</td>
                    <td style={notesCell}>{getMissingScheduleText(deal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardSection>
      )}

      <DashboardSection
        title="Scheduled Payments Due"
        description="Scheduled installments due on the selected date that are still unpaid or partially paid."
        count={scheduledUnpaidOrPartial.length}
        tone="warning"
      >
        {scheduledUnpaidOrPartial.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No scheduled payments due for this date."
            message="There are no active scheduled installments that need payment follow-up for the selected date."
          />
        ) : (
          <div style={tableScroll}>
            <table style={scheduledTableStyle}>
              <thead>
                <tr>
                  <th style={stickyTh}>Deal Tag</th>
                  <th style={{ ...th, width: "180px" }}>Customer</th>
                  <th style={{ ...th, width: "125px" }}>Phone</th>
                  <th style={{ ...th, width: "105px" }}>Installment</th>
                  <th style={{ ...th, width: "130px" }}>Deal Type</th>
                  <th style={{ ...th, width: "160px" }}>Truck</th>
                  <th style={{ ...th, width: "115px" }}>Amount Due</th>
                  <th style={{ ...th, width: "105px" }}>Paid</th>
                  <th style={{ ...th, width: "120px" }}>Remaining</th>
                  <th style={{ ...th, width: "120px" }}>Status</th>
                </tr>
              </thead>

              <tbody>
                {scheduledUnpaidOrPartial.map((item, index) => (
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

                    <td style={td}>{item.deal.customers?.phone || "—"}</td>
                    <td style={td}>{item.installmentNumber}</td>

                    <td style={wrapCell}>
                      <span style={dealTypeBadge}>
                        {item.deal.deal_type || "—"}
                      </span>
                    </td>

                    <td style={wrapCell}>
                      {`${item.deal.year || ""} ${
                        item.deal.truck || ""
                      }`.trim() || "—"}
                    </td>

                    <td style={moneyCell}>{formatMoney(item.amountDue)}</td>
                    <td style={moneyCell}>{formatMoney(item.paidForDueDate)}</td>

                    <td style={warningMoneyCell}>
                      {formatMoney(item.remainingForDueDate)}
                    </td>

                    <td style={td}>
                      <span style={getStatusStyle(item.status)}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardSection>

      <DashboardSection
        title="Promises Due"
        description="Customer promises due on the selected date, including pending and broken promise follow-ups."
        count={promisesDue.length}
        tone="info"
      >
        {promisesDue.length === 0 ? (
          <EmptyState
            icon="🤝"
            title="No promises due for this date."
            message="There are no active customer promises to follow up for the selected date."
          />
        ) : (
          <div style={tableScroll}>
            <table style={promiseTableStyle}>
              <thead>
                <tr>
                  <th style={stickyTh}>Deal Tag</th>
                  <th style={{ ...th, width: "180px" }}>Customer</th>
                  <th style={{ ...th, width: "125px" }}>Phone</th>
                  <th style={{ ...th, width: "130px" }}>Original Due</th>
                  <th style={{ ...th, width: "135px" }}>Promised Date</th>
                  <th style={{ ...th, width: "120px" }}>Amount Due</th>
                  <th style={{ ...th, width: "130px" }}>Status</th>
                  <th style={{ ...th, width: "240px" }}>Notes</th>
                </tr>
              </thead>

              <tbody>
                {promisesDue.map((promise, index) => (
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
                        <Link
                          to={`/deals/${promise.deals.id}`}
                          style={dealLink}
                        >
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

                    <td style={td}>
                      {formatDisplayDate(promise.original_due_date)}
                    </td>

                    <td style={td}>
                      {formatDisplayDate(promise.promised_date)}
                    </td>

                    <td style={moneyCell}>
                      {formatMoney(promise.remaining_amount)}
                    </td>

                    <td style={td}>
                      <span style={getPromiseStatusStyle(promise.promise_status)}>
                        {promise.promise_status}
                      </span>
                    </td>

                    <td style={notesCell}>{promise.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardSection>
    </div>
  );
}

function DashboardSection({ title, description, count, tone, children }) {
  return (
    <div style={tableBox}>
      <div style={sectionHeader}>
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

function getMissingScheduleText(deal) {
  const missing = [];

  if (!deal.start_date) missing.push("Start Date");
  if (!deal.due_day) missing.push("Due Day");

  if (!deal.monthly_payment || Number(deal.monthly_payment || 0) <= 0) {
    missing.push("Monthly Payment");
  }

  if (!deal.term || Number(deal.term || 0) <= 0) {
    missing.push("Term");
  }

  return missing.join(", ");
}

function MetricCard({ icon, title, value, subtitle, tone = "default" }) {
  return (
    <div style={{ ...metricCard, ...getCardToneStyle(tone) }}>
      <div style={metricTop}>
        <span style={metricIcon}>{icon}</span>
        <span style={metricTitle}>{title}</span>
      </div>

      <h3 style={metricValue}>{value}</h3>
      <p style={metricSubtitle}>{subtitle}</p>
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

function EmptyState({ icon, title, message }) {
  return (
    <div style={emptyState}>
      <div style={emptyIcon}>{icon}</div>
      <strong>{title}</strong>
      <p style={{ margin: "6px 0 0" }}>{message}</p>
    </div>
  );
}

function getCardToneStyle(tone) {
  if (tone === "danger") return { borderTop: "4px solid #991b1b" };
  if (tone === "warning") return { borderTop: "4px solid #f59e0b" };
  if (tone === "info") return { borderTop: "4px solid #2563eb" };

  return { borderTop: "4px solid #cbd5e1" };
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

function getStatusStyle(status) {
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

  if (status === "Pending") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
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

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
    border: "1px solid #d1d5db",
  };
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
}

function getDateOffset(dateString, offsetDays) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

const dateBadge = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.24)",
  borderRadius: "14px",
  padding: "10px 14px",
  minWidth: "130px",
};

const dateBadgeLabel = {
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

const warningBox = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  padding: "14px",
  borderRadius: "16px",
  marginBottom: "16px",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
};

const warningIcon = {
  fontSize: "22px",
  lineHeight: 1,
};

const controlPanel = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "16px",
  flexWrap: "wrap",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.07)",
  boxSizing: "border-box",
};

const controlTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
};

const controlDescription = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "14px",
  lineHeight: "1.45",
};

const controlActions = {
  display: "flex",
  alignItems: "flex-end",
  gap: "12px",
  flexWrap: "wrap",
};

const labelStyle = {
  display: "block",
  fontWeight: "800",
  color: "#374151",
  marginBottom: "7px",
  fontSize: "13px",
};

const inputStyle = {
  width: "210px",
  padding: "11px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  boxSizing: "border-box",
  fontWeight: "700",
  color: "#111827",
};

const quickDateButtons = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const secondaryButton = {
  background: "#f8fafc",
  color: "#374151",
  border: "1px solid #d1d5db",
  padding: "10px 12px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "800",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "14px",
  marginBottom: "16px",
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
  marginBottom: "12px",
};

const metricIcon = {
  fontSize: "22px",
};

const metricTitle = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "11px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const metricValue = {
  margin: 0,
  color: "#111827",
  fontSize: "24px",
  fontWeight: "900",
};

const metricSubtitle = {
  margin: "6px 0 0",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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

const sectionHeader = {
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
  height: "430px",
  overflowX: "auto",
  overflowY: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  boxSizing: "border-box",
};

const tableScrollSmall = {
  ...tableScroll,
  height: "260px",
};

const scheduledTableStyle = {
  width: "100%",
  minWidth: "1230px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const promiseTableStyle = {
  width: "100%",
  minWidth: "1120px",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const missingScheduleTableStyle = {
  width: "100%",
  minWidth: "1130px",
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
  width: "105px",
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
  width: "105px",
  boxShadow: "3px 0 8px rgba(0,0,0,0.06)",
};

const customerCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
  color: "#111827",
  fontWeight: "800",
};

const wrapCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
};

const moneyCell = {
  ...td,
  fontWeight: "900",
  color: "#111827",
};

const warningMoneyCell = {
  ...moneyCell,
  color: "#92400e",
};

const notesCell = {
  ...td,
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: "1.35",
};

const dealLink = {
  color: "#1d4ed8",
  fontWeight: "900",
  textDecoration: "none",
  cursor: "pointer",
};

const dealTypeBadge = {
  display: "inline-block",
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "12px",
  fontWeight: "800",
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

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "13px",
  borderRadius: "12px",
  marginBottom: "15px",
  fontWeight: "bold",
};

export default DuePayments;