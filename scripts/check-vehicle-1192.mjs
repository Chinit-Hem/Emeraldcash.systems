import { vehicleService } from "../src/systems/vms/services/VehicleService.ts";

const result = await vehicleService.getById(1192);
if (result.success && result.data) {
  console.log("Vehicle entity:");
  console.log("  id:", result.data.id);
  console.log("  brand:", result.data.brand);
  console.log("  model:", result.data.model);
  console.log("  imageUrl:", result.data.imageUrl);
  console.log("  imageUrl type:", typeof result.data.imageUrl);
  console.log("");
  const apiVehicle = vehicleService.toVehicle(result.data);
  console.log("API response (toVehicle):");
  console.log("  VehicleId:", apiVehicle.VehicleId);
  console.log("  Image:", apiVehicle.Image);
  console.log("  Image length:", apiVehicle.Image?.length);
} else {
  console.log("Vehicle 1192 not found");
}
