
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Users as UsersIcon,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
  Save,
  LockKeyhole,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import "./Users.css";

type UserRole = "ADMIN" | "MAINTENANCE_MANAGER" | "TECHNICIAN";

interface UserData {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

interface UserFormData {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
}

const emptyForm: UserFormData = {
  full_name: "",
  email: "",
  password: "",
  role: "TECHNICIAN",
};

const API_URL = "/api/auth";

function getToken() {
  return localStorage.getItem("access_token");
}

function roleLabel(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "MAINTENANCE_MANAGER":
      return "Maintenance Manager";
    default:
      return "Technician";
  }
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);

  const getHeaders = useCallback(() => {
    const token = getToken();

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Aucun token d'authentification trouvé. Connectez-vous d'abord avec un compte administrateur."
        );
      }

      const response = await fetch(`${API_URL}/users`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.detail || `Erreur lors du chargement (${response.status})`
        );
      }

      const data: UserData[] = await response.json();
      setUsers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de charger les utilisateurs."
      );
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const loadCurrentUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/me`, {
        headers: getHeaders(),
      });

      if (response.ok) {
        const data: UserData = await response.json();
        setCurrentUserId(data.id);
      }
    } catch {
      // La liste reste utilisable même si le profil courant ne peut pas être chargé.
    }
  }, [getHeaders]);

  useEffect(() => {
    void loadUsers();
    void loadCurrentUser();
  }, [loadUsers, loadCurrentUser]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        user.full_name.toLowerCase().includes(searchValue) ||
        user.email.toLowerCase().includes(searchValue);

      const matchesRole =
        roleFilter === "ALL" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.is_active) ||
        (statusFilter === "INACTIVE" && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const activeCount = users.filter((user) => user.is_active).length;
  const inactiveCount = users.length - activeCount;
  const adminCount = users.filter((user) => user.role === "ADMIN").length;

  function openCreateModal() {
    setEditingUser(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(user: UserData) {
    setEditingUser(user);
    setForm({
      full_name: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  }

  function updateField<K extends keyof UserFormData>(
    field: K,
    value: UserFormData[K]
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const isEditing = Boolean(editingUser);

      const payload: Record<string, string> = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role: form.role,
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (!isEditing && !form.password) {
        throw new Error("Le mot de passe est obligatoire pour créer un utilisateur.");
      }

      const url = isEditing
        ? `${API_URL}/users/${editingUser!.id}`
        : `${API_URL}/users`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Une erreur est survenue.");
      }

      setSuccess(
        isEditing
          ? "Utilisateur modifié avec succès."
          : "Utilisateur créé avec succès."
      );

      setModalOpen(false);
      setEditingUser(null);
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible d'enregistrer l'utilisateur."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleUserStatus(user: UserData) {
    const action = user.is_active ? "désactiver" : "activer";

    if (!window.confirm(`Voulez-vous ${action} le compte de ${user.full_name} ?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/users/${user.id}/status`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ is_active: !user.is_active }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de modifier le statut.");
      }

      setSuccess(
        user.is_active
          ? "Compte désactivé avec succès."
          : "Compte activé avec succès."
      );

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de mise à jour.");
    }
  }

  async function deleteUser(user: UserData) {
    if (!window.confirm(`Supprimer définitivement le compte de ${user.full_name} ?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de supprimer cet utilisateur.");
      }

      setSuccess("Utilisateur supprimé avec succès.");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  }

  return (
    <AppLayout>
      <main className="users-page">
        <div className="users-heading">
          <div>
            <span className="users-eyebrow">ADMINISTRATION</span>
            <h1>User Management</h1>
            <p>Manage accounts, roles and access permissions.</p>
          </div>

          <div className="users-heading-actions">
            <button
              className="users-refresh-button"
              onClick={() => {
                void loadUsers();
                void loadCurrentUser();
              }}
              disabled={loading}
              title="Refresh users"
            >
              <RefreshCw size={17} />
            </button>

            <button className="users-primary-button" onClick={openCreateModal}>
              <Plus size={18} />
              Add User
            </button>
          </div>
        </div>

        {error && (
          <div className="users-alert users-alert-error">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Close error">
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="users-alert users-alert-success">
            <span>{success}</span>
            <button onClick={() => setSuccess("")} aria-label="Close message">
              <X size={16} />
            </button>
          </div>
        )}

        <section className="users-stats">
          <div className="users-stat-card">
            <div className="users-stat-icon users-icon-blue">
              <UsersIcon size={21} />
            </div>
            <div>
              <span>Total Users</span>
              <strong>{users.length}</strong>
            </div>
          </div>

          <div className="users-stat-card">
            <div className="users-stat-icon users-icon-green">
              <UserCheck size={21} />
            </div>
            <div>
              <span>Active Users</span>
              <strong>{activeCount}</strong>
            </div>
          </div>

          <div className="users-stat-card">
            <div className="users-stat-icon users-icon-orange">
              <UserX size={21} />
            </div>
            <div>
              <span>Inactive Users</span>
              <strong>{inactiveCount}</strong>
            </div>
          </div>

          <div className="users-stat-card">
            <div className="users-stat-icon users-icon-purple">
              <ShieldCheck size={21} />
            </div>
            <div>
              <span>Administrators</span>
              <strong>{adminCount}</strong>
            </div>
          </div>
        </section>

        <section className="users-panel">
          <div className="users-panel-header">
            <div>
              <h2>Account Management</h2>
              <p>{filteredUsers.length} user(s) found</p>
            </div>
          </div>

          <div className="users-filters">
            <div className="users-search">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              aria-label="Filter by role"
            >
              <option value="ALL">All roles</option>
              <option value="ADMIN">Administrator</option>
              <option value="MAINTENANCE_MANAGER">Maintenance Manager</option>
              <option value="TECHNICIAN">Technician</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Account ID</th>
                  <th className="users-actions-column">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="users-empty">
                      <RefreshCw size={20} className="users-spin" />
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="users-empty">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="users-identity">
                          <div className="users-avatar">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{user.full_name}</strong>
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`users-role users-role-${user.role.toLowerCase()}`}>
                          {roleLabel(user.role)}
                        </span>
                      </td>

                      <td>
                        <span className={`users-status ${user.is_active ? "is-active" : "is-inactive"}`}>
                          <span className="users-status-dot" />
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="users-id">#{user.id}</td>

                      <td>
                        <div className="users-row-actions">
                          <button
                            className="users-action-button"
                            title="Edit user"
                            onClick={() => openEditModal(user)}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="users-action-button"
                            title={user.is_active ? "Deactivate user" : "Activate user"}
                            disabled={user.id === currentUserId && user.is_active}
                            onClick={() => void toggleUserStatus(user)}
                          >
                            {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>

                          <button
                            className="users-action-button users-delete-button"
                            title="Delete user"
                            disabled={user.id === currentUserId}
                            onClick={() => void deleteUser(user)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="users-security-note">
          <LockKeyhole size={19} />
          <div>
            <strong>Role-Based Access Control</strong>
            <p>
              User administration is restricted to authenticated administrators.
              Permissions are enforced by the backend API.
            </p>
          </div>
        </section>

        {modalOpen && (
          <div className="users-modal-overlay" onMouseDown={closeModal}>
            <div
              className="users-modal"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="users-modal-header">
                <div>
                  <h2>{editingUser ? "Edit User" : "Create User"}</h2>
                  <p>
                    {editingUser
                      ? "Update account information and permissions."
                      : "Add a new account to the system."}
                  </p>
                </div>

                <button
                  className="users-modal-close"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="users-form-group">
                  <label htmlFor="user-full-name">Full Name</label>
                  <input
                    id="user-full-name"
                    type="text"
                    value={form.full_name}
                    onChange={(event) => updateField("full_name", event.target.value)}
                    minLength={2}
                    maxLength={120}
                    required
                    placeholder="Enter full name"
                  />
                </div>

                <div className="users-form-group">
                  <label htmlFor="user-email">Email Address</label>
                  <input
                    id="user-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    maxLength={150}
                    required
                    placeholder="name@example.com"
                  />
                </div>

                <div className="users-form-group">
                  <label htmlFor="user-password">
                    Password {editingUser && "(leave empty to keep current password)"}
                  </label>
                  <input
                    id="user-password"
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    minLength={8}
                    maxLength={128}
                    required={!editingUser}
                    placeholder={editingUser ? "Optional new password" : "Minimum 8 characters"}
                  />
                </div>

                <div className="users-form-group">
                  <label htmlFor="user-role">User Role</label>
                  <select
                    id="user-role"
                    value={form.role}
                    onChange={(event) =>
                      updateField("role", event.target.value as UserRole)
                    }
                    required
                  >
                    <option value="TECHNICIAN">Technician</option>
                    <option value="MAINTENANCE_MANAGER">Maintenance Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                <div className="users-modal-footer">
                  <button
                    type="button"
                    className="users-secondary-button"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="users-primary-button"
                    disabled={saving}
                  >
                    <Save size={17} />
                    {saving
                      ? "Saving..."
                      : editingUser
                        ? "Save Changes"
                        : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
