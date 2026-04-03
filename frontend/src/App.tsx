import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Group, Text, Box } from "@mantine/core";
import ConditionsPage from "./pages/ConditionsPage";
import ConditionDetailPage from "./pages/ConditionDetailPage";
import SymptomsPage from "./pages/SymptomsPage";
import SymptomDetailPage from "./pages/SymptomDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Box
        px="xl"
        h={56}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 32,
          background: "white",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Text fw={700} size="sm" c="dark.7">Healthily</Text>
        {[
          { to: "/conditions", label: "Conditions" },
          { to: "/symptoms", label: "Symptoms" },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }: { isActive: boolean }) => ({
              color: isActive ? "var(--mantine-color-blue-6)" : "var(--mantine-color-gray-6)",
              textDecoration: "none",
              fontSize: "var(--mantine-font-size-sm)",
              fontWeight: isActive ? 500 : 400,
            })}
          >
            {label}
          </NavLink>
        ))}
      </Box>

      <Box maw={960} mx="auto" px="xl" py="xl">
        <Routes>
          <Route path="/" element={<Navigate to="/conditions" replace />} />
          <Route path="/conditions" element={<ConditionsPage />} />
          <Route path="/conditions/:id" element={<ConditionDetailPage />} />
          <Route path="/symptoms" element={<SymptomsPage />} />
          <Route path="/symptoms/:id" element={<SymptomDetailPage />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}
