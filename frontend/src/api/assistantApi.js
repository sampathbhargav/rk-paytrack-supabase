import { supabase } from "../supabaseClient";
import { getPromises } from "./promisesApi";

function money(value) {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

function monthString() {
  return new Date().toISOString().slice(0, 7);
}

function toDateString(date) {
    return date.toISOString().split("T")[0];
  }
  
  function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }
  
  function startOfWeek(date) {
    const copy = new Date(date);
    const day = copy.getDay(); // Sunday = 0
    copy.setDate(copy.getDate() - day);
    return copy;
  }
  
  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  
  function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
  
  function getDateRangeFromQuestion(question) {
    const q = normalize(question);
    const now = new Date();
  
    if (q.includes("yesterday")) {
      const yesterday = addDays(now, -1);
  
      return {
        label: "yesterday",
        start: toDateString(yesterday),
        end: toDateString(yesterday),
      };
    }
  
    if (q.includes("today")) {
      const today = toDateString(now);
  
      return {
        label: "today",
        start: today,
        end: today,
      };
    }
  
    if (q.includes("last week")) {
      const thisWeekStart = startOfWeek(now);
      const lastWeekStart = addDays(thisWeekStart, -7);
      const lastWeekEnd = addDays(thisWeekStart, -1);
  
      return {
        label: "last week",
        start: toDateString(lastWeekStart),
        end: toDateString(lastWeekEnd),
      };
    }
  
    if (q.includes("this week")) {
      const weekStart = startOfWeek(now);
  
      return {
        label: "this week",
        start: toDateString(weekStart),
        end: toDateString(now),
      };
    }
  
    if (q.includes("last month")) {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
      return {
        label: "last month",
        start: toDateString(startOfMonth(lastMonthDate)),
        end: toDateString(endOfMonth(lastMonthDate)),
      };
    }
  
    if (q.includes("this month")) {
      return {
        label: "this month",
        start: toDateString(startOfMonth(now)),
        end: toDateString(now),
      };
    }
  
    return null;
  }
  
  function isDateInRange(dateString, startDate, endDate) {
    if (!dateString) return false;
  
    return dateString >= startDate && dateString <= endDate;
  }

function formatDate(dateString) {
  if (!dateString) return "No date";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  return `${month}/${day}/${year}`;
}

function parseMoneyNumber(value) {
  return Number(String(value || "").replace(/[^0-9.-]/g, "")) || 0;
}

function calculateDealTotals(deal, payments) {
  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const totalAmount = Number(deal.total_amount || 0);

  const totalPaid = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  return {
    totalAmount,
    totalPaid,
    balance: Math.max(totalAmount - totalPaid, 0),
  };
}

function calculateMaintenanceTotals(job) {
  const totalAmount = Math.max(
    Number(job.labor_amount || 0) +
      Number(job.parts_amount || 0) +
      Number(job.tax_amount || 0) -
      Number(job.discount_amount || 0),
    0
  );

  const activePayments = (job.maintenance_payments || []).filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const totalPaid = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  return {
    totalAmount,
    totalPaid,
    balance: Math.max(totalAmount - totalPaid, 0),
  };
}

async function loadAssistantData() {
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("*");

  if (customersError) throw new Error(customersError.message);

  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("*, customers (*)");

  if (dealsError) throw new Error(dealsError.message);

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("*")
    .order("payment_date", { ascending: false });

  if (paymentsError) throw new Error(paymentsError.message);

  const promises = await getPromises();

  const { data: maintenanceJobs, error: maintenanceError } = await supabase
    .from("maintenance_jobs")
    .select(`
      *,
      maintenance_payments (*),
      maintenance_promises (*)
    `)
    .order("created_at", { ascending: false });

  if (maintenanceError) throw new Error(maintenanceError.message);

  return {
    customers: customers || [],
    deals: deals || [],
    payments: payments || [],
    promises: promises || [],
    maintenanceJobs: maintenanceJobs || [],
  };
}

function findBestCustomer(customers, deals, maintenanceJobs, question) {
    const q = normalize(question);
    const qDigits = onlyDigits(question);
  
    const stopWords = new Set([
      "what",
      "when",
      "where",
      "who",
      "why",
      "how",
      "is",
      "are",
      "was",
      "were",
      "the",
      "a",
      "an",
      "for",
      "of",
      "to",
      "from",
      "in",
      "on",
      "at",
      "by",
      "with",
      "balance",
      "balances",
      "payment",
      "payments",
      "paid",
      "pay",
      "owe",
      "owes",
      "due",
      "last",
      "show",
      "customer",
      "summary",
      "account",
      "maintenance",
      "invoice",
      "deal",
      "money",
      "collected",
      "collection",
    ]);
  
    const questionWords = q
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 3 && !stopWords.has(word));
  
    const exactCustomer = customers.find((customer) => {
      const name = normalize(customer.customer_name);
      const phone = onlyDigits(customer.phone);
      const email = normalize(customer.email);
  
      if (!name) return false;
  
      return (
        q.includes(name) ||
        (phone && phone.length >= 7 && qDigits.includes(phone)) ||
        (email && q.includes(email))
      );
    });
  
    if (exactCustomer) return exactCustomer;
  
    const scored = customers
      .map((customer) => {
        const name = normalize(customer.customer_name);
        const phone = onlyDigits(customer.phone);
        const email = normalize(customer.email);
  
        const nameParts = name
          .split(/\s+/)
          .map((part) => part.trim())
          .filter((part) => part.length >= 3 && !stopWords.has(part));
  
        let score = 0;
  
        if (name && q.includes(name)) score += 100;
  
        if (phone && phone.length >= 7 && qDigits.includes(phone)) {
          score += 90;
        }
  
        if (email && q.includes(email)) {
          score += 80;
        }
  
        questionWords.forEach((word) => {
          nameParts.forEach((part) => {
            if (part === word) score += 50;
            else if (part.startsWith(word)) score += 35;
            else if (word.startsWith(part)) score += 25;
            else if (part.includes(word)) score += 20;
          });
  
          if (email.includes(word)) score += 15;
        });
  
        return { customer, score };
      })
      .filter((item) => item.score >= 25)
      .sort((a, b) => b.score - a.score);
  
    if (scored.length > 0) return scored[0].customer;
  
    const dealCustomer = deals.find((deal) => {
      const name = normalize(deal.customers?.customer_name);
  
      if (!name) return false;
  
      const nameParts = name
        .split(/\s+/)
        .filter((part) => part.length >= 3 && !stopWords.has(part));
  
      return questionWords.some((word) =>
        nameParts.some(
          (part) =>
            part === word ||
            part.startsWith(word) ||
            word.startsWith(part) ||
            part.includes(word)
        )
      );
    });
  
    if (dealCustomer?.customers) return dealCustomer.customers;
  
    const maintenanceCustomer = maintenanceJobs.find((job) => {
      const name = normalize(job.customer_name);
      const phone = onlyDigits(job.phone);
  
      const nameParts = name
        .split(/\s+/)
        .filter((part) => part.length >= 3 && !stopWords.has(part));
  
      return (
        questionWords.some((word) =>
          nameParts.some(
            (part) =>
              part === word ||
              part.startsWith(word) ||
              word.startsWith(part) ||
              part.includes(word)
          )
        ) ||
        (phone && phone.length >= 7 && qDigits.includes(phone))
      );
    });
  
    if (maintenanceCustomer) {
      return {
        id: maintenanceCustomer.customer_id,
        customer_name: maintenanceCustomer.customer_name,
        phone: maintenanceCustomer.phone,
        email: maintenanceCustomer.email,
        address: maintenanceCustomer.address,
      };
    }
  
    return null;
  }

function getCustomerSuggestions(customers, question) {
    const q = normalize(question);
    const qDigits = onlyDigits(question);
  
    const stopWords = [
      "what",
      "is",
      "the",
      "balance",
      "owe",
      "owed",
      "due",
      "payment",
      "payments",
      "paid",
      "when",
      "did",
      "last",
      "show",
      "for",
      "customer",
      "summary",
      "account",
      "maintenance",
      "invoice",
      "deal",
      "who",
      "has",
      "have",
      "money",
      "the",
    "is",
    "for",
    "what",
    "balance",
    "payment",
    "paid",
    "owe",
    "due",
    ];
  
    const words = q
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 3 && !stopWords.includes(word));
  
    const suggestions = customers
      .map((customer) => {
        const name = normalize(customer.customer_name);
        const phone = onlyDigits(customer.phone);
        const email = normalize(customer.email);
  
        let score = 0;
  
        if (name && q.includes(name)) score += 100;
        if (phone && qDigits.includes(phone)) score += 90;
        if (email && q.includes(email)) score += 80;
  
        const nameParts = name.split(" ").filter(Boolean);
  
        words.forEach((word) => {
          if (name.includes(word)) score += 30;
          if (email.includes(word)) score += 20;
  
          nameParts.forEach((part) => {
            if (part.startsWith(word)) score += 25;
            if (word.startsWith(part) && part.length >= 3) score += 15;
          });
        });
  
        return {
          customer,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => ({
        type: "Customer",
        customer: item.customer.customer_name || "Unknown",
        phone: item.customer.phone || "—",
        email: item.customer.email || "—",
        address: item.customer.address || "—",
        customer_id: item.customer.id,
      }));
  
    return suggestions;
  }

  function customerNotFoundResponse(customers, question) {
    const suggestions = getCustomerSuggestions(customers, question);
  
    if (suggestions.length > 0) {
      return {
        answer: "I could not find an exact customer. Did you mean one of these?",
        rows: suggestions,
      };
    }
  
    return {
      answer:
        "I could not find that customer. Try searching by full name, phone number, deal tag, or invoice number.",
      rows: [],
    };
  }

function findDealByTag(deals, question) {
  const q = normalize(question);

  const dealTagMatch = q.match(/\b\d{3,8}\b/);
  const dealTag = dealTagMatch ? dealTagMatch[0] : null;

  if (!dealTag) return null;

  return deals.find((deal) => String(deal.deal_tag) === String(dealTag));
}

function findMaintenanceByInvoice(maintenanceJobs, question) {
  const q = normalize(question);

  const invoiceMatch = q.match(/mnt[-\s]?\d+/i);
  const invoiceText = invoiceMatch
    ? invoiceMatch[0].replace(/\s/g, "").toLowerCase()
    : "";

  if (!invoiceText) return null;

  return maintenanceJobs.find(
    (job) => normalize(job.invoice_no).replace(/\s/g, "") === invoiceText
  );
}

function getCustomerContext({
  customer,
  matchingDeal,
  matchingMaintenance,
  deals,
  payments,
  promises,
  maintenanceJobs,
}) {
  const targetCustomerId =
    customer?.id ||
    matchingDeal?.customer_id ||
    matchingDeal?.customers?.id ||
    matchingMaintenance?.customer_id;

  const targetCustomerName =
    customer?.customer_name ||
    matchingDeal?.customers?.customer_name ||
    matchingMaintenance?.customer_name ||
    "this customer";

  const customerDeals = deals.filter((deal) => {
    if (targetCustomerId) return deal.customer_id === targetCustomerId;

    return (
      normalize(deal.customers?.customer_name) === normalize(targetCustomerName)
    );
  });

  const customerDealIds = customerDeals.map((deal) => deal.id);

  const customerPayments = payments.filter((payment) =>
    customerDealIds.includes(payment.deal_id)
  );

  const customerPromises = promises.filter((promise) =>
    customerDealIds.includes(promise.deal_id)
  );

  const customerMaintenance = maintenanceJobs.filter((job) => {
    if (targetCustomerId) return job.customer_id === targetCustomerId;

    return normalize(job.customer_name) === normalize(targetCustomerName);
  });

  const dealSummaries = customerDeals.map((deal) => {
    const dealPayments = payments.filter(
      (payment) => payment.deal_id === deal.id
    );

    const dealPromises = promises.filter(
      (promise) => promise.deal_id === deal.id
    );

    return {
      deal,
      totals: calculateDealTotals(deal, dealPayments),
      payments: dealPayments,
      promises: dealPromises,
    };
  });

  const maintenanceSummaries = customerMaintenance.map((job) => ({
    job,
    totals: calculateMaintenanceTotals(job),
  }));

  const totalDealBalance = dealSummaries.reduce(
    (sum, item) => sum + Number(item.totals.balance || 0),
    0
  );

  const totalMaintenanceBalance = maintenanceSummaries.reduce(
    (sum, item) => sum + Number(item.totals.balance || 0),
    0
  );

  const totalBalance = totalDealBalance + totalMaintenanceBalance;

  return {
    targetCustomerId,
    targetCustomerName,
    customerDeals,
    customerPayments,
    customerPromises,
    customerMaintenance,
    dealSummaries,
    maintenanceSummaries,
    totalDealBalance,
    totalMaintenanceBalance,
    totalBalance,
  };
}

function buildCustomerSummaryRows(context) {
  return [
    ...context.dealSummaries.map(({ deal, totals }) => ({
      type: "Deal",
      reference: deal.deal_tag || deal.id,
      customer: deal.customers?.customer_name || context.targetCustomerName,
      status: deal.status || "Active",
      total: money(totals.totalAmount),
      paid: money(totals.totalPaid),
      balance: money(totals.balance),
      customer_id:
        deal.customer_id || deal.customers?.id || context.targetCustomerId,
      deal_id: deal.id,
    })),

    ...context.maintenanceSummaries.map(({ job, totals }) => ({
      type: "Maintenance",
      reference: job.invoice_no || job.id,
      customer: job.customer_name || context.targetCustomerName,
      status: job.work_status || "Open",
      total: money(totals.totalAmount),
      paid: money(totals.totalPaid),
      balance: money(totals.balance),
      customer_id: job.customer_id || context.targetCustomerId,
      maintenance_job_id: job.id,
    })),
  ];
}

function getOpenBalanceRows(deals, payments, maintenanceJobs) {
  const rows = [];

  deals.forEach((deal) => {
    const dealPayments = payments.filter(
      (payment) => payment.deal_id === deal.id
    );

    const totals = calculateDealTotals(deal, dealPayments);

    if (totals.balance > 0) {
      rows.push({
        type: "Deal",
        customer: deal.customers?.customer_name || "Unknown",
        reference: deal.deal_tag || deal.id,
        status: deal.status || "Active",
        total: money(totals.totalAmount),
        paid: money(totals.totalPaid),
        balance: money(totals.balance),
        customer_id: deal.customer_id || deal.customers?.id,
        deal_id: deal.id,
      });
    }
  });

  maintenanceJobs.forEach((job) => {
    const totals = calculateMaintenanceTotals(job);

    if (totals.balance > 0) {
      rows.push({
        type: "Maintenance",
        customer: job.customer_name || "Unknown",
        reference: job.invoice_no || job.id,
        status: job.work_status || "Open",
        total: money(totals.totalAmount),
        paid: money(totals.totalPaid),
        balance: money(totals.balance),
        customer_id: job.customer_id,
        maintenance_job_id: job.id,
      });
    }
  });

  rows.sort((a, b) => parseMoneyNumber(b.balance) - parseMoneyNumber(a.balance));

  return rows;
}

function getCollectionRowsByDateRange({
    deals,
    payments,
    maintenanceJobs,
    startDate,
    endDate,
  }) {
    const dealRows = payments
      .filter(
        (payment) =>
          payment.payment_status !== "Voided" &&
          isDateInRange(payment.payment_date, startDate, endDate)
      )
      .map((payment) => {
        const deal = deals.find((item) => item.id === payment.deal_id);
  
        return {
          type: "Deal",
          customer: deal?.customers?.customer_name || "Unknown",
          reference: deal?.deal_tag || "—",
          date: formatDate(payment.payment_date),
          amount: money(payment.amount_paid),
          method: payment.payment_method || "Other",
          customer_id: deal?.customer_id || deal?.customers?.id,
          deal_id: deal?.id,
        };
      });
  
    const maintenanceRows = maintenanceJobs.flatMap((job) =>
      (job.maintenance_payments || [])
        .filter(
          (payment) =>
            payment.payment_status !== "Voided" &&
            isDateInRange(payment.payment_date, startDate, endDate)
        )
        .map((payment) => ({
          type: "Maintenance",
          customer: job.customer_name || "Unknown",
          reference: job.invoice_no || "—",
          date: formatDate(payment.payment_date),
          amount: money(payment.amount_paid),
          method: payment.payment_method || "Other",
          customer_id: job.customer_id,
          maintenance_job_id: job.id,
        }))
    );
  
    return [...dealRows, ...maintenanceRows].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    );
  }

function getTopCustomerBalanceRows(customers, deals, payments, maintenanceJobs, limit = 10) {
    const rows = customers
      .map((customer) => {
        const customerDeals = deals.filter(
          (deal) => deal.customer_id === customer.id
        );
  
        const customerDealIds = customerDeals.map((deal) => deal.id);
  
        const customerPayments = payments.filter((payment) =>
          customerDealIds.includes(payment.deal_id)
        );
  
        const dealTotal = customerDeals.reduce(
          (sum, deal) => sum + Number(deal.total_amount || 0),
          0
        );
  
        const dealPaid = customerPayments
          .filter((payment) => payment.payment_status !== "Voided")
          .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);
  
        const dealBalance = Math.max(dealTotal - dealPaid, 0);
  
        const customerMaintenance = maintenanceJobs.filter(
          (job) => job.customer_id === customer.id
        );
  
        const maintenanceTotals = customerMaintenance.map((job) =>
          calculateMaintenanceTotals(job)
        );
  
        const maintenanceTotal = maintenanceTotals.reduce(
          (sum, totals) => sum + Number(totals.totalAmount || 0),
          0
        );
  
        const maintenancePaid = maintenanceTotals.reduce(
          (sum, totals) => sum + Number(totals.totalPaid || 0),
          0
        );
  
        const maintenanceBalance = maintenanceTotals.reduce(
          (sum, totals) => sum + Number(totals.balance || 0),
          0
        );
  
        const totalBalance = dealBalance + maintenanceBalance;
  
        return {
          customer: customer.customer_name || "Unknown",
          phone: customer.phone || "—",
          deals: customerDeals.length,
          maintenance: customerMaintenance.length,
          deal_balance: money(dealBalance),
          maintenance_balance: money(maintenanceBalance),
          total_balance: money(totalBalance),
          customer_id: customer.id,
          sort_balance: totalBalance,
        };
      })
      .filter((row) => row.sort_balance > 0)
      .sort((a, b) => b.sort_balance - a.sort_balance)
      .slice(0, limit)
      .map(({ sort_balance, ...row }) => row);
  
    return rows;
  }

  function getCustomersNotPaidThisMonthRows(
    customers,
    deals,
    payments,
    maintenanceJobs
  ) {
    const currentMonth = monthString();
  
    const rows = customers
      .map((customer) => {
        const customerDeals = deals.filter(
          (deal) => deal.customer_id === customer.id
        );
  
        const customerDealIds = customerDeals.map((deal) => deal.id);
  
        const customerDealPayments = payments.filter((payment) =>
          customerDealIds.includes(payment.deal_id)
        );
  
        const activeDealPayments = customerDealPayments.filter(
          (payment) => payment.payment_status !== "Voided"
        );
  
        const dealTotal = customerDeals.reduce(
          (sum, deal) => sum + Number(deal.total_amount || 0),
          0
        );
  
        const dealPaid = activeDealPayments.reduce(
          (sum, payment) => sum + Number(payment.amount_paid || 0),
          0
        );
  
        const dealBalance = Math.max(dealTotal - dealPaid, 0);
  
        const customerMaintenance = maintenanceJobs.filter(
          (job) => job.customer_id === customer.id
        );
  
        const maintenanceTotals = customerMaintenance.map((job) =>
          calculateMaintenanceTotals(job)
        );
  
        const maintenanceBalance = maintenanceTotals.reduce(
          (sum, totals) => sum + Number(totals.balance || 0),
          0
        );
  
        const totalBalance = dealBalance + maintenanceBalance;
  
        const maintenancePayments = customerMaintenance.flatMap((job) =>
          (job.maintenance_payments || []).map((payment) => ({
            ...payment,
            invoice_no: job.invoice_no,
            job_title: job.job_title,
          }))
        );
  
        const activeMaintenancePayments = maintenancePayments.filter(
          (payment) => payment.payment_status !== "Voided"
        );
  
        const paidThisMonth =
          activeDealPayments.some((payment) =>
            String(payment.payment_date || "").startsWith(currentMonth)
          ) ||
          activeMaintenancePayments.some((payment) =>
            String(payment.payment_date || "").startsWith(currentMonth)
          );
  
        const allPayments = [
          ...activeDealPayments.map((payment) => ({
            payment_date: payment.payment_date,
            amount_paid: payment.amount_paid,
            type: "Deal",
          })),
          ...activeMaintenancePayments.map((payment) => ({
            payment_date: payment.payment_date,
            amount_paid: payment.amount_paid,
            type: "Maintenance",
          })),
        ].sort((a, b) =>
          String(b.payment_date || "").localeCompare(String(a.payment_date || ""))
        );
  
        const lastPayment = allPayments[0];
  
        return {
          customer: customer.customer_name || "Unknown",
          phone: customer.phone || "—",
          deals: customerDeals.length,
          maintenance: customerMaintenance.length,
          deal_balance: money(dealBalance),
          maintenance_balance: money(maintenanceBalance),
          total_balance: money(totalBalance),
          last_payment_date: lastPayment
            ? formatDate(lastPayment.payment_date)
            : "No payment found",
          last_payment_amount: lastPayment
            ? money(lastPayment.amount_paid)
            : "—",
          last_payment_type: lastPayment?.type || "—",
          customer_id: customer.id,
          sort_balance: totalBalance,
          paid_this_month: paidThisMonth,
        };
      })
      .filter((row) => row.sort_balance > 0 && !row.paid_this_month)
      .sort((a, b) => b.sort_balance - a.sort_balance)
      .map(({ sort_balance, paid_this_month, ...row }) => row);
  
    return rows;
  }

function getLastDealPayment(context, payments, matchingDeal) {
  let targetPayments = [];

  if (matchingDeal) {
    targetPayments = payments.filter(
      (payment) => payment.deal_id === matchingDeal.id
    );
  } else {
    targetPayments = context.customerPayments;
  }

  const activePayments = targetPayments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  return [...activePayments].sort((a, b) =>
    String(b.payment_date || "").localeCompare(String(a.payment_date || ""))
  )[0];
}

function getLastMaintenancePayment(context, matchingMaintenance) {
  let jobs = context.customerMaintenance;

  if (matchingMaintenance) {
    jobs = [matchingMaintenance];
  }

  const maintenancePayments = jobs.flatMap((job) =>
    (job.maintenance_payments || []).map((payment) => ({
      ...payment,
      invoice_no: job.invoice_no,
      customer_name: job.customer_name,
      job_title: job.job_title,
      customer_id: job.customer_id,
      maintenance_job_id: job.id,
    }))
  );

  const activePayments = maintenancePayments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  return [...activePayments].sort((a, b) =>
    String(b.payment_date || "").localeCompare(String(a.payment_date || ""))
  )[0];
}

export async function askRkAssistant(question) {
  const q = normalize(question);

  if (!q) {
    return {
      answer:
        "Please ask a question about a customer, deal, payment, balance, maintenance, promises, or collections.",
      rows: [],
    };
  }

  const { customers, deals, payments, promises, maintenanceJobs } =
    await loadAssistantData();

  const customer = findBestCustomer(customers, deals, maintenanceJobs, question);
  const matchingDeal = findDealByTag(deals, question);
  const matchingMaintenance = findMaintenanceByInvoice(
    maintenanceJobs,
    question
  );

  const context = getCustomerContext({
    customer,
    matchingDeal,
    matchingMaintenance,
    deals,
    payments,
    promises,
    maintenanceJobs,
  });

  const hasTarget =
    Boolean(context.targetCustomerId) ||
    Boolean(matchingDeal) ||
    Boolean(matchingMaintenance);

  const today = todayString();
  const month = monthString();

  if (
    q.includes("help") ||
    q.includes("what can you do") ||
    q.includes("examples")
  ) {
    return {
      answer:
        "You can ask: What is Peter balance? When did Gary last pay? Show payments for deal 1721. Who owes money? Who is due today? Who is past due? Who has broken promises? How much collected today? What is invoice MNT-1001 balance?",
      rows: [],
    };
  }

  if (
    q.includes("who owes the most") ||
    q.includes("top balances") ||
    q.includes("top 10 balances") ||
    q.includes("biggest balances") ||
    q.includes("highest balances") ||
    q.includes("highest customer balances") ||
    q.includes("top customers by balance")
  ) {
    const topLimitMatch = q.match(/\btop\s+(\d{1,2})\b/);
    const limit = topLimitMatch ? Number(topLimitMatch[1]) : 10;
  
    const rows = getTopCustomerBalanceRows(
      customers,
      deals,
      payments,
      maintenanceJobs,
      limit
    );
  
    const totalOpenBalance = rows.reduce(
      (sum, row) => sum + parseMoneyNumber(row.total_balance),
      0
    );
  
    return {
      answer: `Here are the top ${rows.length} customer balance${
        rows.length === 1 ? "" : "s"
      }. Combined open balance for these customers is ${money(totalOpenBalance)}.`,
      rows,
    };
  }

  if (
    q.includes("not paid this month") ||
    q.includes("did not pay this month") ||
    q.includes("no payment this month") ||
    q.includes("has not paid this month") ||
    q.includes("haven't paid this month") ||
    q.includes("havent paid this month") ||
    q.includes("customers not paid this month") ||
    q.includes("customers with no payment this month")
  ) {
    const rows = getCustomersNotPaidThisMonthRows(
      customers,
      deals,
      payments,
      maintenanceJobs
    );
  
    const totalOpenBalance = rows.reduce(
      (sum, row) => sum + parseMoneyNumber(row.total_balance),
      0
    );
  
    return {
      answer: `I found ${rows.length} customer${
        rows.length === 1 ? "" : "s"
      } with open balance and no payment this month. Combined open balance is ${money(
        totalOpenBalance
      )}.`,
      rows,
    };
  }

  const dateRange = getDateRangeFromQuestion(question);

if (
  dateRange &&
  (
    q.includes("collected") ||
    q.includes("collection") ||
    q.includes("paid") ||
    q.includes("payments") ||
    q.includes("who paid")
  )
) {
  const rows = getCollectionRowsByDateRange({
    deals,
    payments,
    maintenanceJobs,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const totalCollected = rows.reduce(
    (sum, row) => sum + parseMoneyNumber(row.amount),
    0
  );

  return {
    answer: `Total collection for ${dateRange.label} was ${money(
      totalCollected
    )}. I found ${rows.length} payment record${
      rows.length === 1 ? "" : "s"
    } from ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}.`,
    rows,
  };
}

  if (
    q.includes("collected today") ||
    q.includes("collection today") ||
    q.includes("paid today")
  ) {
    const dealPaymentsToday = payments.filter(
      (payment) =>
        payment.payment_status !== "Voided" && payment.payment_date === today
    );

    const maintenancePaymentsToday = maintenanceJobs.flatMap((job) =>
      (job.maintenance_payments || [])
        .filter(
          (payment) =>
            payment.payment_status !== "Voided" &&
            payment.payment_date === today
        )
        .map((payment) => ({
          ...payment,
          invoice_no: job.invoice_no,
          customer_name: job.customer_name,
          source: "Maintenance",
          customer_id: job.customer_id,
          maintenance_job_id: job.id,
        }))
    );

    const dealRows = dealPaymentsToday.map((payment) => {
      const deal = deals.find((item) => item.id === payment.deal_id);

      return {
        type: "Deal",
        customer: deal?.customers?.customer_name || "Unknown",
        reference: deal?.deal_tag || "—",
        date: formatDate(payment.payment_date),
        amount: money(payment.amount_paid),
        method: payment.payment_method || "Other",
        customer_id: deal?.customer_id || deal?.customers?.id,
        deal_id: deal?.id,
      };
    });

    const maintenanceRows = maintenancePaymentsToday.map((payment) => ({
      type: "Maintenance",
      customer: payment.customer_name || "Unknown",
      reference: payment.invoice_no || "—",
      date: formatDate(payment.payment_date),
      amount: money(payment.amount_paid),
      method: payment.payment_method || "Other",
      customer_id: payment.customer_id,
      maintenance_job_id: payment.maintenance_job_id,
    }));

    const rows = [...dealRows, ...maintenanceRows];

    const totalCollected = rows.reduce(
      (sum, row) => sum + parseMoneyNumber(row.amount),
      0
    );

    return {
      answer: `Today’s total collection is ${money(
        totalCollected
      )}. I found ${rows.length} payment record${rows.length === 1 ? "" : "s"}.`,
      rows,
    };
  }

  if (
    q.includes("collected this month") ||
    q.includes("collection this month") ||
    q.includes("paid this month")
  ) {
    const dealPaymentsMonth = payments.filter(
      (payment) =>
        payment.payment_status !== "Voided" &&
        String(payment.payment_date || "").startsWith(month)
    );

    const maintenancePaymentsMonth = maintenanceJobs.flatMap((job) =>
      (job.maintenance_payments || [])
        .filter(
          (payment) =>
            payment.payment_status !== "Voided" &&
            String(payment.payment_date || "").startsWith(month)
        )
        .map((payment) => ({
          ...payment,
          invoice_no: job.invoice_no,
          customer_name: job.customer_name,
          source: "Maintenance",
          customer_id: job.customer_id,
          maintenance_job_id: job.id,
        }))
    );

    const rows = [
      ...dealPaymentsMonth.map((payment) => {
        const deal = deals.find((item) => item.id === payment.deal_id);

        return {
          type: "Deal",
          customer: deal?.customers?.customer_name || "Unknown",
          reference: deal?.deal_tag || "—",
          date: formatDate(payment.payment_date),
          amount: money(payment.amount_paid),
          method: payment.payment_method || "Other",
          customer_id: deal?.customer_id || deal?.customers?.id,
          deal_id: deal?.id,
        };
      }),
      ...maintenancePaymentsMonth.map((payment) => ({
        type: "Maintenance",
        customer: payment.customer_name || "Unknown",
        reference: payment.invoice_no || "—",
        date: formatDate(payment.payment_date),
        amount: money(payment.amount_paid),
        method: payment.payment_method || "Other",
        customer_id: payment.customer_id,
        maintenance_job_id: payment.maintenance_job_id,
      })),
    ];

    const totalCollected = rows.reduce(
      (sum, row) => sum + parseMoneyNumber(row.amount),
      0
    );

    return {
      answer: `This month’s total collection is ${money(
        totalCollected
      )}. I found ${rows.length} payment record${rows.length === 1 ? "" : "s"}.`,
      rows,
    };
  }

  if (
    q.includes("who owes") ||
    q.includes("open balance") ||
    q.includes("all balances") ||
    q === "balances" ||
    q.includes("show balances")
  ) {
    const rows = getOpenBalanceRows(deals, payments, maintenanceJobs);

    return {
      answer: `I found ${rows.length} open balance record${
        rows.length === 1 ? "" : "s"
      }.`,
      rows,
    };
  }

  if (q.includes("due today") || q.includes("who is due")) {
    const dealRows = deals
      .map((deal) => {
        const dealPayments = payments.filter(
          (payment) => payment.deal_id === deal.id
        );

        const totals = calculateDealTotals(deal, dealPayments);

        return {
          deal,
          totals,
        };
      })
      .filter(
        ({ deal, totals }) =>
          totals.balance > 0 && Number(deal.due_day) === new Date().getDate()
      )
      .map(({ deal, totals }) => ({
        type: "Deal",
        customer: deal.customers?.customer_name || "Unknown",
        reference: deal.deal_tag || "—",
        due: `Day ${deal.due_day}`,
        balance: money(totals.balance),
        customer_id: deal.customer_id || deal.customers?.id,
        deal_id: deal.id,
      }));

    const maintenanceRows = maintenanceJobs
      .map((job) => ({
        job,
        totals: calculateMaintenanceTotals(job),
      }))
      .filter(({ job, totals }) => totals.balance > 0 && job.due_date === today)
      .map(({ job, totals }) => ({
        type: "Maintenance",
        customer: job.customer_name || "Unknown",
        reference: job.invoice_no || "—",
        due: formatDate(job.due_date),
        balance: money(totals.balance),
        customer_id: job.customer_id,
        maintenance_job_id: job.id,
      }));

    const rows = [...dealRows, ...maintenanceRows];

    return {
      answer: `I found ${rows.length} due today record${
        rows.length === 1 ? "" : "s"
      }.`,
      rows,
    };
  }

  if (q.includes("past due") || q.includes("overdue")) {
    const rows = [];

    maintenanceJobs.forEach((job) => {
      const totals = calculateMaintenanceTotals(job);

      if (totals.balance > 0 && job.due_date && job.due_date < today) {
        rows.push({
          type: "Maintenance",
          customer: job.customer_name || "Unknown",
          reference: job.invoice_no || "—",
          due_date: formatDate(job.due_date),
          balance: money(totals.balance),
          status: job.work_status || "Open",
          customer_id: job.customer_id,
          maintenance_job_id: job.id,
        });
      }
    });

    promises.forEach((promise) => {
      if (
        promise.promise_status !== "Paid" &&
        promise.promise_status !== "Cancelled" &&
        promise.promise_status !== "Rescheduled" &&
        promise.promised_date &&
        promise.promised_date < today
      ) {
        const deal = deals.find((item) => item.id === promise.deal_id);

        rows.push({
          type: "Deal Promise",
          customer: deal?.customers?.customer_name || "Unknown",
          reference: deal?.deal_tag || "—",
          due_date: formatDate(promise.promised_date),
          balance: money(promise.remaining_amount),
          status: promise.promise_status || "Pending",
          customer_id: deal?.customer_id || deal?.customers?.id,
          deal_id: deal?.id,
        });
      }
    });

    maintenanceJobs.forEach((job) => {
      (job.maintenance_promises || []).forEach((promise) => {
        if (
          promise.promise_status !== "Paid" &&
          promise.promise_status !== "Cancelled" &&
          promise.promise_status !== "Rescheduled" &&
          promise.promised_date &&
          promise.promised_date < today
        ) {
          rows.push({
            type: "Maintenance Promise",
            customer: job.customer_name || "Unknown",
            reference: job.invoice_no || "—",
            due_date: formatDate(promise.promised_date),
            balance: money(promise.promised_amount),
            status: promise.promise_status || "Pending",
            customer_id: job.customer_id,
            maintenance_job_id: job.id,
          });
        }
      });
    });

    return {
      answer: `I found ${rows.length} past due record${
        rows.length === 1 ? "" : "s"
      }.`,
      rows,
    };
  }

  if (q.includes("broken promise") || q.includes("broken promises")) {
    const rows = [];

    promises.forEach((promise) => {
      if (promise.promise_status === "Broken") {
        const deal = deals.find((item) => item.id === promise.deal_id);

        rows.push({
          type: "Deal Promise",
          customer: deal?.customers?.customer_name || "Unknown",
          reference: deal?.deal_tag || "—",
          promised_date: formatDate(promise.promised_date),
          amount: money(promise.remaining_amount),
          status: promise.promise_status,
          customer_id: deal?.customer_id || deal?.customers?.id,
          deal_id: deal?.id,
        });
      }
    });

    maintenanceJobs.forEach((job) => {
      (job.maintenance_promises || []).forEach((promise) => {
        if (promise.promise_status === "Broken") {
          rows.push({
            type: "Maintenance Promise",
            customer: job.customer_name || "Unknown",
            reference: job.invoice_no || "—",
            promised_date: formatDate(promise.promised_date),
            amount: money(promise.promised_amount),
            status: promise.promise_status,
            customer_id: job.customer_id,
            maintenance_job_id: job.id,
          });
        }
      });
    });

    return {
      answer: `I found ${rows.length} broken promise record${
        rows.length === 1 ? "" : "s"
      }.`,
      rows,
    };
  }

  if (
    q.includes("summary") ||
    q.includes("customer summary") ||
    q.includes("account summary")
  ) {
    if (!hasTarget) {
      return customerNotFoundResponse(customers, question);
    }

    const rows = buildCustomerSummaryRows(context);

    return {
      answer: `${context.targetCustomerName}'s total customer balance is ${money(
        context.totalBalance
      )}. Deal balance: ${money(
        context.totalDealBalance
      )}. Maintenance balance: ${money(context.totalMaintenanceBalance)}.`,
      rows,
    };
  }

  if (
    q.includes("last maintenance payment") ||
    q.includes("maintenance last paid")
  ) {
    if (!hasTarget) {
      return {
        answer:
          "Please include a customer name or invoice number. Example: Last maintenance payment for Peter.",
        rows: [],
      };
    }

    const lastPayment = getLastMaintenancePayment(context, matchingMaintenance);

    if (!lastPayment) {
      return {
        answer: `I could not find maintenance payment history for ${context.targetCustomerName}.`,
        rows: [],
      };
    }

    return {
      answer: `${context.targetCustomerName}'s last maintenance payment was ${money(
        lastPayment.amount_paid
      )} on ${formatDate(lastPayment.payment_date)}.`,
      rows: [
        {
          customer: lastPayment.customer_name || context.targetCustomerName,
          invoice: lastPayment.invoice_no || "—",
          work: lastPayment.job_title || "—",
          payment_date: formatDate(lastPayment.payment_date),
          amount_paid: money(lastPayment.amount_paid),
          method: lastPayment.payment_method || "Other",
          status: lastPayment.payment_status || "Paid",
          customer_id: lastPayment.customer_id,
          maintenance_job_id: lastPayment.maintenance_job_id,
        },
      ],
    };
  }

  if (
    q.includes("last payment") ||
    q.includes("last paid") ||
    q.includes("when did")
  ) {
    if (!hasTarget) {
      return customerNotFoundResponse(customers, question);
    }

    const lastDealPayment = getLastDealPayment(context, payments, matchingDeal);
    const lastMaintenancePayment = getLastMaintenancePayment(
      context,
      matchingMaintenance
    );

    const allLastPayments = [];

    if (lastDealPayment) {
      const deal = deals.find((item) => item.id === lastDealPayment.deal_id);

      allLastPayments.push({
        type: "Deal",
        reference: deal?.deal_tag || "—",
        customer: deal?.customers?.customer_name || context.targetCustomerName,
        payment_date: lastDealPayment.payment_date,
        amount_paid: lastDealPayment.amount_paid,
        method: lastDealPayment.payment_method || "Other",
        status: lastDealPayment.payment_status || "Paid",
        customer_id: deal?.customer_id || deal?.customers?.id,
        deal_id: deal?.id,
      });
    }

    if (lastMaintenancePayment) {
      allLastPayments.push({
        type: "Maintenance",
        reference: lastMaintenancePayment.invoice_no || "—",
        customer:
          lastMaintenancePayment.customer_name || context.targetCustomerName,
        payment_date: lastMaintenancePayment.payment_date,
        amount_paid: lastMaintenancePayment.amount_paid,
        method: lastMaintenancePayment.payment_method || "Other",
        status: lastMaintenancePayment.payment_status || "Paid",
        customer_id: lastMaintenancePayment.customer_id,
        maintenance_job_id: lastMaintenancePayment.maintenance_job_id,
      });
    }

    const latest = allLastPayments.sort((a, b) =>
      String(b.payment_date || "").localeCompare(String(a.payment_date || ""))
    )[0];

    if (!latest) {
      return {
        answer: `I could not find payment history for ${context.targetCustomerName}.`,
        rows: [],
      };
    }

    return {
      answer: `${context.targetCustomerName}'s last payment was ${money(
        latest.amount_paid
      )} on ${formatDate(latest.payment_date)} for ${latest.type}.`,
      rows: [
        {
          type: latest.type,
          reference: latest.reference,
          customer: latest.customer,
          payment_date: formatDate(latest.payment_date),
          amount_paid: money(latest.amount_paid),
          method: latest.method,
          status: latest.status,
          customer_id: latest.customer_id,
          deal_id: latest.deal_id,
          maintenance_job_id: latest.maintenance_job_id,
        },
      ],
    };
  }

  if (q.includes("payment") || q.includes("paid")) {
    if (!hasTarget) {
        return customerNotFoundResponse(customers, question);
    }

    const dealPaymentRows = context.customerPayments
      .filter((payment) => payment.payment_status !== "Voided")
      .map((payment) => {
        const deal = deals.find((item) => item.id === payment.deal_id);

        return {
          type: "Deal",
          reference: deal?.deal_tag || "—",
          customer: deal?.customers?.customer_name || context.targetCustomerName,
          payment_date: formatDate(payment.payment_date),
          amount_paid: money(payment.amount_paid),
          method: payment.payment_method || "Other",
          status: payment.payment_status || "Paid",
          due_date: formatDate(payment.due_date),
          customer_id: deal?.customer_id || deal?.customers?.id,
          deal_id: deal?.id,
        };
      });

    const maintenancePaymentRows = context.customerMaintenance.flatMap((job) =>
      (job.maintenance_payments || [])
        .filter((payment) => payment.payment_status !== "Voided")
        .map((payment) => ({
          type: "Maintenance",
          reference: job.invoice_no || "—",
          customer: job.customer_name || context.targetCustomerName,
          payment_date: formatDate(payment.payment_date),
          amount_paid: money(payment.amount_paid),
          method: payment.payment_method || "Other",
          status: payment.payment_status || "Paid",
          due_date: formatDate(job.due_date),
          customer_id: job.customer_id,
          maintenance_job_id: job.id,
        }))
    );

    const rows = [...dealPaymentRows, ...maintenancePaymentRows].sort((a, b) =>
      String(b.payment_date || "").localeCompare(String(a.payment_date || ""))
    );

    return {
      answer: `I found ${rows.length} payment record${
        rows.length === 1 ? "" : "s"
      } for ${context.targetCustomerName}.`,
      rows,
    };
  }

  if (q.includes("maintenance") || q.includes("invoice")) {
    if (!hasTarget) {
      return customerNotFoundResponse(customers, question);
    }

    const targetJobs = matchingMaintenance
      ? [matchingMaintenance]
      : context.customerMaintenance;

    const rows = targetJobs.map((job) => {
      const totals = calculateMaintenanceTotals(job);

      return {
        invoice: job.invoice_no || "—",
        customer: job.customer_name || context.targetCustomerName,
        work: job.job_title || "—",
        status: job.work_status || "Open",
        total: money(totals.totalAmount),
        paid: money(totals.totalPaid),
        balance: money(totals.balance),
        due_date: formatDate(job.due_date),
        customer_id: job.customer_id,
        maintenance_job_id: job.id,
      };
    });

    const balance = rows.reduce(
      (sum, row) => sum + parseMoneyNumber(row.balance),
      0
    );

    return {
      answer: `${context.targetCustomerName}'s maintenance balance is ${money(
        balance
      )}.`,
      rows,
    };
  }

  if (q.includes("balance") || q.includes("owe") || q.includes("due")) {
    if (!hasTarget) {
      return customerNotFoundResponse(customers, question);
    }

    if (matchingDeal) {
      const dealPayments = payments.filter(
        (payment) => payment.deal_id === matchingDeal.id
      );

      const totals = calculateDealTotals(matchingDeal, dealPayments);

      return {
        answer: `Deal ${matchingDeal.deal_tag} balance is ${money(
          totals.balance
        )}. Total: ${money(totals.totalAmount)}. Paid: ${money(
          totals.totalPaid
        )}.`,
        rows: [
          {
            type: "Deal",
            reference: matchingDeal.deal_tag || matchingDeal.id,
            customer:
              matchingDeal.customers?.customer_name ||
              context.targetCustomerName,
            total: money(totals.totalAmount),
            paid: money(totals.totalPaid),
            balance: money(totals.balance),
            customer_id: matchingDeal.customer_id || matchingDeal.customers?.id,
            deal_id: matchingDeal.id,
          },
        ],
      };
    }

    if (matchingMaintenance) {
      const totals = calculateMaintenanceTotals(matchingMaintenance);

      return {
        answer: `Invoice ${matchingMaintenance.invoice_no} balance is ${money(
          totals.balance
        )}. Total: ${money(totals.totalAmount)}. Paid: ${money(
          totals.totalPaid
        )}.`,
        rows: [
          {
            type: "Maintenance",
            reference: matchingMaintenance.invoice_no || matchingMaintenance.id,
            customer:
              matchingMaintenance.customer_name || context.targetCustomerName,
            total: money(totals.totalAmount),
            paid: money(totals.totalPaid),
            balance: money(totals.balance),
            customer_id: matchingMaintenance.customer_id,
            maintenance_job_id: matchingMaintenance.id,
          },
        ],
      };
    }

    const rows = buildCustomerSummaryRows(context);

    return {
      answer: `${context.targetCustomerName}'s total balance is ${money(
        context.totalBalance
      )}. Deal balance: ${money(
        context.totalDealBalance
      )}. Maintenance balance: ${money(context.totalMaintenanceBalance)}.`,
      rows,
    };
  }

  return {
    answer:
      "I could not understand that question yet. Try asking about a balance, payment, due today, past due, broken promises, collections, customer summary, deal tag, or maintenance invoice.",
    rows: [],
  };
}