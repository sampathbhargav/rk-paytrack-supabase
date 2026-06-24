import { useEffect, useMemo, useState } from "react";

function LegalPolicies() {
  const [activePolicy, setActivePolicy] = useState("acceptableUse");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [acknowledged, setAcknowledged] = useState(false);
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

  const selectedPolicy =
    policies.find((policy) => policy.id === activePolicy) || policies[0];

  const categories = [
    "All",
    ...new Set(policies.map((policy) => policy.category)),
  ];

  const filteredPolicies = useMemo(() => {
    const text = search.trim().toLowerCase();

    return policies.filter((policy) => {
      const matchesCategory =
        categoryFilter === "All" || policy.category === categoryFilter;

      const searchableText = [
        policy.title,
        policy.category,
        policy.purpose,
        ...policy.sections.map((section) => section.heading),
        ...policy.sections.map((section) => section.text),
        ...policy.sections.flatMap((section) => section.items || []),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !text || searchableText.includes(text);

      return matchesCategory && matchesSearch;
    });
  }, [search, categoryFilter]);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("All");
  };

  const handlePrintPolicy = () => {
    const html = buildPolicyPrintHtml(selectedPolicy);
    printHtmlWithIframe(html, selectedPolicy.title);
  };

  return (
    <div style={isMobile ? mobilePageWrapper : pageWrapper}>
      <div style={isMobile ? mobileHeroCard : heroCard}>
        <div>
          <div style={eyebrow}>RK PayTrack Governance</div>

          <h1 style={isMobile ? mobilePageTitle : pageTitle}>
            Legal & Policies
          </h1>

          <p style={isMobile ? mobilePageDescription : pageDescription}>
            Review internal software-use rules, customer privacy expectations,
            terms, security responsibilities, compliance reminders, trademark
            checks, and payment-record policies.
          </p>

          <div style={isMobile ? mobileHeroPills : heroPills}>
            <span style={heroPill}>Acceptable Use</span>
            <span style={heroPill}>Privacy</span>
            <span style={heroPill}>Terms</span>
            <span style={heroPill}>Compliance</span>
            <span style={heroPill}>Trademark</span>
          </div>
        </div>

        <div style={isMobile ? mobileHeroStats : heroStats}>
          <div style={isMobile ? mobileHeroStatCard : heroStatCard}>
            <span>Total Policies</span>
            <strong>{policies.length}</strong>
          </div>

          <div style={isMobile ? mobileHeroStatCard : heroStatCard}>
            <span>Categories</span>
            <strong>{categories.length - 1}</strong>
          </div>
        </div>
      </div>

      <div style={noticeBox}>
        <strong>Important:</strong> These are internal templates and are not
        legal advice. Final Privacy Policy, Terms of Service, vendor agreement,
        trademark filing, and compliance documents should be generated through a
        legal-policy service such as Termly or iubenda and reviewed by an
        attorney before public use, resale, licensing, or production release.
      </div>

      <div style={isMobile ? mobileQuickPolicyGrid : quickPolicyGrid}>
        <QuickPolicyCard
          icon="✅"
          title="Acceptable Use"
          text="Users must use RK PayTrack only for approved business purposes."
        />

        <QuickPolicyCard
          icon="🔒"
          title="Privacy"
          text="Customer, payment, balance, and report information must be protected."
        />

        <QuickPolicyCard
          icon="📄"
          title="Terms"
          text="Terms define user responsibilities, prohibited conduct, and limitations."
        />

        <QuickPolicyCard
          icon="™️"
          title="Trademark"
          text="Search USPTO before treating RK PayTrack as a final product brand."
        />
      </div>

      <div style={isMobile ? mobileToolbar : toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search policies..."
          style={isMobile ? mobileSearchInput : searchInput}
        />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          style={isMobile ? mobileSelectStyle : selectStyle}
        >
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleClearFilters}
          style={isMobile ? mobileClearButton : clearButton}
        >
          Clear
        </button>
      </div>

      <div style={isMobile ? mobileContentGrid : contentGrid}>
        <aside style={isMobile ? mobilePolicyList : policyList}>
          <div style={policyListHeader}>
            <strong>Policies</strong>
            <span>{filteredPolicies.length} shown</span>
          </div>

          {filteredPolicies.length === 0 ? (
            <div style={emptySearchBox}>
              No policies found. Try clearing the search.
            </div>
          ) : (
            filteredPolicies.map((policy) => (
              <button
                key={policy.id}
                type="button"
                onClick={() => {
                  setActivePolicy(policy.id);
                  setAcknowledged(false);
                }}
                style={{
                  ...(isMobile ? mobilePolicyButton : policyButton),
                  ...(activePolicy === policy.id ? activePolicyButton : {}),
                }}
              >
                <span style={policyIcon}>{policy.icon}</span>

                <span style={policyButtonText}>
                  <strong>{policy.title}</strong>
                  <small>{policy.category}</small>
                </span>
              </button>
            ))
          )}
        </aside>

        <main style={isMobile ? mobilePolicyContent : policyContent}>
          <div
            style={
              isMobile ? mobilePolicyContentHeader : policyContentHeader
            }
          >
            <div>
              <div style={policyCategoryBadge}>{selectedPolicy.category}</div>

              <h2 style={isMobile ? mobilePolicyTitle : policyTitle}>
                <span style={policyTitleIcon}>{selectedPolicy.icon}</span>
                {selectedPolicy.title}
              </h2>

              <p style={policySubtitle}>{selectedPolicy.purpose}</p>
            </div>

            <button
              type="button"
              onClick={handlePrintPolicy}
              style={isMobile ? mobilePrintButton : printButton}
            >
              Print Policy
            </button>
          </div>

          <div style={isMobile ? mobilePolicyMetaGrid : policyMetaGrid}>
            <PolicyMeta label="Policy Type" value={selectedPolicy.category} />
            <PolicyMeta label="Owner" value="Management / System Admin" />
            <PolicyMeta
              label="Applies To"
              value="Authorized RK PayTrack Users"
            />
            <PolicyMeta label="Status" value="Template - Review Required" />
          </div>

          <div style={policyBody}>
            {selectedPolicy.sections.map((section, index) => (
              <div
                key={section.heading}
                style={isMobile ? mobileSectionBox : sectionBox}
              >
                <div style={sectionNumber}>{index + 1}</div>

                <div>
                  <h3 style={sectionHeading}>{section.heading}</h3>
                  <p style={sectionText}>{section.text}</p>

                  {section.items && (
                    <ul style={sectionList}>
                      {section.items.map((item) => (
                        <li key={item} style={sectionListItem}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            style={
              isMobile ? mobileAcknowledgementBox : acknowledgementBox
            }
          >
            <div>
              <h3 style={acknowledgementTitle}>Acknowledgement</h3>
              <p style={acknowledgementText}>
                By using RK PayTrack, users acknowledge that they have read,
                understood, and agree to follow this policy and all related
                company procedures.
              </p>
            </div>

            <label
              style={
                isMobile
                  ? mobileAcknowledgementCheck
                  : acknowledgementCheck
              }
            >
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              I reviewed this policy.
            </label>
          </div>

          {acknowledged && (
            <div style={acknowledgedBox}>
              Policy reviewed on {new Date().toLocaleString()}.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function QuickPolicyCard({ icon, title, text }) {
  return (
    <div style={quickPolicyCard}>
      <div style={quickPolicyIcon}>{icon}</div>
      <div>
        <h3 style={quickPolicyTitle}>{title}</h3>
        <p style={quickPolicyText}>{text}</p>
      </div>
    </div>
  );
}

function PolicyMeta({ label, value }) {
  return (
    <div style={policyMetaCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const policies = [
  {
    id: "acceptableUse",
    title: "Acceptable Use Policy",
    icon: "✅",
    category: "System Use",
    purpose:
      "Defines how authorized users may and may not use RK PayTrack, company data, reports, payment tools, and customer records.",
    sections: [
      {
        heading: "Purpose",
        text:
          "This Acceptable Use Policy protects RK PayTrack, company records, customer information, payment data, maintenance invoices, reports, and dealership operations by setting clear rules for approved system use.",
      },
      {
        heading: "Authorized Business Use Only",
        text:
          "RK PayTrack may be used only by approved users for legitimate dealership business purposes.",
        items: [
          "View customer, deal, payment, promise, maintenance, and report information only for approved business needs.",
          "Record payments only when money has actually been received and verified.",
          "Create promises only when the customer gives a clear future payment date or follow-up commitment.",
          "Use reports only for accounting, management, reconciliation, collections, or authorized review.",
          "Print receipts, invoices, and customer summaries only for business purposes.",
        ],
      },
      {
        heading: "Prohibited Use",
        text:
          "Users must not use RK PayTrack in a way that creates privacy, security, financial, operational, legal, or reputational risk.",
        items: [
          "Do not share passwords, login sessions, or system access with anyone.",
          "Do not use another employee's account.",
          "Do not enter false, estimated, fake, backdated, or misleading payments.",
          "Do not change balances, promises, due dates, invoices, notes, or customer records without authorization.",
          "Do not export reports for personal use or send them to unauthorized people.",
          "Do not copy, resell, reverse engineer, modify, or redistribute the software without written approval.",
          "Do not attempt to bypass login, permissions, database controls, audit logs, or security settings.",
          "Do not use RK PayTrack to harass, threaten, discriminate, or misuse customer information.",
        ],
      },
      {
        heading: "User Responsibility",
        text:
          "Users are responsible for reviewing information before saving records or taking business action.",
        items: [
          "Verify customer name, phone number, deal tag, invoice number, payment amount, payment date, and payment method before saving.",
          "Review balances and reports before relying on them for collection, accounting, or management decisions.",
          "Use notes honestly and professionally.",
          "Report incorrect records, suspected unauthorized access, system issues, or suspicious activity immediately.",
        ],
      },
      {
        heading: "Violation",
        text:
          "Violations may result in access removal, management review, disciplinary action, legal action, or other remedies available under company policy and applicable law.",
      },
    ],
  },
  {
    id: "officialLegalSetup",
    title: "Official Legal Document Setup",
    icon: "⚖️",
    category: "Legal Setup",
    purpose:
      "Explains how RK PayTrack should handle official Privacy Policy, Terms of Service, and legal document publishing.",
    sections: [
      {
        heading: "Purpose",
        text:
          "This app page contains internal policy templates. It should not be treated as the final legal agreement by itself. Official legal documents should be generated, reviewed, versioned, and approved before production, resale, licensing, or public release.",
      },
      {
        heading: "Recommended Legal Tools",
        text:
          "For official hosted documents, management may use a legal policy generator and then obtain attorney review.",
        items: [
          "Use Termly for a USA-focused Privacy Policy, Terms of Service, cookie/consent tools, and policy hosting.",
          "Use iubenda if the business wants broader international privacy, cookie, SaaS, and multilingual compliance support.",
          "Use a qualified attorney before relying on these documents for resale, licensing, public use, or customer-facing SaaS use.",
          "Store final official legal-document links inside the app, website, login page, and customer/vendor onboarding flow.",
        ],
      },
      {
        heading: "Documents to Publish",
        text:
          "Before production or external use, the business should publish and maintain official versions of the following documents.",
        items: [
          "Privacy Policy.",
          "Terms of Service or Terms and Conditions.",
          "End User License Agreement or Internal Use Agreement.",
          "Data Processing Addendum if the app is used for another company or customer.",
          "Cookie Policy if a public website or tracking cookies are used.",
          "Security and Data Handling Policy.",
          "Support and Service Scope Statement.",
          "Trademark Notice.",
        ],
      },
      {
        heading: "Version Control",
        text:
          "Each legal document should have a version number, effective date, owner, approval status, and review date so the company can prove which version was active at a given time.",
      },
    ],
  },
  {
    id: "privacyPolicy",
    title: "Privacy Policy Template",
    icon: "🔒",
    category: "Privacy",
    purpose:
      "Describes how RK PayTrack may collect, store, use, protect, and share customer and business information.",
    sections: [
      {
        heading: "Information Collected",
        text:
          "RK PayTrack may store personal, vehicle, financial, payment, maintenance, and business information needed to operate dealership payment tracking.",
        items: [
          "Customer name, phone number, email, address, and contact notes.",
          "Deal tag, truck details, year, VIN, deal type, sale amount, due dates, maturity date, and balance.",
          "Payment date, payment method, amount paid, amount due, remaining amount, notes, and receipt details.",
          "Maintenance invoice information, labor amount, parts amount, tax, discounts, technician, work status, payment status, and balance.",
          "Promises, follow-up notes, collection notes, broken promises, disputes, and next follow-up dates.",
          "User account information such as email address, login/session data, and activity logs.",
        ],
      },
      {
        heading: "How Information Is Used",
        text:
          "Information should be used only for legitimate dealership business purposes.",
        items: [
          "Track customer balances, payments, promises, due dates, and maintenance invoices.",
          "Print receipts, invoices, customer statements, and account summaries.",
          "Perform accounting, reconciliation, reporting, management review, collections, and customer service.",
          "Investigate errors, void payments, correct records, monitor activity, and improve internal controls.",
          "Maintain security, audit history, and operational continuity.",
        ],
      },
      {
        heading: "How Information Is Shared",
        text:
          "Customer and business information should not be shared unless there is a valid business, legal, accounting, tax, collection, operational, or security reason.",
        items: [
          "Do not share customer balances with unauthorized people.",
          "Do not send reports to personal email accounts.",
          "Do not export customer data unless management approves the business purpose.",
          "Do not upload reports or customer data to unapproved websites or services.",
          "Only share data with authorized company personnel, accountants, legal advisors, service providers, or parties approved by management.",
        ],
      },
      {
        heading: "Security Safeguards",
        text:
          "The company should use reasonable administrative, technical, and physical safeguards to protect customer information.",
        items: [
          "Require login for system access.",
          "Restrict database access.",
          "Use strong passwords and multi-factor authentication where available.",
          "Review activity logs for sensitive actions.",
          "Back up important data.",
          "Limit exports and store exported reports securely.",
          "Remove access when employees leave or no longer need the system.",
        ],
      },
      {
        heading: "Privacy Policy Disclaimer",
        text:
          "This is a template summary for internal use. The final public Privacy Policy should be generated through a legal-policy service or attorney-reviewed document and customized to the company's actual data practices.",
      },
    ],
  },
  {
    id: "termsOfService",
    title: "Terms of Service Template",
    icon: "📄",
    category: "Legal Terms",
    purpose:
      "Defines the rules, responsibilities, limitations, and restrictions that apply when users access RK PayTrack.",
    sections: [
      {
        heading: "Acceptance of Terms",
        text:
          "By accessing or using RK PayTrack, users agree to follow these terms, company policies, and all approved procedures related to customer records, payments, reports, security, and data handling.",
      },
      {
        heading: "Authorized Access",
        text:
          "RK PayTrack is intended only for authorized users. The company may grant, suspend, restrict, or remove access at any time.",
        items: [
          "Users must keep login credentials confidential.",
          "Users must not access data unless they have a business need.",
          "Users must not allow another person to use their account.",
          "Users must report suspected unauthorized access immediately.",
        ],
      },
      {
        heading: "User Responsibilities",
        text:
          "Users are responsible for the accuracy and appropriateness of the records they create, edit, export, print, or rely on.",
        items: [
          "Confirm customer identity before discussing account information.",
          "Verify amounts and payment methods before saving payments.",
          "Use voiding procedures instead of deleting incorrect financial records.",
          "Review reports before using them for decisions.",
          "Do not misuse the system, data, exports, receipts, or customer information.",
        ],
      },
      {
        heading: "Prohibited Conduct",
        text:
          "Users must not perform actions that could harm the company, customers, software, data integrity, security, or legal compliance.",
        items: [
          "No unauthorized copying, distribution, resale, or sublicensing.",
          "No malicious use, tampering, hacking, scraping, automated abuse, or bypassing controls.",
          "No false entries, misleading notes, unauthorized edits, or fraudulent records.",
          "No use of the app for unlawful, abusive, discriminatory, harassing, or unauthorized purposes.",
        ],
      },
      {
        heading: "Termination and Access Removal",
        text:
          "The company may remove access if a user violates policy, changes roles, leaves employment, creates security risk, or no longer has a business need.",
      },
      {
        heading: "Template Notice",
        text:
          "This Terms of Service content is a starting template and should be reviewed by legal counsel before public release, customer-facing use, resale, licensing, or vendor use.",
      },
    ],
  },
  {
    id: "developerVendorDisclaimer",
    title: "Developer & Vendor Disclaimer",
    icon: "🧑‍💻",
    category: "Legal Terms",
    purpose:
      "Clarifies the limits of the developer/vendor role and the responsibilities of the business using RK PayTrack.",
    sections: [
      {
        heading: "Purpose",
        text:
          "This policy explains that RK PayTrack is a business-support tool. It helps organize records, but final business decisions remain the responsibility of the company and authorized users.",
      },
      {
        heading: "No Guarantee of Error-Free Records",
        text:
          "The software may calculate, display, or organize information based on data entered by users. Incorrect user input, missing records, duplicate entries, incorrect dates, incorrect payment methods, or changed business rules can affect results.",
        items: [
          "Users must verify records before relying on balances, reports, receipts, statements, or due schedules.",
          "Management should review reports before accounting, legal, collection, tax, or customer-facing use.",
          "The developer/vendor is not responsible for errors caused by incorrect data entry, unauthorized use, ignored warnings, failure to follow procedures, or misuse of the system.",
        ],
      },
      {
        heading: "No Legal, Tax, Accounting, or Collection Advice",
        text:
          "RK PayTrack does not provide legal, tax, accounting, credit, lending, collection, or financial advice. The company should consult qualified professionals before making decisions that require professional judgment.",
      },
      {
        heading: "Business Responsibility",
        text:
          "The company using RK PayTrack is responsible for approving policies, training users, reviewing records, complying with applicable laws, handling customer communications, securing exported files, and validating reports.",
      },
      {
        heading: "Attorney Review Required",
        text:
          "This disclaimer is a template. A lawyer should review vendor agreements, limitation-of-liability language, indemnity clauses, service scope, support obligations, privacy commitments, and data processing responsibilities before external licensing or resale.",
      },
    ],
  },
  {
    id: "limitationOfLiability",
    title: "Limitation of Liability Template",
    icon: "🛡️",
    category: "Legal Terms",
    purpose:
      "Provides draft limitation language to reduce risk when RK PayTrack is used, licensed, or supported.",
    sections: [
      {
        heading: "Important Warning",
        text:
          "Limitation-of-liability language can help reduce risk, but it is not a guaranteed lawsuit shield. Enforceability depends on the contract, state law, the parties, the facts, and attorney-reviewed wording.",
      },
      {
        heading: "Draft Limitation Concept",
        text:
          "To the maximum extent permitted by applicable law, RK PayTrack and its developer/vendor should not be responsible for indirect, incidental, special, consequential, exemplary, punitive, or business-loss damages arising from use or inability to use the software.",
        items: [
          "Loss of profits.",
          "Loss of revenue.",
          "Data-entry mistakes by users.",
          "Unauthorized user actions.",
          "Incorrect payment records entered by users.",
          "Customer disputes caused by inaccurate or incomplete business records.",
          "Failure to verify reports before business use.",
        ],
      },
      {
        heading: "Maximum Liability Concept",
        text:
          "A vendor agreement may include a maximum liability cap, such as fees paid for the software or services during a defined period. This must be drafted and approved by an attorney.",
      },
      {
        heading: "User Misuse",
        text:
          "Users and the company are responsible for consequences caused by misuse, unauthorized exports, false entries, sharing passwords, ignoring warnings, bypassing controls, or using the software for improper purposes.",
      },
    ],
  },
  {
    id: "dataPrivacyRights",
    title: "Data Privacy Rights Notice",
    icon: "🌐",
    category: "Privacy",
    purpose:
      "Summarizes privacy-rights concepts that may apply depending on customer location, business size, and applicable law.",
    sections: [
      {
        heading: "Purpose",
        text:
          "Privacy laws may give individuals rights related to access, correction, deletion, portability, opt-out, or restriction of certain personal information. Applicability depends on the business, customer location, data use, and legal thresholds.",
      },
      {
        heading: "Possible Privacy Rights",
        text:
          "Depending on applicable law, individuals may have some or all of the following rights.",
        items: [
          "Request access to personal information.",
          "Request correction of inaccurate personal information.",
          "Request deletion of certain personal information.",
          "Request a copy of personal information.",
          "Opt out of certain sales, sharing, targeted advertising, or profiling where applicable.",
          "Limit certain uses of sensitive personal information where applicable.",
        ],
      },
      {
        heading: "Company Review Required",
        text:
          "The company should define who handles privacy requests, how identity is verified, how responses are documented, and whether the law actually applies to the request.",
      },
      {
        heading: "Internal Reminder",
        text:
          "Employees should not promise deletion, correction, or disclosure of customer records without management review because records may be needed for accounting, contracts, disputes, collections, taxes, warranties, legal holds, or business recordkeeping.",
      },
    ],
  },
  {
    id: "ccpaNotice",
    title: "CCPA / US State Privacy Notice",
    icon: "🇺🇸",
    category: "Compliance",
    purpose:
      "Provides a practical checklist for California and US state privacy-law awareness.",
    sections: [
      {
        heading: "Purpose",
        text:
          "This notice helps management think about California and other US privacy requirements. It is not a final legal determination of whether the company is covered.",
      },
      {
        heading: "Business Applicability Review",
        text:
          "Management should review whether CCPA/CPRA or other US state privacy laws apply based on revenue, number of consumers, data-sharing practices, customer location, and other statutory thresholds.",
        items: [
          "Check whether the business meets California privacy-law thresholds.",
          "Check whether personal information is sold, shared, or used for targeted advertising.",
          "Check whether customer data is disclosed to service providers, contractors, accountants, lenders, collection vendors, or software providers.",
          "Check whether a privacy policy must list categories of personal information collected and purposes of use.",
          "Check whether privacy requests must be received, verified, tracked, and answered.",
        ],
      },
      {
        heading: "Employee Rule",
        text:
          "Employees should forward any privacy, deletion, access, correction, subpoena, legal, or data request to management instead of responding on their own.",
      },
    ],
  },
  {
    id: "gdprNotice",
    title: "GDPR Notice",
    icon: "🇪🇺",
    category: "Compliance",
    purpose:
      "Provides a GDPR awareness checklist if RK PayTrack ever handles personal data connected to individuals located in the EU/EEA.",
    sections: [
      {
        heading: "When to Review GDPR",
        text:
          "Management should review GDPR obligations if the company offers goods or services to people located in the EU/EEA, monitors behavior of people in the EU/EEA, receives EU/EEA customer data, or transfers EU/EEA personal data through vendors.",
      },
      {
        heading: "GDPR Checklist",
        text:
          "If GDPR applies, the company should not rely only on this internal policy page. A formal privacy program may be needed.",
        items: [
          "Identify legal basis for processing personal data.",
          "Publish a GDPR-compliant privacy notice.",
          "Define data subject request procedures.",
          "Review vendor/data processing agreements.",
          "Review cross-border transfer requirements.",
          "Keep data only as long as needed.",
          "Use appropriate security safeguards.",
          "Document breach response procedures.",
        ],
      },
      {
        heading: "Employee Rule",
        text:
          "Employees should report any international privacy request, EU/EEA-related data request, deletion request, access request, or data complaint to management immediately.",
      },
    ],
  },
  {
    id: "trademarkNotice",
    title: "Trademark & USPTO Check",
    icon: "™️",
    category: "Trademark",
    purpose:
      "Provides steps for checking whether the RK PayTrack name or logo may conflict with existing trademarks.",
    sections: [
      {
        heading: "Purpose",
        text:
          "Before treating RK PayTrack as a final product name, public brand, or resale product, the business should check whether the name, logo, or similar names may conflict with existing marks.",
      },
      {
        heading: "USPTO Search Checklist",
        text:
          "Use the official USPTO trademark search system and search broadly, not only exact matches.",
        items: [
          "Search for RK PayTrack.",
          "Search for PayTrack.",
          "Search for Pay Track.",
          "Search for RK Payment Tracking.",
          "Search similar spellings, spacing, and sounds.",
          "Search related software, finance, payment, dealership, SaaS, and business-management categories.",
          "Check live and dead marks, owners, goods/services, and classes.",
          "Save screenshots or PDFs of searches for internal records.",
        ],
      },
      {
        heading: "Attorney Review",
        text:
          "A trademark attorney should review search results before filing an application, selling the software, branding publicly, or sending marketing material to customers.",
      },
      {
        heading: "No Ownership Claim Until Reviewed",
        text:
          "Use of the name in the app does not guarantee trademark ownership, registration, or freedom to operate.",
      },
    ],
  },
  {
    id: "paymentRecords",
    title: "Payment Records Policy",
    icon: "💵",
    category: "Payments",
    purpose:
      "Defines expectations for entering, reviewing, voiding, and protecting payment records.",
    sections: [
      {
        heading: "Payment Accuracy",
        text:
          "Users must verify the customer, deal tag or invoice number, payment amount, payment date, due date, and payment method before saving any payment.",
      },
      {
        heading: "Deal Payments",
        text:
          "Deal payments should be recorded only under the correct customer deal and correct due installment.",
        items: [
          "Select the correct customer deal.",
          "Select the correct due installment.",
          "Enter only the actual amount received.",
          "Use the correct payment method.",
          "Add clear notes for special situations or partial payments.",
        ],
      },
      {
        heading: "Maintenance Payments",
        text:
          "Maintenance payments should be recorded only under the correct maintenance invoice.",
        items: [
          "Verify the invoice number.",
          "Verify the customer name and work title.",
          "Confirm the open maintenance balance.",
          "Record the actual amount received.",
          "Print or save the maintenance receipt if requested.",
        ],
      },
      {
        heading: "No Estimated Payments",
        text:
          "Users must not enter estimated, expected, future, fake, or unverified payments. Only actual received and verified payments should be recorded.",
      },
    ],
  },
  {
    id: "voidPayment",
    title: "Voiding a Payment",
    icon: "🚫",
    category: "Payments",
    purpose:
      "Explains when voiding should be used instead of deleting payment records.",
    sections: [
      {
        heading: "When to Void",
        text:
          "Void a payment only when it was entered incorrectly, duplicated, or needs to be excluded from balance calculations.",
      },
      {
        heading: "Why Void Instead of Delete?",
        text:
          "Voiding keeps a record that the payment existed while excluding it from totals. This helps maintain audit history and protects the business from unexplained missing payment records.",
      },
      {
        heading: "Void Reason",
        text:
          "Users should enter a clear void reason so management can understand why the payment was voided.",
        items: [
          "Wrong customer selected.",
          "Wrong amount entered.",
          "Duplicate payment entry.",
          "Wrong payment method.",
          "Wrong due date or invoice.",
          "Payment was not actually received.",
        ],
      },
      {
        heading: "Approval",
        text:
          "Management may require approval before voiding high-value payments, old payments, or payments that affect customer disputes.",
      },
    ],
  },
  {
    id: "dataRetention",
    title: "Data Retention Policy",
    icon: "🗂️",
    category: "Data",
    purpose:
      "Explains how long records should be kept and how they should be handled.",
    sections: [
      {
        heading: "Business Records",
        text:
          "Deal records, maintenance records, payment history, customer notes, promises, invoices, receipts, follow-up notes, activity logs, and reports should be retained according to company recordkeeping needs and applicable business requirements.",
      },
      {
        heading: "Voided and Corrected Records",
        text:
          "Payment records should generally be voided instead of permanently deleted so the business can maintain a clear account history.",
      },
      {
        heading: "Archived Data",
        text:
          "Old, closed, paid-off, cancelled, defaulted, or inactive accounts may be archived when they are no longer active but should remain available for business review when needed.",
      },
      {
        heading: "Activity Log Retention",
        text:
          "To control database size, routine activity logs may be retained for a limited period, such as 180 days or one year, unless management requires longer retention for disputes, audits, accounting, or legal holds.",
      },
    ],
  },
  {
    id: "accessControl",
    title: "User Access Policy",
    icon: "👤",
    category: "Access",
    purpose:
      "Defines who should have access to RK PayTrack and what responsibilities come with that access.",
    sections: [
      {
        heading: "Access Approval",
        text:
          "Only approved users should receive access to RK PayTrack. Access should be based on job role and business need.",
      },
      {
        heading: "Least Privilege",
        text:
          "Users should only receive the permissions needed to perform their job duties. Sensitive actions should be restricted.",
        items: [
          "Voiding payments.",
          "Editing deal totals.",
          "Editing maintenance invoice totals.",
          "Exporting reports.",
          "Viewing activity logs.",
          "Changing user access.",
          "Deleting or archiving records.",
        ],
      },
      {
        heading: "Access Removal",
        text:
          "Access should be removed when an employee no longer needs the system, changes roles, leaves the company, or creates security risk.",
      },
      {
        heading: "Account Security",
        text:
          "Users must protect login credentials and immediately report suspected unauthorized access.",
      },
    ],
  },
  {
    id: "securityPolicy",
    title: "Security Policy",
    icon: "🛡️",
    category: "Security",
    purpose:
      "Outlines basic security expectations for protecting RK PayTrack and its data.",
    sections: [
      {
        heading: "System Security",
        text:
          "The company should use reasonable safeguards to protect customer records, payment data, reports, and system access.",
      },
      {
        heading: "Recommended Controls",
        text:
          "Security controls should be reviewed regularly and improved as the software grows.",
        items: [
          "Use strong passwords.",
          "Enable multi-factor authentication where available.",
          "Restrict database access.",
          "Use authenticated database policies before production.",
          "Use role-based permissions when multiple employees use the app.",
          "Review sensitive activity logs.",
          "Avoid storing service role keys in frontend code.",
          "Keep software dependencies updated.",
          "Package and distribute the Electron app only through approved channels.",
        ],
      },
      {
        heading: "Suspicious Activity",
        text:
          "Users should report unusual system behavior, incorrect records, unauthorized changes, suspicious exports, or suspected security incidents immediately.",
      },
    ],
  },
  {
    id: "incidentResponse",
    title: "Incident Response Policy",
    icon: "🚨",
    category: "Security",
    purpose:
      "Explains what should happen if there is a suspected security, data, or system incident.",
    sections: [
      {
        heading: "Incident Examples",
        text:
          "An incident may include unauthorized access, missing records, incorrect payment changes, suspicious exports, system failure, malware, device loss, or possible customer-data exposure.",
      },
      {
        heading: "Reporting",
        text:
          "Users should immediately report suspected incidents to management or the person responsible for system administration.",
      },
      {
        heading: "Response Steps",
        text:
          "The company should review the issue, preserve important records, limit further damage, correct the problem, and document what happened.",
        items: [
          "Identify what happened.",
          "Limit access if needed.",
          "Review affected records.",
          "Preserve logs and relevant exports.",
          "Correct incorrect data.",
          "Notify appropriate people if required.",
          "Document the issue.",
          "Improve controls to prevent repeat issues.",
        ],
      },
    ],
  },
  {
    id: "backupRecovery",
    title: "Backup & Disaster Recovery Policy",
    icon: "💾",
    category: "Data",
    purpose:
      "Defines expectations for protecting data and restoring operations if something goes wrong.",
    sections: [
      {
        heading: "Backups",
        text:
          "The company should maintain regular backups of important RK PayTrack data, including customers, deals, payments, promises, maintenance records, maintenance payments, follow-up notes, and reports.",
      },
      {
        heading: "Exports",
        text:
          "CSV exports can be used as an additional business backup, but exported files must be protected because they may contain customer and financial information.",
      },
      {
        heading: "Recovery",
        text:
          "If the system becomes unavailable, management should have a process to restore access, recover data, and continue critical payment operations.",
      },
      {
        heading: "Testing",
        text:
          "Backups and recovery steps should be tested periodically to confirm that data can actually be restored when needed.",
      },
    ],
  },
  {
    id: "exportPolicy",
    title: "Report Export Policy",
    icon: "📊",
    category: "Reports",
    purpose:
      "Defines safe use of exported reports and customer financial information.",
    sections: [
      {
        heading: "Exported Data",
        text:
          "Reports may include customer names, phone numbers, deal balances, payment history, promises, maintenance balances, notes, and other sensitive business information.",
      },
      {
        heading: "Approved Use",
        text:
          "Reports should be exported only for management review, accounting, reconciliation, collections, authorized business needs, or backup purposes.",
      },
      {
        heading: "Sharing Restrictions",
        text:
          "Users must not share exported reports with unauthorized people or store them in unsafe locations.",
        items: [
          "Do not send reports to personal email accounts.",
          "Do not upload reports to unapproved websites.",
          "Do not leave reports on shared computers.",
          "Do not print reports unnecessarily.",
          "Delete old exports when they are no longer needed.",
        ],
      },
    ],
  },
  {
    id: "softwareDisclaimer",
    title: "Software Disclaimer",
    icon: "⚠️",
    category: "Disclaimer",
    purpose:
      "Clarifies that users are responsible for reviewing information before making business decisions.",
    sections: [
      {
        heading: "Accuracy",
        text:
          "RK PayTrack helps organize and calculate dealership payment information, but users must verify important records before relying on them for financial, legal, tax, accounting, customer, or collection decisions.",
      },
      {
        heading: "No Professional Advice",
        text:
          "The software does not provide legal, tax, accounting, lending, credit, collection, or financial advice. Management should consult qualified professionals when needed.",
      },
      {
        heading: "User Review Required",
        text:
          "Users should review payment amounts, balances, due dates, promises, exports, invoices, receipts, and reports for accuracy before taking action.",
      },
      {
        heading: "Final Legal Documents",
        text:
          "This internal policy page is not a substitute for final attorney-reviewed Privacy Policy, Terms of Service, End User License Agreement, Data Processing Agreement, or vendor contract.",
      },
    ],
  },
];

function printHtmlWithIframe(html, title) {
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";

  document.body.appendChild(iframe);

  const iframeWindow = iframe.contentWindow;
  const iframeDocument = iframeWindow.document;

  iframeDocument.open();
  iframeDocument.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: white;
            padding: 28px;
            font-size: 13px;
          }
          .doc {
            max-width: 850px;
            margin: 0 auto;
            border: 1px solid #d1d5db;
            border-radius: 14px;
            padding: 26px;
          }
          .header {
            border-bottom: 4px solid #0A1A2F;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          h1 {
            margin: 0;
            color: #0A1A2F;
            font-size: 26px;
          }
          .subtitle {
            color: #475569;
            line-height: 1.5;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin: 16px 0;
          }
          .box {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px;
          }
          .label {
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .value {
            font-weight: bold;
          }
          section {
            margin-bottom: 18px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 14px;
          }
          h2 {
            margin: 0 0 8px;
            color: #111827;
            font-size: 18px;
          }
          p {
            line-height: 1.6;
            color: #374151;
          }
          li {
            margin-bottom: 6px;
            line-height: 1.5;
          }
          .ack {
            margin-top: 24px;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 14px;
          }
          .signature-row {
            margin-top: 38px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 42px;
          }
          .signature-line {
            border-top: 1px solid #111827;
            padding-top: 8px;
            color: #475569;
          }
          .footer {
            margin-top: 28px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
            color: #64748b;
            font-size: 11px;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
            .doc { border: none; }
          }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);

  iframeDocument.close();

  setTimeout(() => {
    iframeWindow.focus();
    iframeWindow.print();

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 500);
}

function buildPolicyPrintHtml(policy) {
  return `
    <div class="doc">
      <div class="header">
        <h1>${escapeHtml(policy.title)}</h1>
        <p class="subtitle">${escapeHtml(policy.purpose)}</p>
      </div>

      <div class="meta">
        <div class="box">
          <div class="label">Category</div>
          <div class="value">${escapeHtml(policy.category)}</div>
        </div>
        <div class="box">
          <div class="label">Applies To</div>
          <div class="value">Authorized RK PayTrack Users</div>
        </div>
        <div class="box">
          <div class="label">Owner</div>
          <div class="value">Management / System Admin</div>
        </div>
        <div class="box">
          <div class="label">Status</div>
          <div class="value">Template - Review Required</div>
        </div>
      </div>

      ${policy.sections
        .map(
          (section) => `
            <section>
              <h2>${escapeHtml(section.heading)}</h2>
              <p>${escapeHtml(section.text)}</p>
              ${
                section.items
                  ? `<ul>${section.items
                      .map((item) => `<li>${escapeHtml(item)}</li>`)
                      .join("")}</ul>`
                  : ""
              }
            </section>
          `
        )
        .join("")}

      <div class="ack">
        <strong>Acknowledgement:</strong>
        <p>
          By using RK PayTrack, users acknowledge that they have read,
          understood, and agree to follow this policy and all related company
          procedures.
        </p>
      </div>

      <div class="signature-row">
        <div class="signature-line">Employee Signature</div>
        <div class="signature-line">Manager Signature</div>
      </div>

      <div class="footer">
        <span>RK PayTrack Legal & Policies</span>
        <span>Generated ${new Date().toLocaleString()}</span>
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
  display: "grid",
  gap: "18px",
};

const mobilePageWrapper = {
  ...pageWrapper,
  gap: "12px",
};

const heroCard = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #102A4C 55%, #1d4ed8 100%)",
  borderRadius: "22px",
  padding: "26px",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.24)",
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
  lineHeight: "1.1",
  color: "white",
};

const mobilePageTitle = {
  ...pageTitle,
  fontSize: "25px",
};

const pageDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#dbeafe",
  maxWidth: "760px",
  lineHeight: "1.5",
};

const mobilePageDescription = {
  ...pageDescription,
  fontSize: "14px",
};

const heroPills = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const mobileHeroPills = {
  ...heroPills,
  gap: "6px",
  marginTop: "12px",
};

const heroPill = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "#e0f2fe",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const heroStats = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const mobileHeroStats = {
  ...heroStats,
  width: "100%",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
};

const heroStatCard = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: "16px",
  padding: "13px 16px",
  minWidth: "120px",
  display: "grid",
  gap: "5px",
};

const mobileHeroStatCard = {
  ...heroStatCard,
  minWidth: 0,
  padding: "12px",
};

const noticeBox = {
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  padding: "14px",
  borderRadius: "16px",
  lineHeight: "1.5",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.05)",
};

const quickPolicyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "14px",
};

const mobileQuickPolicyGrid = {
  ...quickPolicyGrid,
  gridTemplateColumns: "1fr",
  gap: "10px",
};

const quickPolicyCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
};

const quickPolicyIcon = {
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

const quickPolicyTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "16px",
};

const quickPolicyText = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "13px",
  lineHeight: "1.45",
};

const toolbar = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
};

const mobileToolbar = {
  ...toolbar,
  padding: "12px",
  gap: "8px",
};

const searchInput = {
  flex: "1 1 360px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "11px 13px",
  fontSize: "14px",
  outline: "none",
};

const mobileSearchInput = {
  ...searchInput,
  flex: "1 1 100%",
  width: "100%",
  boxSizing: "border-box",
};

const selectStyle = {
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "11px 13px",
  fontSize: "14px",
  outline: "none",
  background: "white",
};

const mobileSelectStyle = {
  ...selectStyle,
  flex: "1 1 100%",
  width: "100%",
  boxSizing: "border-box",
};

const clearButton = {
  border: "none",
  borderRadius: "12px",
  background: "#e5e7eb",
  color: "#111827",
  padding: "11px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const mobileClearButton = {
  ...clearButton,
  width: "100%",
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: "18px",
  alignItems: "flex-start",
};

const mobileContentGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
  alignItems: "start",
};

const policyList = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "12px",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.07)",
  position: "sticky",
  top: "20px",
  maxHeight: "calc(100vh - 40px)",
  overflowY: "auto",
};

const mobilePolicyList = {
  ...policyList,
  position: "static",
  top: "auto",
  maxHeight: "none",
  overflowY: "visible",
  borderRadius: "18px",
  padding: "10px",
};

const policyListHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  padding: "6px 6px 12px",
  color: "#475569",
  fontSize: "13px",
};

const policyButton = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "11px",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: "14px",
  padding: "12px",
  cursor: "pointer",
  textAlign: "left",
  color: "#374151",
  fontWeight: "900",
  marginBottom: "6px",
};

const mobilePolicyButton = {
  ...policyButton,
  padding: "11px",
  marginBottom: "7px",
};

const activePolicyButton = {
  background: "#0A1A2F",
  color: "white",
  borderColor: "#0A1A2F",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
};

const policyIcon = {
  width: "32px",
  height: "32px",
  borderRadius: "10px",
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const policyButtonText = {
  display: "grid",
  gap: "3px",
};

const emptySearchBox = {
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  padding: "18px",
  color: "#667085",
  textAlign: "center",
  lineHeight: "1.5",
};

const policyContent = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  minWidth: 0,
};

const mobilePolicyContent = {
  ...policyContent,
  borderRadius: "18px",
  padding: "16px",
};

const policyContentHeader = {
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "16px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const mobilePolicyContentHeader = {
  ...policyContentHeader,
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
};

const policyCategoryBadge = {
  display: "inline-flex",
  width: "fit-content",
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "7px 11px",
  fontSize: "12px",
  fontWeight: "900",
  marginBottom: "10px",
};

const policyTitle = {
  margin: 0,
  color: "#111827",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "26px",
};

const mobilePolicyTitle = {
  ...policyTitle,
  fontSize: "22px",
  alignItems: "flex-start",
};

const policyTitleIcon = {
  fontSize: "28px",
};

const policySubtitle = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#667085",
  lineHeight: "1.5",
  maxWidth: "850px",
};

const printButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const mobilePrintButton = {
  ...printButton,
  width: "100%",
};

const policyMetaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const mobilePolicyMetaGrid = {
  ...policyMetaGrid,
  gridTemplateColumns: "1fr",
};

const policyMetaCard = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "12px",
  display: "grid",
  gap: "5px",
  color: "#111827",
};

const policyBody = {
  display: "grid",
  gap: "16px",
};

const sectionBox = {
  display: "grid",
  gridTemplateColumns: "38px minmax(0, 1fr)",
  gap: "14px",
  padding: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  background: "#ffffff",
};

const mobileSectionBox = {
  ...sectionBox,
  gridTemplateColumns: "1fr",
  gap: "10px",
  padding: "14px",
};

const sectionNumber = {
  width: "38px",
  height: "38px",
  borderRadius: "14px",
  background: "#0A1A2F",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
};

const sectionHeading = {
  margin: 0,
  marginBottom: "8px",
  color: "#111827",
  fontSize: "17px",
};

const sectionText = {
  margin: 0,
  color: "#374151",
  lineHeight: "1.6",
};

const sectionList = {
  marginTop: "10px",
  color: "#374151",
  lineHeight: "1.6",
  paddingLeft: "20px",
};

const sectionListItem = {
  marginBottom: "6px",
};

const acknowledgementBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  marginTop: "20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap",
};

const mobileAcknowledgementBox = {
  ...acknowledgementBox,
  display: "grid",
  gridTemplateColumns: "1fr",
};

const acknowledgementTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "17px",
};

const acknowledgementText = {
  margin: "8px 0 0",
  color: "#374151",
  lineHeight: "1.6",
  maxWidth: "760px",
};

const acknowledgementCheck = {
  background: "white",
  border: "1px solid #d1d5db",
  borderRadius: "999px",
  padding: "10px 13px",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  fontWeight: "900",
  color: "#111827",
};

const mobileAcknowledgementCheck = {
  ...acknowledgementCheck,
  width: "100%",
  justifyContent: "center",
  boxSizing: "border-box",
};

const acknowledgedBox = {
  marginTop: "12px",
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
};

export default LegalPolicies;