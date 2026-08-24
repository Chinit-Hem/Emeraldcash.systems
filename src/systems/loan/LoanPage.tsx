import { Metadata } from "next";
import LoanDashboard from "@/systems/loan/components/LoanDashboard";

export const metadata: Metadata = {
  title: "Loan Management | Emerald Cash Systems",
  description: "Overview of loan portfolio, approvals, and repayments.",
};

export default function LoanPage() {
  return <LoanDashboard />;
}
