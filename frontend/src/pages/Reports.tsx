
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  Settings,
  TrendingUp,
  Wrench,
} from "lucide-react";

import AppLayout from "../components/AppLayout";
import StatCard from "../components/StatCard";
import "./Reports.css";

interface Equipment {
  id: number;
  name: string;
  status: string;
  criticality: string;
}

interface Intervention {
  id: number;
  status: string;
  priority: string;
  started_at?: string | null;
  completed_at?: string | null;
}

interface SparePart {
  id: number;
  name: string;
  quantity: number;
  minimum_quantity: number;
  unit_price?: number | null;
}

async function fetchReportData<T>(url: string): Promise<T> {
  const response = await fetch(url);

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `${url} - HTTP ${response.status}: ${responseText.slice(0, 300)}`
    );
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(`${url} returned an invalid JSON response.`);
  }
}

const normalize = (value: string) =>
  value.toUpperCase().replace(/[\s-]/g, "_");

export default function Reports() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const [equipmentData, interventionData, sparePartData] =
        await Promise.all([
          fetchReportData<Equipment[]>("/api/equipment/"),
          fetchReportData<Intervention[]>("/api/interventions/"),
          fetchReportData<SparePart[]>("/api/spare-parts/"),
        ]);

      if (
        !Array.isArray(equipmentData) ||
        !Array.isArray(interventionData) ||
        !Array.isArray(sparePartData)
      ) {
        throw new Error("Unexpected API response format.");
      }

      setEquipment(equipmentData);
      setInterventions(interventionData);
      setSpareParts(sparePartData);
    } catch (err) {
      console.error("Reports loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load reports."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const stats = useMemo(() => {
    const totalEquipment = equipment.length;

    const operationalEquipment = equipment.filter(
      (item) => normalize(item.status) === "OPERATIONAL"
    ).length;

    const completed = interventions.filter(
      (item) => normalize(item.status) === "COMPLETED"
    );

    const open = interventions.filter((item) =>
      ["OPEN", "PENDING", "IN_PROGRESS"].includes(normalize(item.status))
    ).length;

    const highPriority = interventions.filter((item) =>
      ["HIGH", "CRITICAL", "URGENT"].includes(normalize(item.priority))
    ).length;

    const lowStock = spareParts.filter(
      (item) => item.quantity <= item.minimum_quantity
    );

    const stockValue = spareParts.reduce(
      (sum, item) => sum + item.quantity * (item.unit_price ?? 0),
      0
    );

    const durations = completed
      .filter((item) => item.started_at && item.completed_at)
      .map((item) => {
        const start = new Date(item.started_at!).getTime();
        const end = new Date(item.completed_at!).getTime();

        return end > start ? (end - start) / 3600000 : null;
      })
      .filter((value): value is number => value !== null);

    const mttr =
      durations.length > 0
        ? durations.reduce((sum, value) => sum + value, 0) /
          durations.length
        : null;

    return {
      totalEquipment,
      operationalEquipment,
      totalInterventions: interventions.length,
      completedInterventions: completed.length,
      open,
      highPriority,
      lowStock,
      stockValue,
      mttr,
      equipmentRate:
        totalEquipment > 0
          ? (operationalEquipment / totalEquipment) * 100
          : 0,
    };
  }, [equipment, interventions, spareParts]);

  const statusGroups = useMemo(() => {
    return interventions.reduce<Record<string, number>>((groups, item) => {
      const status = normalize(item.status);
      groups[status] = (groups[status] ?? 0) + 1;
      return groups;
    }, {});
  }, [interventions]);

  const priorityGroups = useMemo(() => {
    return interventions.reduce<Record<string, number>>((groups, item) => {
      const priority = normalize(item.priority);
      groups[priority] = (groups[priority] ?? 0) + 1;
      return groups;
    }, {});
  }, [interventions]);

  const equipmentGroups = useMemo(() => {
    return equipment.reduce<Record<string, number>>((groups, item) => {
      const status = normalize(item.status);
      groups[status] = (groups[status] ?? 0) + 1;
      return groups;
    }, {});
  }, [equipment]);

  const formatLabel = (value: string) =>
    value
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const renderBars = (
    groups: Record<string, number>,
    total: number,
    type: string
  ) => {
    if (total === 0) {
      return <div className="report-empty">No data available.</div>;
    }

    return (
      <div className="report-bars">
        {Object.entries(groups).map(([label, count]) => (
          <div className="report-bar-item" key={label}>
            <div className="report-bar-label">
              <span>{formatLabel(label)}</span>
              <strong>{count}</strong>
            </div>

            <div className="report-bar-track">
              <div
                className={`report-bar-fill ${type}`}
                style={{ width: `${(count / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="reports-page">
        <header className="reports-header">
          <div>
            <h1>Reports & Analytics</h1>
            <p>Maintenance performance and operational insights</p>
          </div>

          <button
            className="reports-refresh"
            onClick={loadReports}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="reports-error">
            <AlertTriangle size={19} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="reports-loading">
            <RefreshCw size={25} className="spinning" />
            <p>Loading analytics...</p>
          </div>
        ) : (
          <>
            <section className="reports-stats-grid">
              <StatCard
                title="Total Equipment"
                value={String(stats.totalEquipment)}
                subtitle={`${stats.operationalEquipment} operational`}
                icon={Settings}
                color="#3979db"
              />

              <StatCard
                title="Total Interventions"
                value={String(stats.totalInterventions)}
                subtitle={`${stats.completedInterventions} completed`}
                icon={Wrench}
                color="#805ad5"
              />

              <StatCard
                title="Open Interventions"
                value={String(stats.open)}
                subtitle="Open or in progress"
                icon={Activity}
                color="#e59b32"
              />

              <StatCard
                title="Low Stock Items"
                value={String(stats.lowStock.length)}
                subtitle="Require attention"
                icon={Package}
                color="#e05252"
              />
            </section>

            <section className="reports-stats-grid">
              <StatCard
                title="High Priority"
                value={String(stats.highPriority)}
                subtitle="High, critical or urgent"
                icon={AlertTriangle}
                color="#dc5555"
              />

              <StatCard
                title="Operational Ratio"
                value={`${stats.equipmentRate.toFixed(1)}%`}
                subtitle="Operational equipment ratio"
                icon={CheckCircle2}
                color="#279c78"
              />

              <StatCard
                title="Average Repair Time"
                value={
                  stats.mttr === null
                    ? "N/A"
                    : `${stats.mttr.toFixed(2)} h`
                }
                subtitle="Based on completed interventions with dates"
                icon={Clock}
                color="#3979db"
              />

              <StatCard
                title="Stock Value"
                value={stats.stockValue.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
                subtitle="Quantity × unit price"
                icon={TrendingUp}
                color="#279c78"
              />
            </section>

            <section className="reports-panels-grid">
              <div className="report-panel">
                <div className="report-panel-heading">
                  <div>
                    <h3>Interventions by Status</h3>
                    <p>Current status distribution</p>
                  </div>
                  <Activity size={20} />
                </div>

                {renderBars(
                  statusGroups,
                  stats.totalInterventions,
                  "status-fill"
                )}
              </div>

              <div className="report-panel">
                <div className="report-panel-heading">
                  <div>
                    <h3>Interventions by Priority</h3>
                    <p>Priority distribution</p>
                  </div>
                  <AlertTriangle size={20} />
                </div>

                {renderBars(
                  priorityGroups,
                  stats.totalInterventions,
                  "priority-fill"
                )}
              </div>

              <div className="report-panel">
                <div className="report-panel-heading">
                  <div>
                    <h3>Equipment by Status</h3>
                    <p>Equipment condition</p>
                  </div>
                  <Settings size={20} />
                </div>

                {renderBars(
                  equipmentGroups,
                  stats.totalEquipment,
                  "equipment-fill"
                )}
              </div>

              <div className="report-panel">
                <div className="report-panel-heading">
                  <div>
                    <h3>Low Stock Alerts</h3>
                    <p>Parts requiring replenishment</p>
                  </div>
                  <Package size={20} />
                </div>

                {stats.lowStock.length === 0 ? (
                  <div className="report-empty">
                    <CheckCircle2 size={20} />
                    No low-stock items detected.
                  </div>
                ) : (
                  <div className="report-stock-list">
                    {stats.lowStock.map((item) => (
                      <div className="report-stock-item" key={item.id}>
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            Minimum quantity: {item.minimum_quantity}
                          </span>
                        </div>

                        <span className="report-stock-quantity">
                          {item.quantity} left
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
