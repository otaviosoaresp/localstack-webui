import { useState } from "react";
import type { ReactNode } from "react";
import {
  CloudServerOutlined,
  LockOutlined,
  TableOutlined,
  FunctionOutlined,
  FileTextOutlined,
  TeamOutlined,
  SettingOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { ConfigModal } from "../components/ConfigModal";
import { useConfig } from "../config/ConfigContext";
import { useHealth } from "../contexts/HealthContext";
import { isServiceAvailable } from "../services/health-service";

interface NavItem {
  key: string;
  path: string;
  icon: ReactNode;
  label: string;
  healthKey?: string;
}

const SERVICE_ITEMS: NavItem[] = [
  { key: "home", path: "/", icon: <HomeOutlined />, label: "Dashboard" },
  { key: "s3", path: "/s3", icon: <CloudServerOutlined />, label: "S3", healthKey: "s3" },
  { key: "secrets", path: "/secrets", icon: <LockOutlined />, label: "Secrets Manager", healthKey: "secrets" },
  { key: "dynamodb", path: "/dynamodb", icon: <TableOutlined />, label: "DynamoDB", healthKey: "dynamodb" },
  { key: "lambda", path: "/lambda", icon: <FunctionOutlined />, label: "Lambda", healthKey: "lambda" },
  { key: "cloudwatch", path: "/cloudwatch", icon: <FileTextOutlined />, label: "CloudWatch Logs", healthKey: "cloudwatch" },
  { key: "iam", path: "/iam", icon: <TeamOutlined />, label: "IAM", healthKey: "iam" },
];

function isActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === "/") return currentPath === "/";
  return currentPath.startsWith(itemPath);
}

function getPageTitle(pathname: string): string {
  const match = SERVICE_ITEMS.find((item) =>
    item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)
  );
  return match?.label ?? "LocalStack";
}

export function AppLayout() {
  const [configOpen, setConfigOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { config, isConfigured } = useConfig();
  const { services: healthServices, version, loading: healthLoading } = useHealth();

  function getServiceStatus(healthKey: string | undefined): "available" | "disabled" | "loading" {
    if (!healthKey) return "available";
    if (healthLoading) return "loading";
    const service = healthServices[healthKey];
    if (!service) return "disabled";
    return isServiceAvailable(service.status) ? "available" : "disabled";
  }

  return (
    <div className="app-shell">
      <nav className={`sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">LS</div>
          <span className="sidebar-brand-text">LocalStack</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-group-label">Services</div>
          {SERVICE_ITEMS.map((item) => {
            const status = getServiceStatus(item.healthKey);
            return (
              <button
                key={item.key}
                className={`sidebar-nav-item${isActive(item.path, location.pathname) ? " active" : ""}${status === "disabled" ? " disabled-service" : ""}`}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
                {item.healthKey && (
                  <span className={`sidebar-health-dot ${status}`} />
                )}
              </button>
            );
          })}

          <div className="sidebar-group-label" style={{ marginTop: 16 }}>
            Configuration
          </div>
          <button
            className="sidebar-nav-item"
            onClick={() => setConfigOpen(true)}
            title={collapsed ? "Settings" : undefined}
          >
            <span className="sidebar-nav-icon"><SettingOutlined /></span>
            <span className="sidebar-nav-label">Settings</span>
          </button>
        </div>

        <div className="sidebar-footer">
          {version && !collapsed && (
            <span className="sidebar-version">v{version}</span>
          )}
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </div>
      </nav>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            {getPageTitle(location.pathname)}
          </div>
          <div className="topbar-right">
            <span className="region-label">{config.region}</span>
            <button
              className="connection-badge"
              onClick={() => setConfigOpen(true)}
            >
              <span className={`connection-dot ${isConfigured ? "connected" : "disconnected"}`} />
              {isConfigured ? config.endpoint.replace(/^https?:\/\//, "") : "Not configured"}
            </button>
          </div>
        </header>

        <main className="content-area">
          <div className="content-card">
            <Outlet />
          </div>
        </main>
      </div>

      <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
    </div>
  );
}
