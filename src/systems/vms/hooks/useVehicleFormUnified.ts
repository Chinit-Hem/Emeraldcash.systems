/**
 * useVehicleFormUnified - UNIFIED FORM HOOK (Merged Legacy + Neon)
 *
 * Combines:
 * ✅ useVehicleForm (client state/validation)
 * ✅ useVehicleFormNeon (upload/compression/retry)
 * ✅ React 18 concurrent features
 *
 * @module useVehicleFormUnified
 */

import { compressImage } from "@/shared/utils/clientImageCompression";
import { derivePrices } from "@/systems/vms/utils/pricing";
import type { Vehicle } from "@/shared/types/types";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

type UploadStage = 'compressing' | 'uploading' | 'processing' | 'saving' | null;
type StockStatus = 'PENDING' | 'ASSIGNED' | 'ACCEPTED' | 'LOST' | 'RETURNED' | 'OUT' | 'NOT_RETURNED';

interface UnifiedFormState {
  formData: Partial<Vehicle & { SenderId: number | null; ReceiverId: number | null; HandoverDate: string | null; Status: StockStatus; Remarks: string }>;

  errors: Record<string, string>;
  touched: Record<string, boolean>;
  uploadedImage: File | string | null;
  imageLoading: boolean;
  isSubmitting: boolean;
  hasChanges: boolean;
  derivedPrices: { Price40: number | null; Price70: number | null };
  progress: number;
  stage: UploadStage;
  uploadError: string | null;
}

export interface UseVehicleFormOptions {
  initialVehicle: Vehicle;
  onSubmit?: (data: Partial<Vehicle>, imageFile: File | null) => Promise<void>;
  onSubmitSuccess?: (vehicle: Vehicle) => void;
  onSubmitError?: (error: string) => void;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export function useVehicleFormUnified(options: UseVehicleFormOptions) {
  const {
    initialVehicle,
    onSubmit,
    onSubmitSuccess,
    onSubmitError,
    validateOnBlur = true,
    validateOnChange = false
  } = options;

  const [isPending, startTransition] = useTransition();

  // Unified state
  const [state, setState] = useState<UnifiedFormState>({
    formData: initialVehicle,
    errors: {},
    touched: {},
    uploadedImage: null,
    imageLoading: false,
    isSubmitting: false,
    hasChanges: false,
    derivedPrices: derivePrices(initialVehicle.PriceNew),
    progress: 0,
    stage: null,
    uploadError: null,
  });

  const initialVehicleRef = useRef(initialVehicle);

  // Update initial vehicle
  useEffect(() => {
    if (initialVehicle.VehicleId !== initialVehicleRef.current.VehicleId) {
      startTransition(() => {
        setState(prev => ({
          ...prev,
          formData: initialVehicle,
          uploadedImage: null,
          errors: {},
          touched: {},
          hasChanges: false,
        }));
        initialVehicleRef.current = initialVehicle;
      });
    }
  }, [initialVehicle, initialVehicle.VehicleId]);

  // Computed values
  const derivedPrices = useMemo(() => derivePrices(state.formData.PriceNew ?? null), [state.formData.PriceNew]);
  const categoryOptions = useMemo(() => {
    const cat = state.formData.Category || "";
    const isStandard = ["Cars", "Motorcycles", "Tuk Tuk"].includes(cat);
    return isStandard ? ["Cars", "Motorcycles", "Tuk Tuk"] : [cat, "Cars", "Motorcycles", "Tuk Tuk"];
  }, [state.formData.Category]);

  const hasChanges = useMemo(() => {
    const initialData = initialVehicleRef.current;
    const currentData = state.formData;
    return (
      JSON.stringify(currentData) !== JSON.stringify(initialData) ||
      state.uploadedImage !== null
    );
  }, [state.formData, state.uploadedImage]);

  const isValid = useMemo(() => Object.keys(state.errors).length === 0, [state.errors]);

  // Validation
  const validateField = useCallback((field: keyof Vehicle | 'SenderId' | 'ReceiverId' | 'HandoverDate' | 'Status' | 'Remarks', value: unknown): string => {
    let error = "";

    switch (field) {
      case "Brand":
      case "Model":
      case "Category":
        if (!value || String(value).trim() === "") error = `${String(field)} is required`;
        break;
      case "Year":
        if (value && (Number(value) < 1900 || Number(value) > new Date().getFullYear() + 2)) {
          error = "Valid year required";
        }
        break;
      case "PriceNew":
        if (value && (Number(value) <= 0 || isNaN(Number(value)))) {
          error = "Valid price required";
        }
        break;
case "Status":
        if (!value || !['PENDING', 'ASSIGNED', 'ACCEPTED', 'LOST', 'RETURNED', 'OUT', 'NOT_RETURNED'].includes(String(value))) {
          error = "Status is required";
        }
        break;
      case "Remarks":
        if (!value || String(value).trim().length < 5) {
          error = "Remarks must be at least 5 characters";
        }
        break;
      case "HandoverDate":
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
          error = "Valid date (YYYY-MM-DD) required";
        }
        break;
    }

    return error;
  }, []);


  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    ["Brand", "Model", "Category"].forEach(field => {
      const error = validateField(field as keyof Vehicle, state.formData[field as keyof Vehicle]);
      if (error) newErrors[field] = error;
    });

    // Stock tracking validation
    const stockError = validateField('Status', state.formData.Status);
    if (stockError) newErrors.Status = stockError;
    const remarksError = validateField('Remarks', state.formData.Remarks);
    if (remarksError) newErrors.Remarks = remarksError;

    startTransition(() => {
      setState(prev => ({ ...prev, errors: newErrors }));
    });

    return Object.keys(newErrors).length === 0;
  }, [state.formData, validateField]);


    // Handlers with transition
  const handleChange = useCallback((field: keyof Vehicle | 'SenderId' | 'ReceiverId' | 'HandoverDate' | 'Status' | 'Remarks', value: string | number | null) => {
    startTransition(() => {
      const newFormData = { ...state.formData, [field]: value };

      if (field === "PriceNew") {
        const price = Number(value);
        if (!isNaN(price) && price > 0) {
          const derived = derivePrices(price);
          newFormData.Price40 = derived.Price40;
          newFormData.Price70 = derived.Price70;
        }
      }

      setState(prev => ({
        ...prev,
        formData: newFormData,
        errors: { ...prev.errors, [String(field)]: "" },
      }));
    });
  }, [state.formData]);


  const handleImageChange = useCallback(async (image: File | string | null) => {
    if (!image) {
      startTransition(() => setState(prev => ({ ...prev, uploadedImage: null, imageLoading: false })));
      return;
    }

    setState(prev => ({ ...prev, imageLoading: true }));

    try {
      // Async image processing (non-blocking)
      const processed = await (async () => {
        if (typeof image === "string") {
          if (image.startsWith("http")) return image;
          const blob = await (await fetch(image)).blob();
          return URL.createObjectURL(blob);
        }
        // Compress large images
        if (image.size > 1024 * 1024) {
          const compressed = await compressImage(image, { maxWidth: 800, quality: 0.8 });
          return URL.createObjectURL(compressed.file);
        }
        return URL.createObjectURL(image);
      })();

      startTransition(() => {
        setState(prev => ({
          ...prev,
          uploadedImage: image,
          imageLoading: false,
          formData: { ...prev.formData, Image: processed },
        }));
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        imageLoading: false,
        errors: { ...prev.errors, Image: "Image processing failed" },
      }));
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    startTransition(() => {
      setState(prev => ({
        ...prev,
        uploadedImage: null,
        formData: { ...prev.formData, Image: undefined },
        errors: { ...prev.errors, Image: "" },
      }));
    });
  }, []);

  const handleBlur = useCallback((field: keyof Vehicle | 'SenderId' | 'ReceiverId' | 'HandoverDate' | 'Status' | 'Remarks') => {
    startTransition(() => {
      setState(prev => {
        const nextErrors = { ...prev.errors };
        if (validateOnBlur) {
          const value = prev.formData[field as keyof typeof prev.formData];
          nextErrors[String(field)] = validateField(field, value);
        }
        return {
          ...prev,
          touched: { ...prev.touched, [String(field)]: true },
          errors: nextErrors,
        };
      });
    });
  }, [validateField, validateOnBlur]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    // This is a loop.
    setState(prev => ({ ...prev, isSubmitting: true, stage: 'saving', progress: 0 }));

    try {
      const imageFile = state.uploadedImage instanceof File ? state.uploadedImage : null;
      if (onSubmit) {
        await onSubmit(state.formData as Partial<Vehicle>, imageFile);
      }
      setState(prev => ({ ...prev, isSubmitting: false, stage: null, progress: 100 }));
      onSubmitSuccess?.({ ...initialVehicle, ...(state.formData as Partial<Vehicle>) });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Submit failed";
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        stage: null,
        uploadError: msg
      }));
      onSubmitError?.(msg);
    }
  }, [state, validateForm, onSubmit, onSubmitSuccess, onSubmitError, initialVehicle]);

  return {
    // State (non-urgent)
    formData: state.formData,
    errors: state.errors,
    touched: state.touched,
    uploadedImage: state.uploadedImage,
    imageLoading: state.imageLoading,
    isSubmitting: state.isSubmitting,
    hasChanges,
    derivedPrices,
    progress: state.progress,
    stage: state.stage,

    // Actions
    handleChange,
    handleBlur,
    handleImageChange,
    handleRemoveImage,
    handleSubmit,
    validateForm,
    categoryOptions,
    isValid,
    isPending, // For Suspense boundaries
  };
}
