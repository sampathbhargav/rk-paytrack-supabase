import { useId, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { buildPolicyPrintHtml, printHtmlWithIframe } from "../utils/printReference";
import "./ReferenceCenter.css";

export default function ReferenceCenter({ articles, policy = false }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [acknowledgedId, setAcknowledgedId] = useState(null);
  const [printError, setPrintError] = useState("");
  const titleRef = useRef(null);
  const inputId = useId();
  const categories = ["All", ...new Set(articles.map(article => article.category))];
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = articles.filter(article => {
    const text = [article.title, article.summary, article.category,
      ...article.sections.flatMap(section => [section.heading, section.text, ...(section.items || [])])]
      .join(" ").toLowerCase();
    return (category === "All" || article.category === category) && words.every(word => text.includes(word));
  });
  const requestedId = params.get("article") || (policy ? "paymentRecords" : "dailyRoutine");
  const selected = filtered.find(article => article.id === requestedId) || filtered[0];
  const shortcuts = policy
    ? [["paymentRecords", "01", "Record money accurately", "Confirmation, credits and recovery"],
       ["interactionRecords", "02", "Keep useful contact records", "Notes, callbacks and shared stories"],
       ["paymentIncidents", "03", "Handle an uncertain save", "Preserve history and escalate"]]
    : [["dailyRoutine", "01", "Start your day", "A practical daily checklist"],
       ["customerInteractions", "02", "Work your follow-ups", "Calls, outcomes and next dates"],
       ["paymentRecovery", "03", "Payment not confirmed?", "Recover before submitting again"]];
  const selectArticle = id => {
    setParams({ article: id });
    setAcknowledgedId(null);
    setPrintError("");
    requestAnimationFrame(() => titleRef.current?.focus());
  };
  const openShortcut = id => {
    setSearch("");
    setCategory("All");
    selectArticle(id);
  };
  const clear = () => { setSearch(""); setCategory("All"); };
  const print = () => {
    try {
      setPrintError("");
      printHtmlWithIframe(buildPolicyPrintHtml({ ...selected, purpose: selected.summary }), selected.title);
    } catch {
      setPrintError("The print view could not be opened. Try again in your browser.");
    }
  };

  return <div className="reference-center">
    <header className="reference-hero">
      <div>
        <span className="reference-eyebrow">RK PayTrack · Staff reference</span>
        <h1>{policy ? "Policy Center" : "Help Center"}</h1>
        <p>{policy ? "Clear operating guidance for accurate records, responsible access and customer information."
          : "Find the next step. Practical guides for payments, customer conversations and your daily work."}</p>
        <Link className="reference-crosslink" to={policy ? "/help-center" : "/legal-policies"}>
          {policy ? "Need step-by-step instructions? Open Help Center →" : "Looking for operating rules? Open Policy Center →"}
        </Link>
      </div>
      <div className="reference-hero-meta"><strong>{articles.length}</strong><span>{policy ? "policies & references" : "practical guides"}</span><small>Web application · Staff edition</small></div>
    </header>

    <nav className="reference-shortcuts" aria-label="Common tasks">
      {shortcuts.map(([id, number, title, description]) => <button key={id} type="button" onClick={() => openShortcut(id)}>
        <span className="reference-shortcut-number" aria-hidden="true">{number}</span>
        <span><strong>{title}</strong><small>{description}</small></span><span aria-hidden="true">↗</span>
      </button>)}
    </nav>

    {policy && <div className="reference-notice"><strong>Know what you’re reading.</strong> Operating guidance describes staff procedures, not automatic access restrictions. Existing legal templates are retained for management and legal review; this update does not approve or validate them as legal documents.</div>}

    <div className="reference-toolbar" role="search" aria-label={policy ? "Search policies" : "Search help"}>
      <div className="reference-search"><label htmlFor={`${inputId}-search`}>Search {policy ? "policies" : "guides"}</label>
        <input id={`${inputId}-search`} type="search" placeholder="Try recovery, reschedule, callback…" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div><label htmlFor={`${inputId}-category`}>Category</label><select id={`${inputId}-category`} value={category} onChange={event => setCategory(event.target.value)}>
        {categories.map(value => <option key={value}>{value}</option>)}
      </select></div>
      <button className="reference-button reference-button--quiet" type="button" onClick={clear} disabled={!search && category === "All"}>Clear filters</button>
    </div>

    <div className="reference-layout">
      <aside className="reference-index" aria-label={policy ? "Policy directory" : "Guide directory"}>
        <div className="reference-index-heading"><strong>Browse topics</strong><span role="status">{filtered.length} found</span></div>
        <div className="reference-mobile-picker"><label htmlFor={`${inputId}-topic`}>Choose a topic</label>
          <select id={`${inputId}-topic`} disabled={!selected} value={selected?.id || ""} onChange={event => selectArticle(event.target.value)}>
            {!selected && <option value="">No matching topics</option>}
            {filtered.map(article => <option key={article.id} value={article.id}>{article.title}</option>)}
          </select>
        </div>
        <nav className="reference-topic-list" aria-label="Topics">
          {filtered.map(article => <button key={article.id} type="button" aria-current={selected?.id === article.id ? "page" : undefined} onClick={() => selectArticle(article.id)}>
            <span>{article.title}</span><small>{article.category}</small>
          </button>)}
          {!filtered.length && <p className="reference-muted">Try another search or category.</p>}
        </nav>
      </aside>

      {selected ? <article className="reference-article" aria-labelledby={`${inputId}-title`}>
        <header className="reference-article-heading">
          <span className="reference-badge">{selected.category}</span>
          <h2 id={`${inputId}-title`} ref={titleRef} tabIndex={-1}>{selected.title}</h2>
          <p>{selected.summary}</p>
          {policy && <div className="reference-policy-meta"><span>{selected.kind}</span><span>For authorized staff</span></div>}
          <div className="reference-actions">
            {selected.action && <Link className="reference-button" to={selected.action.to}>{selected.action.label} →</Link>}
            <Link className="reference-permalink" to={`?article=${selected.id}`}>Link to this {policy ? "policy" : "guide"}</Link>
            {policy && <button className="reference-button reference-button--quiet" type="button" onClick={print}>Print policy</button>}
          </div>
          {printError && <p role="alert">{printError}</p>}
        </header>
        <div className="reference-sections">
          {selected.sections.map((section, index) => <section key={`${selected.id}-${section.heading}`}>
            <span className="reference-step" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{section.heading}</h3><p>{section.text}</p>
              {section.items && <ul>{section.items.map(text => <li key={text}>{text}</li>)}</ul>}
            </div>
          </section>)}
        </div>
        {policy ? <footer className="reference-reading-check">
          <label><input type="checkbox" checked={acknowledgedId === selected.id} onChange={event => setAcknowledgedId(event.target.checked ? selected.id : null)} /> I have reviewed this page</label>
          <p>Personal reading checklist only. This is not saved, sent to management or recorded as an electronic signature.</p>
        </footer> : <footer className="reference-article-footer">Before saving financial records, verify the customer, deal or invoice, amount, date and payment method. Review the confirmed account afterward.</footer>}
      </article> : <div className="reference-empty"><h2>No matching {policy ? "policies" : "guides"}</h2><p>Try “payment”, “callback” or “receipt”, or clear the filters to browse all topics.</p><button type="button" className="reference-button" onClick={clear}>Show all topics</button></div>}
    </div>
  </div>;
}
