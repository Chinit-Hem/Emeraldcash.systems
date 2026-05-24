import type { ReactNode } from "react";

export default function SmsLayout({ children }: { children: ReactNode }) {
  return <div className="ec-dark-scope min-h-screen">{children}</div>;
}
