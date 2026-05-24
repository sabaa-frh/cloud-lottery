import React, { useEffect, useState, useRef } from "react";
import "./App.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:3000";

const EMPTY_FORM = { participantName: "", ticketNumber: "", email: "", image: null };

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef();

  // ── Data fetching ──────────────────────────────────────────────────────────

  async function fetchEntries() {
    try {
      const res = await fetch(`${API}/entries`);
      const data = await res.json();
      setEntries(data);
    } catch {
      setError("Failed to load entries. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchEntries(); }, []);

  // ── Form helpers ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setImagePreview(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(entry) {
    setEditingId(entry.entryId);
    setFormData({
      participantName: entry.participantName,
      ticketNumber: entry.ticketNumber,
      email: entry.email,
      image: null,
    });
    setImagePreview(entry.imageUrl || null);
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setImagePreview(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleChange(e) {
    const { name, value, files } = e.target;
    if (name === "image") {
      const file = files[0];
      setFormData((f) => ({ ...f, image: file }));
      setImagePreview(file ? URL.createObjectURL(file) : null);
    } else {
      setFormData((f) => ({ ...f, [name]: value }));
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const body = new FormData();
    body.append("participantName", formData.participantName);
    body.append("ticketNumber", formData.ticketNumber);
    body.append("email", formData.email);
    if (formData.image) body.append("image", formData.image);

    try {
      const url = editingId ? `${API}/entries/${editingId}` : `${API}/entries`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, body });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }
      await fetchEntries();
      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id) {
    if (!window.confirm("Delete this lottery entry?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setEntries((prev) => prev.filter((e) => e.entryId !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="header-title">
            <span className="trophy">🏆</span>
            <h1>Cloud Lottery</h1>
            <span className="trophy">🏆</span>
          </div>
          <p className="header-sub">AWS-Powered Entry Management</p>
        </div>
        <button className="btn btn-gold" onClick={openCreate}>
          + Add Entry
        </button>
      </header>

      {/* Global error banner */}
      {error && !showForm && (
        <div className="banner-error">
          {error}
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* Entry grid */}
      <main className="main">
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎟️</div>
            <p>No entries yet. Add the first one!</p>
          </div>
        ) : (
          <div className="grid">
            {entries.map((entry) => (
              <div className="card" key={entry.entryId}>
                <div className="card-image-wrap">
                  {entry.imageUrl ? (
                    <img src={entry.imageUrl} alt={entry.participantName} className="card-image" />
                  ) : (
                    <div className="card-image-placeholder">🎟️</div>
                  )}
                  <div className="card-ticket-badge">#{entry.ticketNumber}</div>
                </div>
                <div className="card-body">
                  <h2 className="card-name">{entry.participantName}</h2>
                  <p className="card-email">{entry.email}</p>
                  <p className="card-date">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </p>
                </div>
                <div className="card-actions">
                  <button className="btn btn-outline" onClick={() => openEdit(entry)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(entry.entryId)}
                    disabled={deletingId === entry.entryId}
                  >
                    {deletingId === entry.entryId ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal form */}
      {showForm && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editingId ? "Edit Entry" : "New Lottery Entry"}</h2>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>

            {error && <div className="form-error">{error}</div>}

            <form onSubmit={handleSubmit} className="form">
              <label className="form-label">
                Participant Name *
                <input
                  className="form-input"
                  name="participantName"
                  value={formData.participantName}
                  onChange={handleChange}
                  placeholder="Full name"
                  required
                />
              </label>

              <label className="form-label">
                Ticket Number *
                <input
                  className="form-input"
                  name="ticketNumber"
                  value={formData.ticketNumber}
                  onChange={handleChange}
                  placeholder="e.g. LT-00142"
                  required
                />
              </label>

              <label className="form-label">
                Email *
                <input
                  className="form-input"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="participant@example.com"
                  required
                />
              </label>

              <label className="form-label">
                {editingId ? "Replace Image (optional)" : "Participant Image"}
                <div className="file-upload-wrap">
                  <input
                    className="form-input file-input"
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleChange}
                    ref={fileInputRef}
                    required={!editingId}
                  />
                </div>
                {imagePreview && (
                  <div className="image-preview-wrap">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                  </div>
                )}
              </label>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold" disabled={submitting}>
                  {submitting ? "Saving…" : editingId ? "Update Entry" : "Create Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
