
import { useCallback, useEffect, useState } from "react";
import {
  Settings,
  Wrench,
  Package,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import StatCard from "../components/StatCard";

interface DashboardData {
  equipment: {
    total: number;
    by_status: Record<string, number>;
  };
  interventions: {
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
    mttr_hours: number | null;
    mttr_sample_size: number;
  };
  spare_parts: {
    total: number;
    low_stock_count: number;
    total_stock_value: number;
    low_stock_items: Array<{
      id?: number | string;
      name?: string;
      [key: string]: unknown;
    }>;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/");

      if (!response.ok) {
        throw new Error(`Erreur serveur : ${response.status}`);
      }

      const result: DashboardData = await response.json();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de contacter le serveur."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const equipmentOperational =
    data?.equipment.by_status?.OPERATIONAL ?? 0;

  return (
    <AppLayout>
      <div className="welcome-section">
        <div>
          <h2>Welcome back, Administrator 👋</h2>
          <p>
            Monitor your equipment, interventions and spare parts.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={() => void loadDashboard()}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Loading..." : "Refresh data"}
        </button>
      </div>

      {error && (
        <div className="dashboard-error" role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>API connection failed</strong>
            <p>{error}</p>
            <small>
              Vérifie que FastAPI fonctionne sur le port 8010.
            </small>
          </div>
          <button onClick={() => void loadDashboard()}>
            Retry
          </button>
        </div>
      )}

      <div className="api-status">
        {loading ? (
          <>
            <span className="status-dot loading-dot" />
            Loading dashboard data...
          </>
        ) : error ? (
          <>
            <span className="status-dot error-dot" />
            API unavailable
          </>
        ) : (
          <>
            <CheckCircle2 size={17} />
            API connected · Live backend data
          </>
        )}
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Equipment"
          value={loading ? "..." : String(data?.equipment.total ?? 0)}
          subtitle={`${equipmentOperational} operational`}
          icon={Settings}
          color="blue"
        />

        <StatCard
          title="Interventions"
          value={loading ? "..." : String(data?.interventions.total ?? 0)}
          subtitle="Total registered interventions"
          icon={Wrench}
          color="orange"
        />

        <StatCard
          title="Spare Parts"
          value={loading ? "..." : String(data?.spare_parts.total ?? 0)}
          subtitle={`${data?.spare_parts.low_stock_count ?? 0} items with low stock`}
          icon={Package}
          color="purple"
        />

        <StatCard
          title="API Status"
          value={loading ? "..." : error ? "Offline" : "Online"}
          subtitle={error ? "Connection failed" : "Backend reachable"}
          icon={Activity}
          color="green"
        />
      </div>

      <section className="chart-card">
        <div className="section-heading">
          <div>
            <h3>Maintenance Overview</h3>
            <p>Real-time information from the FastAPI backend</p>
          </div>
          <span className="chart-period">Live data</span>
        </div>

        {loading ? (
          <div className="empty-state">
            Loading maintenance information...
          </div>
        ) : error ? (
          <div className="empty-state">
            Dashboard information is temporarily unavailable.
          </div>
        ) : (
          <div className="overview-grid">
            <div className="overview-item">
              <span>Operational equipment</span>
              <strong>{equipmentOperational}</strong>
            </div>

            <div className="overview-item">
              <span>Intervention statuses</span>
              <strong>
                {Object.keys(data?.interventions.by_status ?? {}).length}
              </strong>
            </div>

            <div className="overview-item">
              <span>Low stock alerts</span>
              <strong>{data?.spare_parts.low_stock_count ?? 0}</strong>
            </div>

            <div className="overview-item">
              <span>Average repair time</span>
              <strong>
                {data?.interventions.mttr_hours == null
                  ? "N/A"
                  : `${data.interventions.mttr_hours} h`}
              </strong>
            </div>
          </div>
        )}
      </section>

      <section className="chart-card stock-section">
        <div className="section-heading">
          <div>
            <h3>Low Stock Alerts</h3>
            <p>Spare parts requiring attention</p>
          </div>
          <span className="chart-period">
            {data?.spare_parts.low_stock_count ?? 0} alerts
          </span>
        </div>

        {loading ? (
          <div className="empty-state">Loading stock information...</div>
        ) : !error && data?.spare_parts.low_stock_items?.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={22} />
            <span>No low-stock items detected.</span>
          </div>
        ) : (
          !error && (
            <div className="stock-alert-list">
              {data?.spare_parts.low_stock_items?.map((item, index) => (
                <div key={item.id ?? index} className="stock-alert-item">
                  <AlertCircle size={18} />
                  <span>{item.name ?? `Spare part ${index + 1}`}</span>
                </div>
              ))}
            </div>
          )
        )}
      </section>
    </AppLayout>
  );
}
