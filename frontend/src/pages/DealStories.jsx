import { useEffect, useRef, useState } from "react";
import { listDealStories, saveDealStory, STORY_PAGE_SIZE } from "../api/dealStoriesApi";
import "./DealStories.css";

const formatDate = (date) => new Date(date).toLocaleString();

export default function DealStories() {
  const [stories, setStories] = useState([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await listDealStories(search, page);
        if (active) {
          setStories(result.stories);
          setCount(result.count);
        }
      } catch (err) {
        if (active) setError(err.message || "Could not load stories. Please retry.");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search, page, revision]);

  return (
    <section className="deal-stories">
      <header className="stories-header">
        <div>
          <p className="stories-eyebrow">DEALERSHIP NOTEBOOK</p>
          <h1>Deal Stories</h1>
          <p>Remember the people, conversations, and decisions behind each deal.</p>
        </div>
        <button className="stories-primary" onClick={() => setEditor({ original: null })}>+ New story</button>
      </header>
      <div className="stories-toolbar">
        <label htmlFor="story-search">Find a story</label>
        <input id="story-search" type="search" placeholder="Search titles and stories…" value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(0); setLoading(true); }} />
        <button onClick={() => { setLoading(true); setRevision((value) => value + 1); }}>Refresh</button>
      </div>
      {notice && <p role="status" className="stories-success">{notice}</p>}
      {error ? <div role="alert" className="stories-error">{error} <button onClick={() => setRevision((value) => value + 1)}>Retry</button></div>
        : loading ? <p role="status" className="stories-empty">Loading stories…</p>
        : stories.length === 0 ? <div className="stories-empty">
          <h2>{search ? "No matching stories" : "Every deal has a story"}</h2>
          <p>{search ? "Try another name, phrase, or detail." : "Write down how it started, what was discussed, and what you want to remember."}</p>
          {!search && <button className="stories-primary" onClick={() => setEditor({ original: null })}>Write your first story</button>}
        </div> : <>
          <p className="stories-meta">{count} {count === 1 ? "story" : "stories"} · Most recently updated first</p>
          <div className="stories-grid">
            {stories.map((story) => <button key={story.id} className="story-card" onClick={() => setEditor({ original: story })}>
              <h2>{story.title}</h2>
              <p className="story-excerpt">{story.body}</p>
              <span className="stories-meta">Updated {formatDate(story.updated_at)}</span>
              <span className="story-open">Read story →</span>
            </button>)}
          </div>
          {count > STORY_PAGE_SIZE && <nav className="stories-pagination" aria-label="Story pages">
            <button disabled={page === 0} onClick={() => { setLoading(true); setPage(page - 1); }}>Previous</button>
            <span>Page {page + 1} of {Math.ceil(count / STORY_PAGE_SIZE)}</span>
            <button disabled={(page + 1) * STORY_PAGE_SIZE >= count} onClick={() => { setLoading(true); setPage(page + 1); }}>Next</button>
          </nav>}
        </>}
      {editor && <StoryEditor original={editor.original} onClose={() => { setEditor(null); setRevision((value) => value + 1); }}
        onSaved={() => { setEditor(null); setSearch(""); setPage(0); setLoading(true); setRevision((value) => value + 1); setNotice("Story saved."); }} />}
    </section>
  );
}

function StoryEditor({ original, onClose, onSaved }) {
  const dialog = useRef(null);
  const savingRef = useRef(false);
  const [draft, setDraft] = useState(() => ({ id: original?.id || crypto.randomUUID(), title: original?.title || "", body: original?.body || "" }));
  const [editing, setEditing] = useState(!original);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = draft.title !== (original?.title || "") || draft.body !== (original?.body || "");

  useEffect(() => { dialog.current.showModal(); }, []);
  useEffect(() => {
    const protect = (event) => {
      if (dirty || saving) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, saving]);

  const close = () => {
    if (savingRef.current) return;
    if (!dirty || window.confirm("Discard your unsaved story changes?")) onClose();
  };
  const submit = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await saveDealStory(draft, original);
      onSaved();
    } catch (err) {
      setError(err.code === "23505"
        ? "This story may already have saved. Copy your text, close this window, and refresh the list to check."
        : err.message || "Could not save. Your text is still here; please retry.");
    } finally { savingRef.current = false; setSaving(false); }
  };

  return <dialog ref={dialog} className="story-dialog" aria-labelledby="story-dialog-title" onCancel={(event) => { event.preventDefault(); close(); }}>
    <header className="stories-header">
      <h2 id="story-dialog-title">{editing ? original ? "Edit story" : "New story" : original.title}</h2>
      <button type="button" onClick={close} disabled={saving} aria-label="Close story">×</button>
    </header>
    {editing ? <form onSubmit={submit}>
      <fieldset disabled={saving}>
        <label htmlFor="story-title">Story title</label>
        <input id="story-title" autoFocus required maxLength={200} value={draft.title}
          placeholder="A name or detail that helps you remember this deal"
          onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <label htmlFor="story-body">The story</label>
        <p className="stories-meta" id="story-writing-help">How did it start? What was discussed? What happened next? Write it in your own words.</p>
        <textarea id="story-body" required maxLength={100000} rows={15} aria-describedby="story-writing-help" value={draft.body}
          onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
      </fieldset>
      {error && <p role="alert" className="stories-error">{error}</p>}
      <footer className="stories-actions">
        <span className="stories-meta">{dirty ? "Unsaved changes" : ""}</span>
        <button type="button" onClick={close} disabled={saving}>Cancel</button>
        <button className="stories-primary" disabled={saving || !draft.title.trim() || !draft.body.trim()}>{saving ? "Saving…" : "Save story"}</button>
      </footer>
    </form> : <>
      <p className="stories-meta">Created {formatDate(original.created_at)} · Updated {formatDate(original.updated_at)}</p>
      <div className="story-body">{original.body}</div>
      <footer className="stories-actions"><button className="stories-primary" onClick={() => setEditing(true)}>Edit story</button></footer>
    </>}
  </dialog>;
}
