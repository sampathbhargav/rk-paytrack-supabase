import { getBusinessInsightsData } from "../api/businessInsightsApi";
import { buildBusinessInsights, getMonthKey } from "../utils/businessInsights";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "../utils/moneyUtils";

const FILTER_OPTIONS = [
  { value: "all", label: "All Deals", shortLabel: "Whole" },
  { value: "inhouse", label: "In-house Deals", shortLabel: "In-house" },
  { value: "down_finance", label: "Down Finance Deals", shortLabel: "Down Finance" },
  {
    value: "semi_monthly",
    label: "Semi-Monthly Deals",
    shortLabel: "Semi-Monthly",
  },
  {
    value: "registration",
    label: "Registration Money Deals",
    shortLabel: "Registration",
  },
  { value: "defaulted", label: "Defaulted Deals", shortLabel: "Defaulted" },
  { value: "active", label: "Active Deals", shortLabel: "Active" },
  { value: "paid_off", label: "Paid Off Deals", shortLabel: "Paid Off" },
];

function BusinessInsights() {
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);
  const [paymentSkips, setPaymentSkips] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const today = new Date();
  const currentMonthKey = getMonthKey(today);
  const currentYear = today.getFullYear();

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      setIsLoading(true);
      setError("");

      const data = await getBusinessInsightsData();
      setDeals(data.deals);
      setPayments(data.payments);
      setPromises(data.promises);
      setPaymentSkips(data.paymentSkips);
    } catch (error) {
      setError(error.message || "Unable to load business insights.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add("print-business-insights-only");

    setTimeout(() => {
      window.print();
    }, 100);
  };

  useEffect(() => {
    const removePrintClass = () => {
      document.body.classList.remove("print-business-insights-only");
    };

    window.addEventListener("afterprint", removePrintClass);

    return () => {
      window.removeEventListener("afterprint", removePrintClass);
      removePrintClass();
    };
  }, []);

  const selectedFilterOption =
    FILTER_OPTIONS.find((option) => option.value === selectedFilter) ||
    FILTER_OPTIONS[0];

  const insights = useMemo(() => {
    return buildBusinessInsights({
      deals,
      payments,
      promises,
      paymentSkips,
      selectedFilter,
      currentMonthKey,
      currentYear,
    });
  }, [deals, payments, promises, paymentSkips, selectedFilter, currentMonthKey, currentYear]);

  if (isLoading) {
    return (
      <div style={pageWrapper}>
        <div style={loadingCard}>
          <div style={loadingIcon}>📊</div>
          <strong>Loading business insights...</strong>
          <p style={loadingText}>
            Please wait while RK PayTrack calculates owner-level financing data.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageWrapper}>
        <div style={errorBox}>{error}</div>
      </div>
    );
  }

  return (
    <div style={pageWrapper}>
      <style>{printStyles}</style>

      <BusinessInsightsPrintReport
        insights={insights}
        selectedFilterOption={selectedFilterOption}
        generatedAt={today}
      />

      <div className="business-insights-screen">
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Owner Dashboard</div>
          <h1 style={pageTitle}>Business Insights</h1>
          <p style={pageDescription}>
            Track principal before interest, total repayment amount after
            interest, interest added, amount paid, and remaining principal /
            interest balance for the selected deal group.
          </p>
        </div>

        <div style={heroActionRow} className="business-insights-actions">
          <button type="button" onClick={loadBusinessData} style={refreshButton}>
            Refresh Data
          </button>

          <button type="button" onClick={handlePrint} style={printButton}>
            🖨️ Print Plain Report
          </button>
        </div>
      </div>

      <UnknownDateNotice insights={insights} />

      <section style={filterCard}>
        <div>
          <div style={panelLabel}>Filter</div>
          <h2 style={panelTitle}>Select Deal Group</h2>
          <p style={filterDescription}>
            Choose All, In-house, Down Finance, Semi-Monthly, Registration,
            Defaulted, Active, or Paid Off to compare financing performance.
          </p>
        </div>

        <div style={filterButtonGrid}>
          {FILTER_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setSelectedFilter(option.value)}
              style={{
                ...filterButton,
                ...(selectedFilter === option.value ? activeFilterButton : {}),
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section style={scopeBanner}>
        <div>
          <span style={scopeLabel}>Currently Viewing</span>
          <strong style={scopeTitle}>{selectedFilterOption.label}</strong>
        </div>

        <div style={scopeStats}>
          <ScopeStat label="Deals" value={insights.dealCount} />
          <ScopeStat label="Customers" value={insights.customerCount} />
          <ScopeStat label="Missing Principal" value={insights.missingPrincipalCount} />
        </div>
      </section>

      <div style={summaryGrid}>
        <MetricCard
          label={`${selectedFilterOption.shortLabel} Principal`}
          value={formatMoney(insights.totalPrincipal)}
          helper="Amount before interest. Uses principal_amount. If blank, falls back to total amount and is counted as missing principal."
          tone="blue"
        />

        <MetricCard
          label={`${selectedFilterOption.shortLabel} With Interest Principal`}
          value={formatMoney(insights.totalWithInterest)}
          helper="Total repayment amount after interest. This comes from total_amount."
          tone="purple"
        />

        <MetricCard
          label={`${selectedFilterOption.shortLabel} Interest`}
          value={formatMoney(insights.totalInterest)}
          helper="Interest added: total amount after interest minus principal amount."
          tone="orange"
        />

        <MetricCard
          label={`${selectedFilterOption.shortLabel} Amount Paid`}
          value={formatMoney(insights.totalAmountPaid)}
          helper="Real customer money received. Referral credits are not counted as cash received."
          tone="green"
        />
      </div>

      <div style={summaryGrid}>
        <MetricCard
          label="Current Total Balance"
          value={formatMoney(insights.currentTotalBalance)}
          helper="Total remaining balance after all applied payments and credits."
          tone={insights.currentTotalBalance > 0 ? "red" : "green"}
        />

        <MetricCard
          label="Current Principal Balance"
          value={formatMoney(insights.currentPrincipalBalance)}
          helper="Estimated remaining principal portion of the current balance."
          tone="blue"
        />

        <MetricCard
          label="Current Interest Balance"
          value={formatMoney(insights.currentInterestBalance)}
          helper="Estimated remaining interest portion of the current balance."
          tone="orange"
        />

        <MetricCard
          label="Collection Rate"
          value={`${insights.collectionRate.toFixed(1)}%`}
          helper="Cash received compared to total amount after interest."
          tone={insights.collectionRate >= 75 ? "green" : "orange"}
        />
      </div>

      <div style={summaryGrid}>
        <MetricCard
          label="Principal This Month"
          value={formatMoney(insights.principalThisMonth)}
          helper="Principal amount from new deals started this month."
          tone="blue"
        />

        <MetricCard
          label="With Interest This Month"
          value={formatMoney(insights.withInterestThisMonth)}
          helper="Total repayment amount from new deals started this month."
          tone="purple"
        />

        <MetricCard
          label="Paid This Month"
          value={formatMoney(insights.paidThisMonth)}
          helper="Cash collected this month from the selected deal group."
          tone="green"
        />

        <MetricCard
          label="Interest This Month"
          value={formatMoney(insights.interestThisMonth)}
          helper="Interest added on new selected deals started this month."
          tone="orange"
        />
      </div>

      <div style={summaryGrid}>
        <MetricCard
          label="Principal This Year"
          value={formatMoney(insights.principalThisYear)}
          helper="Principal amount from new deals started this year."
          tone="blue"
        />

        <MetricCard
          label="With Interest This Year"
          value={formatMoney(insights.withInterestThisYear)}
          helper="Total repayment amount from new deals started this year."
          tone="purple"
        />

        <MetricCard
          label="Paid This Year"
          value={formatMoney(insights.paidThisYear)}
          helper="Cash collected this year from the selected deal group."
          tone="green"
        />

        <MetricCard
          label="Interest This Year"
          value={formatMoney(insights.interestThisYear)}
          helper="Interest added on new selected deals started this year."
          tone="orange"
        />
      </div>

      <div style={twoColumnGrid}>
        <section style={panelCard}>
          <div style={panelHeader}>
            <div>
              <div style={panelLabel}>Portfolio Health</div>
              <h2 style={panelTitle}>Status Overview</h2>
            </div>
          </div>

          <div style={statusGrid}>
            <StatusBox label="Active Deals" value={insights.activeDealsCount} />
            <StatusBox label="Paid Off Deals" value={insights.paidOffDealsCount} />
            <StatusBox label="Defaulted Deals" value={insights.defaultedDealsCount} />
            <StatusBox label="Repo Deals" value={insights.repoDealsCount} />
          </div>

          <div style={healthScoreBox}>
            <span style={healthLabel}>Business Health Score</span>
            <strong style={healthScore}>{insights.healthScore}/100</strong>
            <p style={healthText}>{insights.healthMessage}</p>
          </div>
        </section>

        <section style={panelCard}>
          <div style={panelHeader}>
            <div>
              <div style={panelLabel}>Risk Watch</div>
              <h2 style={panelTitle}>Collections Risk</h2>
            </div>
          </div>

          <div style={riskList}>
            <RiskRow
              label="Broken Promises"
              value={insights.brokenPromisesCount}
              severity={insights.brokenPromisesCount > 0 ? "high" : "low"}
            />

            <RiskRow
              label="Skipped Payments"
              value={insights.skippedPaymentCount}
              severity={insights.skippedPaymentCount > 0 ? "medium" : "low"}
            />

            <RiskRow
              label="Skipped Amount Moved"
              value={formatMoney(insights.totalSkippedAmount)}
              severity={insights.totalSkippedAmount > 0 ? "medium" : "low"}
            />

            <RiskRow
              label="Pending Promises"
              value={insights.pendingPromisesCount}
              severity={insights.pendingPromisesCount > 5 ? "medium" : "low"}
            />

            <RiskRow
              label="Referral Credits Applied"
              value={formatMoney(insights.referralCreditsApplied)}
              severity="neutral"
            />

            <RiskRow
              label="Open Balance Ratio"
              value={`${insights.openBalanceRatio.toFixed(1)}%`}
              severity={insights.openBalanceRatio > 50 ? "medium" : "low"}
            />
          </div>
        </section>
      </div>

      <div style={twoColumnGrid}>
        <section style={panelCard}>
          <div style={panelHeader}>
            <div>
              <div style={panelLabel}>Deal Type Breakdown</div>
              <h2 style={panelTitle}>Principal, Interest, Paid, Balance</h2>
            </div>
          </div>

          <div style={breakdownList}>
            {insights.dealTypeBreakdown.length > 0 ? (
              insights.dealTypeBreakdown.map((item) => (
                <BreakdownRow key={item.dealType} item={item} />
              ))
            ) : (
              <EmptyState message="No deal data available for this filter." />
            )}
          </div>
        </section>

        <section style={panelCard}>
          <div style={panelHeader}>
            <div>
              <div style={panelLabel}>Decision Notes</div>
              <h2 style={panelTitle}>Areas to Improve</h2>
            </div>
          </div>

          <div style={recommendationList}>
            {insights.recommendations.map((item) => (
              <RecommendationCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      </div>

      <section style={panelCard}>
        <div style={panelHeader}>
          <div>
            <div style={panelLabel}>Deal Detail Check</div>
            <h2 style={panelTitle}>Top Open Balances</h2>
          </div>
        </div>

        <div style={tableWrapper}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Deal</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Type</th>
                <th style={thRightStyle}>Principal</th>
                <th style={thRightStyle}>With Interest</th>
                <th style={thRightStyle}>Paid</th>
                <th style={thRightStyle}>Balance</th>
              </tr>
            </thead>

            <tbody>
              {insights.topOpenDeals.length > 0 ? (
                insights.topOpenDeals.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{item.dealTag}</td>
                    <td style={tdStyle}>{item.customerName}</td>
                    <td style={tdStyle}>{item.dealType}</td>
                    <td style={tdRightStyle}>{formatMoney(item.principal)}</td>
                    <td style={tdRightStyle}>{formatMoney(item.totalWithInterest)}</td>
                    <td style={tdRightStyle}>{formatMoney(item.amountPaid)}</td>
                    <td style={tdRightDanger}>{formatMoney(item.currentTotalBalance)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={tdStyle} colSpan={7}>
                    No open balances found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </div>
  );
}


function UnknownDateNotice({ insights }) {
  if (!insights.unknownDealDateCount && !insights.unknownPaymentDateCount) return null;
  return <aside style={{ padding: 16, marginBottom: 18, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12, color: "#78350f", lineHeight: 1.6 }}>
    <strong>Unknown dates in this deal group</strong>
    <p style={{ margin: "6px 0 0" }}>{insights.unknownDealDateCount} deal(s) have no valid start date. {insights.unknownPaymentDateCount} non-voided cash payment(s), totaling {formatMoney(insights.unknownPaymentDateAmount)}, have no valid payment date. These records remain in overall totals but are excluded from monthly and yearly figures. No dates or records have been changed.</p>
  </aside>;
}

function BusinessInsightsPrintReport({ insights, selectedFilterOption, generatedAt }) {
  const generatedLabel = generatedAt.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="business-insights-print">
      <h1>RK PayTrack Business Insights</h1>
      <p>Deal Group: {selectedFilterOption.label}</p>
      <p>Generated: {generatedLabel}</p>
      <UnknownDateNotice insights={insights} />

      <h2>Main Totals</h2>
      <table>
        <tbody>
          <PrintMetricRow label={`${selectedFilterOption.shortLabel} Principal`} value={formatMoney(insights.totalPrincipal)} />
          <PrintMetricRow label={`${selectedFilterOption.shortLabel} With Interest Principal`} value={formatMoney(insights.totalWithInterest)} />
          <PrintMetricRow label={`${selectedFilterOption.shortLabel} Interest`} value={formatMoney(insights.totalInterest)} />
          <PrintMetricRow label={`${selectedFilterOption.shortLabel} Amount Paid`} value={formatMoney(insights.totalAmountPaid)} />
          <PrintMetricRow label="Current Total Balance" value={formatMoney(insights.currentTotalBalance)} />
          <PrintMetricRow label="Current Principal Balance" value={formatMoney(insights.currentPrincipalBalance)} />
          <PrintMetricRow label="Current Interest Balance" value={formatMoney(insights.currentInterestBalance)} />
          <PrintMetricRow label="Collection Rate" value={`${insights.collectionRate.toFixed(1)}%`} />
        </tbody>
      </table>

      <h2>Month and Year Totals</h2>
      <table>
        <tbody>
          <PrintMetricRow label="Principal This Month" value={formatMoney(insights.principalThisMonth)} />
          <PrintMetricRow label="With Interest This Month" value={formatMoney(insights.withInterestThisMonth)} />
          <PrintMetricRow label="Paid This Month" value={formatMoney(insights.paidThisMonth)} />
          <PrintMetricRow label="Interest This Month" value={formatMoney(insights.interestThisMonth)} />
          <PrintMetricRow label="Principal This Year" value={formatMoney(insights.principalThisYear)} />
          <PrintMetricRow label="With Interest This Year" value={formatMoney(insights.withInterestThisYear)} />
          <PrintMetricRow label="Paid This Year" value={formatMoney(insights.paidThisYear)} />
          <PrintMetricRow label="Interest This Year" value={formatMoney(insights.interestThisYear)} />
        </tbody>
      </table>

      <h2>Status and Risk</h2>
      <table>
        <tbody>
          <PrintMetricRow label="Deals" value={insights.dealCount} />
          <PrintMetricRow label="Customers" value={insights.customerCount} />
          <PrintMetricRow label="Missing Principal" value={insights.missingPrincipalCount} />
          <PrintMetricRow label="Active Deals" value={insights.activeDealsCount} />
          <PrintMetricRow label="Paid Off Deals" value={insights.paidOffDealsCount} />
          <PrintMetricRow label="Defaulted Deals" value={insights.defaultedDealsCount} />
          <PrintMetricRow label="Repo Deals" value={insights.repoDealsCount} />
          <PrintMetricRow label="Pending Promises" value={insights.pendingPromisesCount} />
          <PrintMetricRow label="Broken Promises" value={insights.brokenPromisesCount} />
          <PrintMetricRow label="Skipped Payments" value={insights.skippedPaymentCount} />
          <PrintMetricRow label="Skipped Amount Moved" value={formatMoney(insights.totalSkippedAmount)} />
          <PrintMetricRow label="Referral Credits Applied" value={formatMoney(insights.referralCreditsApplied)} />
          <PrintMetricRow label="Open Balance Ratio" value={`${insights.openBalanceRatio.toFixed(1)}%`} />
          <PrintMetricRow label="Business Health Score" value={`${insights.healthScore}/100`} />
        </tbody>
      </table>

      <h2>Deal Type Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Deal Type</th>
            <th>Deals</th>
            <th>Principal</th>
            <th>With Interest</th>
            <th>Interest</th>
            <th>Paid</th>
            <th>Total Balance</th>
            <th>Principal Balance</th>
            <th>Interest Balance</th>
          </tr>
        </thead>
        <tbody>
          {insights.dealTypeBreakdown.length > 0 ? (
            insights.dealTypeBreakdown.map((item) => (
              <tr key={item.dealType}>
                <td>{item.dealType}</td>
                <td>{item.count}</td>
                <td>{formatMoney(item.principal)}</td>
                <td>{formatMoney(item.totalWithInterest)}</td>
                <td>{formatMoney(item.interestAmount)}</td>
                <td>{formatMoney(item.amountPaid)}</td>
                <td>{formatMoney(item.currentTotalBalance)}</td>
                <td>{formatMoney(item.currentPrincipalBalance)}</td>
                <td>{formatMoney(item.currentInterestBalance)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9}>No deal type data available.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Top Open Balances</h2>
      <table>
        <thead>
          <tr>
            <th>Deal</th>
            <th>Customer</th>
            <th>Type</th>
            <th>Principal</th>
            <th>With Interest</th>
            <th>Paid</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {insights.topOpenDeals.length > 0 ? (
            insights.topOpenDeals.map((item) => (
              <tr key={item.id}>
                <td>{item.dealTag}</td>
                <td>{item.customerName}</td>
                <td>{item.dealType}</td>
                <td>{formatMoney(item.principal)}</td>
                <td>{formatMoney(item.totalWithInterest)}</td>
                <td>{formatMoney(item.amountPaid)}</td>
                <td>{formatMoney(item.currentTotalBalance)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7}>No open balances found.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Areas to Improve</h2>
      <ol>
        {insights.recommendations.map((item) => (
          <li key={item.title}>
            <strong>{item.title} ({item.priority})</strong>: {item.message}
          </li>
        ))}
      </ol>
    </div>
  );
}

function PrintMetricRow({ label, value }) {
  return (
    <tr>
      <th>{label}</th>
      <td>{value}</td>
    </tr>
  );
}

function MetricCard({ label, value, helper, tone = "default" }) {
  return (
    <div style={{ ...metricCard, ...getMetricTone(tone) }}>
      <span style={metricLabel}>{label}</span>
      <strong style={metricValue}>{value}</strong>
      <p style={metricHelper}>{helper}</p>
    </div>
  );
}

function ScopeStat({ label, value }) {
  return (
    <div style={scopeStat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBox({ label, value }) {
  return (
    <div style={statusBox}>
      <span style={statusLabel}>{label}</span>
      <strong style={statusValue}>{value}</strong>
    </div>
  );
}

function RiskRow({ label, value, severity }) {
  return (
    <div style={riskRow}>
      <div>
        <span style={riskLabel}>{label}</span>
        <strong style={riskValue}>{value}</strong>
      </div>

      <span style={{ ...riskBadge, ...getRiskBadgeStyle(severity) }}>
        {severity}
      </span>
    </div>
  );
}

function BreakdownRow({ item }) {
  const collectionRate =
    item.totalWithInterest > 0
      ? Math.min((item.amountPaid / item.totalWithInterest) * 100, 100)
      : 0;

  return (
    <div style={breakdownRow}>
      <div style={breakdownHeader}>
        <div>
          <strong style={breakdownTitle}>{item.dealType}</strong>
          <span style={breakdownMeta}>
            {item.count} {item.count === 1 ? "deal" : "deals"} •{" "}
            {collectionRate.toFixed(1)}% collected
          </span>
        </div>

        <strong style={breakdownBalance}>
          {formatMoney(item.currentTotalBalance)} balance
        </strong>
      </div>

      <div style={breakdownMoneyGrid}>
        <SmallMoney label="Principal" value={item.principal} />
        <SmallMoney label="With Interest" value={item.totalWithInterest} />
        <SmallMoney label="Interest" value={item.interestAmount} />
        <SmallMoney label="Paid" value={item.amountPaid} />
        <SmallMoney label="Principal Balance" value={item.currentPrincipalBalance} />
        <SmallMoney label="Interest Balance" value={item.currentInterestBalance} />
      </div>
    </div>
  );
}

function SmallMoney({ label, value }) {
  return (
    <div style={smallMoneyBox}>
      <span style={smallMoneyLabel}>{label}</span>
      <strong style={smallMoneyValue}>{formatMoney(value)}</strong>
    </div>
  );
}

function RecommendationCard({ item }) {
  return (
    <div style={recommendationCard}>
      <div style={recommendationHeader}>
        <strong style={recommendationTitle}>{item.title}</strong>
        <span style={getPriorityStyle(item.priority)}>{item.priority}</span>
      </div>

      <p style={recommendationMessage}>{item.message}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return <div style={emptyState}>{message}</div>;
}

function getMetricTone(tone) {
  if (tone === "green") {
    return {
      borderColor: "#bbf7d0",
      background: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)",
    };
  }

  if (tone === "red") {
    return {
      borderColor: "#fecaca",
      background: "linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)",
    };
  }

  if (tone === "orange") {
    return {
      borderColor: "#fed7aa",
      background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)",
    };
  }

  if (tone === "blue") {
    return {
      borderColor: "#bfdbfe",
      background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
    };
  }

  if (tone === "purple") {
    return {
      borderColor: "#ddd6fe",
      background: "linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)",
    };
  }

  return {
    borderColor: "#e5e7eb",
    background: "#ffffff",
  };
}

function getRiskBadgeStyle(severity) {
  if (severity === "high") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }

  if (severity === "medium") {
    return {
      background: "#fffbeb",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  if (severity === "low") {
    return {
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  return {
    background: "#f3f4f6",
    color: "#374151",
    borderColor: "#d1d5db",
  };
}

function getPriorityStyle(priority) {
  const base = {
    borderRadius: "999px",
    padding: "5px 9px",
    fontSize: "11px",
    fontWeight: "900",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };

  if (priority === "High") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }

  if (priority === "Medium") {
    return {
      ...base,
      background: "#fffbeb",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  return {
    ...base,
    background: "#dcfce7",
    color: "#166534",
    borderColor: "#bbf7d0",
  };
}


const printStyles = `
  .business-insights-print {
    display: none;
  }

  @media print {
    @page {
      size: letter;
      margin: 0.5in;
    }

    body.print-business-insights-only {
      background: white !important;
      color: black !important;
      font-family: Arial, sans-serif !important;
    }

    body.print-business-insights-only * {
      visibility: hidden !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }

    body.print-business-insights-only .business-insights-print,
    body.print-business-insights-only .business-insights-print * {
      visibility: visible !important;
    }

    body.print-business-insights-only .business-insights-screen,
    body.print-business-insights-only .business-insights-screen * {
      display: none !important;
      visibility: hidden !important;
    }

    body.print-business-insights-only nav,
    body.print-business-insights-only aside,
    body.print-business-insights-only header,
    body.print-business-insights-only footer,
    body.print-business-insights-only button,
    body.print-business-insights-only .sidebar,
    body.print-business-insights-only [class*="sidebar"],
    body.print-business-insights-only [class*="Sidebar"] {
      display: none !important;
      visibility: hidden !important;
    }

    body.print-business-insights-only .business-insights-print {
      display: block !important;
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      color: black !important;
      font-size: 11px !important;
      line-height: 1.3 !important;
      z-index: 999999 !important;
    }

    body.print-business-insights-only .business-insights-print h1 {
      font-size: 18px !important;
      margin: 0 0 6px !important;
      padding: 0 !important;
      color: black !important;
    }

    body.print-business-insights-only .business-insights-print h2 {
      font-size: 13px !important;
      margin: 16px 0 6px !important;
      padding: 0 !important;
      color: black !important;
      border: none !important;
    }

    body.print-business-insights-only .business-insights-print p {
      margin: 2px 0 !important;
      color: black !important;
    }

    body.print-business-insights-only .business-insights-print table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 6px 0 12px !important;
      color: black !important;
      page-break-inside: auto !important;
    }

    body.print-business-insights-only .business-insights-print tr {
      page-break-inside: avoid !important;
      page-break-after: auto !important;
    }

    body.print-business-insights-only .business-insights-print th,
    body.print-business-insights-only .business-insights-print td {
      border: 1px solid #000 !important;
      padding: 4px 5px !important;
      text-align: left !important;
      vertical-align: top !important;
      background: white !important;
      color: black !important;
      font-weight: normal !important;
    }

    body.print-business-insights-only .business-insights-print th {
      font-weight: bold !important;
    }

    body.print-business-insights-only .business-insights-print ol {
      margin: 6px 0 0 18px !important;
      padding: 0 !important;
    }

    body.print-business-insights-only .business-insights-print li {
      margin-bottom: 5px !important;
    }
  }
`;

const pageWrapper = {
  display: "grid",
  gap: "18px",
  width: "100%",
};

const heroCard = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #102A4C 60%, #1d4ed8 100%)",
  color: "white",
  borderRadius: "24px",
  padding: "24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.22)",
};

const eyebrow = {
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "8px",
};

const pageTitle = {
  margin: 0,
  fontSize: "32px",
  lineHeight: "1.15",
};

const pageDescription = {
  margin: "8px 0 0",
  color: "#dbeafe",
  maxWidth: "900px",
  lineHeight: "1.5",
};

const refreshButton = {
  background: "white",
  color: "#0A1A2F",
  border: "none",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "900",
  cursor: "pointer",
};

const heroActionRow = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const printButton = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "900",
  cursor: "pointer",
};

const filterCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "18px",
  display: "grid",
  gap: "14px",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.07)",
};

const filterDescription = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "14px",
  lineHeight: "1.45",
};

const filterButtonGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const filterButton = {
  border: "1px solid #d1d5db",
  background: "#f8fafc",
  color: "#374151",
  borderRadius: "999px",
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "13px",
};

const activeFilterButton = {
  background: "#0A1A2F",
  color: "white",
  borderColor: "#0A1A2F",
};

const scopeBanner = {
  background: "#0f172a",
  color: "white",
  borderRadius: "20px",
  padding: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const scopeLabel = {
  display: "block",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "5px",
};

const scopeTitle = {
  fontSize: "24px",
};

const scopeStats = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const scopeStat = {
  display: "grid",
  gap: "3px",
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "14px",
  padding: "10px 12px",
  minWidth: "110px",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "14px",
};

const metricCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "18px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
};

const metricLabel = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "8px",
};

const metricValue = {
  display: "block",
  color: "#111827",
  fontSize: "26px",
  lineHeight: "1.15",
};

const metricHelper = {
  margin: "8px 0 0",
  color: "#667085",
  fontSize: "13px",
  lineHeight: "1.4",
};

const twoColumnGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "18px",
};

const panelCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "18px",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.07)",
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "14px",
};

const panelLabel = {
  color: "#2563eb",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "6px",
};

const panelTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
};

const statusGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
};

const statusBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
};

const statusLabel = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  fontWeight: "900",
  marginBottom: "6px",
};

const statusValue = {
  color: "#111827",
  fontSize: "24px",
};

const healthScoreBox = {
  marginTop: "14px",
  background: "#0A1A2F",
  color: "white",
  borderRadius: "18px",
  padding: "16px",
};

const healthLabel = {
  display: "block",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: "900",
  marginBottom: "6px",
};

const healthScore = {
  fontSize: "30px",
};

const healthText = {
  margin: "8px 0 0",
  color: "#dbeafe",
  lineHeight: "1.45",
};

const riskList = {
  display: "grid",
  gap: "10px",
};

const riskRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "12px",
};

const riskLabel = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  fontWeight: "900",
  marginBottom: "4px",
};

const riskValue = {
  color: "#111827",
  fontSize: "18px",
};

const riskBadge = {
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "11px",
  fontWeight: "900",
  border: "1px solid transparent",
  textTransform: "uppercase",
};

const breakdownList = {
  display: "grid",
  gap: "12px",
};

const breakdownRow = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  background: "#f8fafc",
};

const breakdownHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const breakdownTitle = {
  display: "block",
  color: "#111827",
  fontSize: "17px",
  marginBottom: "4px",
};

const breakdownMeta = {
  color: "#667085",
  fontSize: "13px",
  fontWeight: "800",
};

const breakdownBalance = {
  color: "#991b1b",
  fontSize: "15px",
};

const breakdownMoneyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "10px",
};

const smallMoneyBox = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "10px",
};

const smallMoneyLabel = {
  display: "block",
  color: "#667085",
  fontSize: "11px",
  fontWeight: "900",
  marginBottom: "4px",
};

const smallMoneyValue = {
  color: "#111827",
  fontSize: "14px",
};

const recommendationList = {
  display: "grid",
  gap: "12px",
};

const recommendationCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  background: "#f8fafc",
};

const recommendationHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const recommendationTitle = {
  color: "#111827",
  fontSize: "15px",
};

const recommendationMessage = {
  margin: "8px 0 0",
  color: "#475569",
  lineHeight: "1.45",
  fontSize: "13px",
};

const tableWrapper = {
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "900px",
};

const thStyle = {
  textAlign: "left",
  padding: "12px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  color: "#475569",
  fontSize: "12px",
  textTransform: "uppercase",
};

const thRightStyle = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  fontSize: "13px",
};

const tdRightStyle = {
  ...tdStyle,
  textAlign: "right",
  fontWeight: "800",
};

const tdRightDanger = {
  ...tdRightStyle,
  color: "#991b1b",
};

const emptyState = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  padding: "18px",
  color: "#667085",
  fontWeight: "800",
};

const loadingCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "28px",
  textAlign: "center",
  color: "#111827",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
};

const loadingIcon = {
  fontSize: "34px",
  marginBottom: "10px",
};

const loadingText = {
  margin: "6px 0 0",
  color: "#667085",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "13px",
  borderRadius: "12px",
  fontWeight: "bold",
};

export default BusinessInsights;
