function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function createDueDate(startDate, dueDay, monthOffset) {
  const start = new Date(`${startDate}T00:00:00`);

  const targetYear = start.getFullYear();
  const targetMonth = start.getMonth() + monthOffset;

  const calculatedDate = new Date(targetYear, targetMonth, 1);

  const year = calculatedDate.getFullYear();
  const month = calculatedDate.getMonth();

  const lastDay = getLastDayOfMonth(year, month);
  const safeDueDay = Math.min(Number(dueDay), lastDay);

  return new Date(year, month, safeDueDay);
}

function createBiweeklyDueDate(firstPaymentDate, installmentIndex) {
  const firstDate = new Date(`${firstPaymentDate}T00:00:00`);
  const dueDate = new Date(firstDate);

  dueDate.setDate(firstDate.getDate() + installmentIndex * 14);

  return dueDate;
}

function createSafeDate(year, monthIndex, dueDay) {
  const lastDay = getLastDayOfMonth(year, monthIndex);
  const safeDueDay = Math.min(Number(dueDay), lastDay);

  return new Date(year, monthIndex, safeDueDay);
}

function toCents(value) {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.round(numberValue * 100);
}

function fromCents(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

function normalizePaymentFrequency(deal) {
  if (deal?.deal_type === "Cash") return "Cash";

  if (deal?.deal_type === "Registration Money") {
    return "One-Time";
  }

  return deal?.payment_frequency || deal?.paymentFrequency || "Monthly";
}

function getPaymentAmount(deal) {
  return Number(deal?.monthly_payment || deal?.monthlyPayment || 0);
}

function isCashDeal(deal) {
  return deal?.deal_type === "Cash" || normalizePaymentFrequency(deal) === "Cash";
}

function isRegistrationMoneyDeal(deal) {
  return (
    deal?.deal_type === "Registration Money" ||
    normalizePaymentFrequency(deal) === "One-Time"
  );
}

function isBiweeklyDeal(deal) {
  return normalizePaymentFrequency(deal) === "Biweekly";
}

function isSemiMonthlyDeal(deal) {
  return normalizePaymentFrequency(deal) === "Semi-Monthly";
}

function isMonthlyDeal(deal) {
  return normalizePaymentFrequency(deal) === "Monthly";
}

function getFirstPaymentDate(deal) {
  return deal?.first_payment_date || deal?.firstPaymentDate || deal?.start_date || "";
}

function getSecondDueDay(deal) {
  return deal?.second_due_day || deal?.secondDueDay || "";
}

function getFirstDueDayForSemiMonthly(deal) {
  const firstPaymentDate = getFirstPaymentDate(deal);

  if (firstPaymentDate) {
    const firstDate = new Date(`${firstPaymentDate}T00:00:00`);

    if (!Number.isNaN(firstDate.getTime())) {
      return firstDate.getDate();
    }
  }

  return deal?.due_day || deal?.dueDay || "";
}

function isScheduledDealReady(deal) {
  if (!deal) return false;
  if (deal.status !== "Active") return false;
  if (isCashDeal(deal)) return false;

  const paymentAmount = getPaymentAmount(deal);

  if (paymentAmount <= 0) return false;

  if (isRegistrationMoneyDeal(deal)) {
    return Boolean(deal.start_date || deal.first_payment_date);
  }

  if (!deal.term || Number(deal.term) <= 0) return false;

  if (isBiweeklyDeal(deal)) {
    return Boolean(getFirstPaymentDate(deal));
  }

  if (isSemiMonthlyDeal(deal)) {
    return Boolean(getFirstPaymentDate(deal) && getSecondDueDay(deal));
  }

  if (isMonthlyDeal(deal)) {
    return Boolean(deal.start_date && deal.due_day);
  }

  return Boolean(deal.start_date && deal.due_day);
}

function getSemiMonthlyDueSchedule(deal, term, paymentAmount) {
  const firstPaymentDate = getFirstPaymentDate(deal);
  const secondDueDay = Number(getSecondDueDay(deal));
  const firstDueDay = Number(getFirstDueDayForSemiMonthly(deal));

  if (!firstPaymentDate || !firstDueDay || !secondDueDay) {
    return [];
  }

  if (secondDueDay < 1 || secondDueDay > 31) {
    return [];
  }

  const firstDate = new Date(`${firstPaymentDate}T00:00:00`);

  if (Number.isNaN(firstDate.getTime())) {
    return [];
  }

  let year = firstDate.getFullYear();
  let month = firstDate.getMonth();

  const dueDates = [];

  while (dueDates.length < term) {
    const firstMonthDate = createSafeDate(year, month, firstDueDay);
    const secondMonthDate = createSafeDate(year, month, secondDueDay);

    const monthDates = [firstMonthDate, secondMonthDate]
      .filter((date) => date >= firstDate)
      .sort((a, b) => a - b);

    monthDates.forEach((dueDate) => {
      if (dueDates.length < term) {
        dueDates.push({
          installmentNumber: dueDates.length + 1,
          dueDate: formatDateLocal(dueDate),
          amountDue: paymentAmount,
          paymentFrequency: "Semi-Monthly",
        });
      }
    });

    month += 1;

    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return dueDates;
}

function getBaseDealDueSchedule(deal) {
  if (!deal || isCashDeal(deal)) {
    return [];
  }

  const paymentAmount = getPaymentAmount(deal);

  if (paymentAmount <= 0) {
    return [];
  }

  if (isRegistrationMoneyDeal(deal)) {
    const oneTimeDate = deal.first_payment_date || deal.start_date;

    if (!oneTimeDate) {
      return [];
    }

    return [
      {
        installmentNumber: 1,
        dueDate: oneTimeDate,
        amountDue: paymentAmount,
        paymentFrequency: "One-Time",
      },
    ];
  }

  const term = Math.floor(Number(deal.term || 0));

  if (term <= 0) {
    return [];
  }

  if (isBiweeklyDeal(deal)) {
    const firstPaymentDate = getFirstPaymentDate(deal);

    if (!firstPaymentDate) {
      return [];
    }

    const dueDates = [];

    for (let i = 0; i < term; i++) {
      const dueDate = createBiweeklyDueDate(firstPaymentDate, i);

      dueDates.push({
        installmentNumber: i + 1,
        dueDate: formatDateLocal(dueDate),
        amountDue: paymentAmount,
        paymentFrequency: "Biweekly",
      });
    }

    return dueDates;
  }

  if (isSemiMonthlyDeal(deal)) {
    return getSemiMonthlyDueSchedule(deal, term, paymentAmount);
  }

  if (!deal.start_date || !deal.due_day) {
    return [];
  }

  const dueDates = [];

  for (let i = 1; i <= term; i++) {
    const dueDate = createDueDate(deal.start_date, deal.due_day, i);

    dueDates.push({
      installmentNumber: i,
      dueDate: formatDateLocal(dueDate),
      amountDue: paymentAmount,
      paymentFrequency: "Monthly",
    });
  }

  return dueDates;
}

function getActiveSkipsForDeal(deal, paymentSkips = []) {
  if (!deal?.id) return [];

  return (paymentSkips || [])
    .filter(
      (skip) =>
        String(skip.deal_id || skip.dealId) === String(deal.id) &&
        (skip.skip_status || skip.skipStatus || "Active") !== "Cancelled"
    )
    .sort((a, b) =>
      String(a.original_due_date || a.originalDueDate || "").localeCompare(
        String(b.original_due_date || b.originalDueDate || "")
      )
    );
}

function getSkipForInstallment(activeSkips, installment) {
  return activeSkips.find(
    (skip) =>
      String(skip.original_due_date || skip.originalDueDate) ===
        String(installment.dueDate) ||
      Number(skip.installment_no || skip.installmentNo) ===
        Number(installment.installmentNumber)
  );
}

function addMonths(date, monthsToAdd, preferredDay) {
  const year = date.getFullYear();
  const month = date.getMonth() + monthsToAdd;
  const target = new Date(year, month, 1);
  const lastDay = getLastDayOfMonth(target.getFullYear(), target.getMonth());

  target.setDate(Math.min(Number(preferredDay || date.getDate()), lastDay));

  return target;
}

function getNextSemiMonthlyDateAfter(deal, date) {
  const secondDueDay = Number(getSecondDueDay(deal));
  const firstDueDay = Number(getFirstDueDayForSemiMonthly(deal));

  if (!firstDueDay || !secondDueDay) {
    return addMonths(date, 1, date.getDate());
  }

  let year = date.getFullYear();
  let month = date.getMonth();

  for (let i = 0; i < 24; i++) {
    const candidates = [
      createSafeDate(year, month, firstDueDay),
      createSafeDate(year, month, secondDueDay),
    ].sort((a, b) => a - b);

    const nextDate = candidates.find((candidate) => candidate > date);

    if (nextDate) {
      return nextDate;
    }

    month += 1;

    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return addMonths(date, 1, date.getDate());
}

function getNextDueDateAfter(deal, date) {
  if (isBiweeklyDeal(deal)) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 14);
    return nextDate;
  }

  if (isSemiMonthlyDeal(deal)) {
    return getNextSemiMonthlyDateAfter(deal, date);
  }

  return addMonths(date, 1, deal?.due_day || date.getDate());
}

function applySkipsToSchedule(deal, baseSchedule, paymentSkips = []) {
  const activeSkips = getActiveSkipsForDeal(deal, paymentSkips);

  if (activeSkips.length === 0) {
    return baseSchedule;
  }

  const skippedSchedule = baseSchedule.map((installment) => {
    const skip = getSkipForInstallment(activeSkips, installment);

    if (!skip) {
      return installment;
    }

    return {
      ...installment,
      amountDue: Number(skip.amount_due || skip.amountDue || installment.amountDue || 0),
      isSkipped: true,
      skipId: skip.id,
      skipReason: skip.skip_reason || skip.skipReason || "",
      movedDueDate: skip.moved_due_date || skip.movedDueDate || "",
      paymentFrequency: installment.paymentFrequency || normalizePaymentFrequency(deal),
    };
  });

  let lastDueDate = baseSchedule.length
    ? new Date(`${baseSchedule[baseSchedule.length - 1].dueDate}T00:00:00`)
    : null;

  const movedInstallments = activeSkips.map((skip, index) => {
    let movedDueDate = skip.moved_due_date || skip.movedDueDate || "";

    if (!movedDueDate) {
      if (!lastDueDate || Number.isNaN(lastDueDate.getTime())) {
        lastDueDate = new Date(`${skip.original_due_date || skip.originalDueDate}T00:00:00`);
      }

      lastDueDate = getNextDueDateAfter(deal, lastDueDate);
      movedDueDate = formatDateLocal(lastDueDate);
    } else {
      lastDueDate = new Date(`${movedDueDate}T00:00:00`);
    }

    return {
      installmentNumber:
        Number(skip.moved_installment_no || skip.movedInstallmentNo) ||
        baseSchedule.length + index + 1,
      dueDate: movedDueDate,
      amountDue: Number(skip.amount_due || skip.amountDue || getPaymentAmount(deal)),
      paymentFrequency: normalizePaymentFrequency(deal),
      isMovedFromSkip: true,
      originalDueDate: skip.original_due_date || skip.originalDueDate,
      skipId: skip.id,
      skipReason: skip.skip_reason || skip.skipReason || "",
    };
  });

  return [...skippedSchedule, ...movedInstallments];
}

export function getDealDueSchedule(deal, paymentSkips = []) {
  const baseSchedule = getBaseDealDueSchedule(deal);

  return applySkipsToSchedule(deal, baseSchedule, paymentSkips);
}

function getPaymentsForDeal(deal, payments) {
  return payments.filter(
    (payment) =>
      String(payment.deal_id) === String(deal.id) &&
      payment.payment_status !== "Voided"
  );
}

function hasUsableDueDate(payment) {
  return Boolean(payment.due_date);
}

function getExactPaidCentsForDueDate(dealPayments, dueDate) {
  return dealPayments
    .filter((payment) => hasUsableDueDate(payment) && payment.due_date === dueDate)
    .reduce((sum, payment) => sum + toCents(payment.amount_paid), 0);
}

function getLegacyPaymentsWithoutDueDate(dealPayments) {
  return dealPayments.filter((payment) => !hasUsableDueDate(payment));
}

function applyLegacyPaymentsToSchedule(schedule, dealPayments) {
  let legacyPaidCents = getLegacyPaymentsWithoutDueDate(dealPayments).reduce(
    (sum, payment) => sum + toCents(payment.amount_paid),
    0
  );

  return schedule.map((installment) => {
    const amountDueCents = toCents(installment.amountDue);

    if (installment.isSkipped) {
      return {
        ...installment,
        amountDue: fromCents(amountDueCents),
        paidForDueDate: 0,
        remainingForDueDate: 0,
        status: "Skipped",
      };
    }

    const exactPaidCents = getExactPaidCentsForDueDate(
      dealPayments,
      installment.dueDate
    );

    const remainingAfterExactCents = Math.max(
      amountDueCents - exactPaidCents,
      0
    );

    const legacyAppliedCents = Math.min(
      legacyPaidCents,
      remainingAfterExactCents
    );

    legacyPaidCents = Math.max(legacyPaidCents - legacyAppliedCents, 0);

    const paidForDueDateCents = Math.min(
      exactPaidCents + legacyAppliedCents,
      amountDueCents
    );

    const remainingForDueDateCents = Math.max(
      amountDueCents - paidForDueDateCents,
      0
    );

    let status = "Due";

    if (remainingForDueDateCents <= 0) {
      status = "Paid";
    } else if (paidForDueDateCents > 0) {
      status = "Partial";
    }

    return {
      ...installment,
      amountDue: fromCents(amountDueCents),
      paidForDueDate: fromCents(paidForDueDateCents),
      remainingForDueDate: fromCents(remainingForDueDateCents),
      status,
    };
  });
}

function getScheduleWithPaymentStatus(deal, payments, paymentSkips = []) {
  const schedule = getDealDueSchedule(deal, paymentSkips);
  const dealPayments = getPaymentsForDeal(deal, payments);

  return applyLegacyPaymentsToSchedule(schedule, dealPayments);
}

export function getDueDealsForDate(deals, payments, selectedDate, paymentSkips = []) {
  return deals
    .filter(isScheduledDealReady)
    .flatMap((deal) => {
      const scheduleWithStatus = getScheduleWithPaymentStatus(
        deal,
        payments,
        paymentSkips
      );

      return scheduleWithStatus
        .filter((item) => item.dueDate === selectedDate && !item.isSkipped)
        .map((scheduleItem) => ({
          deal,
          installmentNumber: scheduleItem.installmentNumber,
          dueDate: scheduleItem.dueDate,
          amountDue: scheduleItem.amountDue,
          paidForDueDate: scheduleItem.paidForDueDate,
          remainingForDueDate: scheduleItem.remainingForDueDate,
          status: scheduleItem.status,
          paymentFrequency: scheduleItem.paymentFrequency,
          isMovedFromSkip: Boolean(scheduleItem.isMovedFromSkip),
          originalDueDate: scheduleItem.originalDueDate || "",
          skipId: scheduleItem.skipId || null,
        }));
    });
}

export function getPastDueScheduledPayments(deals, payments, todayDate, paymentSkips = []) {
  const today = new Date(`${todayDate}T00:00:00`);

  return deals
    .filter(isScheduledDealReady)
    .flatMap((deal) => {
      const scheduleWithStatus = getScheduleWithPaymentStatus(
        deal,
        payments,
        paymentSkips
      );

      return scheduleWithStatus
        .filter((installment) => {
          const dueDate = new Date(`${installment.dueDate}T00:00:00`);

          return (
            dueDate < today &&
            !installment.isSkipped &&
            toCents(installment.remainingForDueDate) > 0
          );
        })
        .map((installment) => {
          const dueDate = new Date(`${installment.dueDate}T00:00:00`);
          const diffMs = today - dueDate;
          const daysLate = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          const status =
            toCents(installment.paidForDueDate) > 0
              ? "Past Due - Partial"
              : "Past Due";

          return {
            deal,
            installmentNumber: installment.installmentNumber,
            dueDate: installment.dueDate,
            amountDue: installment.amountDue,
            paidForDueDate: installment.paidForDueDate,
            remainingForDueDate: installment.remainingForDueDate,
            daysLate,
            status,
            paymentFrequency: installment.paymentFrequency,
            isMovedFromSkip: Boolean(installment.isMovedFromSkip),
            originalDueDate: installment.originalDueDate || "",
            skipId: installment.skipId || null,
          };
        })
        .filter(Boolean);
    })
    .sort((a, b) => b.daysLate - a.daysLate);
}