import type { ReactNode } from "react";

export default function LmsLayout({ children }: { children: ReactNode }) {
  return <div className="ec-dark-scope min-h-screen">{children}</div>;
}
