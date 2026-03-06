import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useConfig } from "../config/ConfigContext";
import { fetchHealth, mapServiceHealth } from "../services/health-service";
import type { ServiceHealth, HealthResponse } from "../services/health-service";

interface HealthState {
  services: Record<string, ServiceHealth>;
  edition: string;
  version: string;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const HealthContext = createContext<HealthState>({
  services: {},
  edition: "",
  version: "",
  loading: true,
  error: null,
  refresh: () => {},
});

export function HealthProvider({ children }: { children: ReactNode }) {
  const { config } = useConfig();
  const [services, setServices] = useState<Record<string, ServiceHealth>>({});
  const [edition, setEdition] = useState("");
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const health: HealthResponse = await fetchHealth(config);
      setServices(mapServiceHealth(health));
      setEdition(health.edition ?? "");
      setVersion(health.version ?? "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch health";
      setError(msg);
      setServices({});
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <HealthContext.Provider value={{ services, edition, version, loading, error, refresh }}>
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth(): HealthState {
  return useContext(HealthContext);
}
