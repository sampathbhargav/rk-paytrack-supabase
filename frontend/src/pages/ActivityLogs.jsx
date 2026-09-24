import { useEffect, useMemo, useRef, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatActivityDate, getActivityLogs } from "../api/activityLogsApi";
import { formatMoney } from "../utils/moneyUtils";

function defaultFilters() {
  return { search: "", module: "", action: "", startDate: "", endDate: getLocalDateString(new Date()) };
}

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [lastUpdated, setLastUpdated] = useState(null);
  const logsRequest = useRef(0);
  const summaryRequest = useRef(0);
  const filtersPending = JSON.stringify(filters) !== JSON.stringify(appliedFilters);

  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [dailySummaryDate, setDailySummaryDate] = useState(() => getLocalDateString(new Date()));
  const [dailySummaryLogs, setDailySummaryLogs] = useState([]);
  const [dailySummaryLoading, setDailySummaryLoading] = useState(false);
  const [dailySummaryMessage, setDailySummaryMessage] = useState("");
  const [dailySummaryLoaded, setDailySummaryLoaded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 820 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 820);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    loadLogs();
    return () => { logsRequest.current += 1; summaryRequest.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLogs = async (requestedFilters = filters) => {
    if (requestedFilters.startDate && requestedFilters.endDate && requestedFilters.startDate > requestedFilters.endDate) {
      setMessage("Start date must be on or before end date.");
      return;
    }
    const request = ++logsRequest.current;
    try {
      setLoading(true);
      setMessage("");

      const data = await getActivityLogs(requestedFilters);
      if (request !== logsRequest.current) return;
      setAppliedFilters({ ...requestedFilters });
      setLastUpdated(new Date());
      setLogs(data || []);
      setCurrentPage(1);
    } catch (error) {
      if (request !== logsRequest.current) return;
      setMessage(error.message || "Unable to load activity logs.");
    } finally {
      if (request === logsRequest.current) setLoading(false);
    }
  };

  const loadDailySummary = async (dateValue = dailySummaryDate) => {
    const selectedDate = dateValue || dailySummaryDate;

    if (!selectedDate) {
      setDailySummaryMessage("Select a date to view the daily activity summary.");
      return;
    }

    const request = ++summaryRequest.current;
    try {
      setDailySummaryLoaded(false);
      setDailySummaryLoading(true);
      setDailySummaryMessage("");

      const data = await getActivityLogs({
        startDate: selectedDate,
        endDate: selectedDate,
      });

      if (request !== summaryRequest.current) return;
      if (data.length >= 1000) {
        throw new Error("The activity query reached its 1,000-record limit. A complete daily summary cannot be confirmed; use Reports to review collections.");
      }
      const localDayLogs = (data || []).filter(
        (log) => getLocalDateString(log.created_at) === selectedDate
      );

      setDailySummaryLogs(localDayLogs);
      setDailySummaryLoaded(true);
    } catch (error) {
      if (request !== summaryRequest.current) return;
      setDailySummaryLogs([]);
      setDailySummaryLoaded(false);
      setDailySummaryMessage(
        error.message || "Unable to load the daily activity summary."
      );
    } finally {
      if (request === summaryRequest.current) setDailySummaryLoading(false);
    }
  };

  const loadTodaySummary = async () => {
    const todayString = getLocalDateString(new Date());
    setDailySummaryDate(todayString);
    await loadDailySummary(todayString);
  };

  const dailySummary = useMemo(
    () => buildDailyActivitySummary(dailySummaryLogs),
    [dailySummaryLogs]
  );

  const printDailySummary = () => {
    if (!dailySummaryLoaded || dailySummaryLoading) return;

    printDailyActivitySummary({
      date: dailySummaryDate,
      summary: dailySummary,
    });
  };

  const updateFilter = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    const nextFilters = defaultFilters();
    setFilters(nextFilters);
    loadLogs(nextFilters);
  };

  const applyDatePreset = (days) => {
    const today = getLocalDateString(new Date());
    const nextFilters = { ...filters, startDate: shiftDateString(today, -(days - 1)), endDate: today };
    setFilters(nextFilters);
    loadLogs(nextFilters);
  };

  const stats = useMemo(() => {
    const today = getLocalDateString(new Date());

    return {
      total: logs.length,
      today: logs.filter(
        (log) => getLocalDateString(log.created_at) === today
      ).length,
      payments: logs.filter((log) =>
        String(log.module || "").toLowerCase().includes("payment")
      ).length,
      maintenance: logs.filter((log) =>
        String(log.module || "").toLowerCase().includes("maintenance")
      ).length,
    };
  }, [logs]);

  const totalPages = Math.max(Math.ceil(logs.length / pageSize), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pageStart =
    logs.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;

  const pageEnd = Math.min(safeCurrentPage * pageSize, logs.length);

  const paginatedLogs = logs.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const handlePageSizeChange = (value) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
  };

  return (
    <div className="activity-logs-page" style={isMobile ? mobilePageWrapper : pageWrapper}>
      <div style={isMobile ? mobileHeroCard : heroCard}>
        <div>
          <div style={eyebrow}>System Monitoring</div>

          <h1 style={isMobile ? mobilePageTitle : pageTitle}>Activity Logs</h1>

          <p style={isMobile ? mobilePageDescription : pageDescription}>
            Track important user actions across deals, payments, maintenance,
            customers, promises, receipts, and reports.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadLogs(appliedFilters)}
          disabled={loading}
          style={isMobile ? mobileRefreshButton : refreshButton}
        >
          {loading ? "Refreshing…" : "Refresh Logs"}
        </button>
      </div>

      <div style={isMobile ? mobileStatsGrid : statsGrid}>
        <StatCard title="Matching loaded logs" value={stats.total} icon="📋" />
        <StatCard title="Today in results" value={stats.today} icon="📅" />
        <StatCard title="Payment Logs" value={stats.payments} icon="💵" />
        <StatCard title="Maintenance Logs" value={stats.maintenance} icon="🔧" />
      </div>

      <details style={summaryDisclosure}>
        <summary style={disclosureHeading}>Daily activity summary <span style={disclosureHint}>Review or print a day’s recorded actions</span></summary>
      <DailyActivitySummary
        date={dailySummaryDate}
        onDateChange={(value) => {
          summaryRequest.current += 1;
          setDailySummaryLoading(false);
          setDailySummaryDate(value);
          setDailySummaryLoaded(false);
          setDailySummaryMessage("");
        }}
        onLoad={() => loadDailySummary()}
        onToday={loadTodaySummary}
        onPrint={printDailySummary}
        loading={dailySummaryLoading}
        loaded={dailySummaryLoaded}
        message={dailySummaryMessage}
        summary={dailySummary}
        isMobile={isMobile}
      />

      </details>

      <form onSubmit={(event) => { event.preventDefault(); loadLogs(); }} style={isMobile ? mobileFilterCard : filterCard}>
        <div style={filterToolbar}>
          <div><strong>Find activity</strong><p style={sectionDescription}>Filter by record, user, action, or date range.</p></div>
          <div style={presetButtons}>
            {[ [1, "Today"], [7, "Last 7 days"], [30, "Last 30 days"] ].map(([days, title]) => (
              <button key={days} type="button" disabled={loading} style={pageButton} onClick={() => applyDatePreset(days)}>{title}</button>
            ))}
          </div>
        </div>
        <div style={isMobile ? mobileFilterGrid : filterGrid}>
          <div>
            <label htmlFor="activity-search" style={labelStyle}>Search</label>
            <input
              id="activity-search"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder={
                isMobile
                  ? "Search logs..."
                  : "Search user, action, customer, invoice, deal tag..."
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="activity-module" style={labelStyle}>Module</label>
            <select
              id="activity-module"
              value={filters.module}
              onChange={(event) => updateFilter("module", event.target.value)}
              style={inputStyle}
            >
              <option value="">All Modules</option>
              <option value="Deals">Deals</option>
              <option value="Payments">Payments</option>
              <option value="Promises">Promises</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Customers">Customers</option>
              <option value="Reports">Reports</option>
              <option value="Receipts">Receipts</option>
              <option value="Auth">Auth</option>
              <option value="Follow-Ups">Follow-Ups</option>
            </select>
          </div>

          <div>
            <label htmlFor="activity-action" style={labelStyle}>Action</label>
            <select
              id="activity-action"
              value={filters.action}
              onChange={(event) => updateFilter("action", event.target.value)}
              style={inputStyle}
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="VOID">VOID</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="PROMISE">PROMISE</option>
              <option value="RESCHEDULE">RESCHEDULE</option>
              <option value="CANCEL">CANCEL</option>
              <option value="STATUS_CHANGE">STATUS CHANGE</option>
              <option value="SKIP">SKIP</option>
              <option value="EXPORT">EXPORT</option>
              <option value="SECURITY">SECURITY</option>
            </select>
          </div>

          <div>
            <label htmlFor="activity-startDate" style={labelStyle}>Start Date</label>
            <input
              type="date"
              id="activity-startDate"
              value={filters.startDate}
              onChange={(event) => updateFilter("startDate", event.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="activity-endDate" style={labelStyle}>End Date</label>
            <input
              type="date"
              id="activity-endDate"
              value={filters.endDate}
              onChange={(event) => updateFilter("endDate", event.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={isMobile ? mobileFilterButtonWrap : filterButtonWrap}>
            <button type="submit" disabled={loading} style={applyButton}>
              Apply Filters
            </button>

            <button type="button" disabled={loading} onClick={clearFilters} style={resetButton}>
              Reset
            </button>
          </div>
        </div>
        {filtersPending && !loading && <p role="status" style={filterNotice}>Filters have changed. Select Apply Filters to update the results.</p>}
      </form>

      {message && <div role="alert" style={errorBox}>
        <strong>Activity could not be updated.</strong> {message}
        {lastUpdated && <p style={sectionDescription}>The previous results are still displayed below.</p>}
        <button type="button" disabled={loading} onClick={() => loadLogs()} style={pageButton}>Try again</button>
      </div>}

      <div style={isMobile ? mobileTableCard : tableCard}>
        <div style={tableHeader}>
          <div>
            <h2 style={sectionTitle}>Recent Activity</h2>
            <p style={sectionDescription}>
              Newest first · {logs.length.toLocaleString()} matching loaded records
              {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString()}`}
            </p>
          </div>

          {!loading && logs.length > 0 && (
            <PaginationControls
              isMobile={isMobile}
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={logs.length}
              pageStart={pageStart}
              pageEnd={pageEnd}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              onPageChange={goToPage}
            />
          )}
        </div>

        <p style={scopeNote}>Search and counts cover up to the latest 1,000 records matching the applied module, action, and dates. Narrow the date range when looking for older activity. Recorded events are an activity history, not a statement of current balances.</p>
        {loading ? (
          <LoadingSpinner message="Loading activity logs..." height="420px" />
        ) : logs.length === 0 ? (
          <div style={emptyState}>
            <strong>No matching activity</strong>
            <p>Try a different record name, a wider date range, or reset the filters.</p>
            <button type="button" onClick={clearFilters} style={pageButton}>Reset filters</button>
          </div>
        ) : isMobile ? (
          <>
            <div style={mobileLogList}>
              {paginatedLogs.map((log) => (
                <MobileLogCard
                  key={log.id}
                  log={log}
                  onView={() => setSelectedLog(log)}
                />
              ))}
            </div>

            <PaginationControls
              isMobile={isMobile}
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={logs.length}
              pageStart={pageStart}
              pageEnd={pageEnd}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              onPageChange={goToPage}
            />
          </>
        ) : (
          <>
            <div style={tableWrapper}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date / Time</th>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Action</th>
                    <th style={thStyle}>Module</th>
                    <th style={thStyle}>Record</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={tdStyle}>
                        {formatActivityDate(log.created_at)}
                      </td>
                      <td style={tdStyle}>{log.user_email || "—"}</td>
                      <td style={tdStyle}>
                        <span style={actionBadge(log.action)}>{log.action}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={moduleBadge}>{log.module || "—"}</span>
                      </td>
                      <td style={tdStyle}>
                        <strong>
                          {log.entity_label || log.entity_id || "—"}
                        </strong>
                        {log.entity_type && (
                          <span style={subText}>{log.entity_type}</span>
                        )}
                      </td>
                      <td style={tdStyle}>{log.description || "—"}</td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          style={viewButton}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              isMobile={isMobile}
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={logs.length}
              pageStart={pageStart}
              pageEnd={pageEnd}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              onPageChange={goToPage}
            />
          </>
        )}
      </div>

      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          isMobile={isMobile}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

function DailyActivitySummary({
  date,
  onDateChange,
  onLoad,
  onToday,
  onPrint,
  loading,
  loaded,
  message,
  summary,
  isMobile,
}) {
  return (
    <div style={simpleSummaryWrapper}>
      <div style={simpleSummaryTopRow}>
        <div>
          <h2 style={simpleSummaryTitle}>Daily Activity Summary</h2>
          <p style={simpleSummaryHelp}>
            Select a day to review recorded events. Amounts reflect log entries, not verified current payment balances.
          </p>
        </div>

        <div style={isMobile ? simpleSummaryControlsMobile : simpleSummaryControls}>
          <div>
            <label htmlFor="activity-summary-date" style={dailyDateLabel}>Summary Date</label>
            <input
              id="activity-summary-date"
              type="date"
              disabled={loading}
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              style={dailyDateInput}
            />
          </div>

          <button type="button" onClick={onToday} disabled={loading} style={simpleSecondaryButton}>
            Today
          </button>

          <button type="button" onClick={onLoad} disabled={loading} style={simplePrimaryButton}>
            {loading ? "Loading..." : "View Summary"}
          </button>

          <button
            type="button"
            onClick={onPrint}
            disabled={!loaded || loading}
            style={{
              ...simpleSecondaryButton,
              ...(!loaded || loading ? disabledDailyButton : {}),
            }}
          >
            Print
          </button>
        </div>
      </div>

      {message && <div role="alert" style={dailySummaryError}>{message}</div>}

      {loading ? (
        <LoadingSpinner message="Building daily summary..." height="180px" />
      ) : !loaded ? (
        <div style={simpleSummaryEmpty}>
          Select a date and click <strong>View Summary</strong>.
        </div>
      ) : summary.totalActivities === 0 ? (
        <div style={simpleSummaryEmpty}>
          No important activity was recorded for {formatSummaryDate(date)}.
        </div>
      ) : (
        <div style={simpleTextReport}>
          <div style={simpleReportHeader}>
            <strong>DAILY ACTIVITY SUMMARY</strong>
            <span>{formatSummaryDate(date)}</span>
          </div>

          <section style={simpleReportSection}>
            <strong>COLLECTIONS</strong>
            <div style={simpleReportLines}>
              <SimpleReportLine
                label="Gross Collections"
                value={formatMoney(summary.grossCollections)}
              />
              <SimpleReportLine
                label="Voided Amount"
                value={formatMoney(summary.voidedAmount)}
              />
              <SimpleReportLine
                label="Net Collections"
                value={formatMoney(summary.netCollections)}
              />
              <SimpleReportLine
                label="Payment Transactions"
                value={summary.paymentTransactions}
              />
              <SimpleReportLine
                label="Important Activities"
                value={summary.totalActivities}
              />
              <SimpleReportLine
                label="Active Users"
                value={summary.activeUsers.length}
              />
            </div>
          </section>

          {summary.paymentMethodBreakdown.length > 0 && (
            <section style={simpleReportSection}>
              <strong>COLLECTIONS BY PAYMENT METHOD</strong>
              <div style={simpleReportLines}>
                {summary.paymentMethodBreakdown.map((item) => (
                  <SimpleReportLine
                    key={item.method}
                    label={`${item.method} (${item.count})`}
                    value={formatMoney(item.amount)}
                  />
                ))}
              </div>
            </section>
          )}

          <section style={simpleReportSection}>
            <strong>PAYMENTS RECEIVED</strong>

            {summary.payments.length === 0 ? (
              <div style={simpleNoItems}>No payments were recorded.</div>
            ) : (
              <div style={simpleActivityList}>
                {summary.payments.map((payment, index) => (
                  <div key={payment.key} style={simpleActivityItem}>
                    <div>
                      <strong>
                        {index + 1}. {payment.customer}
                      </strong>
                      {payment.company ? ` — ${payment.company}` : ""}
                    </div>

                    <div>
                      {payment.dealLabel || payment.recordLabel || "No deal/invoice"}
                      {" | "}
                      {formatMoney(payment.amount)}
                      {" | "}
                      {payment.method}
                    </div>

                    <div style={simpleMutedText}>
                      {payment.time} | Recorded by {payment.user}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={simpleReportSection}>
            <strong>IMPORTANT ACTIVITY</strong>

            {summary.importantActivities.length === 0 ? (
              <div style={simpleNoItems}>
                No other important activity was recorded.
              </div>
            ) : (
              <div style={simpleActivityList}>
                {summary.importantActivities.map((activity, index) => (
                  <div key={activity.key} style={simpleActivityItem}>
                    <div>
                      <strong>
                        {index + 1}. {activity.action} — {activity.module}
                      </strong>
                    </div>

                    <div>
                      {activity.recordLabel || "Record"} —{" "}
                      {activity.description || "Important activity recorded."}
                    </div>

                    <div style={simpleMutedText}>
                      {activity.time} | {activity.user}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={simpleReportSection}>
            <strong>ACTIVITY BY USER</strong>

            <div style={simpleActivityList}>
              {summary.userSummaries.map((user) => (
                <div key={user.user} style={simpleActivityItem}>
                  <div>
                    <strong>{user.user}</strong>
                  </div>

                  <div>
                    Collected {formatMoney(user.paymentAmount)} from{" "}
                    {user.paymentCount} payment
                    {user.paymentCount === 1 ? "" : "s"}.
                  </div>

                  <div style={simpleMutedText}>
                    Total actions: {user.totalActivities}
                    {" | "}Voids: {user.voidCount}
                    {" | "}Deals created: {user.dealsCreated}
                    {" | "}Deal updates: {user.dealUpdates}
                    {" | "}Promises: {user.promiseActions}
                    {" | "}Skips: {user.skipActions}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SimpleReportLine({ label, value }) {
  return (
    <div style={simpleReportLine}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DailyMetricCard({ icon, title, value, detail, danger = false }) {
  return (
    <div
      style={{
        ...dailyMetricCard,
        ...(danger ? dailyMetricDanger : {}),
      }}
    >
      <div style={dailyMetricIcon}>{icon}</div>
      <div>
        <span style={dailyMetricTitle}>{title}</span>
        <strong style={dailyMetricValue}>{value}</strong>
        <span style={dailyMetricDetail}>{detail}</span>
      </div>
    </div>
  );
}

function DailySection({ title, subtitle, children }) {
  return (
    <section style={dailySection}>
      <div style={dailySectionHeader}>
        <h3 style={dailySectionTitle}>{title}</h3>
        <p style={dailySectionSubtitle}>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function SummaryFact({ label, value }) {
  return (
    <div style={summaryFact}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildDailyActivitySummary(logs = []) {
  const normalizedLogs = Array.isArray(logs) ? logs : [];

  const paymentLogs = normalizedLogs.filter(
    (log) => normalizeText(log.action) === "payment"
  );

  const voidLogs = normalizedLogs.filter(
    (log) => normalizeText(log.action) === "void"
  );

  const payments = paymentLogs
    .map((log, index) => buildPaymentSummaryItem(log, index))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  const grossCollections = roundMoney(
    payments.reduce((sum, payment) => sum + payment.amount, 0)
  );

  const voidedAmount = roundMoney(
    voidLogs.reduce((sum, log) => sum + getActivityAmount(log), 0)
  );

  const paymentMethodMap = new Map();

  payments.forEach((payment) => {
    const method = payment.method || "Other";
    const current = paymentMethodMap.get(method) || {
      method,
      amount: 0,
      count: 0,
    };

    current.amount = roundMoney(current.amount + payment.amount);
    current.count += 1;
    paymentMethodMap.set(method, current);
  });

  const paymentMethodBreakdown = Array.from(paymentMethodMap.values()).sort(
    (a, b) => b.amount - a.amount
  );

  const importantActivities = normalizedLogs
    .filter((log) => normalizeText(log.action) !== "payment")
    .map((log, index) => {
      const action = String(log.action || "ACTIVITY").toUpperCase();

      return {
        key: log.id || `activity-${index}`,
        action,
        module: log.module || "System",
        recordLabel: getRecordLabel(log),
        description: log.description || "",
        user: log.user_email || "Unknown user",
        time: formatTimeOnly(log.created_at),
        createdAt: log.created_at || "",
        isException: [
          "VOID",
          "DELETE",
          "CANCEL",
          "STATUS_CHANGE",
          "SECURITY",
        ].includes(action),
      };
    })
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  const userMap = new Map();

  normalizedLogs.forEach((log) => {
    const user = log.user_email || "Unknown user";

    if (!userMap.has(user)) {
      userMap.set(user, {
        user,
        totalActivities: 0,
        paymentCount: 0,
        paymentAmount: 0,
        voidCount: 0,
        dealsCreated: 0,
        dealUpdates: 0,
        promiseActions: 0,
        skipActions: 0,
      });
    }

    const summary = userMap.get(user);
    const action = normalizeText(log.action);
    const module = normalizeText(log.module);
    const description = normalizeText(log.description);

    summary.totalActivities += 1;

    if (action === "payment") {
      summary.paymentCount += 1;
      summary.paymentAmount = roundMoney(
        summary.paymentAmount + getActivityAmount(log)
      );
    }

    if (action === "void") {
      summary.voidCount += 1;
    }

    if (action === "create" && module === "deals") {
      summary.dealsCreated += 1;
    }

    if (
      (action === "update" || action === "status_change") &&
      module === "deals"
    ) {
      summary.dealUpdates += 1;
    }

    if (
      module === "promises" ||
      ["promise", "reschedule", "cancel", "paid"].includes(action) ||
      description.includes("promise")
    ) {
      summary.promiseActions += 1;
    }

    if (
      ["skip", "skip_payment", "skip_cancel", "cancel_skip"].includes(action) ||
      description.includes("skipped installment") ||
      description.includes("payment skip")
    ) {
      summary.skipActions += 1;
    }
  });

  const userSummaries = Array.from(userMap.values()).sort((a, b) => {
    if (b.paymentAmount !== a.paymentAmount) {
      return b.paymentAmount - a.paymentAmount;
    }

    return b.totalActivities - a.totalActivities;
  });

  return {
    totalActivities: normalizedLogs.length,
    payments,
    paymentTransactions: payments.length,
    grossCollections,
    voidedAmount,
    voidCount: voidLogs.length,
    netCollections: roundMoney(grossCollections - voidedAmount),
    paymentMethodBreakdown,
    importantActivities,
    userSummaries,
    activeUsers: userSummaries.map((item) => item.user),
  };
}

function buildPaymentSummaryItem(log, index) {
  const metadata = log.metadata || {};

  return {
    key: log.id || `payment-${index}`,
    customer:
      metadata.customer_name ||
      metadata.customer ||
      getCustomerFromDescription(log.description) ||
      log.entity_label ||
      "Customer",
    company: metadata.company_name || metadata.company || "",
    dealLabel:
      metadata.deal_tag ||
      metadata.invoice_no ||
      getDealFromDescription(log.description) ||
      "",
    recordLabel: getRecordLabel(log),
    amount: getActivityAmount(log),
    method: metadata.payment_method || "Other",
    user: log.user_email || "Unknown user",
    time: formatTimeOnly(log.created_at),
    createdAt: log.created_at || "",
    description: log.description || "",
  };
}

function getActivityAmount(log) {
  const metadata = log?.metadata || {};

  const directValues = [
    metadata.amount_paid,
    metadata.amount,
    metadata.total_amount,
  ];

  for (const value of directValues) {
    const numericValue = Number(value);

    if (Number.isFinite(numericValue) && numericValue !== 0) {
      return roundMoney(Math.abs(numericValue));
    }
  }

  const description = String(log?.description || "");
  const moneyMatch = description.match(/\$([\d,]+(?:\.\d{1,2})?)/);

  if (moneyMatch?.[1]) {
    return roundMoney(Number(moneyMatch[1].replaceAll(",", "")) || 0);
  }

  return 0;
}

function getRecordLabel(log) {
  const metadata = log?.metadata || {};

  return (
    metadata.deal_tag ||
    metadata.invoice_no ||
    log?.entity_label ||
    log?.entity_id ||
    "—"
  );
}

function getCustomerFromDescription(description) {
  const text = String(description || "");
  const match = text.match(/recorded for\s+(.+?)\s+on\s+(?:deal|invoice)\b/i);
  return match?.[1]?.trim() || "";
}

function getDealFromDescription(description) {
  const text = String(description || "");
  const match = text.match(/\bon deal\s+([^\s.]+)/i);
  return match?.[1]?.trim() || "";
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function formatTimeOnly(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getLocalDateString(dateValue = new Date()) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shiftDateString(dateValue, daysToAdd) {
  const [year, month, day] = String(dateValue || "").split("-").map(Number);

  if (!year || !month || !day) return dateValue || "";

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + Number(daysToAdd || 0));

  return getLocalDateString(date);
}

function formatSummaryDate(dateValue) {
  if (!dateValue) return "—";

  const [year, month, day] = String(dateValue).split("-").map(Number);

  if (!year || !month || !day) return dateValue;

  return new Date(year, month - 1, day).toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function printDailyActivitySummary({ date, summary }) {
  const printWindow = window.open("", "_blank", "width=1100,height=820");

  if (!printWindow) {
    alert("Popup was blocked. Allow popups to print the daily summary.");
    return;
  }

  const paymentRows = summary.payments
    .map(
      (payment) => `
        <tr>
          <td>${escapeHtml(payment.time)}</td>
          <td>
            <strong>${escapeHtml(payment.customer)}</strong>
            ${
              payment.company
                ? `<div class="muted">${escapeHtml(payment.company)}</div>`
                : ""
            }
          </td>
          <td>${escapeHtml(payment.dealLabel || payment.recordLabel)}</td>
          <td>${escapeHtml(payment.method)}</td>
          <td class="money">${escapeHtml(formatMoney(payment.amount))}</td>
          <td>${escapeHtml(payment.user)}</td>
        </tr>
      `
    )
    .join("");

  const methodRows = summary.paymentMethodBreakdown
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.method)}</td>
          <td>${item.count}</td>
          <td class="money">${escapeHtml(formatMoney(item.amount))}</td>
        </tr>
      `
    )
    .join("");

  const activityRows = summary.importantActivities
    .map(
      (activity) => `
        <tr>
          <td>${escapeHtml(activity.time)}</td>
          <td>${escapeHtml(activity.action)}</td>
          <td>${escapeHtml(activity.module)}</td>
          <td>${escapeHtml(activity.recordLabel)}</td>
          <td>${escapeHtml(activity.description)}</td>
          <td>${escapeHtml(activity.user)}</td>
        </tr>
      `
    )
    .join("");

  const userRows = summary.userSummaries
    .map(
      (user) => `
        <tr>
          <td>${escapeHtml(user.user)}</td>
          <td>${user.paymentCount}</td>
          <td class="money">${escapeHtml(formatMoney(user.paymentAmount))}</td>
          <td>${user.voidCount}</td>
          <td>${user.dealsCreated}</td>
          <td>${user.dealUpdates}</td>
          <td>${user.promiseActions}</td>
          <td>${user.skipActions}</td>
        </tr>
      `
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Daily Activity Summary - ${escapeHtml(formatSummaryDate(date))}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 28px;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: white;
          }
          h1, h2 { margin: 0; }
          h1 { font-size: 26px; }
          h2 {
            font-size: 17px;
            margin-top: 26px;
            margin-bottom: 9px;
          }
          .subtitle {
            margin-top: 6px;
            color: #64748b;
          }
          .metrics {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-top: 20px;
          }
          .metric {
            border: 1px solid #dbe3ee;
            border-radius: 10px;
            padding: 12px;
          }
          .metric span {
            display: block;
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
          }
          .metric strong {
            display: block;
            margin-top: 6px;
            font-size: 19px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 7px;
          }
          th, td {
            border: 1px solid #dbe3ee;
            padding: 8px;
            font-size: 11px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #f8fafc;
            text-transform: uppercase;
            color: #475569;
          }
          .money {
            white-space: nowrap;
            font-weight: 700;
          }
          .muted {
            color: #64748b;
            font-size: 10px;
            margin-top: 2px;
          }
          .empty {
            border: 1px dashed #cbd5e1;
            padding: 12px;
            color: #64748b;
          }
          .footer {
            margin-top: 28px;
            border-top: 1px solid #dbe3ee;
            padding-top: 10px;
            color: #64748b;
            font-size: 10px;
          }
          @media print {
            body { padding: 0; }
            .section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>Daily Activity Summary</h1>
        <div class="subtitle">${escapeHtml(formatSummaryDate(date))}</div>
        <div class="subtitle">Amounts reflect recorded activity events, not verified current payment balances. Use Reports for financial reconciliation.</div>

        <div class="metrics">
          <div class="metric">
            <span>Gross Collections</span>
            <strong>${escapeHtml(formatMoney(summary.grossCollections))}</strong>
          </div>
          <div class="metric">
            <span>Voided</span>
            <strong>${escapeHtml(formatMoney(summary.voidedAmount))}</strong>
          </div>
          <div class="metric">
            <span>Net Collections</span>
            <strong>${escapeHtml(formatMoney(summary.netCollections))}</strong>
          </div>
          <div class="metric">
            <span>Important Activities</span>
            <strong>${summary.totalActivities}</strong>
          </div>
        </div>

        <div class="section">
          <h2>Collections by Payment Method</h2>
          ${
            methodRows
              ? `<table>
                  <thead>
                    <tr><th>Method</th><th>Transactions</th><th>Amount</th></tr>
                  </thead>
                  <tbody>${methodRows}</tbody>
                </table>`
              : '<div class="empty">No payments recorded.</div>'
          }
        </div>

        <div class="section">
          <h2>Payments Received</h2>
          ${
            paymentRows
              ? `<table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Customer</th>
                      <th>Deal / Invoice</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Taken By</th>
                    </tr>
                  </thead>
                  <tbody>${paymentRows}</tbody>
                </table>`
              : '<div class="empty">No payments recorded.</div>'
          }
        </div>

        <div class="section">
          <h2>Important Activity</h2>
          ${
            activityRows
              ? `<table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Module</th>
                      <th>Record</th>
                      <th>Description</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>${activityRows}</tbody>
                </table>`
              : '<div class="empty">No other important activity recorded.</div>'
          }
        </div>

        <div class="section">
          <h2>Activity by User</h2>
          ${
            userRows
              ? `<table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Payments</th>
                      <th>Collected</th>
                      <th>Voids</th>
                      <th>Deals Created</th>
                      <th>Deal Updates</th>
                      <th>Promises</th>
                      <th>Skips</th>
                    </tr>
                  </thead>
                  <tbody>${userRows}</tbody>
                </table>`
              : '<div class="empty">No user activity recorded.</div>'
          }
        </div>

        <div class="footer">
          Generated from existing RK PayTrack activity logs. No additional
          activity-log records are created by this report.
        </div>

        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function PaginationControls({
  isMobile,
  currentPage,
  totalPages,
  totalItems,
  pageStart,
  pageEnd,
  pageSize,
  onPageSizeChange,
  onPageChange,
}) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <div style={isMobile ? mobilePaginationWrapper : paginationWrapper}>
      <div style={paginationInfo}>
        <strong>
          Showing {pageStart}-{pageEnd}
        </strong>{" "}
        of {totalItems} logs
      </div>

      <div style={paginationControlsRow}>
        <label style={pageSizeLabel}>
          Rows
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(event.target.value)}
            style={pageSizeSelect}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>

        <div style={paginationButtons}>
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={isFirstPage}
            style={{
              ...pageButton,
              ...(isFirstPage ? disabledPageButton : {}),
            }}
          >
            First
          </button>

          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={isFirstPage}
            style={{
              ...pageButton,
              ...(isFirstPage ? disabledPageButton : {}),
            }}
          >
            Prev
          </button>

          <span style={pageNumberBadge}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={isLastPage}
            style={{
              ...pageButton,
              ...(isLastPage ? disabledPageButton : {}),
            }}
          >
            Next
          </button>

          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={isLastPage}
            style={{
              ...pageButton,
              ...(isLastPage ? disabledPageButton : {}),
            }}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div style={statCard}>
      <div style={statIcon}>{icon}</div>
      <div>
        <p style={statTitle}>{title}</p>
        <strong style={statValue}>{value}</strong>
      </div>
    </div>
  );
}

function MobileLogCard({ log, onView }) {
  return (
    <div style={mobileLogCard}>
      <div style={mobileLogTop}>
        <div>
          <div style={mobileLogDate}>{formatActivityDate(log.created_at)}</div>
          <div style={mobileLogUser}>{log.user_email || "Unknown user"}</div>
        </div>

        <span style={actionBadge(log.action)}>{log.action || "—"}</span>
      </div>

      <div style={mobileLogBadgeRow}>
        <span style={moduleBadge}>{log.module || "—"}</span>
        {log.entity_type && <span style={mobileEntityType}>{log.entity_type}</span>}
      </div>

      <div style={mobileLogRecord}>
        <span>Record</span>
        <strong>{log.entity_label || log.entity_id || "—"}</strong>
      </div>

      <p style={mobileLogDescription}>{log.description || "—"}</p>

      <button type="button" onClick={onView} style={mobileViewButton}>
        View Details
      </button>
    </div>
  );
}

function LogDetailModal({ log, onClose, isMobile }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current.showModal();
    return () => { previousFocus?.focus?.(); };
  }, []);
  return (
    <div style={modalOverlay}>
      <dialog ref={dialogRef} aria-labelledby="activity-detail-title" onCancel={onClose} style={{ ...(isMobile ? mobileModalBox : modalBox), border: "none" }}>
        <div style={modalHeader}>
          <div>
            <h2 id="activity-detail-title" style={modalTitle}>Activity Details</h2>
            <p style={modalSubtitle}>
              {formatActivityDate(log.created_at)} ·{" "}
              {log.user_email || "Unknown user"}
            </p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close activity details" style={closeButton}>
            ×
          </button>
        </div>

        <div style={isMobile ? mobileDetailGrid : detailGrid}>
          <DetailItem label="Action" value={log.action} />
          <DetailItem label="Module" value={log.module} />
          <DetailItem label="Entity Type" value={log.entity_type} />
          <DetailItem label="Entity ID" value={log.entity_id} />
          <DetailItem label="Entity Label" value={log.entity_label} />
          <DetailItem label="User" value={log.user_email} />
        </div>

        <div style={detailSection}>
          <strong>Description</strong>
          <p>{log.description || "—"}</p>
        </div>

        <details style={detailSection}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Technical details / metadata</summary>
          <pre style={metadataBox}>
            {JSON.stringify(log.metadata || {}, null, 2)}
          </pre>
        </details>
      </dialog>
    </div>
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

function actionBadge(action) {
  const base = {
    display: "inline-flex",
    borderRadius: "999px",
    padding: "5px 8px",
    fontSize: "11px",
    fontWeight: "900",
    border: "1px solid transparent",
    width: "fit-content",
    whiteSpace: "nowrap",
  };

  if (action === "DELETE" || action === "VOID") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }

  if (action === "UPDATE") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  if (action === "CREATE" || action === "PAYMENT") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  return {
    ...base,
    background: "#eff6ff",
    color: "#1d4ed8",
    borderColor: "#bfdbfe",
  };
}


const simpleSummaryWrapper = {
  background: "white",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "16px",
};

const simpleSummaryTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "16px",
  flexWrap: "wrap",
  paddingBottom: "14px",
  borderBottom: "1px solid #e5e7eb",
};

const simpleSummaryTitle = {
  margin: 0,
  fontSize: "22px",
  color: "#111827",
};

const simpleSummaryHelp = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontSize: "13px",
};

const simpleSummaryControls = {
  display: "flex",
  alignItems: "flex-end",
  gap: "8px",
  flexWrap: "wrap",
};

const simpleSummaryControlsMobile = {
  ...simpleSummaryControls,
  width: "100%",
};

const simplePrimaryButton = {
  background: "#111827",
  color: "white",
  border: "1px solid #111827",
  borderRadius: "6px",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: "700",
};

const simpleSecondaryButton = {
  background: "white",
  color: "#111827",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: "700",
};

const simpleSummaryEmpty = {
  padding: "18px 0 4px",
  color: "#6b7280",
};

const simpleTextReport = {
  marginTop: "16px",
  color: "#111827",
  fontSize: "14px",
  lineHeight: "1.55",
};

const simpleReportHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  paddingBottom: "10px",
};

const simpleReportSection = {
  borderTop: "1px solid #d1d5db",
  padding: "12px 0",
};

const simpleReportLines = {
  marginTop: "8px",
  display: "grid",
  gap: "4px",
  maxWidth: "560px",
};

const simpleReportLine = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  padding: "2px 0",
};

const simpleActivityList = {
  marginTop: "8px",
  display: "grid",
  gap: "10px",
};

const simpleActivityItem = {
  paddingBottom: "9px",
  borderBottom: "1px solid #f3f4f6",
};

const simpleMutedText = {
  color: "#6b7280",
  fontSize: "12px",
};

const simpleNoItems = {
  marginTop: "8px",
  color: "#6b7280",
};

const dailySummaryCard = {
  background: "white",
  border: "1px solid #dbe3ee",
  borderRadius: "22px",
  padding: "20px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
};

const mobileDailySummaryCard = {
  ...dailySummaryCard,
  borderRadius: "18px",
  padding: "14px",
};

const dailySummaryHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
};

const dailySummaryEyebrow = {
  color: "#1d4ed8",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const dailySummaryTitle = {
  margin: "5px 0 0",
  color: "#0f172a",
  fontSize: "23px",
};

const dailySummaryDescription = {
  margin: "7px 0 0",
  color: "#64748b",
  lineHeight: "1.5",
  maxWidth: "730px",
  fontSize: "13px",
};

const dailySummaryControls = {
  display: "flex",
  alignItems: "end",
  gap: "8px",
  flexWrap: "wrap",
};

const mobileDailySummaryControls = {
  ...dailySummaryControls,
  width: "100%",
  alignItems: "stretch",
};

const dailyDateField = {
  display: "grid",
  gap: "5px",
};

const dailyDateLabel = {
  color: "#475569",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const dailyDateInput = {
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  padding: "10px 11px",
  background: "white",
  color: "#0f172a",
  fontWeight: "800",
};

const dailyTodayButton = {
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  padding: "10px 12px",
  background: "white",
  color: "#334155",
  fontWeight: "900",
  cursor: "pointer",
};

const dailyLoadButton = {
  border: "none",
  borderRadius: "10px",
  padding: "11px 14px",
  background: "#0A1A2F",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const dailyPrintButton = {
  border: "none",
  borderRadius: "10px",
  padding: "11px 14px",
  background: "#166534",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const disabledDailyButton = {
  opacity: 0.45,
  cursor: "not-allowed",
};

const dailySummaryError = {
  marginTop: "14px",
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#991b1b",
  borderRadius: "12px",
  padding: "11px 12px",
  fontWeight: "800",
};

const dailySummaryEmpty = {
  marginTop: "16px",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  borderRadius: "14px",
  padding: "20px",
  color: "#64748b",
  textAlign: "center",
};

const dailySummaryBody = {
  marginTop: "16px",
  display: "grid",
  gap: "16px",
};

const dailySummaryDateBanner = {
  background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
  color: "white",
  borderRadius: "16px",
  padding: "15px 17px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const dailySummaryDateLabel = {
  display: "block",
  color: "#bfdbfe",
  fontSize: "10px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
};

const dailySummaryDateValue = {
  display: "block",
  marginTop: "4px",
  fontSize: "18px",
};

const dailySummaryDateBannerRight = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  fontSize: "12px",
  fontWeight: "800",
  color: "#dbeafe",
};

const dailyMetricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "11px",
};

const mobileDailyMetricGrid = {
  ...dailyMetricGrid,
  gridTemplateColumns: "1fr 1fr",
};

const dailyMetricCard = {
  border: "1px solid #e2e8f0",
  borderRadius: "15px",
  padding: "13px",
  display: "flex",
  gap: "11px",
  alignItems: "flex-start",
  background: "#ffffff",
};

const dailyMetricDanger = {
  borderColor: "#fecaca",
  background: "#fff7f7",
};

const dailyMetricIcon = {
  width: "39px",
  height: "39px",
  borderRadius: "12px",
  background: "#eff6ff",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const dailyMetricTitle = {
  display: "block",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const dailyMetricValue = {
  display: "block",
  marginTop: "3px",
  color: "#0f172a",
  fontSize: "20px",
};

const dailyMetricDetail = {
  display: "block",
  marginTop: "3px",
  color: "#94a3b8",
  fontSize: "11px",
};

const dailySection = {
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "14px",
  background: "#ffffff",
};

const dailySectionHeader = {
  marginBottom: "11px",
};

const dailySectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "16px",
};

const dailySectionSubtitle = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "12px",
};

const dailyPaymentMethodGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "9px",
};

const dailyPaymentMethodCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "11px",
};

const dailyPaymentMethodName = {
  display: "block",
  color: "#475569",
  fontWeight: "900",
  fontSize: "12px",
};

const dailyPaymentMethodAmount = {
  display: "block",
  color: "#166534",
  marginTop: "4px",
  fontSize: "18px",
};

const dailyPaymentMethodCount = {
  display: "block",
  color: "#94a3b8",
  marginTop: "3px",
  fontSize: "11px",
};

const dailyTableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
};

const dailyTable = {
  width: "100%",
  minWidth: "800px",
  borderCollapse: "collapse",
};

const dailyTh = {
  textAlign: "left",
  background: "#f8fafc",
  color: "#475569",
  padding: "10px",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #e2e8f0",
};

const dailyTd = {
  padding: "10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  fontSize: "12px",
  verticalAlign: "top",
};

const dailyCellSubText = {
  display: "block",
  color: "#64748b",
  fontSize: "10px",
  marginTop: "2px",
};

const dailyInlineEmpty = {
  padding: "12px",
  border: "1px dashed #cbd5e1",
  borderRadius: "11px",
  color: "#64748b",
  background: "#f8fafc",
};

const dailyMobileList = {
  display: "grid",
  gap: "9px",
};

const dailyMobilePaymentCard = {
  border: "1px solid #e2e8f0",
  borderRadius: "13px",
  padding: "11px",
  background: "#f8fafc",
};

const dailyMobilePaymentTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
};

const dailySmallMuted = {
  display: "block",
  color: "#64748b",
  fontSize: "11px",
  marginTop: "3px",
};

const dailyPaymentAmount = {
  color: "#166534",
  whiteSpace: "nowrap",
};

const dailyMobilePaymentMeta = {
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
  marginTop: "9px",
  color: "#475569",
  fontSize: "11px",
  fontWeight: "800",
};

const dailyPaymentDescription = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: "11px",
  lineHeight: "1.4",
};

const dailyImportantList = {
  display: "grid",
  gap: "9px",
};

const dailyImportantItem = {
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "11px",
  background: "#f8fafc",
};

const dailyExceptionItem = {
  borderColor: "#fecaca",
  background: "#fff7f7",
};

const dailyImportantTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
  flexWrap: "wrap",
};

const dailyImportantBadges = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const dailyImportantTime = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "800",
};

const dailyImportantRecord = {
  display: "block",
  color: "#0f172a",
  marginTop: "8px",
};

const dailyImportantDescription = {
  margin: "5px 0 0",
  color: "#475569",
  fontSize: "12px",
  lineHeight: "1.45",
};

const dailyImportantUser = {
  display: "block",
  marginTop: "7px",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "800",
};

const userSummaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "10px",
};

const mobileUserSummaryGrid = {
  ...userSummaryGrid,
  gridTemplateColumns: "1fr",
};

const userSummaryCard = {
  border: "1px solid #e2e8f0",
  borderRadius: "13px",
  padding: "12px",
  background: "#f8fafc",
};

const userSummaryHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  alignItems: "flex-start",
};

const userSummaryName = {
  color: "#0f172a",
  fontSize: "12px",
  overflowWrap: "anywhere",
};

const userSummaryActivityCount = {
  color: "#64748b",
  fontSize: "10px",
  fontWeight: "800",
  whiteSpace: "nowrap",
};

const userSummaryMoney = {
  marginTop: "10px",
  padding: "9px 10px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  color: "#475569",
  fontSize: "11px",
};

const userSummaryFacts = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "7px",
  marginTop: "9px",
};

const summaryFact = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "9px",
  padding: "8px",
  display: "flex",
  justifyContent: "space-between",
  gap: "6px",
  color: "#64748b",
  fontSize: "10px",
};

const summaryDisclosure = { background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden" };
const disclosureHeading = { padding: "16px", cursor: "pointer", color: "#0f172a", fontWeight: 800 };
const disclosureHint = { display: "inline-block", marginLeft: "12px", color: "#64748b", fontWeight: 400, fontSize: "13px" };
const filterToolbar = { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "18px" };
const presetButtons = { display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" };
const filterNotice = { margin: "12px 0 0", color: "#92400e", fontSize: "13px" };
const scopeNote = { background: "#f8fafc", color: "#64748b", borderRadius: "10px", padding: "12px", fontSize: "12px", lineHeight: 1.6 };

const pageWrapper = {
  display: "grid",
  gap: "18px",
};

const mobilePageWrapper = {
  ...pageWrapper,
  gap: "12px",
};

const heroCard = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #1d4ed8 100%)",
  color: "white",
  borderRadius: "22px",
  padding: "26px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.22)",
};

const mobileHeroCard = {
  ...heroCard,
  borderRadius: "18px",
  padding: "18px",
  gap: "14px",
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
};

const mobilePageTitle = {
  ...pageTitle,
  fontSize: "25px",
};

const pageDescription = {
  margin: "8px 0 0",
  color: "#dbeafe",
  maxWidth: "760px",
  lineHeight: "1.5",
};

const mobilePageDescription = {
  ...pageDescription,
  fontSize: "14px",
};

const refreshButton = {
  background: "white",
  color: "#0A1A2F",
  border: "none",
  borderRadius: "999px",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: "900",
};

const mobileRefreshButton = {
  ...refreshButton,
  width: "100%",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "14px",
};

const mobileStatsGrid = {
  ...statsGrid,
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const statCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
};

const statIcon = {
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

const statTitle = {
  margin: 0,
  color: "#667085",
  fontSize: "13px",
  fontWeight: "800",
};

const statValue = {
  display: "block",
  marginTop: "3px",
  color: "#111827",
  fontSize: "24px",
};

const filterCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
};

const mobileFilterCard = {
  ...filterCard,
  padding: "12px",
};

const filterGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  alignItems: "end",
};

const mobileFilterGrid = {
  ...filterGrid,
  gridTemplateColumns: "1fr",
  gap: "12px",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "900",
  color: "#374151",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "11px",
  boxSizing: "border-box",
  fontSize: "14px",
  background: "white",
};

const filterButtonWrap = {
  display: "flex",
  alignItems: "end",
  gap: "10px",
};

const mobileFilterButtonWrap = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "8px",
};

const applyButton = {
  width: "100%",
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "12px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const resetButton = {
  width: "100%",
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: "999px",
  padding: "12px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "12px",
  padding: "13px",
  fontWeight: "900",
};

const tableCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "16px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
};

const mobileTableCard = {
  ...tableCard,
  borderRadius: "18px",
  padding: "12px",
};

const tableHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "14px",
  flexWrap: "wrap",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
};

const sectionDescription = {
  margin: "5px 0 0",
  color: "#667085",
  fontSize: "13px",
};

const tableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
};

const tableStyle = {
  width: "100%",
  minWidth: "1050px",
  borderCollapse: "collapse",
};

const thStyle = {
  background: "#f8fafc",
  color: "#475569",
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  fontSize: "13px",
  verticalAlign: "top",
};

const moduleBadge = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "11px",
  fontWeight: "900",
  width: "fit-content",
  whiteSpace: "nowrap",
};

const subText = {
  display: "block",
  color: "#667085",
  fontSize: "11px",
  marginTop: "3px",
};

const viewButton = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: "900",
};

const emptyState = {
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  padding: "24px",
  textAlign: "center",
  color: "#667085",
  fontWeight: "800",
};

const paginationWrapper = {
  marginTop: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "12px",
};

const mobilePaginationWrapper = {
  ...paginationWrapper,
  display: "grid",
  gridTemplateColumns: "1fr",
  marginTop: "12px",
};

const paginationInfo = {
  color: "#374151",
  fontSize: "13px",
  fontWeight: "800",
};

const paginationControlsRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const pageSizeLabel = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  color: "#475569",
  fontSize: "13px",
  fontWeight: "900",
};

const pageSizeSelect = {
  border: "1px solid #d1d5db",
  borderRadius: "999px",
  padding: "8px 10px",
  background: "white",
  fontWeight: "900",
};

const paginationButtons = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  flexWrap: "wrap",
};

const pageButton = {
  background: "white",
  color: "#0A1A2F",
  border: "1px solid #d1d5db",
  borderRadius: "999px",
  padding: "8px 11px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "12px",
};

const disabledPageButton = {
  opacity: 0.45,
  cursor: "not-allowed",
};

const pageNumberBadge = {
  background: "#0A1A2F",
  color: "white",
  borderRadius: "999px",
  padding: "8px 11px",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const mobileLogList = {
  display: "grid",
  gap: "12px",
};

const mobileLogCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "13px",
  background: "#ffffff",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.05)",
};

const mobileLogTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
};

const mobileLogDate = {
  color: "#111827",
  fontWeight: "900",
  fontSize: "13px",
};

const mobileLogUser = {
  color: "#667085",
  fontSize: "12px",
  marginTop: "4px",
  wordBreak: "break-word",
};

const mobileLogBadgeRow = {
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
  marginTop: "10px",
};

const mobileEntityType = {
  background: "#f1f5f9",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "11px",
  fontWeight: "900",
};

const mobileLogRecord = {
  display: "grid",
  gap: "3px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "10px",
  marginTop: "10px",
  color: "#111827",
};

const mobileLogDescription = {
  margin: "10px 0 0",
  color: "#374151",
  lineHeight: "1.45",
  overflowWrap: "anywhere",
};

const mobileViewButton = {
  width: "100%",
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: "900",
  marginTop: "12px",
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
  borderRadius: "20px",
  width: "760px",
  maxWidth: "96vw",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: "18px",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.28)",
};

const mobileModalBox = {
  ...modalBox,
  width: "100%",
  maxWidth: "100%",
  maxHeight: "92dvh",
  borderRadius: "18px",
  padding: "14px",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "12px",
  marginBottom: "14px",
};

const modalTitle = {
  margin: 0,
  color: "#111827",
};

const modalSubtitle = {
  margin: "5px 0 0",
  color: "#667085",
};

const closeButton = {
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  border: "none",
  background: "#e5e7eb",
  color: "#111827",
  cursor: "pointer",
  fontSize: "20px",
  fontWeight: "900",
  flexShrink: 0,
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "10px",
};

const mobileDetailGrid = {
  ...detailGrid,
  gridTemplateColumns: "1fr",
};

const detailItem = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "11px",
  display: "grid",
  gap: "4px",
  overflowWrap: "anywhere",
};

const detailSection = {
  marginTop: "14px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
};

const metadataBox = {
  background: "#0f172a",
  color: "#e5e7eb",
  padding: "12px",
  borderRadius: "10px",
  overflowX: "auto",
  fontSize: "12px",
  maxWidth: "100%",
};

export default ActivityLogs;
