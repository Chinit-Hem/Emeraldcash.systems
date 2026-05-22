"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

function rootIsDark() {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  return root.classList.contains("dark") || root.dataset.theme === "dark";
}

export function useChartTheme() {
  const [isDark, setIsDark] = useState(rootIsDark);

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => setIsDark(rootIsDark());

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });

    return () => observer.disconnect();
  }, []);

  return useMemo(() => {
    const tooltipContentStyle: CSSProperties = {
      background: isDark ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.95)",
      border: isDark ? "1px solid #334155" : "1px solid #e5e7eb",
      borderRadius: "12px",
      backdropFilter: "blur(12px)",
      boxShadow: isDark ? "0 12px 28px rgba(2, 6, 23, 0.5)" : "0 10px 26px rgba(0, 0, 0, 0.1)",
      color: isDark ? "#e2e8f0" : "#1f2937",
    };

    const tooltipLabelStyle: CSSProperties = {
      color: isDark ? "#cbd5e1" : "#6b7280",
      fontWeight: 600,
    };

    const tooltipItemStyle: CSSProperties = {
      color: isDark ? "#e2e8f0" : "#1f2937",
    };

    const legendStyle: CSSProperties = {
      color: isDark ? "#cbd5e1" : "#6b7280",
      fontSize: 12,
      fontWeight: 500,
      paddingTop: "20px",
    };

    return {
      axisStroke: isDark ? "#334155" : "#e5e7eb",
      gridStroke: isDark ? "#334155" : "#e5e7eb",
      pieStroke: isDark ? "#334155" : "#e5e7eb",
      tickFill: isDark ? "#94a3b8" : "#6b7280",
      tooltipContentStyle,
      tooltipLabelStyle,
      tooltipItemStyle,
      legendStyle,
    };
  }, [isDark]);
}
