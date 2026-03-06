import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ConfigProvider as AntConfigProvider, theme } from "antd";
import { ConfigProvider } from "./config/ConfigContext";
import { HealthProvider } from "./contexts/HealthContext";
import { AppLayout } from "./layouts/AppLayout";
import { routes } from "./routes";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: routes,
  },
]);

const antTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    fontFamily: "'DM Sans', sans-serif",
    colorPrimary: "#ff9900",
    borderRadius: 6,
    colorBgContainer: "#ffffff",
    colorBorder: "#e1e4e8",
    colorBorderSecondary: "#eef0f2",
    colorText: "#1a1f25",
    colorTextSecondary: "#57606a",
    fontSize: 14,
  },
};

function App() {
  return (
    <ConfigProvider>
      <HealthProvider>
        <AntConfigProvider theme={antTheme}>
          <RouterProvider router={router} />
        </AntConfigProvider>
      </HealthProvider>
    </ConfigProvider>
  );
}

export default App;
