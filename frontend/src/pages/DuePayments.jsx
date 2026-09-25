import RequestError from "../components/RequestError";
import LoadingSpinner from "../components/LoadingSpinner";
import "./DuePayments.css";
import { getActivePromises, getCombinedDueAmount } from "../utils/promiseUtils";
import { useCallback, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { getDeals } from "../api/dealsApi";
import { getPayments } from "../api/paymentsApi";
import { getPromises, updateBrokenPromises } from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";
import { getDueDealsForDate } from "../utils/duePaymentsUtils";

function DuePayments() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [selectedDate, setSelectedDate] = useState(today);
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const requestId = useRef(0);
  const loadData = useCallback(async () => {
    const request = ++requestId.current;
    try {
      setLoading(true);
      setError("");
      await updateBrokenPromises();
      const [dealsData, paymentsData, promisesData] = await Promise.all([
        getDeals(), getPayments(), getPromises(),
      ]);
      if (request !== requestId.current) return;
      setDeals(dealsData || []);
      setPayments(paymentsData || []);
      setPromises(promisesData || []);
      setLastRefreshedAt(new Date());
    } catch (error) {
      if (request === requestId.current) setError(error.message || "Unable to load due payments.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) loadData(); });
    return () => { cancelled = true; requestId.current += 1; };
  }, [loadData]);

  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const dueDeals = getDueDealsForDate(deals, activePayments, selectedDate);

  const scheduledUnpaidOrPartial = dueDeals.filter(
    (item) => item.status === "Due" || item.status === "Partial"
  );

  const activePromises = getActivePromises(promises);

  const promisesDue = activePromises.filter(
    (promise) => promise.promised_date === selectedDate
  );

  const brokenPromisesDue = promisesDue.filter(
    (promise) => promise.promise_status === "Broken"
  );

  const pendingPromisesDue = promisesDue.filter(
    (promise) => promise.promise_status === "Pending"
  );

  const missingScheduleDeals = deals.filter((deal) => {
    const isActivePaymentDeal =
      deal.status === "Active" && deal.deal_type !== "Cash";

    return isActivePaymentDeal && isScheduleMissing(deal);
  });

  const totalScheduledDue = scheduledUnpaidOrPartial.reduce(
    (sum, item) => sum + Number(item.remainingForDueDate || 0),
    0
  );

  const totalPromiseDue = promisesDue.reduce(
    (sum, promise) => sum + Number(promise.remaining_amount || 0),
    0
  );

  const totalDue = getCombinedDueAmount(scheduledUnpaidOrPartial, promisesDue);

  const isToday = selectedDate === today;
  const pageDateLabel = isToday ? "Today" : formatDisplayDate(selectedDate);
  const totalFollowUps = scheduledUnpaidOrPartial.length + promisesDue.length;

  const matchesDeal = (deal, notes = "") => {
    const query = search.trim().toLowerCase();
    return [deal?.deal_tag, deal?.customers?.customer_name, deal?.customers?.phone, notes]
      .some(value => String(value || "").toLowerCase().includes(query));
  };
  const listedScheduled = scheduledUnpaidOrPartial.filter(item => matchesDeal(item.deal));
  const listedPromises = promisesDue.filter(promise => matchesDeal(promise.deals, promise.notes));
  const listedMissing = missingScheduleDeals.filter(deal => matchesDeal(deal));
  const listKey = JSON.stringify([selectedDate, search]);

  if (!lastRefreshedAt) {
    return <div style={pageWrapper}>
      <h1 style={{ color: "#0f172a" }}>Due Payments</h1>
      {error ? <RequestError error={error} onRetry={loadData} busy={loading} /> :
        <LoadingSpinner message="Loading scheduled payments and promises…" height="420px" />}
    </div>;
  }

  return (
    <div className="due-payments-page" style={pageWrapper}>
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

      {error && <div style={errorBox}><RequestError error={error} onRetry={loadData} busy={loading} /></div>}

      {missingScheduleDeals.length > 0 && (
        <div style={warningBox}>
          <div style={warningIcon}>⚠️</div>
          <div>
            <strong>
              {missingScheduleDeals.length} active deal(s) missing schedule
              setup.
            </strong>
            <p style={{ margin: "6px 0 0" }}>
              Open Missing Schedule Setup below to review the affected deals and required fields.
            </p>
          </div>
        </div>
      )}

      <div style={controlPanel}>
        <div>
          <h2 style={controlTitle}>Select Collection Date</h2>
          <p style={controlDescription}>
            Shows obligations dated exactly on this day, not all overdue balances.
          </p>
        </div>

        <div style={controlActions}>
          <div>
            <label htmlFor="collection-date" style={labelStyle}>Due Date</label>
            <input
              id="collection-date"
              type="date"
              required
              value={selectedDate}
              onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
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
          subtitle={`${formatMoney(totalScheduledDue)} remaining`}
          tone="warning"
        />

        <MetricCard
          icon="🤝"
          title="Promises Due"
          value={promisesDue.length}
          subtitle={`${formatMoney(totalPromiseDue)} promised`}
          tone="info"
        />

        <MetricCard
          icon="🚨"
          title="Total Due"
          value={formatMoney(totalDue)}
          subtitle="Scheduled dues and promises, without counting an installment twice"
          tone="danger"
        />

        <MetricCard
          icon="⚠️"
          title="Broken Promises"
          value={brokenPromisesDue.length}
          subtitle="Needs attention"
          tone="danger"
        />

      </div>

      <div style={summaryStrip}>
        <SummaryItem label="Selected Date" value={formatDisplayDate(selectedDate)} />
        <SummaryItem label="Pending Promises" value={pendingPromisesDue.length} />
        <SummaryItem label="Broken Promises" value={brokenPromisesDue.length} />
        <SummaryItem label="Scheduled + promise records" value={totalFollowUps} />
      </div>

      <div className="due-list-filters">
        <div>
          <label htmlFor="due-search">Find a customer or deal</label>
          <input id="due-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search deal tag, customer, phone, or promise notes" />
        </div>
        <button type="button" onClick={() => setSearch("")} disabled={!search}>Clear search</button>
        <p>Cards show all obligations on the selected date. Search and pagination affect only the lists. A scheduled installment and its promise may appear in both lists; Total Due counts that obligation once.</p>
      </div>

      {missingScheduleDeals.length > 0 && (
        <DashboardSection
          collapsible
          title="Missing Schedule Setup"
          description="These active deals cannot generate due payments until schedule fields are completed."
          count={listedMissing.length}
          tone="warning"
        >
          <DueList key={listKey} rows={listedMissing} label="Missing schedule deals">{rows => (
          <div style={tableScrollSmall}>
            <table style={missingScheduleTableStyle}>
              <thead>
                <tr>
                  <th style={stickyTh}>Deal Tag</th>
                  <th style={{ ...th, width: "190px" }}>Customer</th>
                  <th style={{ ...th, width: "120px" }}>Frequency</th>
                  <th style={{ ...th, width: "130px" }}>Deal Type</th>
                  <th style={{ ...th, width: "115px" }}>Start Date</th>
                  <th style={{ ...th, width: "130px" }}>First Payment</th>
                  <th style={{ ...th, width: "90px" }}>Due Day</th>
                  <th style={{ ...th, width: "115px" }}>Second Due Day</th>
                  <th style={{ ...th, width: "130px" }}>Payment Amount</th>
                  <th style={{ ...th, width: "90px" }}>Term</th>
                  <th style={{ ...th, width: "260px" }}>Missing Fields</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((deal, index) => {
                  const frequency = getPaymentFrequency(deal);

                  return (
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

                      <td style={td}>
                        <span style={getFrequencyBadgeStyle(frequency)}>
                          {getPaymentFrequencyLabel(frequency)}
                        </span>
                      </td>

                      <td style={td}>{deal.deal_type || "—"}</td>
                      <td style={td}>{formatDisplayDate(deal.start_date)}</td>
                      <td style={td}>
                        {frequency === "Biweekly" || frequency === "Semi-Monthly"
                          ? formatDisplayDate(getFirstPaymentDate(deal))
                          : "—"}
                      </td>
                      <td style={td}>
                        {frequency === "Monthly" || frequency === "Semi-Monthly"
                          ? deal.due_day || "—"
                          : "—"}
                      </td>
                      <td style={td}>
                        {frequency === "Semi-Monthly" ? getSecondDueDay(deal) || "—" : "—"}
                      </td>
                      <td style={moneyCell}>
                        {formatMoney(getPaymentAmount(deal))}
                      </td>
                      <td style={td}>{deal.term || "—"}</td>
                      <td style={notesCell}>{getMissingScheduleText(deal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}</DueList>
        </DashboardSection>
      )}

      <DashboardSection
        title="Scheduled Payments Due"
        description="Monthly, biweekly, semi-monthly, or one-time scheduled installments due on the selected date that are still unpaid or partially paid."
        count={listedScheduled.length}
        tone="warning"
      >
        {listedScheduled.length === 0 ? (
          <EmptyState
            icon="✅"
            title={search ? "No scheduled payments match your search." : "No scheduled payments due for this date."}
            message={search ? "Try another customer or deal, or clear the search." : "No open scheduled installments were found on this date. Other dates may still have amounts outstanding."}
          />
        ) : (
          <DueList key={listKey} rows={listedScheduled} label="Scheduled payments">{rows => (
          <div style={tableScroll}>
            <table style={scheduledTableStyle}>
              <thead>
                <tr>
                  <th style={stickyTh}>Deal Tag</th>
                  <th style={{ ...th, width: "180px" }}>Customer</th>
                  <th style={{ ...th, width: "125px" }}>Phone</th>
                  <th style={{ ...th, width: "105px" }}>Installment</th>
                  <th style={{ ...th, width: "120px" }}>Frequency</th>
                  <th style={{ ...th, width: "130px" }}>Deal Type</th>
                  <th style={{ ...th, width: "160px" }}>Truck</th>
                  <th style={{ ...th, width: "115px" }}>Amount Due</th>
                  <th style={{ ...th, width: "105px" }}>Paid</th>
                  <th style={{ ...th, width: "120px" }}>Remaining</th>
                  <th style={{ ...th, width: "120px" }}>Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((item, index) => (
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

                    <td style={td}>
                      <span
                        style={getFrequencyBadgeStyle(
                          item.paymentFrequency || getPaymentFrequency(item.deal)
                        )}
                      >
                        {getPaymentFrequencyLabel(
                          item.paymentFrequency || getPaymentFrequency(item.deal)
                        )}
                      </span>
                    </td>

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
          )}</DueList>
        )}
      </DashboardSection>

      <DashboardSection
        title="Promises Due"
        description="Customer promises due on the selected date, including pending and broken promise follow-ups."
        count={listedPromises.length}
        tone="info"
      >
        {listedPromises.length === 0 ? (
          <EmptyState
            icon="🤝"
            title={search ? "No promises match your search." : "No promises due for this date."}
            message={search ? "Try another customer or deal, or clear the search." : "No active promises were found on this date. Other dates may still have commitments outstanding."}
          />
        ) : (
          <DueList key={listKey} rows={listedPromises} label="Promises due">{rows => (
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
                {rows.map((promise, index) => (
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
          )}</DueList>
        )}
      </DashboardSection>
    </div>
  );
}

function DashboardSection({ title, description, count, tone, children, collapsible = false }) {
  const Container = collapsible ? "details" : "section";
  const Header = collapsible ? "summary" : "div";
  return (
    <Container style={tableBox}>
      <Header style={{ ...sectionHeader, cursor: collapsible ? "pointer" : undefined }}>
        <div>
          <h2 style={sectionTitle}>{title}</h2>
          <p style={sectionDescription}>{description}</p>
        </div>

        <span style={getSectionBadgeStyle(tone)}>{count}</span>
      </Header>

      {children}
    </Container>
  );
}

function DueList({ rows, label, children }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const listRef = useRef(null);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);
  const go = next => {
    setPage(Math.max(1, Math.min(next, pages)));
    const scroller = listRef.current?.firstElementChild;
    if (scroller) scroller.scrollTop = 0;
  };
  return <>
    <div ref={listRef}>{rows.length ? children(visible) : <p>No matching records. Try clearing the search.</p>}</div>
    <nav className="due-pagination" aria-label={`${label} pagination`}>
      <span role="status">Showing {rows.length ? start + 1 : 0}–{start + visible.length} of {rows.length}</span>
      <label>Rows per page <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); go(1); }}>
        {[10, 25, 50, 100].map(size => <option key={size}>{size}</option>)}
      </select></label>
      <div>
        <button type="button" disabled={current === 1} onClick={() => go(1)}>First</button>
        <button type="button" disabled={current === 1} onClick={() => go(current - 1)}>Previous</button>
        <span>Page {current} of {pages}</span>
        <button type="button" disabled={current === pages} onClick={() => go(current + 1)}>Next</button>
        <button type="button" disabled={current === pages} onClick={() => go(pages)}>Last</button>
      </div>
    </nav>
  </>;
}

function getPaymentFrequency(deal) {
  if (deal?.deal_type === "Cash") return "Cash";

  if (deal?.deal_type === "Registration Money") {
    return "One-Time";
  }

  return deal?.payment_frequency || deal?.paymentFrequency || "Monthly";
}

function getPaymentFrequencyLabel(frequency) {
  if (frequency === "Biweekly") return "Biweekly";
  if (frequency === "Semi-Monthly") return "Semi-Monthly";
  if (frequency === "One-Time") return "One-Time";
  if (frequency === "Cash") return "Cash";
  return "Monthly";
}

function getPaymentAmount(deal) {
  return Number(deal?.monthly_payment || deal?.monthlyPayment || 0);
}

function getFirstPaymentDate(deal) {
  return deal?.first_payment_date || deal?.firstPaymentDate || deal?.start_date || "";
}

function getSecondDueDay(deal) {
  return deal?.second_due_day || deal?.secondDueDay || "";
}

function isScheduleMissing(deal) {
  const frequency = getPaymentFrequency(deal);
  const paymentAmount = getPaymentAmount(deal);

  if (frequency === "Cash") return false;

  if (paymentAmount <= 0) return true;

  if (frequency === "One-Time") {
    return !deal.start_date && !deal.first_payment_date;
  }

  if (!deal.term || Number(deal.term || 0) <= 0) return true;

  if (frequency === "Biweekly") {
    return !getFirstPaymentDate(deal);
  }

  if (frequency === "Semi-Monthly") {
    return !getFirstPaymentDate(deal) || !getSecondDueDay(deal);
  }

  return !deal.start_date || !deal.due_day;
}

function getMissingScheduleText(deal) {
  const missing = [];
  const frequency = getPaymentFrequency(deal);

  if (frequency === "One-Time") {
    if (!deal.start_date && !deal.first_payment_date) {
      missing.push("Tentative Due Date");
    }

    if (getPaymentAmount(deal) <= 0) {
      missing.push("One-Time Amount");
    }

    return missing.join(", ");
  }

  if (frequency === "Biweekly") {
    if (!getFirstPaymentDate(deal)) missing.push("First Payment Date");

    if (getPaymentAmount(deal) <= 0) {
      missing.push("Biweekly Payment");
    }

    if (!deal.term || Number(deal.term || 0) <= 0) {
      missing.push("Term");
    }

    return missing.join(", ");
  }

  if (frequency === "Semi-Monthly") {
    if (!getFirstPaymentDate(deal)) missing.push("First Payment Date");
    if (!deal.due_day) missing.push("First Due Day");
    if (!getSecondDueDay(deal)) missing.push("Second Due Day");

    if (getPaymentAmount(deal) <= 0) {
      missing.push("Semi-Monthly Payment");
    }

    if (!deal.term || Number(deal.term || 0) <= 0) {
      missing.push("Term");
    }

    return missing.join(", ");
  }

  if (!deal.start_date) missing.push("Start Date");
  if (!deal.due_day) missing.push("Due Day");

  if (getPaymentAmount(deal) <= 0) {
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

function getFrequencyBadgeStyle(frequency) {
  const base = {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap",
    display: "inline-block",
    border: "1px solid transparent",
  };

  if (frequency === "Biweekly") {
    return {
      ...base,
      background: "#ede9fe",
      color: "#6d28d9",
      border: "1px solid #ddd6fe",
    };
  }

  if (frequency === "Semi-Monthly") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (frequency === "One-Time") {
    return {
      ...base,
      background: "#ccfbf1",
      color: "#0f766e",
      border: "1px solid #99f6e4",
    };
  }

  return {
    ...base,
    background: "#dbeafe",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
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
  maxHeight: "430px",
  overflowX: "auto",
  overflowY: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  boxSizing: "border-box",
};

const tableScrollSmall = {
  ...tableScroll,
  maxHeight: "260px",
};

const scheduledTableStyle = {
  width: "100%",
  minWidth: "1360px",
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
  minWidth: "1435px",
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
