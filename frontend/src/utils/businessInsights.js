import { getActivePromises } from "./promiseUtils.js";
import { formatMoney } from "./moneyUtils.js";

export function buildBusinessInsights({
  deals,
  payments,
  promises,
  paymentSkips,
  selectedFilter,
  currentMonthKey,
  currentYear,
}) {
  const activePayments = payments.filter((payment) => !isVoidedPayment(payment));
  const filteredDeals = deals.filter((deal) => shouldIncludeDeal(deal, selectedFilter));
  const filteredDealIds = new Set(filteredDeals.map((deal) => String(deal.id)));

  const filteredPayments = activePayments.filter((payment) =>
    filteredDealIds.has(String(payment.deal_id))
  );

  const filteredCashPayments = filteredPayments.filter(
    (payment) => !isReferralCredit(payment)
  );

  const filteredReferralCreditPayments = filteredPayments.filter((payment) =>
    isReferralCredit(payment)
  );

  const activePaymentSkips = (paymentSkips || []).filter((skip) =>
    isActivePaymentSkip(skip)
  );

  const filteredPaymentSkips = activePaymentSkips.filter((skip) =>
    filteredDealIds.has(String(skip.deal_id || skip.dealId))
  );

  const skippedPaymentCount = filteredPaymentSkips.length;

  const totalSkippedAmount = roundMoney(
    filteredPaymentSkips.reduce(
      (sum, skip) => sum + Number(skip.amount_due || skip.amountDue || 0),
      0
    )
  );

  const dealSummaries = filteredDeals.map((deal) =>
    buildDealFinancialSummary(deal, activePayments)
  );

  const totalPrincipal = sumMoney(dealSummaries, "principal");
  const totalWithInterest = sumMoney(dealSummaries, "totalWithInterest");
  const totalInterest = sumMoney(dealSummaries, "interestAmount");
  const totalAmountPaid = roundMoney(
    filteredCashPayments.reduce(
      (sum, payment) => sum + Number(payment.amount_paid || 0),
      0
    )
  );

  const referralCreditsApplied = roundMoney(
    filteredReferralCreditPayments.reduce(
      (sum, payment) => sum + Number(payment.amount_paid || 0),
      0
    )
  );

  const totalAppliedToBalance = sumMoney(dealSummaries, "amountApplied");
  const currentTotalBalance = sumMoney(dealSummaries, "currentTotalBalance");
  const currentPrincipalBalance = sumMoney(dealSummaries, "currentPrincipalBalance");
  const currentInterestBalance = roundMoney(
    Math.max(currentTotalBalance - currentPrincipalBalance, 0)
  );

  const principalThisMonth = sumFilteredDealMoney(
    dealSummaries,
    currentMonthKey,
    null,
    "principal"
  );

  const withInterestThisMonth = sumFilteredDealMoney(
    dealSummaries,
    currentMonthKey,
    null,
    "totalWithInterest"
  );

  const interestThisMonth = sumFilteredDealMoney(
    dealSummaries,
    currentMonthKey,
    null,
    "interestAmount"
  );

  const principalThisYear = sumFilteredDealMoney(
    dealSummaries,
    null,
    currentYear,
    "principal"
  );

  const withInterestThisYear = sumFilteredDealMoney(
    dealSummaries,
    null,
    currentYear,
    "totalWithInterest"
  );

  const interestThisYear = sumFilteredDealMoney(
    dealSummaries,
    null,
    currentYear,
    "interestAmount"
  );

  const paidThisMonth = roundMoney(
    filteredCashPayments
      .filter((payment) => getMonthKey(getPaymentDate(payment)) === currentMonthKey)
      .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0)
  );

  const paidThisYear = roundMoney(
    filteredCashPayments
      .filter((payment) => getPaymentDate(payment)?.getFullYear() === currentYear)
      .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0)
  );

  const collectionRate =
    totalWithInterest > 0
      ? Math.min((totalAmountPaid / totalWithInterest) * 100, 100)
      : 0;

  const openBalanceRatio =
    totalWithInterest > 0
      ? Math.min((currentTotalBalance / totalWithInterest) * 100, 100)
      : 0;

  const activeDealsCount = filteredDeals.filter(
    (deal) => normalizeStatus(deal.status) === "active"
  ).length;

  const paidOffDealsCount = filteredDeals.filter((deal) =>
    isPaidOffStatus(deal.status)
  ).length;

  const defaultedDealsCount = filteredDeals.filter(
    (deal) => normalizeStatus(deal.status) === "defaulted"
  ).length;

  const repoDealsCount = filteredDeals.filter(
    (deal) => normalizeStatus(deal.status) === "repo"
  ).length;

  const customerCount = new Set(
    filteredDeals.map((deal) => String(deal.customer_id || ""))
  ).size;

  const missingPrincipalCount = filteredDeals.filter(
    (deal) => !hasRealPrincipalAmount(deal)
  ).length;

  const activePromises = getActivePromises(promises);

  const pendingPromisesCount = activePromises
    .filter((promise) => filteredDealIds.has(String(promise.deal_id)))
    .filter((promise) => isPendingPromise(promise)).length;

  const brokenPromisesCount = activePromises
    .filter((promise) => filteredDealIds.has(String(promise.deal_id)))
    .filter((promise) => isBrokenPromise(promise)).length;

  const healthScore = calculateHealthScore({
    collectionRate,
    defaultedDealsCount,
    repoDealsCount,
    brokenPromisesCount,
    skippedPaymentCount,
    openBalanceRatio,
    missingPrincipalCount,
  });

  const dealTypeBreakdown = buildDealTypeBreakdown(dealSummaries);
  const recommendations = buildRecommendations({
    selectedFilter,
    collectionRate,
    openBalanceRatio,
    currentTotalBalance,
    currentPrincipalBalance,
    currentInterestBalance,
    defaultedDealsCount,
    repoDealsCount,
    brokenPromisesCount,
    pendingPromisesCount,
    skippedPaymentCount,
    totalSkippedAmount,
    missingPrincipalCount,
    paidThisMonth,
    withInterestThisMonth,
  });

  const topOpenDeals = [...dealSummaries]
    .filter((item) => item.currentTotalBalance > 0)
    .sort((a, b) => b.currentTotalBalance - a.currentTotalBalance)
    .slice(0, 10);

  return {
    unknownDealDateCount: filteredDeals.filter(deal => !getDealDate(deal)).length,
    unknownPaymentDateCount: filteredCashPayments.filter(payment => !getPaymentDate(payment)).length,
    unknownPaymentDateAmount: roundMoney(filteredCashPayments.filter(payment => !getPaymentDate(payment)).reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0)),
    dealCount: filteredDeals.length,
    customerCount,
    totalPrincipal,
    totalWithInterest,
    totalInterest,
    totalAmountPaid,
    referralCreditsApplied,
    totalAppliedToBalance,
    currentTotalBalance,
    currentPrincipalBalance,
    currentInterestBalance,
    principalThisMonth,
    withInterestThisMonth,
    interestThisMonth,
    principalThisYear,
    withInterestThisYear,
    interestThisYear,
    paidThisMonth,
    paidThisYear,
    collectionRate,
    openBalanceRatio,
    activeDealsCount,
    paidOffDealsCount,
    defaultedDealsCount,
    repoDealsCount,
    missingPrincipalCount,
    pendingPromisesCount,
    brokenPromisesCount,
    skippedPaymentCount,
    totalSkippedAmount,
    healthScore,
    healthMessage: getHealthMessage(healthScore),
    dealTypeBreakdown,
    recommendations,
    topOpenDeals,
  };
}

function buildDealFinancialSummary(deal, activePayments) {
  const dealPayments = activePayments.filter(
    (payment) => String(payment.deal_id) === String(deal.id)
  );

  const cashPaid = roundMoney(
    dealPayments
      .filter((payment) => !isReferralCredit(payment))
      .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0)
  );

  const amountApplied = roundMoney(
    dealPayments.reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0)
  );

  const totalWithInterest = roundMoney(deal.total_amount);
  const principal = getPrincipalAmount(deal);
  const interestAmount = roundMoney(Math.max(totalWithInterest - principal, 0));
  const currentTotalBalance = roundMoney(
    Math.max(totalWithInterest - amountApplied, 0)
  );

  const principalRatio =
    totalWithInterest > 0 ? Math.min(principal / totalWithInterest, 1) : 1;

  const currentPrincipalBalance = roundMoney(
    Math.min(currentTotalBalance, currentTotalBalance * principalRatio)
  );

  const currentInterestBalance = roundMoney(
    Math.max(currentTotalBalance - currentPrincipalBalance, 0)
  );

  return {
    id: deal.id,
    dealTag: deal.deal_tag || "-",
    customerName: deal.customers?.customer_name || "Customer",
    dealType: deal.deal_type || "Unknown",
    status: deal.status || "Active",
    dealDate: getDealDate(deal),
    principal,
    totalWithInterest,
    interestAmount,
    amountPaid: cashPaid,
    amountApplied,
    currentTotalBalance,
    currentPrincipalBalance,
    currentInterestBalance,
    hasPrincipalAmount: hasRealPrincipalAmount(deal),
  };
}

function buildDealTypeBreakdown(dealSummaries) {
  const groups = {};

  dealSummaries.forEach((item) => {
    const dealType = item.dealType || "Unknown";

    if (!groups[dealType]) {
      groups[dealType] = {
        dealType,
        count: 0,
        principal: 0,
        totalWithInterest: 0,
        interestAmount: 0,
        amountPaid: 0,
        currentTotalBalance: 0,
        currentPrincipalBalance: 0,
        currentInterestBalance: 0,
      };
    }

    groups[dealType].count += 1;
    groups[dealType].principal += item.principal;
    groups[dealType].totalWithInterest += item.totalWithInterest;
    groups[dealType].interestAmount += item.interestAmount;
    groups[dealType].amountPaid += item.amountPaid;
    groups[dealType].currentTotalBalance += item.currentTotalBalance;
    groups[dealType].currentPrincipalBalance += item.currentPrincipalBalance;
    groups[dealType].currentInterestBalance += item.currentInterestBalance;
  });

  return Object.values(groups)
    .map((item) => ({
      ...item,
      principal: roundMoney(item.principal),
      totalWithInterest: roundMoney(item.totalWithInterest),
      interestAmount: roundMoney(item.interestAmount),
      amountPaid: roundMoney(item.amountPaid),
      currentTotalBalance: roundMoney(item.currentTotalBalance),
      currentPrincipalBalance: roundMoney(item.currentPrincipalBalance),
      currentInterestBalance: roundMoney(item.currentInterestBalance),
    }))
    .sort((a, b) => b.currentTotalBalance - a.currentTotalBalance);
}

function buildRecommendations({
  selectedFilter,
  collectionRate,
  openBalanceRatio,
  currentTotalBalance,
  currentPrincipalBalance,
  currentInterestBalance,
  defaultedDealsCount,
  repoDealsCount,
  brokenPromisesCount,
  pendingPromisesCount,
  skippedPaymentCount,
  totalSkippedAmount,
  missingPrincipalCount,
  paidThisMonth,
  withInterestThisMonth,
}) {
  const recommendations = [];

  if (missingPrincipalCount > 0) {
    recommendations.push({
      title: "Add missing principal amounts",
      message: `${missingPrincipalCount} deal(s) are missing principal_amount. Those deals fall back to total_amount, so interest may look lower than reality until you update them.`,
      priority: "High",
    });
  }

  if (paidThisMonth < withInterestThisMonth && withInterestThisMonth > 0) {
    recommendations.push({
      title: "This month collections are behind new financing",
      message:
        "The selected group added more repayment balance this month than it collected. Review down payment rules and daily follow-up calls.",
      priority: "High",
    });
  }

  if (collectionRate < 60 && currentTotalBalance > 0) {
    recommendations.push({
      title: "Collection rate needs attention",
      message:
        "Cash received is low compared to total repayment amount. Consider stronger customer screening, larger down payments, or shorter terms.",
      priority: "High",
    });
  }

  if (defaultedDealsCount > 0 || repoDealsCount > 0) {
    recommendations.push({
      title: "Default and repo risk needs action",
      message:
        "Review defaulted/repo accounts separately and decide whether to collect, settle, repossess, or close them.",
      priority: "High",
    });
  }

  if (brokenPromisesCount > 0) {
    recommendations.push({
      title: "Broken promises need daily follow-up",
      message:
        "Broken promises usually show early collection risk. Call or message these customers first every morning.",
      priority: "Medium",
    });
  }

  if (pendingPromisesCount > 10) {
    recommendations.push({
      title: "Too many open promises",
      message:
        "Many open promises can become hard to manage. Review the promise list and confirm upcoming payment commitments.",
      priority: "Medium",
    });
  }

  if (skippedPaymentCount > 0) {
    recommendations.push({
      title: "Skipped payments need follow-up",
      message: `${skippedPaymentCount} skipped payment(s) moved ${formatMoney(
        totalSkippedAmount
      )} to later due dates. Review these accounts so skipped balances do not become forgotten back-end collections.`,
      priority: "Medium",
    });
  }

  if (openBalanceRatio > 50) {
    recommendations.push({
      title: "High open balance",
      message: `The current total balance is ${formatMoney(
        currentTotalBalance
      )}. Principal balance is ${formatMoney(
        currentPrincipalBalance
      )}, and interest balance is ${formatMoney(
        currentInterestBalance
      )}. Protect cash flow by tightening approval and collection discipline.`,
      priority: "Medium",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Business is moving in the right direction",
      message:
        "Collections and balances look healthy for this filter. Keep reviewing principal, interest, and balance weekly.",
      priority: "Good",
    });
  }

  return recommendations;
}

function calculateHealthScore({
  collectionRate,
  defaultedDealsCount,
  repoDealsCount,
  brokenPromisesCount,
  skippedPaymentCount,
  openBalanceRatio,
  missingPrincipalCount,
}) {
  let score = 100;

  if (collectionRate < 75) score -= 12;
  if (collectionRate < 60) score -= 15;
  if (openBalanceRatio > 50) score -= 10;
  if (openBalanceRatio > 70) score -= 10;
  if (defaultedDealsCount > 0) score -= Math.min(defaultedDealsCount * 5, 20);
  if (repoDealsCount > 0) score -= Math.min(repoDealsCount * 7, 21);
  if (brokenPromisesCount > 0) score -= Math.min(brokenPromisesCount * 3, 18);
  if (skippedPaymentCount > 0) score -= Math.min(skippedPaymentCount * 2, 12);
  if (missingPrincipalCount > 0) score -= Math.min(missingPrincipalCount * 2, 10);

  return Math.max(Math.min(Math.round(score), 100), 0);
}

function getHealthMessage(score) {
  if (score >= 85) {
    return "Strong position. Collections, open balance, and risk look healthy.";
  }

  if (score >= 70) {
    return "Good position, but continue watching collections and open balances.";
  }

  if (score >= 50) {
    return "Needs attention. Focus on collections, promises, principal balance, and defaulted accounts.";
  }

  return "High risk. Owner should review financing approvals and collection process immediately.";
}

function shouldIncludeDeal(deal, selectedFilter) {
  if (selectedFilter === "all") {
    return !isCashDeal(deal);
  }

  if (selectedFilter === "inhouse") {
    return isInHouseDeal(deal);
  }

  if (selectedFilter === "down_finance") {
    return isDownFinanceDeal(deal);
  }

  if (selectedFilter === "registration") {
    return isRegistrationMoneyDeal(deal);
  }

  if (selectedFilter === "semi_monthly") {
    return isSemiMonthlyDeal(deal);
  }

  if (selectedFilter === "defaulted") {
    return normalizeStatus(deal.status) === "defaulted";
  }

  if (selectedFilter === "active") {
    return normalizeStatus(deal.status) === "active" && !isCashDeal(deal);
  }

  if (selectedFilter === "paid_off") {
    return isPaidOffStatus(deal.status) && !isCashDeal(deal);
  }

  return !isCashDeal(deal);
}

function getPrincipalAmount(deal) {
  const principalAmount = Number(deal?.principal_amount || 0);

  if (principalAmount > 0) {
    return roundMoney(principalAmount);
  }

  return roundMoney(deal?.total_amount || 0);
}

function hasRealPrincipalAmount(deal) {
  return Number(deal?.principal_amount || 0) > 0;
}

function sumMoney(items, key) {
  return roundMoney(items.reduce((sum, item) => sum + Number(item[key] || 0), 0));
}

function sumFilteredDealMoney(dealSummaries, monthKey, year, key) {
  return roundMoney(
    dealSummaries
      .filter((item) => {
        if (monthKey) return getMonthKey(item.dealDate) === monthKey;
        if (year) return item.dealDate?.getFullYear() === year;
        return true;
      })
      .reduce((sum, item) => sum + Number(item[key] || 0), 0)
  );
}

function getDealDate(deal) {
  return parseInsightDate(deal.start_date);
}

function getPaymentDate(payment) {
  return parseInsightDate(payment.payment_date);
}

// Business dates have no timezone. Reject impossible dates instead of rolling
// them forward, and never substitute record-creation time or today's date.
export function parseInsightDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1000) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function getMonthKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeStatus(status) {
  return String(status || "Active").trim().toLowerCase();
}

function isPaidOffStatus(status) {
  const normalizedStatus = normalizeStatus(status);

  return (
    normalizedStatus === "paid off" ||
    normalizedStatus === "paidoff" ||
    normalizedStatus === "paid"
  );
}

function normalizeDealType(dealType) {
  return String(dealType || "").trim().toLowerCase();
}

function isInHouseDeal(deal) {
  const dealType = normalizeDealType(deal?.deal_type);

  return dealType.includes("in-house") || dealType.includes("inhouse");
}

function isDownFinanceDeal(deal) {
  return normalizeDealType(deal?.deal_type).includes("down");
}

function isRegistrationMoneyDeal(deal) {
  return normalizeDealType(deal?.deal_type).includes("registration");
}

function getPaymentFrequency(deal) {
  return String(deal?.payment_frequency || deal?.paymentFrequency || "Monthly")
    .trim()
    .toLowerCase();
}

function isSemiMonthlyDeal(deal) {
  return getPaymentFrequency(deal) === "semi-monthly";
}

function isCashDeal(deal) {
  return normalizeDealType(deal?.deal_type) === "cash";
}

function isActivePaymentSkip(skip) {
  const status = String(skip?.skip_status || skip?.skipStatus || "Active")
    .trim()
    .toLowerCase();

  return status !== "cancelled" && status !== "canceled";
}

function isReferralCredit(payment) {
  return (
    String(payment?.payment_method || "").trim().toLowerCase() ===
    "referral credit"
  );
}

function isVoidedPayment(payment) {
  const status = String(payment?.payment_status || "").trim().toLowerCase();

  return status === "voided" || status === "void";
}

function isPendingPromise(promise) {
  const status = String(promise?.promise_status || "")
    .trim()
    .toLowerCase();

  return status === "pending" || status === "active";
}

function isBrokenPromise(promise) {
  const status = String(promise?.promise_status || "")
    .trim()
    .toLowerCase();

  return status === "broken" || status === "missed";
}

function toCents(value) {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) return 0;

  return Math.round(numberValue * 100);
}

function fromCents(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

function roundMoney(value) {
  return fromCents(toCents(value));
}

