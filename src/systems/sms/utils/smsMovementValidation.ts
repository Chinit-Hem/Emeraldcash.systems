import type { MovementFormState } from "@/systems/sms/types/sms-movement";
import type { SmsTransferFormData } from "@/systems/sms/utils/sms-validation";

type ValidationResult = {
  errors: Record<string, string>;
  isValid: boolean;
};

export function buildMovementTransferPayload(
  form: MovementFormState,
  assetId: string
): SmsTransferFormData {
  return {
    assetId: assetId.trim(),
    senderId: form.senderId.trim(),
    receiverId: form.receiverId.trim(),
    location: form.location.trim(),
    remark: form.remark.trim() || undefined,
  };
}

export function validateReturnMovementForm(
  form: MovementFormState,
  selectedAssetId: string
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!selectedAssetId) errors.assetId = "Please select an assigned asset to send back.";
  if (!form.senderId.trim()) errors.senderId = "Please select who is sending this asset back.";
  if (!form.receiverId.trim()) errors.receiverId = "Please select who this asset is going back to.";
  if (!form.location.trim()) errors.location = "Location is required";
  if (form.location.length > 128) errors.location = "Location too long";
  if (form.remark.length > 500) errors.remark = "Remark too long";

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
