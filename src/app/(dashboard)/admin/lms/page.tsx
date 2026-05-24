import { redirect } from "next/navigation";

/**
 * Redirect /admin/lms to /lms
 * 
 * The LMS is now unified at /lms for all users.
 * Admin and Staff roles see different views based on their permissions.
 */
export default function AdminLmsRedirectPage() {
  redirect("/lms");
}
