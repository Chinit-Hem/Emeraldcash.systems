import { canPrepareAccountReport, isBranchManagerReportActor, isDirectorReportActor, isHumanResourcesReportActor, isReportAdministrator } from "./reportWorkflowRoles.ts";

type Actor = { role: string; position?: string | null };
export function getReportNavigation(user: Actor, language: string) {
  const text = (en: string, km: string) => language === "km" ? km : en;
  const bm = isBranchManagerReportActor(user.role, user.position);
  const reviewer = isHumanResourcesReportActor(user.role, user.position) || isDirectorReportActor(user.role, user.position) || isReportAdministrator(user.role);
  const base = "/loan?view=operationReport&reportPanel=records&operationForm=summary";
  const ls = `${base}&operationMode=operation`;
  const manager = `${base}&operationMode=branchManager`;
  if (reviewer) return { href: `${manager}&reportLanding=dashboard`, links: [
    { label: text("BM Report", "របាយការណ៍ BM"), href: manager },
    { label: text("LS Report", "របាយការណ៍ LS"), href: ls },
    { label: text("Account Report", "របាយការណ៍គណនេយ្យ"), href: `${manager}&reportCategory=account` },
  ] };
  if (bm) return { href: `${manager}&reportLanding=dashboard`, links: [
    { label: text("LS Report", "របាយការណ៍ LS"), href: ls },
    { label: text("My Report", "របាយការណ៍ខ្ញុំ"), href: "/loan?view=operationReport&operationMode=branchManager&reportPanel=form&operationForm=collection&reportScope=mine&reportEntry=manual" },
    { label: text("My History", "ប្រវត្តិរបស់ខ្ញុំ"), href: `${manager}&reportScope=mine` },
  ] };
  if (canPrepareAccountReport(user.role, user.position)) return { href: "/loan?view=accounting&accountMode=accountReport&reportPanel=records", links: [] };
  return { href: ls, links: [
    { label: text("My Report", "របាយការណ៍ខ្ញុំ"), href: "/loan?view=operationReport&operationMode=operation&reportPanel=form&operationForm=collection&reportScope=mine" },
    { label: text("My History", "ប្រវត្តិរបស់ខ្ញុំ"), href: `${ls}&reportScope=mine` },
  ] };
}
