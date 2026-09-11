import { redirect } from "next/navigation";

export default function HrPage() {
  return redirect("/loan?view=operationReport&reportPanel=records&operationMode=branchManager&operationForm=summary&reportLanding=dashboard");
}
