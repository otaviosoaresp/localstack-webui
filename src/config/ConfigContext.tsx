import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { AwsConfig } from "./aws-config";
import { loadConfig, saveConfig, hasStoredConfig } from "./aws-config";

interface ConfigContextValue {
  config: AwsConfig;
  updateConfig: (config: AwsConfig) => void;
  isConfigured: boolean;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AwsConfig>(loadConfig);
  const [isConfigured, setIsConfigured] = useState<boolean>(hasStoredConfig);

  const updateConfig = useCallback((newConfig: AwsConfig) => {
    saveConfig(newConfig);
    setConfig(newConfig);
    setIsConfigured(true);
  }, []);

  return (
    <ConfigContext.Provider value={{ config, updateConfig, isConfigured }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within ConfigProvider");
  }
  return context;
}
