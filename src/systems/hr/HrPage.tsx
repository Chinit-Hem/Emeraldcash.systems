import { Metadata } from "next";

export const metadata: Metadata = {
  title: "HR",
};

export default function HrPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        HR - Human Resources
      </h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Coming soon. This section will be used for HR management.
      </p>
    </div>
  );
}
