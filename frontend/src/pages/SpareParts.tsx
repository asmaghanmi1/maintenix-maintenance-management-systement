
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Package,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import AppLayout from "../components/AppLayout";

interface SparePart {
  id: number;
  reference: string;
  name: string;
  category: string;
  quantity: number;
  minimum_quantity: number;
  unit_price: number | null;
  location: string | null;
}

interface SparePartForm {
  reference: string;
  name: string;
  category: string;
  quantity: string;
  minimum_quantity: string;
  unit_price: string;
  location: string;
}

const emptyForm: SparePartForm = {
  reference: "",
  name: "",
  category: "",
  quantity: "0",
  minimum_quantity: "5",
  unit_price: "",
  location: "",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

function isLowStock(item: SparePart): boolean {
  return item.quantity <= item.minimum_quantity;
}

function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)} DT`;
}

async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const body = await response.json();

      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail
          .map((item: { msg?: string; loc?: (string | number)[] }) =>
            `${item.loc?.join(".") ?? "Field"}: ${item.msg ?? "Invalid value"}`
          )
          .join(" | ");
      }
    } catch {
      // Keep the HTTP status message.
    }

    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export default function SpareParts() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [form, setForm] = useState<SparePartForm>(emptyForm);

  const loadParts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<SparePart[]>("/api/spare-parts/");
      setParts(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadParts();
  }, [loadParts]);

  const lowStockParts = useMemo(
    () => parts.filter(isLowStock),
    [parts]
  );

  const totalStockValue = useMemo(
    () =>
      parts.reduce(
        (total, item) =>
          total + item.quantity * (item.unit_price ?? 0),
        0
      ),
    [parts]
  );

  const filteredParts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return parts.filter((item) => {
      const matchesSearch =
        !term ||
        item.reference.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        (item.location ?? "").toLowerCase().includes(term);

      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "LOW" && isLowStock(item)) ||
        (stockFilter === "AVAILABLE" && !isLowStock(item));

      return matchesSearch && matchesStock;
    });
  }, [parts, search, stockFilter]);

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(item: SparePart) {
    setEditing(item);
    setForm({
      reference: item.reference,
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      minimum_quantity: String(item.minimum_quantity),
      unit_price: item.unit_price === null ? "" : String(item.unit_price),
      location: item.location ?? "",
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  }

  function updateField(field: keyof SparePartForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...(editing ? {} : { reference: form.reference.trim() }),
        name: form.name.trim(),
        category: form.category.trim(),
        quantity: Number(form.quantity),
        minimum_quantity: Number(form.minimum_quantity),
        unit_price: form.unit_price.trim()
          ? Number(form.unit_price)
          : null,
        location: form.location.trim() || null,
      };

      if (editing) {
        await apiRequest<SparePart>(
          `/api/spare-parts/${editing.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        setSuccess("Spare part updated successfully.");
      } else {
        await apiRequest<SparePart>("/api/spare-parts/", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess("Spare part created successfully.");
      }

      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);

      await loadParts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: SparePart) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${item.name} (${item.reference})?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await apiRequest<void>(`/api/spare-parts/${item.id}`, {
        method: "DELETE",
      });

      setSuccess("Spare part deleted successfully.");
      await loadParts();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <AppLayout>
      <div className="spare-parts-page">
        <div className="spare-parts-heading">
          <div>
            <span className="spare-parts-eyebrow">INVENTORY MANAGEMENT</span>
            <h1>Spare Parts</h1>
            <p>Manage spare parts, quantities and stock availability.</p>
          </div>

          <button
            className="spare-primary-button"
            onClick={openCreateModal}
          >
            <Plus size={18} />
            Add Spare Part
          </button>
        </div>

        {error && (
          <div className="spare-alert spare-alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              aria-label="Close error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="spare-alert spare-alert-success" role="status">
            <CheckCircle2 size={18} />
            <span>{success}</span>
            <button
              onClick={() => setSuccess("")}
              aria-label="Close message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="spare-stats">
          <article className="spare-stat-card">
            <span className="spare-stat-icon">
              <Package size={21} />
            </span>
            <div>
              <strong>{parts.length}</strong>
              <span>Registered parts</span>
            </div>
          </article>

          <article className="spare-stat-card">
            <span className="spare-stat-icon warning">
              <AlertTriangle size={21} />
            </span>
            <div>
              <strong>{lowStockParts.length}</strong>
              <span>Low-stock items</span>
            </div>
          </article>

          <article className="spare-stat-card">
            <span className="spare-stat-icon available">
              <CheckCircle2 size={21} />
            </span>
            <div>
              <strong>{parts.filter((item) => !isLowStock(item)).length}</strong>
              <span>Stock sufficient</span>
            </div>
          </article>

          <article className="spare-stat-card">
            <span className="spare-stat-icon value">
              <Package size={21} />
            </span>
            <div>
              <strong>{totalStockValue.toFixed(2)} DT</strong>
              <span>Estimated stock value</span>
            </div>
          </article>
        </section>

        {lowStockParts.length > 0 && (
          <section className="spare-low-stock-banner">
            <AlertTriangle size={20} />
            <div>
              <strong>Stock attention required</strong>
              <p>
                {lowStockParts.length} spare part(s) have reached or fallen
                below their minimum stock threshold.
              </p>
            </div>
          </section>
        )}

        <section className="spare-list-card">
          <div className="spare-list-heading">
            <div>
              <h2>Spare Parts Inventory</h2>
              <p>Inventory records retrieved from FastAPI.</p>
            </div>

            <button
              className="spare-refresh-button"
              onClick={() => void loadParts()}
              disabled={loading}
              title="Refresh inventory"
            >
              <RefreshCw
                size={17}
                className={loading ? "spare-spin" : ""}
              />
              Refresh
            </button>
          </div>

          <div className="spare-filters">
            <div className="spare-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, name, category..."
              />
            </div>

            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
              aria-label="Filter by stock status"
            >
              <option value="ALL">All stock levels</option>
              <option value="LOW">Low stock</option>
              <option value="AVAILABLE">Sufficient stock</option>
            </select>
          </div>

          {loading ? (
            <div className="spare-empty-state">Loading spare parts...</div>
          ) : filteredParts.length === 0 ? (
            <div className="spare-empty-state">
              <Package size={34} />
              <strong>No spare parts found</strong>
              <span>
                {parts.length === 0
                  ? "Add your first spare part to start managing inventory."
                  : "Try changing your search or stock filter."}
              </span>
            </div>
          ) : (
            <div className="spare-table-scroll">
              <table className="spare-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Part name</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Minimum</th>
                    <th>Unit price</th>
                    <th>Location</th>
                    <th>Stock status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredParts.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.reference}</strong></td>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td>
                        <strong>{item.quantity}</strong>
                      </td>
                      <td>{item.minimum_quantity}</td>
                      <td>{formatPrice(item.unit_price)}</td>
                      <td>{item.location || "—"}</td>
                      <td>
                        <span
                          className={`spare-stock-badge ${
                            isLowStock(item) ? "low" : "sufficient"
                          }`}
                        >
                          {isLowStock(item) ? "Low stock" : "Sufficient"}
                        </span>
                      </td>
                      <td>
                        <div className="spare-actions">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit spare part"
                            aria-label={`Edit ${item.reference}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="delete"
                            onClick={() => void handleDelete(item)}
                            title="Delete spare part"
                            aria-label={`Delete ${item.reference}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="spare-table-footer">
            Showing {filteredParts.length} of {parts.length} spare parts
          </div>
        </section>

        {modalOpen && (
          <div
            className="spare-modal-overlay"
            onMouseDown={closeModal}
          >
            <section
              className="spare-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="spare-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="spare-modal-heading">
                <div>
                  <span className="spare-parts-eyebrow">
                    {editing ? "UPDATE INVENTORY" : "NEW INVENTORY ITEM"}
                  </span>
                  <h2 id="spare-modal-title">
                    {editing ? "Edit Spare Part" : "Add Spare Part"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {!editing && (
                  <label className="spare-form-field">
                    Reference *
                    <input
                      required
                      minLength={2}
                      maxLength={50}
                      value={form.reference}
                      onChange={(event) =>
                        updateField("reference", event.target.value)
                      }
                      placeholder="e.g. REF-001"
                    />
                  </label>
                )}

                {editing && (
                  <div className="spare-readonly-reference">
                    Reference: <strong>{editing.reference}</strong>
                    <span>The reference cannot be changed through this API.</span>
                  </div>
                )}

                <div className="spare-form-grid">
                  <label className="spare-form-field">
                    Part name *
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      placeholder="Spare part name"
                    />
                  </label>

                  <label className="spare-form-field">
                    Category *
                    <input
                      required
                      minLength={2}
                      maxLength={60}
                      value={form.category}
                      onChange={(event) =>
                        updateField("category", event.target.value)
                      }
                      placeholder="e.g. Mechanical"
                    />
                  </label>

                  <label className="spare-form-field">
                    Quantity *
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={form.quantity}
                      onChange={(event) =>
                        updateField("quantity", event.target.value)
                      }
                    />
                  </label>

                  <label className="spare-form-field">
                    Minimum quantity *
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={form.minimum_quantity}
                      onChange={(event) =>
                        updateField("minimum_quantity", event.target.value)
                      }
                    />
                  </label>

                  <label className="spare-form-field">
                    Unit price (DT)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.unit_price}
                      onChange={(event) =>
                        updateField("unit_price", event.target.value)
                      }
                      placeholder="Optional"
                    />
                  </label>

                  <label className="spare-form-field">
                    Storage location
                    <input
                      maxLength={120}
                      value={form.location}
                      onChange={(event) =>
                        updateField("location", event.target.value)
                      }
                      placeholder="e.g. Warehouse A"
                    />
                  </label>
                </div>

                {error && (
                  <div className="spare-alert spare-alert-error">
                    <AlertCircle size={17} />
                    {error}
                  </div>
                )}

                <div className="spare-modal-actions">
                  <button
                    type="button"
                    className="spare-cancel-button"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="spare-primary-button"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editing
                        ? "Save changes"
                        : "Create spare part"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
