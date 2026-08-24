import { redirect } from "next/navigation";

export default function VehicleDetailView({
  params,
}: {
  params: { id?: string };
}) {
  const id = params.id;
  if (!id) redirect("/vehicles");
  redirect(`/vehicles/${encodeURIComponent(id)}/view`);
}


