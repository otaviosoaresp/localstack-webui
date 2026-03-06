import { Breadcrumb, Space } from "antd";
import type { ReactNode } from "react";

interface BreadcrumbItem {
  title: string | ReactNode;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function PageHeader({ title, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 8, fontSize: 13 }}
          items={breadcrumb.map((item, index) => ({
            key: index,
            title: item.onClick ? (
              <a onClick={item.onClick} style={{ color: "var(--text-muted)" }}>{item.title}</a>
            ) : (
              <span style={{ color: "var(--text-secondary)" }}>{item.title}</span>
            ),
          }))}
        />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
        }}>
          {title}
        </h3>
        {actions && <Space size={8}>{actions}</Space>}
      </div>
    </div>
  );
}
