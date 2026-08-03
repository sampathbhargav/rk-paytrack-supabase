import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getCustomers } from "../api/customersApi";
import { getDeals } from "../api/dealsApi";
import { getPayments } from "../api/paymentsApi";
import { getPromises } from "../api/promisesApi";
import { formatMoney } from "../utils/moneyUtils";

function GlobalSearch() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [promises, setPromises] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchRef = useRef(null);

  useEffect(() => {
    loadSearchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadSearchData = async () => {
    try {
      setLoading(true);

      const [customersData, dealsData, paymentsData, promisesData] =
        await Promise.all([
          getCustomers(),
          getDeals(),
          getPayments(),
          getPromises(),
        ]);

      setCustomers(customersData || []);
      setDeals(dealsData || []);
      setPayments(paymentsData || []);
      setPromises(promisesData || []);
    } catch (error) {
      console.error("Global search failed:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const results = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return [];

    const customerResults = customers
      .filter((customer) =>
        matchesSearchText(
          [
            customer.customer_name,
            customer.company_name,
            customer.phone,
            customer.email,
            customer.address,
          ],
          text
        )
      )
      .map((customer) => {
        const customerDeals = deals.filter(
          (deal) => String(deal.customer_id) === String(customer.id)
        );

        return {
          id: `customer-${customer.id}`,
          type: "Customer",
          to: `/customers/${customer.id}`,
          title: customer.company_name
            ? `${customer.customer_name || "Customer"} (${customer.company_name})`
            : customer.customer_name || "Customer",
          subtitle:
            customerDeals.length > 0
              ? `${customerDeals.length} deal(s) on file`
              : "Customer profile only - no deal on file",
          meta: customer.phone || customer.email || "Customer Profile",
          amount: "",
          priority: customerDeals.length > 0 ? 2 : 1,
        };
      });

    const dealResults = deals
      .filter((deal) =>
        matchesSearchText(
          [
            deal.deal_tag,
            deal.customers?.customer_name,
            deal.customers?.company_name,
            deal.customers?.phone,
            deal.customers?.email,
            deal.customers?.address,
            deal.truck,
            deal.year,
            deal.vin,
            deal.deal_type,
            deal.deal_subtype,
            deal.status,
            deal.notes,
          ],
          text
        )
      )
      .map((deal) => {
        const customerName = deal.customers?.customer_name || "Customer";
        const companyName = deal.customers?.company_name || "";

        return {
          id: `deal-${deal.id}`,
          type: "Deal",
          to: `/deals/${deal.id}`,
          title: companyName
            ? `${deal.deal_tag || "—"} - ${customerName} (${companyName})`
            : `${deal.deal_tag || "—"} - ${customerName}`,
          subtitle: `${deal.year || ""} ${deal.truck || ""} • ${
            deal.deal_type || "No Type"
          } • ${deal.status || "Active"}`,
          meta: companyName || deal.customers?.phone || "No phone",
          amount: deal.total_amount,
          priority: 3,
        };
      });

    const paymentResults = payments
      .filter((payment) =>
        matchesSearchText(
          [
            payment.deals?.deal_tag,
            payment.deals?.customers?.customer_name,
            payment.deals?.customers?.company_name,
            payment.deals?.customers?.phone,
            payment.deals?.customers?.email,
            payment.payment_method,
            payment.payment_type,
            payment.payment_status,
            payment.notes,
          ],
          text
        )
      )
      .map((payment) => {
        const customerName =
          payment.deals?.customers?.customer_name || "Customer";
        const companyName = payment.deals?.customers?.company_name || "";
        const dealId = payment.deal_id || payment.deals?.id;

        return {
          id: `payment-${payment.id}`,
          type: "Payment",
          to: dealId ? `/deals/${dealId}` : "",
          title: companyName
            ? `${payment.deals?.deal_tag || "—"} - ${customerName} (${companyName})`
            : `${payment.deals?.deal_tag || "—"} - ${customerName}`,
          subtitle: `Payment ${formatMoney(payment.amount_paid)} • ${
            payment.payment_date || "No date"
          } • ${payment.payment_status || "Active"}`,
          meta: companyName || payment.payment_method || "Payment",
          amount: payment.amount_paid,
          priority: 4,
        };
      })
      .filter((item) => item.to);

    const promiseResults = promises
      .filter((promise) =>
        matchesSearchText(
          [
            promise.deals?.deal_tag,
            promise.deals?.customers?.customer_name,
            promise.deals?.customers?.company_name,
            promise.deals?.customers?.phone,
            promise.deals?.customers?.email,
            promise.promise_status,
            promise.notes,
          ],
          text
        )
      )
      .map((promise) => {
        const customerName =
          promise.deals?.customers?.customer_name || "Customer";
        const companyName = promise.deals?.customers?.company_name || "";
        const dealId = promise.deal_id || promise.deals?.id;

        return {
          id: `promise-${promise.id}`,
          type: "Promise",
          to: dealId ? `/deals/${dealId}` : "",
          title: companyName
            ? `${promise.deals?.deal_tag || "—"} - ${customerName} (${companyName})`
            : `${promise.deals?.deal_tag || "—"} - ${customerName}`,
          subtitle: `Promise ${formatMoney(promise.remaining_amount)} • ${
            promise.promised_date || "No date"
          } • ${promise.promise_status || "Pending"}`,
          meta: companyName || promise.deals?.customers?.phone || "No phone",
          amount: promise.remaining_amount,
          priority: 5,
        };
      })
      .filter((item) => item.to);

    return [
      ...customerResults,
      ...dealResults,
      ...paymentResults,
      ...promiseResults,
    ]
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 14);
  }, [search, customers, deals, payments, promises]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setOpen(value.trim().length > 0);
  };

  const clearSearch = () => {
    setSearch("");
    setOpen(false);
  };

  return (
    <div ref={searchRef} style={wrapper}>
      <div style={searchBox}>
        <span style={searchIcon}>⌕</span>

        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (search.trim()) setOpen(true);
          }}
          placeholder="Search customer profile, company, deal tag, phone, VIN, payment, promise..."
          style={inputStyle}
        />

        {search && (
          <button type="button" onClick={clearSearch} style={clearButton}>
            ×
          </button>
        )}
      </div>

      {open && (
        <div style={dropdown}>
          <div style={dropdownHeader}>
            <strong>Global Search</strong>
            <span>{loading ? "Loading..." : `${results.length} result(s)`}</span>
          </div>

          {results.length === 0 ? (
            <div style={emptyState}>
              No matching records found. Try customer name, company name, phone,
              email, deal tag, or VIN.
            </div>
          ) : (
            <div style={resultList}>
              {results.map((result) => (
                <Link
                  key={result.id}
                  to={result.to}
                  style={resultItem}
                  onClick={clearSearch}
                >
                  <div style={resultLeft}>
                    <span style={getTypeBadgeStyle(result.type)}>
                      {result.type}
                    </span>

                    <div style={resultTextBlock}>
                      <div style={resultTitle}>{result.title}</div>
                      <div style={resultSubtitle}>{result.subtitle}</div>
                    </div>
                  </div>

                  <div style={resultMeta}>{result.meta}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function matchesSearchText(values, searchText) {
  const haystack = values
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  const tokens = String(searchText || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return tokens.every((token) => haystack.includes(token));
}

function getTypeBadgeStyle(type) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "76px",
    padding: "6px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    border: "1px solid transparent",
    flexShrink: 0,
  };

  if (type === "Customer") {
    return {
      ...base,
      background: "#ede9fe",
      color: "#5b21b6",
      borderColor: "#ddd6fe",
    };
  }

  if (type === "Payment") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  if (type === "Promise") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  return {
    ...base,
    background: "#dbeafe",
    color: "#1d4ed8",
    borderColor: "#bfdbfe",
  };
}

const wrapper = {
  position: "relative",
  width: "100%",
  maxWidth: "620px",
  zIndex: 50,
};

const searchBox = {
  height: "44px",
  background: "white",
  border: "1px solid #d1d5db",
  borderRadius: "999px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "0 12px",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
};

const searchIcon = {
  color: "#64748b",
  fontSize: "20px",
  fontWeight: "900",
};

const inputStyle = {
  flex: 1,
  border: "none",
  outline: "none",
  fontSize: "14px",
  color: "#111827",
  background: "transparent",
  minWidth: 0,
};

const clearButton = {
  width: "26px",
  height: "26px",
  borderRadius: "999px",
  border: "none",
  background: "#e5e7eb",
  color: "#374151",
  cursor: "pointer",
  fontWeight: "900",
};

const dropdown = {
  position: "absolute",
  top: "52px",
  left: 0,
  right: 0,
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
  overflow: "hidden",
  zIndex: 100,
};

const dropdownHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "12px 14px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  color: "#334155",
  fontSize: "13px",
};

const resultList = {
  maxHeight: "430px",
  overflowY: "auto",
};

const resultItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  padding: "12px 14px",
  borderBottom: "1px solid #f1f5f9",
  textDecoration: "none",
  color: "#111827",
};

const resultLeft = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: 0,
};

const resultTextBlock = {
  minWidth: 0,
};

const resultTitle = {
  fontWeight: "900",
  color: "#111827",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "360px",
};

const resultSubtitle = {
  marginTop: "4px",
  color: "#64748b",
  fontSize: "12px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "390px",
};

const resultMeta = {
  color: "#475569",
  fontSize: "12px",
  fontWeight: "800",
  whiteSpace: "nowrap",
};

const emptyState = {
  padding: "18px",
  color: "#64748b",
  fontSize: "14px",
  textAlign: "center",
};

export default GlobalSearch;