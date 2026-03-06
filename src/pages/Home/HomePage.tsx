import { useEffect, useState } from "react";
import { Skeleton } from "antd";
import {
  CloudServerOutlined,
  LockOutlined,
  TableOutlined,
  FunctionOutlined,
  FileTextOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useConfig } from "../../config/ConfigContext";
import { listBuckets } from "../../services/s3-service";
import { listSecrets } from "../../services/secrets-service";
import { listTables } from "../../services/dynamodb-service";
import { listFunctions } from "../../services/lambda-service";
import { listLogGroups } from "../../services/cloudwatch-service";
import { listRoles } from "../../services/iam-service";
import { useHealth } from "../../contexts/HealthContext";
import { isServiceAvailable } from "../../services/health-service";
import type { AwsConfig } from "../../config/aws-config";
import type { ReactNode } from "react";

interface ServiceCard {
  key: string;
  name: string;
  route: string;
  icon: ReactNode;
  color: string;
  fetcher: (config: AwsConfig) => Promise<unknown[]>;
  label: string;
  healthKey: string;
}

const SERVICES: ServiceCard[] = [
  { key: "s3", name: "S3", route: "/s3", icon: <CloudServerOutlined />, color: "var(--aws-s3)", fetcher: (c) => listBuckets(c), label: "Buckets", healthKey: "s3" },
  { key: "secrets", name: "Secrets Manager", route: "/secrets", icon: <LockOutlined />, color: "var(--aws-secrets)", fetcher: (c) => listSecrets(c), label: "Secrets", healthKey: "secrets" },
  { key: "dynamodb", name: "DynamoDB", route: "/dynamodb", icon: <TableOutlined />, color: "var(--aws-dynamodb)", fetcher: (c) => listTables(c), label: "Tables", healthKey: "dynamodb" },
  { key: "lambda", name: "Lambda", route: "/lambda", icon: <FunctionOutlined />, color: "var(--aws-lambda)", fetcher: (c) => listFunctions(c), label: "Functions", healthKey: "lambda" },
  { key: "cloudwatch", name: "CloudWatch Logs", route: "/cloudwatch", icon: <FileTextOutlined />, color: "var(--aws-cloudwatch)", fetcher: (c) => listLogGroups(c), label: "Log Groups", healthKey: "cloudwatch" },
  { key: "iam", name: "IAM", route: "/iam", icon: <TeamOutlined />, color: "var(--aws-iam)", fetcher: (c) => listRoles(c), label: "Roles", healthKey: "iam" },
];

interface CountState {
  value: number | null;
  loading: boolean;
}

export function HomePage() {
  const { config } = useConfig();
  const navigate = useNavigate();
  const { services: healthServices, edition, version, loading: healthLoading } = useHealth();
  const [counts, setCounts] = useState<Record<string, CountState>>(() => {
    const initial: Record<string, CountState> = {};
    for (const s of SERVICES) initial[s.key] = { value: null, loading: true };
    return initial;
  });

  useEffect(() => {
    for (const s of SERVICES) {
      s.fetcher(config)
        .then((result: unknown[]) => {
          setCounts((prev) => ({ ...prev, [s.key]: { value: result.length, loading: false } }));
        })
        .catch(() => {
          setCounts((prev) => ({ ...prev, [s.key]: { value: null, loading: false } }));
        });
    }
  }, [config]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Dashboard
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--surface-secondary)", padding: "1px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>
            {config.endpoint.replace(/^https?:\/\//, "")}
          </span>
          <span style={{ color: "var(--border)" }}>/</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{config.region}</span>
          {version && (
            <>
              <span style={{ color: "var(--border)" }}>/</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--surface-secondary)", padding: "1px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>
                {edition} v{version}
              </span>
            </>
          )}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {SERVICES.map((service) => {
          const count = counts[service.key];
          const health = healthServices[service.healthKey];
          const serviceAvailable = healthLoading || !health ? true : isServiceAvailable(health.status);
          return (
            <button
              key={service.key}
              onClick={() => navigate(service.route)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: 20,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s, box-shadow 0.15s, opacity 0.15s",
                width: "100%",
                fontFamily: "var(--font-body)",
                opacity: serviceAvailable ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = service.color;
                e.currentTarget.style.boxShadow = `0 0 0 1px ${service.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  background: `${service.color}10`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: service.color,
                  flexShrink: 0,
                }}
              >
                {service.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  {service.name}
                  {!healthLoading && health && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: serviceAvailable ? "#2da44e" : "#8b949e",
                        boxShadow: serviceAvailable ? "0 0 0 2px rgba(45,164,78,0.15)" : "none",
                      }}
                    />
                  )}
                </div>
                {!serviceAvailable && !healthLoading ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Not running
                  </div>
                ) : count.loading ? (
                  <Skeleton.Input active size="small" style={{ width: 48, height: 16 }} />
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 16, color: "var(--text-primary)", marginRight: 4 }}>
                      {count.value !== null ? count.value : "-"}
                    </span>
                    {service.label}
                  </div>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
