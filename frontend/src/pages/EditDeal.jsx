import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getDealById, updateDeal } from "../api/dealsApi";
import { updateCustomer } from "../api/customersApi";
import {
  getDueDayFromStartDate,
  calculateMaturityDate,
} from "../utils/dealDateUtils";

const initialFormData = {
  customerName: "",
  companyName: "",
  phone: "",
  email: "",
  address: "",
  dealTag: "",
  dealType: "In-house",
  dealSubtype: "",
  startDate: "",
  paymentFrequency: "Monthly",
  firstPaymentDate: "",
  secondDueDay: "",
  truck: "",
  year: "",
  vin: "",
  totalAmount: "",
  principalAmount: "",
  monthlyPayment: "",
  eachMonthPayment: "",
  dueDay: "",
  term: "",
  maturityDate: "",
  referredByName: "",
  referredByPhone: "",
  referralMoneyPaid: "No",
  referralAmountPaid: "",
  status: "Active",
  notes: "",
};

function calculateBiweeklyMaturityDate(firstPaymentDate, term) {
  if (!firstPaymentDate || !term || Number(term) <= 0) return "";

  const firstDate = new Date(`${firstPaymentDate}T00:00:00`);
  const maturityDate = new Date(firstDate);

  maturityDate.setDate(firstDate.getDate() + (Number(term) - 1) * 14);

  return formatDateLocal(maturityDate);
}

function calculateSemiMonthlyMaturityDate(firstPaymentDate, secondDueDay, term) {
  if (!firstPaymentDate || !secondDueDay || !term || Number(term) <= 0) return "";

  const firstDate = new Date(`${firstPaymentDate}T00:00:00`);
  if (Number.isNaN(firstDate.getTime())) return "";

  const firstDueDay = firstDate.getDate();
  const secondDay = Number(secondDueDay);

  if (!Number.isInteger(secondDay) || secondDay < 1 || secondDay > 31) return "";

  let year = firstDate.getFullYear();
  let month = firstDate.getMonth();
  const dates = [];

  while (dates.length < Number(term)) {
    const firstMonthDate = buildSafeDate(year, month, firstDueDay);

    if (firstMonthDate >= firstDate && dates.length < Number(term)) {
      dates.push(firstMonthDate);
    }

    const secondMonthDate = buildSafeDate(year, month, secondDay);

    if (secondMonthDate >= firstDate && dates.length < Number(term)) {
      dates.push(secondMonthDate);
    }

    month += 1;

    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return dates.length > 0 ? formatDateLocal(dates[dates.length - 1]) : "";
}

function buildSafeDate(year, monthIndex, dueDay) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const safeDay = Math.min(Number(dueDay || 1), lastDay);

  return new Date(year, monthIndex, safeDay);
}

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addMonthsToDateString(dateString, monthsToAdd) {
  if (!dateString) return "";

  const sourceDate = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(sourceDate.getTime())) return "";

  const year = sourceDate.getFullYear();
  const month = sourceDate.getMonth() + Number(monthsToAdd || 0);
  const day = sourceDate.getDate();

  return formatDateLocal(buildSafeDate(year, month, day));
}

function getSemiMonthlyFirstPaymentDateFromStartDate(startDate) {
  return addMonthsToDateString(startDate, 1);
}

function getSemiMonthlySecondDueDay(firstPaymentDate) {
  if (!firstPaymentDate) return "";

  const firstDate = new Date(`${firstPaymentDate}T00:00:00`);
  if (Number.isNaN(firstDate.getTime())) return "";

  const secondDate = new Date(firstDate);
  secondDate.setDate(firstDate.getDate() + 15);

  return String(secondDate.getDate());
}

function calculateSemiMonthlyPaymentFromMonthly(eachMonthPayment) {
  const monthlyAmount = Number(eachMonthPayment || 0);
  if (!monthlyAmount || monthlyAmount <= 0) return "";

  return String(roundMoney(monthlyAmount / 2));
}

function calculateEachMonthPaymentFromSemiMonthly(semiMonthlyPayment) {
  const paymentAmount = Number(semiMonthlyPayment || 0);
  if (!paymentAmount || paymentAmount <= 0) return "";

  return String(roundMoney(paymentAmount * 2));
}

function calculateSemiMonthlyTermFromPayment(totalAmount, semiMonthlyPayment) {
  const total = Number(totalAmount || 0);
  const payment = Number(semiMonthlyPayment || 0);

  if (!total || !payment || total <= 0 || payment <= 0) return "";

  return String(Math.ceil(total / payment));
}

function getInitialPaymentFrequency(deal) {
  if (deal.deal_type === "Cash") return "Monthly";
  if (deal.deal_type === "Registration Money") return "One-Time";

  return deal.payment_frequency || "Monthly";
}

function EditDeal() {
  const { dealId } = useParams();
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState("");
  const [originalFormData, setOriginalFormData] = useState(null);

  const [formData, setFormData] = useState(initialFormData);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isCashDeal = formData.dealType === "Cash";
  const isInHouseDeal = formData.dealType === "In-house";
  const isRegistrationMoneyDeal = formData.dealType === "Registration Money";
  const isPaymentDeal = !isCashDeal && !isRegistrationMoneyDeal;
  const isBiweeklyDeal =
    isPaymentDeal && formData.paymentFrequency === "Biweekly";
  const isSemiMonthlyDeal =
    isPaymentDeal && formData.paymentFrequency === "Semi-Monthly";
  const isMonthlyDeal =
    isPaymentDeal && formData.paymentFrequency === "Monthly";

  const scheduleMath = getScheduleMathCheck(formData);

  const applySuggestedPaymentAmount = () => {
    if (!scheduleMath.suggestedPaymentAmount) return;

    setMessage("");
    setMessageType("");

    setFormData((prev) => ({
      ...prev,
      monthlyPayment: String(scheduleMath.suggestedPaymentAmount),
      eachMonthPayment:
        prev.paymentFrequency === "Semi-Monthly"
          ? String(roundMoney(scheduleMath.suggestedPaymentAmount * 2))
          : prev.eachMonthPayment || "",
    }));
  };

  useEffect(() => {
    loadDeal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const loadDeal = async () => {
    try {
      setMessage("");
      setMessageType("");

      const deal = await getDealById(dealId);

      setCustomerId(deal.customer_id);

      const loadedPaymentFrequency = getInitialPaymentFrequency(deal);

      const loadedData = {
        customerName: deal.customers?.customer_name || "",
        companyName: deal.customers?.company_name || "",
        phone: deal.customers?.phone || "",
        email: deal.customers?.email || "",
        address: deal.customers?.address || "",
        dealTag: deal.deal_tag || "",
        dealType: deal.deal_type || "In-house",
        dealSubtype: deal.deal_subtype || "",
        startDate: deal.start_date || "",
        paymentFrequency:
          loadedPaymentFrequency === "One-Time"
            ? "Monthly"
            : loadedPaymentFrequency,
        firstPaymentDate: deal.first_payment_date || "",
        secondDueDay: deal.second_due_day || "",
        truck: deal.truck || "",
        year: deal.year || "",
        vin: deal.vin || "",
        totalAmount: deal.total_amount || "",
        principalAmount: deal.principal_amount || "",
        monthlyPayment: deal.monthly_payment || "",
        eachMonthPayment:
          loadedPaymentFrequency === "Semi-Monthly" && deal.monthly_payment
            ? String(roundMoney(Number(deal.monthly_payment || 0) * 2))
            : "",
        dueDay: deal.due_day || "",
        term: deal.term || "",
        maturityDate: deal.maturity_date || "",
        referredByName: deal.referred_by_name || "",
        referredByPhone: deal.referred_by_phone || "",
        referralMoneyPaid: deal.referral_money_paid ? "Yes" : "No",
        referralAmountPaid:
          Number(deal.referral_amount_paid || 0) > 0
            ? deal.referral_amount_paid
            : "",
        status: deal.status || "Active",
        notes: deal.notes || "",
      };

      setFormData(loadedData);
      setOriginalFormData(loadedData);
    } catch (error) {
      setMessage(`Failed to load deal: ${error.message}`);
      setMessageType("error");
    }
  };

  const cleanFormData = (data) => {
    return {
      ...data,
      customerName: data.customerName.trim(),
      companyName: data.companyName.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      address: data.address.trim(),
      dealTag: data.dealTag.trim(),
      truck: data.truck.trim(),
      year: data.year.trim(),
      vin: data.vin.trim().toUpperCase(),
      paymentFrequency: data.paymentFrequency || "Monthly",
      eachMonthPayment: data.eachMonthPayment || "",
      firstPaymentDate: data.firstPaymentDate || "",
      secondDueDay: data.secondDueDay || "",
      referredByName: data.referredByName.trim(),
      referredByPhone: data.referredByPhone.trim(),
      referralMoneyPaid: data.referralMoneyPaid,
      referralAmountPaid: data.referralAmountPaid,
      notes: data.notes.trim(),
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setMessage("");
    setMessageType("");

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "referralMoneyPaid" && value === "No") {
        updated.referralAmountPaid = "";
      }

      if (name === "dealType") {
        if (value !== "In-house") {
          updated.dealSubtype = "";
        }

        if (value === "Cash") {
          updated.paymentFrequency = "Monthly";
          updated.firstPaymentDate = "";
          updated.secondDueDay = "";
          updated.monthlyPayment = "";
          updated.dueDay = "";
          updated.term = "";
          updated.maturityDate = "";
        }

        if (value === "Registration Money") {
          updated.paymentFrequency = "Monthly";
          updated.firstPaymentDate = "";
          updated.secondDueDay = "";
          updated.term = "1";

          if (updated.totalAmount) {
            updated.monthlyPayment = updated.totalAmount;
          }

          if (updated.startDate) {
            const dueDay = getDueDayFromStartDate(updated.startDate);
            updated.dueDay = dueDay;
            updated.maturityDate = updated.startDate;
          }
        }

        if (value !== "Cash" && value !== "Registration Money") {
          if (!updated.paymentFrequency || updated.paymentFrequency === "One-Time") {
            updated.paymentFrequency = "Monthly";
          }

          if (updated.paymentFrequency === "Monthly" && updated.startDate) {
            const dueDay =
              updated.dueDay || getDueDayFromStartDate(updated.startDate);
            updated.dueDay = dueDay;

            if (updated.term) {
              updated.maturityDate = calculateMaturityDate(
                updated.startDate,
                dueDay,
                updated.term
              );
            }
          }

          if (updated.paymentFrequency === "Biweekly") {
            updated.dueDay = "";
            updated.secondDueDay = "";
            updated.firstPaymentDate =
              updated.firstPaymentDate || updated.startDate || "";

            if (updated.firstPaymentDate && updated.term) {
              updated.maturityDate = calculateBiweeklyMaturityDate(
                updated.firstPaymentDate,
                updated.term
              );
            }
          }

          if (updated.paymentFrequency === "Semi-Monthly") {
            updated.dueDay = "";
            updated.firstPaymentDate =
              updated.firstPaymentDate || updated.startDate || "";

            if (updated.firstPaymentDate && updated.secondDueDay && updated.term) {
              updated.maturityDate = calculateSemiMonthlyMaturityDate(
                updated.firstPaymentDate,
                updated.secondDueDay,
                updated.term
              );
            }
          }
        }
      }

      if (name === "paymentFrequency") {
        if (value === "Biweekly") {
          updated.dueDay = "";
          updated.secondDueDay = "";
          updated.firstPaymentDate =
            updated.firstPaymentDate || updated.startDate || "";

          if (updated.firstPaymentDate && updated.term) {
            updated.maturityDate = calculateBiweeklyMaturityDate(
              updated.firstPaymentDate,
              updated.term
            );
          } else {
            updated.maturityDate = "";
          }
        }

        if (value === "Semi-Monthly") {
          updated.dueDay = "";
          updated.firstPaymentDate =
            updated.firstPaymentDate || updated.startDate || "";

          if (updated.firstPaymentDate && updated.secondDueDay && updated.term) {
            updated.maturityDate = calculateSemiMonthlyMaturityDate(
              updated.firstPaymentDate,
              updated.secondDueDay,
              updated.term
            );
          } else {
            updated.maturityDate = "";
          }
        }

        if (value === "Monthly") {
          updated.firstPaymentDate = "";
          updated.secondDueDay = "";

          if (updated.startDate) {
            const dueDay =
              updated.dueDay || getDueDayFromStartDate(updated.startDate);
            updated.dueDay = dueDay;

            if (updated.term) {
              updated.maturityDate = calculateMaturityDate(
                updated.startDate,
                dueDay,
                updated.term
              );
            }
          }
        }
      }

      if (name === "totalAmount" && updated.dealType === "Registration Money") {
        updated.monthlyPayment = value;
        updated.term = "1";

        if (updated.startDate) {
          updated.maturityDate = updated.startDate;
        }
      }

      if (
        name === "startDate" &&
        value &&
        updated.dealType === "Registration Money"
      ) {
        const dueDay = getDueDayFromStartDate(value);
        updated.dueDay = dueDay;
        updated.term = "1";
        updated.maturityDate = value;
      }

      if (
        name === "startDate" &&
        value &&
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money"
      ) {
        if (updated.paymentFrequency === "Biweekly") {
          updated.firstPaymentDate = updated.firstPaymentDate || value;
          updated.dueDay = "";
          updated.secondDueDay = "";

          if (updated.firstPaymentDate && updated.term) {
            updated.maturityDate = calculateBiweeklyMaturityDate(
              updated.firstPaymentDate,
              updated.term
            );
          }
        } else if (updated.paymentFrequency === "Semi-Monthly") {
          updated.firstPaymentDate = updated.firstPaymentDate || value;
          updated.dueDay = "";

          if (updated.firstPaymentDate && updated.secondDueDay && updated.term) {
            updated.maturityDate = calculateSemiMonthlyMaturityDate(
              updated.firstPaymentDate,
              updated.secondDueDay,
              updated.term
            );
          }
        } else {
          const dueDay = getDueDayFromStartDate(value);
          updated.dueDay = dueDay;
          updated.firstPaymentDate = "";
          updated.secondDueDay = "";

          if (updated.term) {
            updated.maturityDate = calculateMaturityDate(
              value,
              dueDay,
              updated.term
            );
          }
        }
      }

      if (
        name === "firstPaymentDate" &&
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money"
      ) {
        if (updated.paymentFrequency === "Biweekly") {
          if (value && updated.term) {
            updated.maturityDate = calculateBiweeklyMaturityDate(
              value,
              updated.term
            );
          } else {
            updated.maturityDate = "";
          }
        }

        if (updated.paymentFrequency === "Semi-Monthly") {
          if (value && updated.secondDueDay && updated.term) {
            updated.maturityDate = calculateSemiMonthlyMaturityDate(
              value,
              updated.secondDueDay,
              updated.term
            );
          } else {
            updated.maturityDate = "";
          }
        }
      }

      if (
        name === "secondDueDay" &&
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money" &&
        updated.paymentFrequency === "Semi-Monthly"
      ) {
        if (updated.firstPaymentDate && value && updated.term) {
          updated.maturityDate = calculateSemiMonthlyMaturityDate(
            updated.firstPaymentDate,
            value,
            updated.term
          );
        } else {
          updated.maturityDate = "";
        }
      }

      if (
        name === "term" &&
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money"
      ) {
        if (updated.paymentFrequency === "Biweekly") {
          updated.maturityDate = calculateBiweeklyMaturityDate(
            updated.firstPaymentDate || updated.startDate,
            value
          );
        } else if (updated.paymentFrequency === "Semi-Monthly") {
          updated.maturityDate = calculateSemiMonthlyMaturityDate(
            updated.firstPaymentDate || updated.startDate,
            updated.secondDueDay,
            value
          );
        } else {
          updated.maturityDate = calculateMaturityDate(
            updated.startDate,
            updated.dueDay,
            value
          );
        }
      }

      if (
        name === "dueDay" &&
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money" &&
        updated.paymentFrequency === "Monthly"
      ) {
        updated.maturityDate = calculateMaturityDate(
          updated.startDate,
          value,
          updated.term
        );
      }

      if (
        updated.dealType !== "Cash" &&
        updated.dealType !== "Registration Money" &&
        updated.paymentFrequency === "Semi-Monthly"
      ) {
        updated.dueDay = "";

        if (name === "paymentFrequency") {
          updated.firstPaymentDate =
            updated.firstPaymentDate ||
            getSemiMonthlyFirstPaymentDateFromStartDate(updated.startDate);
          updated.secondDueDay =
            updated.secondDueDay ||
            getSemiMonthlySecondDueDay(updated.firstPaymentDate);

          if (!updated.eachMonthPayment && updated.monthlyPayment) {
            updated.eachMonthPayment = calculateEachMonthPaymentFromSemiMonthly(
              updated.monthlyPayment
            );
          }
        }

        if (name === "startDate" && value) {
          updated.firstPaymentDate = getSemiMonthlyFirstPaymentDateFromStartDate(value);
          updated.secondDueDay = getSemiMonthlySecondDueDay(updated.firstPaymentDate);
        }

        if (name === "firstPaymentDate") {
          updated.secondDueDay = getSemiMonthlySecondDueDay(value);
        }

        if (name === "eachMonthPayment") {
          updated.monthlyPayment = calculateSemiMonthlyPaymentFromMonthly(value);

          if (updated.totalAmount && updated.monthlyPayment) {
            updated.term = calculateSemiMonthlyTermFromPayment(
              updated.totalAmount,
              updated.monthlyPayment
            );
          }
        }

        if (name === "monthlyPayment") {
          updated.eachMonthPayment = calculateEachMonthPaymentFromSemiMonthly(value);

          if (updated.totalAmount && value) {
            updated.term = calculateSemiMonthlyTermFromPayment(
              updated.totalAmount,
              value
            );
          }
        }

        if (name === "totalAmount" && updated.monthlyPayment) {
          updated.term = calculateSemiMonthlyTermFromPayment(
            value,
            updated.monthlyPayment
          );
        }

        if (!updated.firstPaymentDate && updated.startDate) {
          updated.firstPaymentDate = getSemiMonthlyFirstPaymentDateFromStartDate(
            updated.startDate
          );
        }

        if (!updated.secondDueDay && updated.firstPaymentDate) {
          updated.secondDueDay = getSemiMonthlySecondDueDay(updated.firstPaymentDate);
        }

        if (updated.firstPaymentDate && updated.secondDueDay && updated.term) {
          updated.maturityDate = calculateSemiMonthlyMaturityDate(
            updated.firstPaymentDate,
            updated.secondDueDay,
            updated.term
          );
        } else {
          updated.maturityDate = "";
        }
      }

      return updated;
    });
  };

  const validateForm = () => {
    const data = cleanFormData(formData);

    if (!data.customerName) {
      return "Customer name is required.";
    }

    if (!data.dealTag) {
      return "Deal tag is required.";
    }

    if (!data.dealType) {
      return "Deal type is required.";
    }

    if (data.dealType === "In-house" && !data.dealSubtype) {
      return "Deal sub type is required for In-house deals.";
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return "Please enter a valid email address.";
    }

    if (data.year && !/^\d{4}$/.test(data.year)) {
      return "Year must be a 4-digit year, for example 2022.";
    }

    if (data.vin && data.vin.length > 17) {
      return "VIN cannot be more than 17 characters.";
    }

    if (!data.totalAmount || Number(data.totalAmount) < 0) {
      return "Total amount is required and cannot be negative.";
    }

    if (data.principalAmount && Number(data.principalAmount) < 0) {
      return "Principal amount cannot be negative.";
    }

    if (data.referralAmountPaid && Number(data.referralAmountPaid) < 0) {
      return "Referral amount paid cannot be negative.";
    }

    if (
      data.referralMoneyPaid === "Yes" &&
      (!data.referralAmountPaid || Number(data.referralAmountPaid) <= 0)
    ) {
      return "Referral amount paid is required when referral money is marked as paid.";
    }

    if (data.dealType === "Registration Money") {
      if (!data.startDate) {
        return "Tentative due date is required for Registration Money deals.";
      }

      if (!data.totalAmount || Number(data.totalAmount) <= 0) {
        return "Registration money amount must be greater than 0.";
      }

      return "";
    }

    if (data.dealType !== "Cash") {
      if (!data.startDate) {
        return "Start date is required for payment deals.";
      }

      if (!data.paymentFrequency) {
        return "Payment frequency is required.";
      }

      if (!["Monthly", "Biweekly", "Semi-Monthly"].includes(data.paymentFrequency)) {
        return "Payment frequency must be Monthly, Biweekly, or Semi-Monthly.";
      }

      if (!data.monthlyPayment || Number(data.monthlyPayment) <= 0) {
        return "Payment amount must be greater than 0.";
      }

      if (data.paymentFrequency === "Biweekly") {
        if (!data.firstPaymentDate) {
          return "First payment date is required for biweekly deals.";
        }

        if (data.firstPaymentDate < data.startDate) {
          return "First payment date cannot be before the start date.";
        }
      } else if (data.paymentFrequency === "Semi-Monthly") {
        if (!data.firstPaymentDate) {
          return "First payment date is required for semi-monthly deals.";
        }

        if (data.firstPaymentDate < data.startDate) {
          return "First payment date cannot be before the start date.";
        }

        if (
          !data.secondDueDay ||
          Number(data.secondDueDay) < 1 ||
          Number(data.secondDueDay) > 31
        ) {
          return "Second due day must be between 1 and 31.";
        }
      } else {
        if (
          !data.dueDay ||
          Number(data.dueDay) < 1 ||
          Number(data.dueDay) > 31
        ) {
          return "Due day must be between 1 and 31.";
        }
      }

      if (!data.term || Number(data.term) <= 0) {
        return "Term must be greater than 0.";
      }

      if (!Number.isInteger(Number(data.term))) {
        return "Term must be a whole number.";
      }

      if (!data.maturityDate) {
        return "Maturity date is required.";
      }
    }

    return "";
  };

  const didScheduleChange = () => {
    if (!originalFormData) return true;

    const scheduleFields = [
      "totalAmount",
      "principalAmount",
      "monthlyPayment",
      "eachMonthPayment",
      "paymentFrequency",
      "firstPaymentDate",
      "secondDueDay",
      "term",
      "dueDay",
      "startDate",
      "maturityDate",
      "status",
    ];

    return scheduleFields.some(
      (field) =>
        String(originalFormData[field] || "") !== String(formData[field] || "")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    const validationError = validateForm();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      return;
    }

    const data = cleanFormData(formData);

    const scheduleCheckForConfirm = getScheduleMathCheck(data);

    const scheduleWarningText = scheduleCheckForConfirm.hasWarning
      ? `\n\nSchedule Math Warning:\n${scheduleCheckForConfirm.warningText}\n\nContinue only if this difference is intentional.`
      : "";

    const confirmationMessage = didScheduleChange()
      ? `Are you sure you want to save these changes? You changed important deal or schedule information. This may affect the payment schedule, balance, due payments, and paid-off status.${scheduleWarningText}`
      : `Are you sure you want to save these changes?${scheduleWarningText}`;

    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) return;

    try {
      setIsSaving(true);

      await updateCustomer(customerId, {
        customerName: data.customerName,
        companyName: data.companyName,
        phone: data.phone,
        email: data.email,
        address: data.address,
      });

      const finalPaymentFrequency =
        data.dealType === "Cash"
          ? null
          : data.dealType === "Registration Money"
          ? "One-Time"
          : data.paymentFrequency || "Monthly";

      const finalFirstPaymentDate =
        finalPaymentFrequency === "Biweekly" ||
        finalPaymentFrequency === "Semi-Monthly"
          ? data.firstPaymentDate || data.startDate || null
          : null;

      const finalSecondDueDay =
        finalPaymentFrequency === "Semi-Monthly" && data.secondDueDay
          ? Number(data.secondDueDay)
          : null;

      const finalDueDay =
        data.dealType === "Cash"
          ? null
          : data.dealType === "Registration Money"
          ? data.dueDay
            ? Number(data.dueDay)
            : data.startDate
            ? Number(getDueDayFromStartDate(data.startDate))
            : null
          : finalPaymentFrequency === "Biweekly"
          ? null
          : finalPaymentFrequency === "Semi-Monthly"
          ? finalFirstPaymentDate
            ? Number(getDueDayFromStartDate(finalFirstPaymentDate))
            : null
          : data.dueDay
          ? Number(data.dueDay)
          : data.startDate
          ? Number(getDueDayFromStartDate(data.startDate))
          : null;

      const finalTerm =
        data.dealType === "Cash"
          ? null
          : data.dealType === "Registration Money"
          ? 1
          : Number(data.term || 0);

      const finalMonthlyPayment =
        data.dealType === "Cash"
          ? 0
          : data.dealType === "Registration Money"
          ? Number(data.totalAmount || 0)
          : Number(data.monthlyPayment || 0);

      const finalMaturityDate =
        data.dealType === "Cash"
          ? null
          : data.dealType === "Registration Money"
          ? data.startDate
          : finalPaymentFrequency === "Biweekly"
          ? calculateBiweeklyMaturityDate(finalFirstPaymentDate, finalTerm)
          : finalPaymentFrequency === "Semi-Monthly"
          ? calculateSemiMonthlyMaturityDate(
              finalFirstPaymentDate,
              finalSecondDueDay,
              finalTerm
            )
          : data.maturityDate ||
            calculateMaturityDate(data.startDate, finalDueDay, finalTerm);

      await updateDeal(dealId, {
        dealTag: data.dealTag,
        dealType: data.dealType,
        dealSubtype: data.dealType === "In-house" ? data.dealSubtype : null,
        startDate: data.startDate || null,
        paymentFrequency: finalPaymentFrequency,
        firstPaymentDate: finalFirstPaymentDate,
        secondDueDay: finalSecondDueDay,
        truck: data.truck,
        year: data.year,
        vin: data.vin,
        totalAmount: Number(data.totalAmount || 0),
        principalAmount: data.principalAmount
          ? Number(data.principalAmount || 0)
          : null,
        monthlyPayment: finalMonthlyPayment,
        dueDay: finalDueDay,
        term: finalTerm,
        maturityDate: finalMaturityDate,
        referredByName: data.referredByName,
        referredByPhone: data.referredByPhone,
        referralMoneyPaid: data.referralMoneyPaid === "Yes",
        referralAmountPaid:
          data.referralMoneyPaid === "Yes"
            ? Number(data.referralAmountPaid || 0)
            : 0,
        status: data.status,
        notes: data.notes,
      });

      setMessage("Deal updated successfully.");
      setMessageType("success");

      setTimeout(() => {
        navigate(`/deals/${dealId}`);
      }, 700);
    } catch (error) {
      setMessage(`Failed to update deal: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!originalFormData && !message) {
    return (
      <div style={pageWrapper}>
        <p>Loading deal...</p>
      </div>
    );
  }

  return (
    <div style={pageWrapper}>
      <div style={topActionBar}>
        <Link to={`/deals/${dealId}`} style={backLink}>
          ← Back to deal
        </Link>

        <button
          type="button"
          onClick={loadDeal}
          style={secondaryButtonStyle}
          disabled={isSaving}
        >
          Reload
        </button>
      </div>

      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>Edit Deal</h1>
          <p style={pageDescription}>
            Update customer information, company name, deal details, referral
            information, schedule fields, status, and internal notes.
          </p>
        </div>

        <div style={getStatusBadgeStyle(formData.status)}>
          {formData.status || "Active"}
        </div>
      </div>

      {message && (
        <div
          style={{
            ...messageBox,
            ...(messageType === "success" ? successMessage : errorMessage),
          }}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={formStyle}>
        <Section
          title="Customer Information"
          description="Basic customer and company contact details used for follow-up and records."
        >
          <div style={grid}>
            <Input
              label="Customer Name"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              required
            />

            <Input
              label="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              helperText="Optional"
            />

            <Input
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />

            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />

            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>
        </Section>

        <Section
          title="Deal Information"
          description="Truck, deal type, amount, and current deal status."
        >
          <div style={grid}>
            <Input
              label="Deal Tag"
              name="dealTag"
              value={formData.dealTag}
              onChange={handleChange}
              required
            />

            <Select
              label="Deal Type"
              name="dealType"
              value={formData.dealType}
              onChange={handleChange}
              options={[
                "In-house",
                "Down Finance",
                "Borrow Money",
                "Motor Finance",
                "Registration Money",
                "Cash",
              ]}
              required
            />

            {isInHouseDeal && (
              <Select
                label="Deal Sub Type"
                name="dealSubtype"
                value={formData.dealSubtype}
                onChange={handleChange}
                options={["Regular", "Apportioned", "Combination"]}
                placeholder="Select Sub Type"
                required
              />
            )}

            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                "Active",
                "Paid Off",
                "Closed",
                "Repo",
                "Cancelled",
                "Defaulted",
              ]}
              required
            />

            <Input
              label="Truck"
              name="truck"
              value={formData.truck}
              onChange={handleChange}
            />

            <Input
              label="Year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              maxLength={4}
            />

            <Input
              label="VIN"
              name="vin"
              value={formData.vin}
              onChange={handleChange}
              maxLength={17}
            />

            <Input
              label="Principal Amount"
              name="principalAmount"
              type="number"
              value={formData.principalAmount}
              onChange={handleChange}
              helperText="Optional original sale/principal amount before down payment."
            />

            <Input
              label={
                isRegistrationMoneyDeal
                  ? "Registration Money Amount"
                  : "Total Amount"
              }
              name="totalAmount"
              type="number"
              value={formData.totalAmount}
              onChange={handleChange}
              required
              helperText="Changing this may affect balance and paid-off status."
            />
          </div>
        </Section>

        <Section
          title="Referral Information"
          description="Optional referral tracking for who referred this customer and whether referral money was paid."
        >
          <div style={referralInfoBox}>
            Use this section to track the person who referred the customer, their
            phone number, and whether referral money has already been paid.
          </div>

          <div style={grid}>
            <Input
              label="Referred By Name"
              name="referredByName"
              value={formData.referredByName}
              onChange={handleChange}
              helperText="Optional"
            />

            <Input
              label="Referred By Phone"
              name="referredByPhone"
              value={formData.referredByPhone}
              onChange={handleChange}
              helperText="Optional"
            />

            <Select
              label="Referral Money Paid?"
              name="referralMoneyPaid"
              value={formData.referralMoneyPaid}
              onChange={handleChange}
              options={["No", "Yes"]}
              required
            />

            <Input
              label="Referral Amount Paid"
              name="referralAmountPaid"
              type="number"
              value={formData.referralAmountPaid}
              onChange={handleChange}
              disabled={formData.referralMoneyPaid === "No"}
              helperText={
                formData.referralMoneyPaid === "Yes"
                  ? "Required when referral money is marked paid."
                  : "Disabled unless referral money is paid."
              }
            />
          </div>
        </Section>

        <Section
          title="Payment Schedule"
          description={
            isCashDeal
              ? "Cash deals do not need payment schedule fields."
              : isRegistrationMoneyDeal
              ? "Registration Money is treated as a one-time scheduled receivable."
              : isSemiMonthlyDeal
              ? "Semi-monthly schedule uses a first payment date, a second due day, payment amount, and number of payments."
              : "Schedule is calculated from payment frequency, payment amount, term, and due date rules."
          }
        >
          {isCashDeal && (
            <div style={infoBox}>
              Cash deal selected. Payment amount, due day, term, and maturity
              date are not required.
            </div>
          )}

          {isRegistrationMoneyDeal && (
            <div style={infoBox}>
              Registration Money selected. Use the tentative due date as the
              date the customer is expected to pay title/registration money.
              Term will stay 1 and payment amount will match the total amount.
            </div>
          )}

          {isBiweeklyDeal && (
            <div style={biweeklyInfoBox}>
              Biweekly selected. The payment schedule will start from the first
              payment date and repeat every 14 days. Due day is not used for
              biweekly deals.
            </div>
          )}

          {isSemiMonthlyDeal && (
            <div style={biweeklyInfoBox}>
              Semi-Monthly selected. The payment schedule will use the first
              payment date and the second due day each month. Term means total
              number of semi-monthly payments.
            </div>
          )}

          <div style={grid}>
            <Input
              label={
                isRegistrationMoneyDeal ? "Tentative Due Date" : "Start Date"
              }
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              disabled={isCashDeal}
              required={!isCashDeal}
              helperText={
                isRegistrationMoneyDeal
                  ? "This is the expected sticker pickup / registration money due date."
                  : isBiweeklyDeal
                  ? "This is the deal start date. First payment date controls the biweekly schedule."
                  : isSemiMonthlyDeal
                  ? "This is the deal start date. First payment date controls the semi-monthly schedule."
                  : "Due day will auto-fill from this date."
              }
            />

            {isPaymentDeal && (
              <Select
                label="Payment Frequency"
                name="paymentFrequency"
                value={formData.paymentFrequency}
                onChange={handleChange}
                options={["Monthly", "Biweekly", "Semi-Monthly"]}
                required
              />
            )}

            {(isBiweeklyDeal || isSemiMonthlyDeal) && (
              <Input
                label="First Payment Date"
                name="firstPaymentDate"
                type="date"
                value={formData.firstPaymentDate}
                onChange={handleChange}
                required
                helperText={
                  isSemiMonthlyDeal
                    ? "First semi-monthly installment due date."
                    : "The first biweekly installment date. Future payments repeat every 14 days."
                }
              />
            )}

            {isSemiMonthlyDeal && (
              <Input
                label="Second Due Day"
                name="secondDueDay"
                type="number"
                value={formData.secondDueDay}
                onChange={handleChange}
                required
                helperText="Example: use 20 for payments on the first payment date day and the 20th of each month."
              />
            )}

            {isSemiMonthlyDeal && (
              <Input
                label="Each Month Payment"
                name="eachMonthPayment"
                type="number"
                value={formData.eachMonthPayment}
                onChange={handleChange}
                disabled={isCashDeal || isRegistrationMoneyDeal}
                helperText="Enter the expected monthly amount. Semi-monthly payment auto-fills as half, but can still be edited."
              />
            )}

            <Input
              label={
                isRegistrationMoneyDeal
                  ? "One-Time Amount"
                  : isBiweeklyDeal
                  ? "Biweekly Payment Amount"
                  : isSemiMonthlyDeal
                  ? "Semi-Monthly Payment Amount"
                  : "Monthly Payment Amount"
              }
              name="monthlyPayment"
              type="number"
              value={formData.monthlyPayment}
              onChange={handleChange}
              disabled={isCashDeal || isRegistrationMoneyDeal}
              required={!isCashDeal}
              helperText={
                isSemiMonthlyDeal
                  ? "Auto-filled from Each Month Payment, but can be edited. Term recalculates when this changes."
                  : undefined
              }
            />

            {isMonthlyDeal && (
              <Input
                label="Due Day"
                name="dueDay"
                type="number"
                value={formData.dueDay}
                onChange={handleChange}
                disabled={isCashDeal || isRegistrationMoneyDeal}
                required={!isCashDeal}
                helperText="Auto-filled from start date, but can be edited for monthly payment deals."
              />
            )}

            <Input
              label={
                isBiweeklyDeal
                  ? "Term / Number of Biweekly Payments"
                  : isSemiMonthlyDeal
                  ? "Term / Number of Semi-Monthly Payments"
                  : "Term"
              }
              name="term"
              type="number"
              value={formData.term}
              onChange={handleChange}
              disabled={isCashDeal || isRegistrationMoneyDeal}
              required={!isCashDeal}
            />

            <Input
              label="Maturity Date"
              name="maturityDate"
              type="date"
              value={formData.maturityDate}
              onChange={handleChange}
              disabled={isCashDeal || isRegistrationMoneyDeal}
              readOnly
              helperText={
                isRegistrationMoneyDeal
                  ? "Same as tentative due date for Registration Money."
                  : isBiweeklyDeal
                  ? "Auto-calculated from first payment date and number of biweekly payments."
                  : isSemiMonthlyDeal
                  ? "Auto-calculated from first payment date, second due day, and number of semi-monthly payments."
                  : "Auto-calculated from start date, due day, and term."
              }
            />
          </div>

          {!isCashDeal && (
            <ScheduleMathCard
              scheduleMath={scheduleMath}
              onUseSuggestedPayment={applySuggestedPaymentAmount}
            />
          )}
        </Section>

        <Section
          title="Internal Deal Notes"
          description="Special terms, title notes, payment notes, referral notes, customer agreements, or internal dealership notes."
        >
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add internal notes for this deal..."
            style={notesInput}
          />
        </Section>

        <div style={buttonRow}>
          <button type="submit" style={buttonStyle} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>

          <Link to={`/deals/${dealId}`} style={cancelButtonStyle}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function getScheduleMathCheck(data) {
  const totalAmount = roundMoney(data.totalAmount);

  const paymentAmount =
    data.dealType === "Registration Money"
      ? roundMoney(data.totalAmount)
      : roundMoney(data.monthlyPayment);

  const term =
    data.dealType === "Registration Money" ? 1 : Number(data.term || 0);

  const paymentFrequency =
    data.dealType === "Registration Money"
      ? "One-Time"
      : data.paymentFrequency || "Monthly";

  const paymentLabel =
    paymentFrequency === "Biweekly"
      ? "Biweekly Payment"
      : paymentFrequency === "Semi-Monthly"
      ? "Semi-Monthly Payment"
      : paymentFrequency === "One-Time"
      ? "One-Time Amount"
      : "Monthly Payment";

  const shouldShow =
    data.dealType !== "Cash" &&
    (totalAmount > 0 || paymentAmount > 0 || term > 0);

  const scheduledTotal = roundMoney(
    data.dealType === "Registration Money"
      ? totalAmount
      : paymentAmount * term
  );

  const difference = subtractMoney(scheduledTotal, totalAmount);
  const absoluteDifference = Math.abs(difference);

  const suggestedPaymentAmount =
    totalAmount > 0 && term > 0 ? roundMoney(totalAmount / term) : 0;

  const hasWarning =
    shouldShow &&
    data.dealType !== "Registration Money" &&
    totalAmount > 0 &&
    paymentAmount > 0 &&
    term > 0 &&
    absoluteDifference > 1;

  const warningText =
    difference > 0
      ? `Scheduled total is ${formatMoneyLocal(
          absoluteDifference
        )} more than the total amount. Check payment amount or term.`
      : `Scheduled total is ${formatMoneyLocal(
          absoluteDifference
        )} less than the total amount. Check payment amount or term.`;

  return {
    shouldShow,
    hasWarning,
    totalAmount,
    paymentAmount,
    term,
    paymentFrequency,
    paymentLabel,
    scheduledTotal,
    difference,
    suggestedPaymentAmount,
    warningText,
  };
}

function ScheduleMathCard({ scheduleMath, onUseSuggestedPayment }) {
  if (!scheduleMath.shouldShow) return null;

  return (
    <div
      style={{
        ...scheduleMathCard,
        ...(scheduleMath.hasWarning
          ? scheduleMathWarningCard
          : scheduleMathGoodCard),
      }}
    >
      <div style={scheduleMathHeader}>
        <div>
          <strong style={scheduleMathTitle}>Schedule Math Check</strong>
          <p style={scheduleMathDescription}>
            Confirms the payment amount and term match the total deal amount.
          </p>
        </div>

        <span
          style={
            scheduleMath.hasWarning
              ? scheduleMathWarningBadge
              : scheduleMathGoodBadge
          }
        >
          {scheduleMath.hasWarning ? "Check Needed" : "Looks Good"}
        </span>
      </div>

      <div style={scheduleMathGrid}>
        <div style={scheduleMathItem}>
          <span>Total Amount</span>
          <strong>{formatMoneyLocal(scheduleMath.totalAmount)}</strong>
        </div>

        <div style={scheduleMathItem}>
          <span>{scheduleMath.paymentLabel}</span>
          <strong>{formatMoneyLocal(scheduleMath.paymentAmount)}</strong>
        </div>

        <div style={scheduleMathItem}>
          <span>Term</span>
          <strong>{scheduleMath.term || "—"}</strong>
        </div>

        <div style={scheduleMathItem}>
          <span>Scheduled Total</span>
          <strong>{formatMoneyLocal(scheduleMath.scheduledTotal)}</strong>
        </div>

        <div style={scheduleMathItem}>
          <span>Difference</span>
          <strong
            style={{
              color: scheduleMath.hasWarning ? "#991b1b" : "#166534",
            }}
          >
            {formatMoneyLocal(scheduleMath.difference)}
          </strong>
        </div>
      </div>

      {scheduleMath.hasWarning ? (
        <div style={scheduleMathWarningText}>
          {scheduleMath.warningText}

          {scheduleMath.suggestedPaymentAmount > 0 && (
            <button
              type="button"
              onClick={onUseSuggestedPayment}
              style={useSuggestedButton}
            >
              Use Suggested {scheduleMath.paymentLabel}:{" "}
              {formatMoneyLocal(scheduleMath.suggestedPaymentAmount)}
            </button>
          )}
        </div>
      ) : (
        <div style={scheduleMathGoodText}>
          Scheduled total matches the total amount.
        </div>
      )}
    </div>
  );
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

function roundMoney(value) {
  return fromCents(toCents(value));
}

function subtractMoney(amountA, amountB) {
  return fromCents(toCents(amountA) - toCents(amountB));
}

function formatMoneyLocal(value) {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function Section({ title, description, children }) {
  return (
    <section style={sectionBox}>
      <div style={sectionHeader}>
        <h2 style={sectionTitle}>{title}</h2>
        <p style={sectionDescription}>{description}</p>
      </div>

      {children}
    </section>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
  disabled,
  readOnly,
  helperText,
  maxLength,
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={requiredMark}>*</span>}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        maxLength={maxLength}
        style={{
          ...inputStyle,
          background: disabled || readOnly ? "#f3f4f6" : "white",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />

      {helperText && <small style={helperTextStyle}>{helperText}</small>}
    </div>
  );
}

function Select({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required,
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={requiredMark}>*</span>}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={inputStyle}
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function getStatusBadgeStyle(status) {
  const base = {
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px",
    whiteSpace: "nowrap",
  };

  if (status === "Paid Off") {
    return { ...base, background: "#dcfce7", color: "#166534" };
  }

  if (status === "Defaulted") {
    return { ...base, background: "#111827", color: "white" };
  }

  if (status === "Repo") {
    return { ...base, background: "#fee2e2", color: "#991b1b" };
  }

  if (status === "Closed") {
    return { ...base, background: "#e5e7eb", color: "#374151" };
  }

  if (status === "Cancelled") {
    return { ...base, background: "#f3f4f6", color: "#6b7280" };
  }

  return { ...base, background: "#dbeafe", color: "#1d4ed8" };
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const topActionBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const backLink = {
  color: "#0A1A2F",
  textDecoration: "none",
  fontWeight: "bold",
};

const pageHeader = {
  background: "white",
  padding: "20px",
  borderRadius: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  marginBottom: "20px",
};

const pageTitle = {
  margin: 0,
  color: "#111827",
};

const pageDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#667085",
};

const formStyle = {
  background: "white",
  padding: "22px",
  borderRadius: "14px",
  maxWidth: "100%",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  boxSizing: "border-box",
};

const sectionBox = {
  marginTop: "22px",
  padding: "18px",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  background: "#ffffff",
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

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "16px",
};

const labelStyle = {
  display: "block",
  fontWeight: "bold",
  color: "#374151",
  marginBottom: "6px",
};

const requiredMark = {
  color: "#dc2626",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  boxSizing: "border-box",
  fontSize: "14px",
};

const helperTextStyle = {
  display: "block",
  color: "#667085",
  fontSize: "12px",
  marginTop: "5px",
};

const notesInput = {
  ...inputStyle,
  minHeight: "130px",
  resize: "vertical",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  lineHeight: "1.5",
};

const infoBox = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  padding: "13px",
  borderRadius: "10px",
  color: "#475569",
  marginBottom: "16px",
};

const biweeklyInfoBox = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  padding: "13px",
  borderRadius: "10px",
  color: "#1d4ed8",
  marginBottom: "16px",
  fontWeight: "800",
};

const referralInfoBox = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  padding: "13px",
  borderRadius: "10px",
  color: "#1d4ed8",
  marginBottom: "16px",
  fontWeight: "800",
};

const buttonRow = {
  display: "flex",
  gap: "12px",
  marginTop: "24px",
  flexWrap: "wrap",
};

const buttonStyle = {
  background: "#0A1A2F",
  color: "white",
  padding: "12px 20px",
  border: "none",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "bold",
};

const cancelButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "12px 20px",
  borderRadius: "9px",
  textDecoration: "none",
  fontWeight: "bold",
};

const secondaryButtonStyle = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "9px 13px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
};

const messageBox = {
  padding: "12px 14px",
  borderRadius: "10px",
  marginBottom: "18px",
  fontWeight: "bold",
};

const successMessage = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
};

const errorMessage = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};

const scheduleMathCard = {
  marginTop: "16px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
};

const scheduleMathGoodCard = {
  background: "#f0fdf4",
  borderColor: "#bbf7d0",
};

const scheduleMathWarningCard = {
  background: "#fffbeb",
  borderColor: "#fde68a",
};

const scheduleMathHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const scheduleMathTitle = {
  display: "block",
  color: "#111827",
  fontSize: "15px",
};

const scheduleMathDescription = {
  margin: "4px 0 0",
  color: "#667085",
  fontSize: "13px",
};

const scheduleMathGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: "10px",
};

const scheduleMathItem = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "10px",
  display: "grid",
  gap: "4px",
  color: "#111827",
};

const scheduleMathGoodBadge = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const scheduleMathWarningBadge = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const scheduleMathGoodText = {
  marginTop: "12px",
  color: "#166534",
  fontWeight: "900",
  fontSize: "13px",
};

const scheduleMathWarningText = {
  marginTop: "12px",
  color: "#92400e",
  fontWeight: "900",
  fontSize: "13px",
  display: "grid",
  gap: "10px",
};

const useSuggestedButton = {
  width: "fit-content",
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: "900",
};

export default EditDeal;