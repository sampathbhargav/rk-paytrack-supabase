// Staff reference content. Legal templates are retained for management review.
export const helpArticles = [
  {
    "id": "gettingStarted",
    "title": "Getting Started",
    "icon": "🚀",
    "category": "Basics",
    "summary": "A quick overview of RK PayTrack and how employees should use it daily.",
    "sections": [
      {
        "heading": "Use the browser application",
        "text": "Sign in at the dealership’s approved website using your own account. The supported production workflow is the web browser. Review the daily workflow guide and learn payment recovery before recording money."
      },
      {
        "heading": "What is RK PayTrack?",
        "text": "RK PayTrack is used to manage dealership deals, customer balances, monthly payments, biweekly payments, registration money, payments, due schedules, promises, receipts, maintenance invoices, follow-up notes, referral information, and reports."
      },
      {
        "heading": "Main Things You Can Do",
        "text": "Employees can use the system to track customer payment activity.",
        "items": [
          "View customer, company, deal, and maintenance details.",
          "Check balances, monthly payment amounts, and biweekly payment amounts.",
          "Add deal payments and maintenance payments.",
          "Use Cash, Zelle, Cash App, Apple Pay, Card, Check, ACH, Referral Credit, or Other as payment methods.",
          "Create promises for partial or delayed payments.",
          "Add customer follow-up notes for calls, texts, disputes, and manager notes.",
          "Edit basic customer information from the customer profile.",
          "Track referral information on deals.",
          "Print receipts, invoices, and account summaries.",
          "Review due payments and past-due accounts.",
          "Export reports for management or accounting."
        ]
      },
      {
        "heading": "Best Practice",
        "text": "Always review the customer name, company name, deal tag or invoice number, payment amount, payment method, due date, total remaining balance, and notes before saving any payment or promise."
      }
    ]
  },
  {
    "id": "globalSearch",
    "title": "Global Search",
    "icon": "🔎",
    "category": "Basics",
    "summary": "Explains how to quickly find customers, companies, deals, payments, and promises.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "Global Search helps employees quickly find records without opening multiple pages."
      },
      {
        "heading": "What You Can Search",
        "text": "Use the search bar to find information across the system.",
        "items": [
          "Customer name.",
          "Company name.",
          "Phone number.",
          "Deal tag.",
          "VIN.",
          "Truck year or truck name.",
          "Payment method or payment status.",
          "Promise status or notes."
        ]
      },
      {
        "heading": "Best Practice",
        "text": "If a customer has a company name, search by either the customer name or company name to locate the correct deal faster."
      },
      {
        "heading": "Compact search while opening a deal",
        "text": "The header search retracts to its compact Search button while a deal loads, just as it does when you scroll. Hover, focus or select Search to expand it. The loading screen says “Opening a customer deal”; use Back if you need to leave."
      }
    ]
  },
  {
    "id": "customers",
    "title": "Customers",
    "icon": "👤",
    "category": "Customers",
    "summary": "Explains customer records, company names, and customer profile information.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "Customer records store basic customer information used across deals, maintenance, payments, follow-ups, and reports."
      },
      {
        "heading": "Customer Information",
        "text": "A customer record may include the following details.",
        "items": [
          "Customer name.",
          "Company name.",
          "Phone number.",
          "Email address.",
          "Address.",
          "Connected deals.",
          "Connected maintenance records.",
          "Follow-up notes."
        ]
      },
      {
        "heading": "Best Practice",
        "text": "Keep customer name, company name, and phone number accurate because they appear in searches, reports, receipts, and profile pages."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/customers"
    }
  },
  {
    "id": "editCustomerInfo",
    "title": "Editing Customer Info",
    "icon": "✏️",
    "category": "Customers",
    "summary": "Explains how to update customer name, company name, phone, email, and address from the customer profile.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "The Edit Customer Info button is used to update only the customer's contact details without changing deals, payments, promises, or maintenance records."
      },
      {
        "heading": "What Can Be Edited",
        "text": "Employees can update basic customer information.",
        "items": [
          "Customer name.",
          "Company name.",
          "Phone number.",
          "Email address.",
          "Address."
        ]
      },
      {
        "heading": "Important",
        "text": "Editing customer information does not change payment history, deal balances, maintenance invoices, or promise records. It only updates the customer contact information."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/customers"
    }
  },
  {
    "id": "customerProfile",
    "title": "Customer Profile Page",
    "icon": "📁",
    "category": "Customers",
    "summary": "Explains the customer profile page and what information employees can find there.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "The customer profile page gives a full view of one customer across deals, maintenance, balances, follow-up notes, and account history."
      },
      {
        "heading": "Important Sections",
        "text": "Employees should review these sections carefully.",
        "items": [
          "Customer and company information.",
          "Total customer balance.",
          "Deal balance.",
          "Maintenance balance.",
          "All connected deals.",
          "All connected maintenance records.",
          "Customer follow-up notes."
        ]
      },
      {
        "heading": "When to Use This Page",
        "text": "Use this page when a customer calls, makes a payment, requests a promise date, asks for account details, or when management needs a full customer view."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/customers"
    }
  },
  {
    "id": "dealEntry",
    "title": "Deal Entry",
    "icon": "🚚",
    "category": "Deals",
    "summary": "Explains how to create a deal and choose the correct deal type, payment frequency, and schedule.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "Deal Entry is used to create a new customer deal or add a new deal to an existing customer."
      },
      {
        "heading": "Deal Types",
        "text": "Choose the correct deal type before entering the payment schedule.",
        "items": [
          "In-house: customer pays the dealership over time.",
          "Down Finance: customer owes a down payment or financed down amount.",
          "Borrow Money: customer borrowed money and must repay it.",
          "Motor Finance: customer has a motor-related financed balance.",
          "Registration Money: one-time expected payment for registration or title-related money.",
          "Cash: customer paid cash and no schedule is required."
        ]
      },
      {
        "heading": "Best Practice",
        "text": "Before saving a deal, verify the deal tag, customer, company, truck, VIN, total amount, payment frequency, payment amount, term, and maturity date."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/add-deal"
    }
  },
  {
    "id": "scheduleMathCheck",
    "title": "Schedule Math Check",
    "icon": "🧮",
    "category": "Deals",
    "summary": "Explains the deal entry math check that helps prevent wrong payment amounts or wrong terms.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "The Schedule Math Check confirms whether the payment amount multiplied by the term matches the total deal amount."
      },
      {
        "heading": "How It Helps",
        "text": "This feature helps reduce human errors while creating deals.",
        "items": [
          "Shows the total deal amount.",
          "Shows the monthly or biweekly payment amount.",
          "Shows the term.",
          "Shows the scheduled total.",
          "Shows the difference between scheduled total and total amount.",
          "Warns employees if the schedule does not match the deal total."
        ]
      },
      {
        "heading": "Important",
        "text": "If the Schedule Math Check shows a warning, review the total amount, payment amount, and term before creating the deal. Continue only when the difference is intentional."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/add-deal"
    }
  },
  {
    "id": "biweeklyPayments",
    "title": "Biweekly Payments",
    "icon": "📅",
    "category": "Payments",
    "summary": "Explains how biweekly deal schedules work and how employees should enter them.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "Biweekly payments are used when a customer pays every 14 days instead of once per month."
      },
      {
        "heading": "Required Fields",
        "text": "For a biweekly deal, employees must enter the correct schedule details.",
        "items": [
          "Start date.",
          "Payment frequency set to Biweekly.",
          "Biweekly payment amount.",
          "First payment date.",
          "Number of biweekly payments.",
          "Maturity date, which is calculated by the system."
        ]
      },
      {
        "heading": "How the Schedule Works",
        "text": "The system creates one installment every 14 days starting from the first payment date. The term means the total number of biweekly payments."
      },
      {
        "heading": "Best Practice",
        "text": "Confirm the first payment date with the customer before saving the deal because all future biweekly due dates are based on that date."
      }
    ]
  },
  {
    "id": "followupNotes",
    "title": "Customer Follow-Up Notes",
    "icon": "📝",
    "category": "Customers",
    "summary": "Explains how to record calls, texts, promises, disputes, and manager notes for a customer.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "Follow-up notes help employees track communication history with a customer. This helps avoid forgetting calls, promises, disputes, and manager instructions."
      },
      {
        "heading": "Common Follow-Up Types",
        "text": "Employees can create follow-up notes for different situations.",
        "items": [
          "Called customer.",
          "Texted customer.",
          "Customer promised payment.",
          "Customer did not answer.",
          "Customer disputed amount.",
          "Manager note.",
          "Other."
        ]
      },
      {
        "heading": "Actions Available",
        "text": "Follow-up notes support simple actions.",
        "items": [
          "Add a new note.",
          "Edit an existing note.",
          "Delete an incorrect note.",
          "Mark a note as completed.",
          "Use next follow-up date when another contact is needed.",
          "Use pagination to keep the notes list compact."
        ]
      },
      {
        "heading": "Best Practice",
        "text": "Write short and clear notes. Include what happened, what the customer said, and what needs to happen next."
      },
      {
        "heading": "Use the daily work queue",
        "text": "Customer Interactions brings contact records together across customers. Use its due/overdue views and Next Follow-Up dates for your daily callback routine."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/customer-interactions"
    }
  },
  {
    "id": "referralInfo",
    "title": "Referral Information",
    "icon": "🤝",
    "category": "Deals",
    "summary": "Explains how referral information is tracked on deals.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "Referral information helps the dealership track who referred a customer and whether referral money was paid."
      },
      {
        "heading": "Referral Fields",
        "text": "A deal can include referral tracking details.",
        "items": [
          "Referred by name.",
          "Referred by phone.",
          "Referral money paid status.",
          "Referral amount paid."
        ]
      },
      {
        "heading": "When to Use",
        "text": "Use referral information only when a customer or deal came from a referral. If there is no referral, leave the fields blank."
      }
    ]
  },
  {
    "id": "paymentCenter",
    "title": "Payment Center",
    "icon": "💳",
    "category": "Payments",
    "summary": "Explains the Add Payment page and how to choose between deal payments and maintenance payments.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "The Payment Center is used to take both deal installment payments and maintenance invoice payments from one screen."
      },
      {
        "heading": "Payment Types",
        "text": "Employees should choose the correct payment mode before saving.",
        "items": [
          "Use Deal / Installment Payment for customer financing payments.",
          "Use Maintenance Payment for repair or service invoice payments.",
          "Use the receipt prompt after saving to print or view a receipt.",
          "Use notes to explain any special payment situation."
        ]
      },
      {
        "heading": "Important",
        "text": "Do not record a maintenance payment under a deal payment, and do not record a deal payment under maintenance. The balance will update in the wrong place."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/add-payment"
    }
  },
  {
    "id": "paymentMethods",
    "title": "Payment Methods",
    "icon": "💰",
    "category": "Payments",
    "summary": "Explains the payment methods available and how Referral Credit should be treated.",
    "sections": [
      {
        "heading": "Available Payment Methods",
        "text": "Employees can record payments using the available payment methods.",
        "items": [
          "Cash.",
          "Zelle.",
          "Cash App.",
          "Apple Pay.",
          "Card.",
          "Check.",
          "ACH.",
          "Referral Credit.",
          "Other."
        ]
      },
      {
        "heading": "Referral Credit",
        "text": "Referral Credit is used when a customer earned a referral bonus and wants to apply that bonus toward their own balance."
      },
      {
        "heading": "Important Accounting Rule",
        "text": "Referral Credit reduces the customer's balance, but it should not be counted as real cash collected. Reports should separate cash collected from referral credits applied."
      }
    ]
  },
  {
    "id": "addPayment",
    "title": "How to Add a Deal Payment",
    "icon": "💵",
    "category": "Payments",
    "summary": "Steps employees should follow when entering a customer installment payment.",
    "sections": [
      {
        "heading": "Before Adding Payment",
        "text": "Before saving a payment, confirm the customer, deal tag, total remaining balance, amount received, payment method, and correct installment due date."
      },
      {
        "heading": "Steps",
        "text": "Follow these steps when adding a deal payment.",
        "items": [
          "Open Add Payment.",
          "Choose Deal / Installment Payment.",
          "Search and select the correct customer deal.",
          "Review the selected deal summary and total remaining balance.",
          "Select the correct due installment.",
          "Enter the amount paid or credit applied.",
          "Choose payment method.",
          "Add notes if needed.",
          "Review the payment allocation preview.",
          "Save the payment.",
          "Print or view the receipt if required."
        ]
      },
      {
        "heading": "Review this payment before saving",
        "text": "Check the customer/deal, payment date, method and amount in the review panel. Total deal balance before includes future installments. Estimated deal balance after and Selected installment after are different amounts; review both and the promised date when a remainder is owed. These are estimates from the loaded account, not confirmation that money was saved. Read the confirmation dialog, then verify Payment History and the receipt after success."
      },
      {
        "heading": "Partial Payments",
        "text": "If the customer pays less than the selected installment amount, enter the partial amount and provide a promised date for the remaining balance."
      },
      {
        "heading": "Extra Payments",
        "text": "If a customer pays more than the selected installment balance, the extra amount should be applied toward the next unpaid installment automatically."
      },
      {
        "heading": "Important",
        "text": "Do not enter fake or estimated payments. Only record payments that were actually received or approved as a valid credit."
      },
      {
        "heading": "One save, one operation",
        "text": "All selected deal-payment allocations, related promise updates and deal status changes are saved together. Wait for confirmation. Separate legitimate payments are separate submissions; an uncertain response should be recovered first."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/add-payment"
    }
  },
  {
    "id": "extraPaymentAllocation",
    "title": "Extra Payment Allocation",
    "icon": "➕",
    "category": "Payments",
    "summary": "Explains what happens when a customer pays more than the current installment.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "Extra payment allocation helps keep the due schedule accurate when a customer pays more than one installment or pays extra toward the next installment."
      },
      {
        "heading": "How It Works",
        "text": "The system applies the payment to the selected due installment first. Any extra amount is applied to the next unpaid installments in order.",
        "items": [
          "Selected installment is paid first.",
          "Extra money goes to the next unpaid installment.",
          "If the next installment is only partially covered, it remains partially paid.",
          "The customer balance is reduced by the full valid payment amount."
        ]
      },
      {
        "heading": "Overpayment With No Installments Left",
        "text": "If the customer tries to pay more than the total remaining open balance, the extra amount should not be saved as a normal payment. The employee should record only the remaining balance and handle the extra amount as a refund or outside adjustment."
      },
      {
        "heading": "Example",
        "text": "If the customer owes $500 on the last installment but gives $600, only $500 should be recorded as the deal payment. The extra $100 should not reduce the balance below zero."
      },
      {
        "heading": "Best Practice",
        "text": "Always select the correct starting due installment before entering an extra payment. Review the allocation preview before saving."
      }
    ]
  },
  {
    "id": "maintenancePayments",
    "title": "Maintenance Payments",
    "icon": "🛠️",
    "category": "Maintenance",
    "summary": "Explains how to take payments for maintenance invoices and repair balances.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "Maintenance payments are used when a customer pays for a repair, service job, parts, labor, or other maintenance invoice."
      },
      {
        "heading": "Steps",
        "text": "Follow these steps when taking a maintenance payment.",
        "items": [
          "Open Add Payment.",
          "Choose Maintenance Payment.",
          "Search for the open maintenance invoice.",
          "Select the correct invoice and customer.",
          "Confirm the balance and invoice details.",
          "Enter the amount paid.",
          "Choose the payment method.",
          "Add notes if needed.",
          "Save the payment.",
          "Print or view the maintenance receipt if required."
        ]
      },
      {
        "heading": "Important",
        "text": "Always confirm the invoice number, customer name, work title, and balance before saving a maintenance payment."
      },
      {
        "heading": "Separate payment workflow",
        "text": "Maintenance invoice payments use their own workflow. The deal-payment recovery and atomic-save guarantees described elsewhere do not apply to maintenance payments. If an invoice save is uncertain, inspect its payment history and contact the administrator before retrying."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/add-payment"
    }
  },
  {
    "id": "maintenanceRecords",
    "title": "Maintenance Records",
    "icon": "🔧",
    "category": "Maintenance",
    "summary": "Explains the maintenance page and how to manage service or repair records.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "The Maintenance page tracks repair invoices, customer information, truck details, technician work, parts, labor, payments, promises, and balances."
      },
      {
        "heading": "Common Actions",
        "text": "Employees can manage maintenance work from this page.",
        "items": [
          "Add a maintenance record.",
          "Edit a maintenance record.",
          "Take a maintenance payment.",
          "Schedule a maintenance payment promise.",
          "Print a maintenance invoice.",
          "View payment and promise history."
        ]
      },
      {
        "heading": "Best Practice",
        "text": "Keep job title, work description, labor amount, parts amount, due date, and technician information accurate."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/maintenance"
    }
  },
  {
    "id": "dueSchedule",
    "title": "Due Schedule",
    "icon": "📆",
    "category": "Payments",
    "summary": "Explains how to read monthly, biweekly, and one-time due schedules.",
    "sections": [
      {
        "heading": "What the Due Schedule Shows",
        "text": "The due schedule shows each installment, due date, payment frequency, amount due, amount paid, remaining amount, and current status."
      },
      {
        "heading": "Schedule Types",
        "text": "Different deal types can have different schedules.",
        "items": [
          "Monthly deals create one installment per month.",
          "Biweekly deals create one installment every 14 days.",
          "Registration Money creates one one-time scheduled receivable.",
          "Cash deals do not require a payment schedule."
        ]
      },
      {
        "heading": "Status Meaning",
        "text": "Each installment can have a different status.",
        "items": [
          "Paid means the installment is fully paid.",
          "Partial means some money was received but balance remains.",
          "Due means the installment is currently due.",
          "Past Due means the due date has passed and money is still owed.",
          "Promise Pending means the customer promised to pay later.",
          "Promise Broken means the promised date passed without full payment."
        ]
      },
      {
        "heading": "Best Practice",
        "text": "Review the due schedule before taking payment so the payment is applied to the correct installment."
      },
      {
        "heading": "Semi-monthly and skipped installments",
        "text": "Semi-monthly uses the configured two dates each month; it is different from every 14 days. Short months use clamped dates. Skip installment moves an obligation to the end of the schedule; it does not forgive debt. Review the resulting schedule. Captured installments may not be moved or cancelled."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/due-payments"
    }
  },
  {
    "id": "promises",
    "title": "Payment Promises",
    "icon": "🤝",
    "category": "Payments",
    "summary": "Explains how payment promises should be used.",
    "sections": [
      {
        "heading": "What is a Promise?",
        "text": "A promise is used when a customer cannot fully pay now but gives a future date to pay the remaining amount."
      },
      {
        "heading": "When to Create a Promise",
        "text": "Create a promise when the customer gives a clear payment date and amount expectation.",
        "items": [
          "Customer makes a partial payment.",
          "Customer requests extra time.",
          "Customer gives a specific promised payment date.",
          "Management wants follow-up tracking."
        ]
      },
      {
        "heading": "Important",
        "text": "Do not create a promise without a clear promised date. Always add notes explaining the customer agreement."
      },
      {
        "heading": "Current commitment and history",
        "text": "Use Mark Paid for the full current promise balance, the partial-payment action for a smaller payment and new promise date, or Reschedule to change the commitment date. Previous Partial Paid or Rescheduled entries remain history; only the current Pending or Broken commitment contributes to active promise totals."
      },
      {
        "heading": "Promise amounts are not extra debt",
        "text": "If a $500 installment receives $200 and the remainder is promised, the remaining obligation is $300—not $800. If the promised date passes with an unpaid remainder, the current promise is shown as Broken and still needs follow-up."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/promises"
    }
  },
  {
    "id": "receipts",
    "title": "Receipts & Account Summary",
    "icon": "🧾",
    "category": "Receipts",
    "summary": "Explains how to print receipts, invoices, and account summaries.",
    "sections": [
      {
        "heading": "Payment Receipt",
        "text": "A receipt can be printed after a payment is saved. It shows customer, deal or invoice, payment amount, payment method, date, and remaining balance."
      },
      {
        "heading": "Maintenance Receipt",
        "text": "A maintenance receipt shows the customer name, invoice number, work title, payment amount, previous balance, and remaining balance."
      },
      {
        "heading": "Account Summary",
        "text": "The account summary gives a broader view of the customer account, including deal details, total paid, balance, payments, and promises."
      },
      {
        "heading": "Referral Credit Receipts",
        "text": "If Referral Credit is applied as payment, the receipt should clearly show the method as Referral Credit so it is not confused with cash received."
      },
      {
        "heading": "Best Practice",
        "text": "Print or save receipts immediately after payment when the customer requests proof of payment."
      }
    ]
  },
  {
    "id": "reports",
    "title": "Reports",
    "icon": "📊",
    "category": "Reports",
    "summary": "Explains how employees and managers can use reports.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "Reports help management review collections, balances, due payments, paid-off deals, defaulted deals, maintenance balances, payment activity, company information, payment methods, and referral information."
      },
      {
        "heading": "Common Reports",
        "text": "The Reports page includes several useful exports.",
        "items": [
          "Full Deals Report.",
          "Customer Balance Report.",
          "Collection Priority.",
          "Past Due Scheduled Payments.",
          "Due Today.",
          "Past Due Promises.",
          "Paid Off Deals.",
          "Defaulted Deals.",
          "Registration Money.",
          "Monthly Collection.",
          "Daily Collection Summary.",
          "Maintenance Balances."
        ]
      },
      {
        "heading": "Cash vs Referral Credit",
        "text": "Reports should separate real cash collected from Referral Credit applied. Referral Credit reduces the customer balance, but it should not be counted as cash collected."
      },
      {
        "heading": "Payment Method Breakdown",
        "text": "Payment Method Breakdown shows payment method totals for the selected report month. If it says no data available, check that the selected month matches the payment dates."
      },
      {
        "heading": "Important",
        "text": "Exported reports may contain customer and financial information. Do not share them with unauthorized people."
      },
      {
        "heading": "Avoid counting a promise twice",
        "text": "A scheduled installment and its promise describe the same debt. Due Payments combines them without counting the installment twice. In the Collection Priority CSV, a promise already covered by a scheduled row has Amount 0; Promise_Remaining and Amount_Explanation retain its collection context."
      },
      {
        "heading": "Compare the same scope",
        "text": "Match the customer/deal, report date, filters and payment method before comparing totals. Voided payments do not count as collected. Some portfolio cards subtract aggregate totals while reports clamp each deal balance at zero; overpaid historical accounts can therefore produce a difference. Report unexplained differences instead of changing old records."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/reports"
    }
  },
  {
    "id": "calendarReminders",
    "title": "Calendar Reminders",
    "icon": "⏰",
    "category": "Tools",
    "summary": "Explains how to create reminders for customer collections.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "Calendar reminders help employees remember when to follow up with customers for upcoming or past-due payments."
      },
      {
        "heading": "Reminder Options",
        "text": "RK PayTrack supports reminder options from the customer page and from individual due schedule rows.",
        "items": [
          "Use Google Calendar to open a pre-filled calendar event.",
          "Use ICS download for Apple Calendar, Outlook, or Google Calendar import.",
          "Use Add All reminders to create reminders for all unpaid due dates."
        ]
      },
      {
        "heading": "Best Practice",
        "text": "Use reminders for customers with upcoming payments, partial payments, promises, or repeated late payments."
      }
    ]
  },
  {
    "id": "activityLogs",
    "title": "Activity Logs",
    "icon": "📋",
    "category": "Tools",
    "summary": "Explains how activity logs help track important system actions.",
    "sections": [
      {
        "heading": "Purpose",
        "text": "Activity Logs help management review important actions performed in the system, such as payments, updates, receipts, reports, and other business activity."
      },
      {
        "heading": "How to Use",
        "text": "Employees and managers can use filters to find specific activity.",
        "items": [
          "Search by user, action, customer, invoice, or deal tag.",
          "Filter by module.",
          "Filter by action.",
          "Filter by date range.",
          "Use pagination to review logs in smaller pages."
        ]
      },
      {
        "heading": "Best Practice",
        "text": "Use Activity Logs when you need to understand who changed something, when an action happened, or what record was affected."
      },
      {
        "heading": "Use financial history to confirm money",
        "text": "Activity attribution uses the signed-in account. Activity logs are supporting context, not the authoritative payment ledger; a missing log is not proof that a payment failed. Check Payment History and recovery before retrying."
      }
    ],
    "action": {
      "label": "Go to this workflow",
      "to": "/activity-logs"
    }
  },
  {
    "id": "voidPayment",
    "title": "Voiding a Payment",
    "icon": "🚫",
    "category": "Payments",
    "summary": "Explains when and how voiding should be used.",
    "sections": [
      {
        "heading": "When to Void",
        "text": "Void a payment only when it was entered incorrectly, duplicated, or needs to be removed from balance calculations."
      },
      {
        "heading": "Why Void Instead of Delete?",
        "text": "Voiding keeps a record that the payment existed while excluding it from totals. This helps maintain better audit history."
      },
      {
        "heading": "What Voiding Affects",
        "text": "Voided payments should not count toward total paid, cash collected, referral credits applied, deal balance, maintenance balance, reports, or due schedule calculations."
      },
      {
        "heading": "Best Practice",
        "text": "Always enter a clear void reason so management can understand why the payment was voided."
      },
      {
        "heading": "Verify the recalculated account",
        "text": "For deal payments, voiding excludes the amount from valid collected totals and recalculates the current promise from remaining non-voided payments. Example: $500 owed, payments of $200 and $100, then void $200: valid paid is $100 and remaining is $400. A previously Paid Off deal can reopen to Active when money is still owed. Historical promise ancestors remain history."
      }
    ]
  },
  {
    "id": "commonMistakes",
    "title": "Common Mistakes to Avoid",
    "icon": "⚠️",
    "category": "Best Practices",
    "summary": "Important mistakes employees should avoid while using RK PayTrack.",
    "sections": [
      {
        "heading": "Avoid These Mistakes",
        "text": "Small data entry mistakes can affect balances, due reports, receipts, and customer follow-up.",
        "items": [
          "Do not select the wrong customer or deal tag.",
          "Do not select the wrong maintenance invoice.",
          "Do not enter payment under the wrong due date.",
          "Do not forget to mark incorrect payments as voided.",
          "Do not create promises without a promised date.",
          "Do not count Referral Credit as cash collected.",
          "Do not record more than the customer’s remaining open balance.",
          "Do not ignore the Schedule Math Check warning when creating a deal.",
          "Do not forget to add follow-up notes after important customer conversations.",
          "Do not export reports and share them without approval.",
          "Do not ignore broken promises or past-due installments."
        ]
      },
      {
        "heading": "Best Practice",
        "text": "Before saving anything, verify customer name, company name, deal tag or invoice number, payment amount, due date, payment method, total remaining balance, and notes."
      }
    ]
  },
  {
    "id": "dailyRoutine",
    "title": "Your daily workflow",
    "category": "Basics",
    "summary": "A short routine for opening the day, contacting customers and checking your work.",
    "sections": [
      {
        "heading": "Start with today’s work",
        "text": "Sign in with your own account. Review Dashboard, Due Payments and Promises; then open Customer Interactions and refresh the queue."
      },
      {
        "heading": "Work the contact queue",
        "text": "Start with overdue callbacks, then today’s follow-ups. Read the customer account and prior notes before contacting them. Give open items in Needs a date a next follow-up date."
      },
      {
        "heading": "Record the right kind of record",
        "text": "Save received money through Add Payment, financial commitments through the deal’s payment/promise workflow, and conversation outcomes through Customer Interactions. A note alone does not change a balance."
      },
      {
        "heading": "Finish the day",
        "text": "Review today’s interactions, unresolved payment recovery, payment history and requested receipts. Check Reports using the correct dates and methods. Leave a clear next step for unfinished work."
      }
    ],
    "action": {
      "label": "Open Customer Interactions",
      "to": "/customer-interactions"
    }
  },
  {
    "id": "paymentRecovery",
    "title": "Recover an unconfirmed payment",
    "category": "Payments",
    "summary": "Use the recovery banner when a deal payment or promise operation did not receive a clear confirmation.",
    "sections": [
      {
        "heading": "When the banner appears",
        "text": "The recovery banner is normally hidden. It appears when a saved deal payment or promise operation needs confirmation, or when the browser cannot check recovery state. An unavailable-payment notice can also appear during an update."
      },
      {
        "heading": "Recover before starting another payment",
        "text": "Use the same browser profile, website address and signed-in account that submitted the operation.",
        "items": [
          "Do not clear browser data or switch to another device to retry an uncertain payment.",
          "Select Recover Payment and wait for the result.",
          "Select Open confirmed account, then review Payment History, balance and the receipt.",
          "If recovery still fails, retain the exact error and contact the system administrator. Do not create another payment to work around it."
        ]
      },
      {
        "heading": "What recovery does",
        "text": "It retries the original request with the original amount and details. If that request already committed, its stored result is returned without creating another payment. If it did not commit, the original operation may be saved now. Recovery is not a read-only lookup."
      },
      {
        "heading": "What recovery does not do",
        "text": "It does not edit, refund or void a payment. It does not recover maintenance invoice payments. A confirmed validation rejection may leave no request to recover; review the account and correct the form before submitting again."
      }
    ],
    "action": {
      "label": "Open Add Payment",
      "to": "/add-payment"
    }
  },
  {
    "id": "customerInteractions",
    "title": "Customer Interactions: daily use",
    "category": "Customers",
    "summary": "Keep a reliable contact history and a dated queue of callbacks.",
    "sections": [
      {
        "heading": "Review before calling",
        "text": "Click Refresh. Work Overdue callbacks and Due today & overdue first. Open Customer to review the balance, payment history and existing promises. Needs a date contains Open or Needs Follow-up items without a next date."
      },
      {
        "heading": "Log each conversation or attempt",
        "text": "Use + Add Interaction or Log new contact. Select the customer, Outcome, Method and actual Interaction Date. Add a specific note; use quick notes such as No answer or Left voicemail as a starting point."
      },
      {
        "heading": "Choose a clear next step",
        "text": "Set Next Follow-Up and priority when more work is needed.",
        "items": [
          "Needs Follow-up: another contact is needed; choose its date.",
          "Open: work remains unresolved; schedule the next review.",
          "Completed: this interaction’s task is finished.",
          "Resolved: the underlying issue has been settled."
        ]
      },
      {
        "heading": "Keep history useful",
        "text": "Log a new contact for the next conversation; mark the previous follow-up Done when its task is complete. Use Edit to correct a record. Check Today and Upcoming before finishing your shift. Employee filters identify the logged employee, not a separate assignment system."
      },
      {
        "heading": "Notes are not financial transactions",
        "text": "Payment taken records a conversation only: enter the actual transaction in Add Payment. Customer promised payment is not a tracked financial promise: use the relevant deal and installment workflow. Interaction notes do not automatically reconcile balances or close when a customer pays."
      }
    ],
    "action": {
      "label": "Open Customer Interactions",
      "to": "/customer-interactions"
    }
  },
  {
    "id": "dealStories",
    "title": "Deal Stories",
    "category": "Tools",
    "summary": "A shared dealership notebook for longer context that does not change financial records.",
    "sections": [
      {
        "heading": "Write and find a story",
        "text": "Open Deal Stories, add a clear title and factual body, and save. Search existing stories before adding another. Use Customer Interactions for dated callbacks and customer-linked contact history."
      },
      {
        "heading": "Understand the boundaries",
        "text": "Stories are shared with authorized users in this dealership workspace. They are not automatically linked to a customer, deal, payment or promise. Saving a story does not change balances or create a follow-up."
      },
      {
        "heading": "Keep your work and customer information safe",
        "text": "Save before leaving: drafts are not persistent. If a story changed while you were editing it, copy your text and reopen the latest story before saving. Include only information needed for the business; never put passwords or payment-card credentials in a story."
      }
    ],
    "action": {
      "label": "Open Deal Stories",
      "to": "/deal-stories"
    }
  },
  {
    "id": "troubleshooting",
    "title": "Payment errors and next steps",
    "category": "Support",
    "summary": "Resolve uncertainty without duplicating money or changing history.",
    "sections": [
      {
        "heading": "Payment was not confirmed",
        "text": "Read the exact message and inspect the account. If a recovery banner is present, use it first. If the payment was recorded but a receipt or follow-up step failed, do not submit a second payment."
      },
      {
        "heading": "Installment or promise changed",
        "text": "Another operation may have updated the account. Refresh the account and review current amounts. Recover any pending operation before preparing a new submission."
      },
      {
        "heading": "Legacy obligation or skip metadata needs review",
        "text": "Stop working on that affected transaction and send the deal tag, operation and exact error to the administrator. Do not guess dates, create replacement commitments, or delete history to get past the check."
      },
      {
        "heading": "Captured schedule cannot be changed",
        "text": "Once the new payment workflow captures an installment, changes to protected financial schedule fields can be blocked. Contact the administrator for a reviewed correction; changing customer contact details is a separate workflow."
      },
      {
        "heading": "Payment saves unavailable",
        "text": "Confirm your connection and refresh the application. The backend may be unavailable or undergoing an update. Existing account views can remain available; keep evidence of received funds and follow the dealership’s interruption procedure."
      }
    ]
  },
  {
    "id": "dealAccountSummary",
    "title": "Reading the customer deal summary",
    "category": "Deals",
    "summary": "Understand current amounts due, the full deal balance and active promises without adding the same debt twice.",
    "sections": [
      {
        "heading": "What needs attention now?",
        "text": "Outstanding through today combines open scheduled amounts and active promises dated today or earlier using the collection rules. A promise for the same scheduled obligation is counted once. For a $500 installment with $200 applied and $300 still promised, the remaining obligation is $300, not $800."
      },
      {
        "heading": "Read the status before collecting",
        "text": "Collection outstanding means an amount still needs attention. Nothing due now means no amount is currently due in this summary; it does not mean the deal is Paid Off. Future installments may remain. Schedule needs review or Review needed means a reliable current-due amount is unavailable, not zero. Review the payment schedule and promise history on the same page."
      },
      {
        "heading": "Understand the balance cards",
        "text": "Total Financed is the deal amount. Applied to Balance includes valid payments and credits and excludes voided entries. Total Deal Balance includes future installments. Active Promised Amount represents part of existing debt; never add it again to Total Deal Balance or the current-due summary."
      },
      {
        "heading": "Amounts that need review",
        "text": "The current-due summary applies to Active deals with a generated schedule. Other deal statuses require review of the account and promise history. If records disagree, preserve the transaction history and report the discrepancy before making a correction."
      }
    ]
  },
  {
    "id": "legacyPromiseCompatibility",
    "title": "Older promise compatibility",
    "category": "Payments",
    "summary": "What staff should do when an older promise is blocked by a historical-data check.",
    "sections": [
      {
        "heading": "Recognize a blocked save",
        "text": "An error such as “Historical promise basis needs review” asks for a review of older promise amounts and installment allocations. It is not permission to recreate payments, change historical dates or force a different balance."
      },
      {
        "heading": "Preserve the original transaction",
        "text": "Check Payment History before trying again. If the response is uncertain and recovery is available, keep the same browser, site and account and use the original request. Recovery may complete the original operation; it does not just look up its status. A confirmed validation rejection may have no recovery request."
      },
      {
        "heading": "What an administrator can review",
        "text": "Provide the deal reference, intended installment, amount, date, method and exact error through the approved support channel. An administrator can check whether the reviewed compatibility patch matches that database. Staff should not paste SQL, disable validation or re-enter the payment history."
      },
      {
        "heading": "After compatibility is confirmed",
        "text": "Record only the actual new payment or authorized promise action. Verify its single transaction, remaining installment, current promise, deal balance and receipt. Some ambiguous legacy records must still be rejected; compatibility is not a blanket repair of old data."
      }
    ]
  }
];
