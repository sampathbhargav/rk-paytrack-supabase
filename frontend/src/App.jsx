import "./AppHeader.css";
import PaymentRecovery from "./components/PaymentRecovery";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Deals from "./pages/Deals";
import DealStories from "./pages/DealStories";
import AddPayment from "./pages/AddPayment";
import AddDeal from "./pages/AddDeal";
import DuePayments from "./pages/DuePayments";
import Promises from "./pages/Promises";
import CustomerDetail from "./pages/CustomerDetail";
import EditDeal from "./pages/EditDeal";
import Reports from "./pages/Reports";
import LegalPolicies from "./pages/LegalPolicies";
import HelpCenter from "./pages/HelpCenter";
import Maintenance from "./pages/Maintenance";
import CustomerProfile from "./pages/CustomerProfile";
import Customers from "./pages/Customers";
import CustomerInteractions from "./pages/CustomerInteractions";
import AIAssistant from "./pages/AIAssistant";
import Login from "./pages/Login";
import ActivityLogs from "./pages/ActivityLogs";

import GlobalSearch from "./components/GlobalSearch";
import ConnectionStatus from "./components/ConnectionStatus";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import UserMenu from "./components/UserMenu";
import BusinessInsights from "./pages/BusinessInsights";

import logo from "./assets/rk-paytrack-logo.png";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function AppLayout() {
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarKeyboardFocused, setSidebarKeyboardFocused] = useState(false);
  const collapsed = !sidebarHovered && !sidebarKeyboardFocused;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 820 : false
  );

  const [searchMinimized, setSearchMinimized] = useState(true);
  const [accountLoading, setAccountLoading] = useState(false);
  const [searchHovered, setSearchHovered] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [headerScrolledAway, setHeaderScrolledAway] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);
  const [headerFocused, setHeaderFocused] = useState(false);
  const previousScrollTop = useRef(0);
  const headerRef = useRef(null);

  const searchWrapperRef = useRef(null);
  const mainScrollRef = useRef(null);
  const location = useLocation();

  useLayoutEffect(() => {
    if (/^\/deals\/[^/]+\/?$/.test(location.pathname) && mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
      mainScrollRef.current.scrollLeft = 0;
    }
  }, [location.pathname, location.key]);

  const searchActive = searchHovered || searchFocused;
  const showFullSearch = !(searchMinimized || accountLoading) || searchActive;

  const showSidebarLabels = isMobile || !collapsed;
  const headerHidden = headerScrolledAway && !headerHovered && !headerFocused;
  const headerLeft = isMobile ? 0 : collapsed ? 72 : 250;

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth <= 820;

      setIsMobile(nextIsMobile);

      if (!nextIsMobile) {
        setMobileNavOpen(false);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setSearchMinimized(true);
    setSearchHovered(false);
    setSearchFocused(false);
    setHeaderHovered(false);
    setHeaderFocused(false);
    const top = mainScrollRef.current?.scrollTop || 0;
    previousScrollTop.current = top;
    setHeaderScrolledAway(top > 40);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) return;

    document.body.style.overflow = mobileNavOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, mobileNavOpen]);

  const handleMainScroll = (event) => {
    const scrollTop = event.currentTarget.scrollTop;
    const previous = previousScrollTop.current;
    previousScrollTop.current = scrollTop;
    if (scrollTop <= 40) setHeaderScrolledAway(false);
    else if (!isMobile) setHeaderScrolledAway(true);
    else if (Math.abs(scrollTop - previous) > 2) setHeaderScrolledAway(scrollTop > previous);
    if (searchActive) return;
    const minimizeAfter = isMobile ? 45 : 80;
    const shouldMinimize = scrollTop > minimizeAfter;
  
    setSearchMinimized((prev) => {
      if (prev === shouldMinimize) return prev;
      return shouldMinimize;
    });
  };

  const navItems = [
    { label: "Dashboard", path: "/" },
    { label: "Customers", path: "/customers" },
    { label: "Customer Interactions", path: "/customer-interactions" },
    { label: "Deals", path: "/deals" },
    { label: "Deal Stories", path: "/deal-stories" },
    { label: "Add Deal", path: "/add-deal" },
    { label: "Add Payment", path: "/add-payment" },
    { label: "Due Payments", path: "/due-payments" },
    { label: "Promises", path: "/promises" },
    { label: "Maintenance", path: "/maintenance" },
    { label: "Reports", path: "/reports" },
    { label: "Business Insights", path: "/business-insights" },
    { label: "AI Assistant", path: "/ai-assistant" },
    { label: "Help Center", path: "/help-center" },
    { label: "Policy Center", path: "/legal-policies" },
    { label: "Activity Logs", path: "/activity-logs" },
  ];

  const dealDetail = /^\/deals\/[^/]+\/?$/.test(location.pathname);
  const dealEdit = /^\/deals\/[^/]+\/edit\/?$/.test(location.pathname);
  const customerDetail = /^\/customers\/[^/]+\/?$/.test(location.pathname);
  const pageParent = dealDetail || dealEdit ? { label: "Deals", path: "/deals" }
    : customerDetail ? { label: "Customers", path: "/customers" } : null;
  const pageTitle = dealEdit ? "Edit deal" : dealDetail ? "Customer deal" : customerDetail ? "Customer profile"
    : navItems.find(item => item.path === location.pathname)?.label || "RK PayTrack";

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };

  const computedSidebarStyle = isMobile
    ? {
        ...sidebarStyle,
        ...mobileSidebarStyle,
        width: "288px",
        padding: "18px",
        transform: mobileNavOpen ? "translateX(0)" : "translateX(-105%)",
      }
    : {
        ...sidebarStyle,
        width: collapsed ? "72px" : "250px",
        padding: collapsed ? "16px 10px" : "20px",
      };

  return (
    <div style={isMobile ? mobileAppShell : appShell}>
      {isMobile && mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
          style={mobileOverlay}
        />
      )}

      <aside
        style={computedSidebarStyle}
        aria-label="Main navigation"
        onMouseEnter={() => { if (!isMobile) setSidebarHovered(true); }}
        onMouseLeave={() => setSidebarHovered(false)}
        onFocusCapture={(event) => {
          if (!isMobile && event.target.matches(":focus-visible")) {
            setSidebarKeyboardFocused(true);
          }
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setSidebarKeyboardFocused(false);
          }
        }}
      >
        <div
          style={{
            ...sidebarHeaderStyle,
            justifyContent:
              isMobile || !collapsed ? "space-between" : "center",
          }}
        >
          {showSidebarLabels && (
            <div style={simpleLogoWrapper}>
              <div style={logoHighlightBox}>
                <img
                  src={logo}
                  alt="RK PayTrack Logo"
                  style={simpleLogoStyle}
                />
              </div>

              <p style={sidebarSubtitle}>Dealer Payment Tracking</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (isMobile) {
                setMobileNavOpen(false);
              } else {
                setSidebarHovered(true);
              }
            }}
            style={collapseButton}
            aria-label={isMobile ? "Close menu" : "Expand navigation"}
            aria-expanded={isMobile ? mobileNavOpen : !collapsed}
            title={isMobile ? "Close menu" : "Hover or focus to expand navigation"}
          >
            {isMobile ? "×" : "☰"}
          </button>
        </div>

        <nav style={sidebarNavStyle} className="sidebar-nav-scroll">
          {navItems.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                title={!showSidebarLabels ? item.label : ""}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (isMobile) {
                    setMobileNavOpen(false);
                  }
                }}
                style={{
                  ...linkStyle,
                  justifyContent: showSidebarLabels ? "flex-start" : "center",
                  background: active ? "#1D4ED8" : "transparent",
                  color: active ? "#ffffff" : "#cbd5e1",
                  fontWeight: active ? "bold" : "normal",
                }}
              >
                <span style={{ fontSize: "18px" }}>{getIcon(item.label)}</span>

                {showSidebarLabels && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main
        ref={mainScrollRef}
        style={{ ...(isMobile ? mobileMainStyle : mainStyle), paddingTop: isMobile && showFullSearch ? "148px" : "96px" }}
        onScroll={handleMainScroll}
      >
        <button type="button" className="app-header-reveal" style={{ left: headerLeft }}
          aria-label="Show page header" aria-controls="page-header"
          onMouseEnter={() => setHeaderHovered(true)}
          onMouseLeave={(event) => { if (!headerRef.current?.contains(event.relatedTarget)) setHeaderHovered(false); }}
          onFocus={() => setHeaderFocused(true)}
          onBlur={() => setHeaderFocused(false)}
          onClick={() => headerRef.current?.querySelector("button, a, input")?.focus()} />
        <header id="page-header" ref={headerRef}
          className={`app-header${showFullSearch ? " app-header--search-open" : ""}${headerHidden ? " app-header--hidden" : ""}`}
          style={{ left: headerLeft }}
          onMouseEnter={() => setHeaderHovered(true)}
          onMouseLeave={() => setHeaderHovered(false)}
          onFocusCapture={() => setHeaderFocused(true)}
          onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHeaderFocused(false); }}>
          <div className="app-header-context">
            {isMobile && <button type="button" className="app-header-menu" aria-label="Open navigation menu" onClick={() => setMobileNavOpen(true)}>☰</button>}
            <div className="app-header-page">
              <span className="app-header-eyebrow">RK PayTrack</span>
              <nav aria-label="Breadcrumb" className="app-header-breadcrumb">
                {pageParent && <><Link to={pageParent.path}>{pageParent.label}</Link><span aria-hidden="true">/</span></>}
                <strong aria-current="page">{pageTitle}</strong>
              </nav>
            </div>
          </div>
          <div className="app-header-search">
            {showFullSearch ? (
              <div ref={searchWrapperRef} className="app-header-search-expanded"
                onMouseEnter={() => setSearchHovered(true)}
                onMouseLeave={() => setSearchHovered(false)}
                onFocusCapture={() => setSearchFocused(true)}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setSearchFocused(false);
                }}
              >
                <GlobalSearch autoFocus={searchFocused} />
              </div>
            ) : (
              <button type="button" className="app-header-search-button" aria-label="Search customers, deals and payments"
                onClick={() => { setSearchFocused(true); setSearchHovered(false); }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
                <span>Search</span>
              </button>
            )}
          </div>
          <div className="app-header-user"><UserMenu compact={isMobile} /></div>
        </header>

        <ConnectionStatus />
        <PaymentRecovery />

        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/deal-stories" element={<DealStories />} />
            <Route path="/deals/:dealId" element={<CustomerDetail onLoadingChange={setAccountLoading} />} />
            <Route path="/deals/:dealId/edit" element={<EditDeal />} />
            <Route path="/add-deal" element={<AddDeal />} />
            <Route path="/add-payment" element={<AddPayment />} />
            <Route path="/due-payments" element={<DuePayments />} />
            <Route path="/promises" element={<Promises />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:customerId" element={<CustomerProfile />} />
            <Route
              path="/customer-interactions"
              element={<CustomerInteractions />}
            />
            <Route path="/reports" element={<Reports />} />
            <Route path="/business-insights" element={<BusinessInsights />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/help-center" element={<HelpCenter />} />
            <Route path="/legal-policies" element={<LegalPolicies />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>

        <footer style={{ background: "transparent", textAlign: "center", color: "#64748b", fontSize: "12px", padding: "24px 12px 8px", marginTop: "16px" }}>
          © Daily Transport Inc
        </footer>

        {location.pathname !== "/ai-assistant" && (
          <Link
            to="/ai-assistant"
            style={{
              ...floatingAiButton,
              ...(isMobile ? mobileFloatingAiButton : {}),
            }}
          >
            <span style={floatingAiIcon}>🤖</span>
            <span
              style={{
                ...floatingAiText,
                ...(isMobile ? mobileFloatingAiText : {}),
              }}
            >
              Ask AI
            </span>
          </Link>
        )}
      </main>
    </div>
  );
}

function getIcon(label) {
  const icons = {
    Dashboard: "📊",
    Deals: "🚚",
    "Deal Stories": "📖",
    "Add Deal": "➕",
    "Add Payment": "💵",
    "Due Payments": "📅",
    Promises: "🤝",
    Maintenance: "🔧",
    Customers: "👥",
    "Customer Interactions": "📞",
    Reports: "📈",
    "Business Insights": "💡",
    "AI Assistant": "🤖",
    "Help Center": "📚",
    "Policy Center": "📘",
    "Activity Logs": "🧾",
  };

  return icons[label] || "•";
}

const appShell = {
  display: "flex",
  minHeight: "100vh",
  width: "100vw",
  maxWidth: "100vw",
  fontFamily: "Arial",
  overflow: "hidden",
};

const mobileAppShell = {
  minHeight: "100dvh",
  width: "100vw",
  maxWidth: "100vw",
  fontFamily: "Arial",
  overflow: "hidden",
  background: "#f4f6f8",
};

const sidebarStyle = {
  background: "#0A1A2F",
  color: "white",
  transition: "width 0.25s ease, transform 0.25s ease",
  overflow: "hidden",
  flexShrink: 0,
  boxSizing: "border-box",
  height: "100vh",
  position: "sticky",
  top: 0,
  alignSelf: "flex-start",
  display: "flex",
  flexDirection: "column",
};

const mobileSidebarStyle = {
  position: "fixed",
  left: 0,
  top: 0,
  bottom: 0,
  height: "100dvh",
  zIndex: 1000,
  boxShadow: "18px 0 45px rgba(15, 23, 42, 0.35)",
};

const mobileOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  border: "none",
  padding: 0,
  margin: 0,
  zIndex: 990,
  cursor: "pointer",
};

const sidebarHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "14px",
  flexShrink: 0,
};

const collapseButton = {
  background: "transparent",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "8px",
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: "20px",
  flexShrink: 0,
  lineHeight: 1,
};

const sidebarNavStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: "0",
  paddingBottom: "18px",
  flex: 1,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const linkStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "white",
  textDecoration: "none",
  fontSize: "15px",
  padding: "12px",
  borderRadius: "10px",
  transition: "background 0.2s ease, color 0.2s ease",
  whiteSpace: "nowrap",
};

const mainStyle = {
  flex: 1,
  minWidth: 0,
  maxWidth: "100%",
  height: "100vh",
  padding: "25px",
  background: "#f4f6f8",
  overflowX: "hidden",
  overflowY: "auto",
  boxSizing: "border-box",
};

const mobileMainStyle = {
  width: "100%",
  minWidth: 0,
  height: "100dvh",
  padding: "12px",
  paddingBottom: "84px",
  background: "#f4f6f8",
  overflowX: "hidden",
  overflowY: "auto",
  boxSizing: "border-box",
};

const simpleLogoWrapper = {
  textAlign: "center",
};

const logoHighlightBox = {
  background: "white",
  padding: "4px",
  borderRadius: "8px",
  boxShadow: "0 3px 8px rgba(0,0,0,0.22)",
  display: "inline-block",
};

const simpleLogoStyle = {
  width: "180px",
  height: "auto",
  display: "block",
  objectFit: "contain",
};

const sidebarSubtitle = {
  color: "#cbd5e1",
  fontSize: "13px",
  marginTop: "8px",
  marginBottom: 0,
};

const floatingAiButton = {
  position: "fixed",
  right: "22px",
  bottom: "22px",
  zIndex: 9999,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  background: "linear-gradient(135deg, #0A1A2F 0%, #1D4ED8 55%, #7C3AED 100%)",
  color: "white",
  textDecoration: "none",
  borderRadius: "999px",
  padding: "12px 16px",
  fontWeight: "900",
  fontSize: "13px",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.28)",
  border: "1px solid rgba(255,255,255,0.25)",
  cursor: "pointer",
};

const mobileFloatingAiButton = {
  right: "14px",
  bottom: "14px",
  padding: "12px",
  borderRadius: "999px",
};

const floatingAiIcon = {
  fontSize: "20px",
  lineHeight: 1,
};

const floatingAiText = {
  whiteSpace: "nowrap",
};

const mobileFloatingAiText = {
  display: "none",
};

export default App;
