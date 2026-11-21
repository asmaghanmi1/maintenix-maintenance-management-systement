
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  ClipboardList,
  X,
  CalendarDays,
  Wrench,
} from "lucide-react";
import AppLayout from "../components/AppLayout";

interface Equipment {
  id: number;
  code: string;
  name: string;
  zone: string;
}

interface Intervention {
  id: number;
  reference: string;
  equipment_id: number;
  title: string;
  description: string | null;
  intervention_type: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface InterventionForm {
  equipment_id: string;
  title: string;
  description: string;
  intervention_type: string;
  priority: string;
  status: string;
  assigned_to: string;
  scheduled_date: string;
}

const emptyForm: InterventionForm = {
  equipment_id: "",
  title: "",
  description: "",
  intervention_type: "PREVENTIVE",
  priority: "MEDIUM",
  status: "OPEN",
  assigned_to: "",
  scheduled_date: "",
};

const statuses = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function toLocalDateTime(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
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
          .map(
            (item: { msg?: string; loc?: (string | number)[] }) =>
              `${item.loc?.join(".") ?? "Field"}: ${
                item.msg ?? "Invalid value"
              }`
          )
          .join(" | ");
      }
    } catch {
      // Keep the HTTP status message if the response is not JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export default function Interventions() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Intervention | null>(null);
  const [form, setForm] = useState<InterventionForm>(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [interventionData, equipmentData] = await Promise.all([
        apiRequest<Intervention[]>("/api/interventions/"),
        apiRequest<Equipment[]>("/api/equipment/"),
      ]);

      setInterventions(interventionData);
      setEquipment(equipmentData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const equipmentById = useMemo(
    () => new Map(equipment.map((item) => [item.id, item])),
    [equipment]
  );

  const filteredInterventions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return interventions.filter((item) => {
      const machine = equipmentById.get(item.equipment_id);

      const matchesSearch =
        !term ||
        item.reference.toLowerCase().includes(term) ||
        item.title.toLowerCase().includes(term) ||
        (item.assigned_to ?? "").toLowerCase().includes(term) ||
        (machine?.code ?? "").toLowerCase().includes(term) ||
        (machine?.name ?? "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" || item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [
    interventions,
    equipmentById,
    search,
    statusFilter,
    priorityFilter,
  ]);

  const counts = useMemo(
    () => ({
      total: interventions.length,
      open: interventions.filter((item) => item.status === "OPEN").length,
      inProgress: interventions.filter(
        (item) => item.status === "IN_PROGRESS"
      ).length,
      completed: interventions.filter(
        (item) => item.status === "COMPLETED"
      ).length,
    }),
    [interventions]
  );

  function openCreateModal() {
    setEditing(null);
    setForm({
      ...emptyForm,
      equipment_id: equipment[0] ? String(equipment[0].id) : "",
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(item: Intervention) {
    setEditing(item);

    setForm({
      equipment_id: String(item.equipment_id),
      title: item.title,
      description: item.description ?? "",
      intervention_type: item.intervention_type,
      priority: item.priority,
      status: item.status,
      assigned_to: item.assigned_to ?? "",
      scheduled_date: toLocalDateTime(item.scheduled_date),
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const scheduledDate = form.scheduled_date
        ? new Date(form.scheduled_date).toISOString()
        : null;

      if (editing) {
        const payload = {
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
          status: form.status,
          assigned_to: form.assigned_to.trim() || null,
          scheduled_date: scheduledDate,
        };

        await apiRequest<Intervention>(
          `/api/interventions/${editing.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        setSuccess("Intervention updated successfully.");
      } else {
        const payload = {
          equipment_id: Number(form.equipment_id),
          title: form.title.trim(),
          description: form.description.trim() || null,
          intervention_type: form.intervention_type,
          priority: form.priority,
          assigned_to: form.assigned_to.trim() || null,
          scheduled_date: scheduledDate,
        };

        await apiRequest<Intervention>("/api/interventions/", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess("Intervention created successfully.");
      }

      setModalOpen(false);
      setEditing(null);

      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Intervention) {
    if (!window.confirm(`Delete intervention ${item.reference}?`)) return;

    setError("");
    setSuccess("");

    try {
      await apiRequest<void>(`/api/interventions/${item.id}`, {
        method: "DELETE",
      });

      setSuccess("Intervention deleted successfully.");

      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function equipmentLabel(equipmentId: number): string {
    const item = equipmentById.get(equipmentId);

    return item
      ? `${item.code} — ${item.name}`
      : `Equipment #${equipmentId}`;
  }

  return (
    <AppLayout>
      <div className="interventions-page">
        <div className="interventions-heading">
          <div>
            <span className="interventions-eyebrow">
              MAINTENANCE OPERATIONS
            </span>
            <h1>Interventions</h1>
            <p>Plan, assign and monitor maintenance activities.</p>
          </div>

          <button
            className="intervention-primary-button"
            onClick={openCreateModal}
            disabled={equipment.length === 0}
          >
            <Plus size={18} />
            New Intervention
          </button>
        </div>

        {error && (
          <div className="intervention-alert intervention-alert-error">
            {error}
            <button
              onClick={() => setError("")}
              aria-label="Close error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="intervention-alert intervention-alert-success">
            {success}
            <button
              onClick={() => setSuccess("")}
              aria-label="Close message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="intervention-stats">
          <article className="intervention-stat-card">
            <span className="intervention-stat-icon">
              <ClipboardList size={20} />
            </span>
            <div>
              <strong>{counts.total}</strong>
              <span>Total interventions</span>
            </div>
          </article>

          <article className="intervention-stat-card">
            <span className="intervention-stat-icon open">
              <CalendarDays size={20} />
            </span>
            <div>
              <strong>{counts.open}</strong>
              <span>Open</span>
            </div>
          </article>

          <article className="intervention-stat-card">
            <span className="intervention-stat-icon progress">
              <Wrench size={20} />
            </span>
            <div>
              <strong>{counts.inProgress}</strong>
              <span>In progress</span>
            </div>
          </article>

          <article className="intervention-stat-card">
            <span className="intervention-stat-icon completed">
              <ClipboardList size={20} />
            </span>
            <div>
              <strong>{counts.completed}</strong>
              <span>Completed</span>
            </div>
          </article>
        </section>

        <section className="intervention-list-card">
          <div className="intervention-list-heading">
            <div>
              <h2>Intervention register</h2>
              <p>Records retrieved from the maintenance API.</p>
            </div>

            <button
              className="intervention-refresh-button"
              onClick={() => void loadData()}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw
                size={17}
                className={loading ? "spin" : ""}
              />
              Refresh
            </button>
          </div>

          <div className="intervention-filters">
            <div className="intervention-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, title, equipment..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="ALL">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              aria-label="Filter by priority"
            >
              <option value="ALL">All priorities</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="intervention-empty-state">
              Loading interventions...
            </div>
          ) : filteredInterventions.length === 0 ? (
            <div className="intervention-empty-state">
              <ClipboardList size={34} />
              <strong>No interventions found</strong>
              <span>
                {interventions.length === 0
                  ? "Create your first intervention to get started."
                  : "Try changing your search or filters."}
              </span>
            </div>
          ) : (
            <div className="intervention-table-scroll">
              <table className="intervention-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Intervention</th>
                    <th>Equipment</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned to</th>
                    <th>Scheduled date</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInterventions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.reference}</strong>
                      </td>

                      <td>
                        <span className="intervention-title-cell">
                          {item.title}
                        </span>
                        {item.description && (
                          <small className="intervention-description-cell">
                            {item.description}
                          </small>
                        )}
                      </td>

                      <td>{equipmentLabel(item.equipment_id)}</td>

                      <td>
                        <span className="intervention-type">
                          {item.intervention_type}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`intervention-priority priority-${item.priority.toLowerCase()}`}
                        >
                          {item.priority}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`intervention-status status-${item.status.toLowerCase()}`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </td>

                      <td>{item.assigned_to || "Unassigned"}</td>
                      <td>{formatDate(item.scheduled_date)}</td>

                      <td>
                        <div className="intervention-actions">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit intervention"
                            aria-label={`Edit ${item.reference}`}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="delete"
                            onClick={() => void handleDelete(item)}
                            title="Delete intervention"
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

          <div className="intervention-table-footer">
            Showing {filteredInterventions.length} of{" "}
            {interventions.length} interventions
          </div>
        </section>

        {modalOpen && (
          <div
            className="intervention-modal-overlay"
            onMouseDown={closeModal}
          >
            <section
              className="intervention-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="intervention-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="intervention-modal-header">
                <div>
                  <span className="interventions-eyebrow">
                    {editing ? "UPDATE RECORD" : "NEW MAINTENANCE RECORD"}
                  </span>

                  <h2 id="intervention-modal-title">
                    {editing ? "Edit Intervention" : "Create Intervention"}
                  </h2>
                </div>

                <button
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Close"
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {!editing && (
                  <label className="intervention-form-field">
                    Equipment *
                    <select
                      required
                      value={form.equipment_id}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          equipment_id: event.target.value,
                        })
                      }
                    >
                      <option value="">Select equipment</option>
                      {equipment.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {editing && (
                  <div className="intervention-readonly-equipment">
                    Equipment:{" "}
                    <strong>{equipmentLabel(editing.equipment_id)}</strong>
                    <span>
                      Equipment and intervention type cannot be changed
                      through this API update endpoint.
                    </span>
                  </div>
                )}

                <label className="intervention-form-field">
                  Title *
                  <input
                    required
                    minLength={3}
                    maxLength={150}
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    placeholder="e.g. Replace worn cutting blade"
                  />
                </label>

                <label className="intervention-form-field">
                  Description
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        description: event.target.value,
                      })
                    }
                    placeholder="Describe the maintenance work..."
                  />
                </label>

                <div className="intervention-form-grid">
                  {!editing && (
                    <label className="intervention-form-field">
                      Type *
                      <select
                        value={form.intervention_type}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            intervention_type: event.target.value,
                          })
                        }
                      >
                        <option value="PREVENTIVE">Preventive</option>
                        <option value="CORRECTIVE">Corrective</option>
                      </select>
                    </label>
                  )}

                  <label className="intervention-form-field">
                    Priority
                    <select
                      value={form.priority}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          priority: event.target.value,
                        })
                      }
                    >
                      {priorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>

                  {editing && (
                    <label className="intervention-form-field">
                      Status
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            status: event.target.value,
                          })
                        }
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="intervention-form-grid">
                  <label className="intervention-form-field">
                    Assigned to
                    <input
                      value={form.assigned_to}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          assigned_to: event.target.value,
                        })
                      }
                      placeholder="Technician name"
                    />
                  </label>

                  <label className="intervention-form-field">
                    Scheduled date
                    <input
                      type="datetime-local"
                      value={form.scheduled_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          scheduled_date: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                {error && (
                  <div className="intervention-alert intervention-alert-error">
                    {error}
                  </div>
                )}

                <div className="intervention-modal-actions">
                  <button
                    type="button"
                    className="intervention-cancel-button"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="intervention-primary-button"
                    disabled={
                      saving || (!editing && equipment.length === 0)
                    }
                  >
                    {saving
                      ? "Saving..."
                      : editing
                        ? "Save changes"
                        : "Create intervention"}
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
