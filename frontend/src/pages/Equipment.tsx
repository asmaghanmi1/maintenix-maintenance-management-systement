
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Settings,
  X,
  AlertCircle,
} from "lucide-react";
import AppLayout from "../components/AppLayout";

interface EquipmentData {
  id: number;
  code: string;
  name: string;
  zone: string;
  category: string;
  status: string;
  criticality: string;
  description?: string | null;
}

type EquipmentForm = Omit<EquipmentData, "id">;

const emptyForm: EquipmentForm = {
  code: "",
  name: "",
  zone: "",
  category: "",
  status: "OPERATIONAL",
  criticality: "MEDIUM",
  description: "",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export default function Equipment() {
  const [equipment, setEquipment] = useState<EquipmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EquipmentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/equipment/");

      if (!response.ok) {
        throw new Error(`Unable to load equipment (${response.status})`);
      }

      const result = await response.json();

      const items = Array.isArray(result)
        ? result
        : result.items ?? result.equipments ?? result.data;

      if (!Array.isArray(items)) {
        throw new Error("Unexpected equipment API response format.");
      }

      setEquipment(items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEquipment();
  }, [loadEquipment]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter((item) => {
      const term = search.toLowerCase();

      const matchesSearch = [
        item.code,
        item.name,
        item.zone,
        item.category,
      ].some((value) => value?.toLowerCase().includes(term));

      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [equipment, search, statusFilter]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(item: EquipmentData) {
    setEditingId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      zone: item.zone,
      category: item.category,
      status: item.status,
      criticality: item.criticality,
      description: item.description ?? "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function updateField(field: keyof EquipmentForm, value: string) {
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
      const url =
        editingId !== null
          ? `/api/equipment/${editingId}`
          : "/api/equipment/";

      const response = await fetch(url, {
        method: editingId !== null ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          description: form.description || null,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const detail = body?.detail;

        const message = Array.isArray(detail)
          ? detail.map((item: { msg?: string }) => item.msg).join(", ")
          : typeof detail === "string"
            ? detail
            : `Request failed (${response.status})`;

        throw new Error(message);
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);

      setSuccess(
        editingId !== null
          ? "Equipment updated successfully."
          : "Equipment created successfully."
      );

      await loadEquipment();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEquipment(item: EquipmentData) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${item.name} (${item.code})?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/equipment/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          typeof body?.detail === "string"
            ? body.detail
            : `Delete failed (${response.status})`
        );
      }

      setSuccess("Equipment deleted successfully.");
      await loadEquipment();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <AppLayout>
      <div className="equipment-heading">
        <div>
          <h2>Equipment Management</h2>
          <p>Manage and monitor your maintenance equipment.</p>
        </div>

        <button className="primary-button" onClick={openCreateForm}>
          <Plus size={17} />
          Add Equipment
        </button>
      </div>

      {success && (
        <div className="success-message" role="status">
          {success}
          <button onClick={() => setSuccess("")} aria-label="Close message">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="equipment-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => void loadEquipment()}>Retry</button>
        </div>
      )}

      <div className="equipment-toolbar">
        <div className="equipment-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by code, name, zone..."
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter equipment by status"
        >
          <option value="ALL">All statuses</option>
          {[...new Set(equipment.map((item) => item.status))]
            .filter(Boolean)
            .map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
        </select>

        <button
          className="icon-button"
          onClick={() => void loadEquipment()}
          disabled={loading}
          title="Refresh equipment"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="equipment-summary">
        <div>
          <strong>{equipment.length}</strong>
          <span>Total equipment</span>
        </div>
        <div>
          <strong>
            {equipment.filter((item) => item.status === "OPERATIONAL").length}
          </strong>
          <span>Operational</span>
        </div>
        <div>
          <strong>{filteredEquipment.length}</strong>
          <span>Displayed results</span>
        </div>
      </div>

      <section className="equipment-table-card">
        <div className="section-heading">
          <div>
            <h3>Equipment List</h3>
            <p>Equipment records retrieved from FastAPI.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading equipment...</div>
        ) : filteredEquipment.length === 0 ? (
          <div className="empty-state">
            <Settings size={25} />
            <span>
              {equipment.length === 0
                ? "No equipment registered yet."
                : "No equipment matches your search."}
            </span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Equipment</th>
                  <th>Zone</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Criticality</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredEquipment.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.code}</strong>
                    </td>
                    <td>{item.name}</td>
                    <td>{item.zone}</td>
                    <td>{item.category}</td>
                    <td>
                      <span
                        className={`equipment-status ${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>{item.criticality}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="edit-button"
                          onClick={() => openEditForm(item)}
                          title="Edit equipment"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => void deleteEquipment(item)}
                          title="Delete equipment"
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
      </section>

      {showForm && (
        <div className="modal-overlay">
          <section className="equipment-modal">
            <div className="modal-heading">
              <div>
                <h3>
                  {editingId !== null ? "Edit Equipment" : "Add New Equipment"}
                </h3>
                <p>Enter the equipment information.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowForm(false)}
                type="button"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Equipment Code *
                  <input
                    required
                    maxLength={30}
                    value={form.code}
                    onChange={(event) =>
                      updateField("code", event.target.value)
                    }
                  />
                </label>

                <label>
                  Equipment Name *
                  <input
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                  />
                </label>

                <label>
                  Zone *
                  <input
                    required
                    maxLength={50}
                    value={form.zone}
                    onChange={(event) =>
                      updateField("zone", event.target.value)
                    }
                  />
                </label>

                <label>
                  Category *
                  <input
                    required
                    maxLength={50}
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                  />
                </label>

                <label>
                  Status
                  <input
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                    placeholder="OPERATIONAL"
                  />
                </label>

                <label>
                  Criticality
                  <input
                    value={form.criticality}
                    onChange={(event) =>
                      updateField("criticality", event.target.value)
                    }
                    placeholder="MEDIUM"
                  />
                </label>

                <label className="full-width">
                  Description
                  <textarea
                    maxLength={500}
                    rows={4}
                    value={form.description ?? ""}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Create Equipment"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
