"use client";

import { compressImage } from '@/shared/utils/compressImage';
import { generateShortUUID } from '@/shared/utils/uuid';
import { AlertCircle, Loader2, Package, RefreshCw, Save, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';
import {
  smsDropzoneClass,
  smsErrorTextClass,
  smsHelperClass,
  smsInvalidFieldClass,
  smsInputClass,
  smsLabelClass,
  smsModalFooterClass,
  smsModalHeaderClass,
  smsModalPanelClass,
  smsPrimaryButtonClass,
  smsSecondaryButtonClass,
  smsTextareaClass,
} from '@/systems/sms/components/SmsShared';
import { useSmsUsers } from '@/systems/sms/hooks/useSmsUsers';
import { formatSmsUserLabel } from '@/systems/sms/utils/smsUsers';

interface SmsAsset {
  id?: string;
  name: string;
  itemCode?: string;
  type: string;
  category?: string;
  quantity?: number;
  location?: string;
  assignedTo?: string;
  imageUrl?: string;
  documentUrl?: string;
  description?: string;
  refId?: string;
  status: 'Available' | 'In Use' | 'Borrowed' | 'Out' | 'Not Returned';
}

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<SmsAsset, 'id'>) => Promise<{ success: boolean; error?: string; errors?: Record<string, string> }>;
  initialData?: Partial<SmsAsset>;
  title: ReactNode;
  isEdit?: boolean;
}

interface CloudinarySignature {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  upload_preset: string;
  folder: string;
  public_id?: string;
  tags?: string;
}

type AssetFormData = Omit<SmsAsset, 'id'>;
type AssetFormField = keyof AssetFormData;

const assetStatusOptions = ['Available', 'In Use', 'Borrowed', 'Out', 'Not Returned'] as const;
const statusLabels: Record<SmsAsset['status'], string> = {
  Available: 'Available',
  'In Use': 'Assigned',
  Borrowed: 'Borrowed',
  Out: 'Sent Out',
  'Not Returned': 'Overdue Return',
};

function buildAssetCode(type: string, category?: string) {
  const source = (category || type || 'SMS')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const prefix = source.length > 0
    ? source.map((part) => part[0]).join('').slice(0, 4).toUpperCase()
    : 'SMS';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `SMS-${prefix || 'AST'}-${suffix}`;
}

async function getCloudinarySignature(publicId: string): Promise<CloudinarySignature> {
  const response = await fetch('/api/cloudinary-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder: 'sms/assets/images',
      public_id: publicId,
      tags: ['sms', 'asset'],
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok || !result.data) {
    throw new Error(result.error || `Failed to prepare upload: ${response.status}`);
  }

  return result.data;
}

function uploadToCloudinary(
  file: File,
  signatureData: CloudinarySignature,
  onProgress: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', signatureData.upload_preset);
    formData.append('folder', signatureData.folder);
    formData.append('api_key', signatureData.api_key);
    formData.append('timestamp', String(signatureData.timestamp));
    formData.append('signature', signatureData.signature);

    if (signatureData.public_id) formData.append('public_id', signatureData.public_id);
    if (signatureData.tags) formData.append('tags', signatureData.tags);

    const request = new XMLHttpRequest();
    request.open('POST', `https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/image/upload`);
    request.timeout = 120000;

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(30 + Math.round((event.loaded / event.total) * 70));
    };

    request.onload = () => {
      let result: { secure_url?: string; error?: { message?: string } } = {};
      try {
        result = JSON.parse(request.responseText || '{}');
      } catch {
        reject(new Error(`Cloudinary upload failed: ${request.status}`));
        return;
      }

      if (request.status >= 200 && request.status < 300 && result.secure_url) {
        resolve(result.secure_url);
        return;
      }

      reject(new Error(result.error?.message || `Cloudinary upload failed: ${request.status}`));
    };

    request.onerror = () => reject(new Error('Network error while uploading image'));
    request.ontimeout = () => reject(new Error('Image upload timed out. Try a smaller image or a stronger connection.'));
    request.send(formData);
  });
}

export default function AssetFormModal({
  isOpen,
  onClose,
  onSave,
  initialData = {},
  title,
  isEdit = false
}: AssetFormModalProps) {
  const [formData, setFormData] = useState<AssetFormData>({
    name: '',
    type: '',
    status: 'Available',
    quantity: 1,
    ...initialData
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  // The modal remains mounted while closed, so preload assignees before the
  // user opens the form instead of showing a late-populating field.
  const { users } = useSmsUsers();

  // Sync formData and imagePreview whenever the modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData?.name || '',
        type: initialData?.type || '',
        status: initialData?.status || 'Available',
        quantity: initialData?.quantity ?? 1,
        itemCode: initialData?.itemCode || undefined,
        category: initialData?.category || undefined,
        location: initialData?.location || undefined,
        assignedTo: (initialData?.status || 'Available') === 'Available'
          ? undefined
          : initialData?.assignedTo || undefined,
        imageUrl: initialData?.imageUrl || undefined,
        documentUrl: initialData?.documentUrl || undefined,
        description: initialData?.description || undefined,
        refId: initialData?.refId || undefined,
      });
      setImagePreview(initialData?.imageUrl || null);
      setErrors({});
      setUploadProgress(0);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  const clearFieldError = (field: string) => {
    setErrors((current) => {
      if (!current[field] && current.general !== 'Please fix the errors below.') return current;
      const next = { ...current };
      delete next[field];
      if (next.general === 'Please fix the errors below.') {
        delete next.general;
      }
      return next;
    });
  };

  const updateFormField = <K extends AssetFormField>(field: K, value: AssetFormData[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    clearFieldError(field);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name?.trim()) newErrors.name = 'Asset name is required';
    if (formData.name && formData.name.length < 2) newErrors.name = 'Name must be at least 2 characters';
    if (formData.name && formData.name.length > 255) newErrors.name = 'Name too long (max 255 characters)';

    if (!formData.type?.trim()) newErrors.type = 'Type is required';
    if (formData.type && formData.type.length > 64) newErrors.type = 'Type too long (max 64 characters)';

    // Quantity validation
    if (!formData.quantity) newErrors.quantity = 'Quantity is required';
    else if (formData.quantity < 1) newErrors.quantity = 'Quantity must be at least 1';
    else if (formData.quantity > 999) newErrors.quantity = 'Quantity too high (max 999)';

    if (formData.status !== 'Available' && !formData.assignedTo?.trim()) {
      newErrors.assignedTo = 'Assigned to is required when the asset is not available';
    }

    // Optional field max lengths
    if (formData.itemCode && formData.itemCode.length > 64) newErrors.itemCode = 'Item code too long (max 64 characters)';
    if (formData.category && formData.category.length > 64) newErrors.category = 'Category too long (max 64 characters)';
    if (formData.location && formData.location.length > 128) newErrors.location = 'Location too long (max 128 characters)';
    if (formData.assignedTo && formData.assignedTo.length > 128) newErrors.assignedTo = 'Assigned to too long (max 128 characters)';
    if (formData.description && formData.description.length > 1000) newErrors.description = 'Description too long (max 1000 characters)';
    if (formData.refId && formData.refId.length > 128) newErrors.refId = 'Reference ID too long (max 128 characters)';
    if (formData.documentUrl && formData.documentUrl.length > 512) newErrors.documentUrl = 'Document URL too long (max 512 characters)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB
      setErrors((current) => ({ ...current, image: 'File too large (max 10MB)' }));
      return;
    }

    clearFieldError('image');
    setLoading(true);
    setUploadProgress(0);

    const publicId = `asset-${generateShortUUID()}`;

    try {
      setUploadProgress(10);
      const signatureData = await getCloudinarySignature(publicId);

      setUploadProgress(20);
      let fileToUpload = file;
      try {
        const compressed = await compressImage(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.75,
          type: 'image/webp',
        });
        fileToUpload = compressed.file;
      } catch {
        fileToUpload = file;
      }

      setUploadProgress(30);
      const imageUrl = await uploadToCloudinary(fileToUpload, signatureData, setUploadProgress);

      updateFormField('imageUrl', imageUrl);
      setImagePreview(imageUrl);
      clearFieldError('image');
    } catch (err) {
      setErrors((current) => ({
        ...current,
        image: err instanceof Error ? err.message : 'Upload failed',
      }));
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await onSave(formData);

      if (result.success) {
        onClose();
      } else {
        // Merge field-level errors from API response with existing errors.
        const fieldErrors = result.errors || {};
        setErrors((current) => ({
          ...current,
          ...fieldErrors,
          general: fieldErrors && Object.keys(fieldErrors).length > 0
            ? 'Please fix the errors below.'
            : (result.error || 'Save failed')
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    updateFormField('imageUrl', undefined);
    setImagePreview(null);
    clearFieldError('image');
  };

  const handleGenerateCode = () => {
    updateFormField('itemCode', buildAssetCode(formData.type, formData.category));
  };

  const handleStatusChange = (status: SmsAsset['status']) => {
    setFormData((current) => ({
      ...current,
      status,
      assignedTo: status === 'Available' ? undefined : current.assignedTo,
    }));
    clearFieldError('status');
    if (status === 'Available') {
      clearFieldError('assignedTo');
    }
  };

  if (!isOpen) return null;
  const loadingLabel = uploadProgress > 0 ? 'Uploading...' : 'Saving...';

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className={smsModalPanelClass}>
          {/* Header */}
          <div className={smsModalHeaderClass}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
                    {title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isEdit ? 'Update SMS asset details' : 'Create an SMS asset record'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close asset form"
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                disabled={loading}
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              {errors.general && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{errors.general}</p>
                </div>
              )}

              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">Required Asset Info</h3>
                  <p className={smsHelperClass}>Name, code, type, and quantity define the inventory record.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={smsLabelClass}>Asset Name *</label>
                    <input
                      type="text"
                      title="Asset name"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      className={`${smsInputClass} ${errors.name ? smsInvalidFieldClass : ""}`}
                      placeholder="e.g. Office Laptop Dell XPS"
                      disabled={loading}
                      required
                      maxLength={255}
                      {...(errors.name ? { "aria-invalid": "true" as const } : {})}
                      autoFocus
                    />
                    {errors.name && (
                      <p className={smsErrorTextClass}>
                        <AlertCircle className="h-4 w-4" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={smsLabelClass}>Asset Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        title="Asset code"
                        value={formData.itemCode || ''}
                        onChange={(e) => updateFormField('itemCode', e.target.value || undefined)}
                        className={`${smsInputClass} ${errors.itemCode ? smsInvalidFieldClass : ""}`}
                        placeholder="e.g. SMS-LAP-0001"
                        disabled={loading}
                        maxLength={64}
                        {...(errors.itemCode ? { "aria-invalid": "true" as const } : {})}
                      />
                      <button
                        type="button"
                        onClick={handleGenerateCode}
                        disabled={loading}
                        className={`${smsSecondaryButtonClass} shrink-0 px-3`}
                        title="Generate asset code"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Generate
                      </button>
                    </div>
                    <p className={smsHelperClass}>Use a short unique code for labels, audits, and search.</p>
                    {errors.itemCode && (
                      <p className={smsErrorTextClass}>
                        <AlertCircle className="h-4 w-4" />
                        {errors.itemCode}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={smsLabelClass}>Asset Type *</label>
                    <input
                      list="asset-types"
                      type="text"
                      title="Asset type"
                      value={formData.type}
                      onChange={(e) => updateFormField('type', e.target.value)}
                      className={`${smsInputClass} ${errors.type ? smsInvalidFieldClass : ""}`}
                      placeholder="Select or type an asset type..."
                      disabled={loading}
                      required
                      maxLength={64}
                      {...(errors.type ? { "aria-invalid": "true" as const } : {})}
                    />
                    <datalist id="asset-types">
                      <option value="Electronics" />
                      <option value="Furniture" />
                      <option value="Vehicle" />
                      <option value="Tool" />
                      <option value="Office Supply" />
                      <option value="Other" />
                    </datalist>
                    {errors.type && (
                      <p className={smsErrorTextClass}>
                        <AlertCircle className="h-4 w-4" />
                        {errors.type}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={smsLabelClass}>Quantity *</label>
                    <input
                      type="number"
                      title="Quantity"
                      min="1"
                      max="999"
                      step="1"
                      value={formData.quantity ?? ''}
                      onChange={(e) => {
                        const nextQuantity = e.target.value === '' ? undefined : Number(e.target.value);
                        updateFormField('quantity', Number.isFinite(nextQuantity) ? nextQuantity : undefined);
                      }}
                      className={`${smsInputClass} ${errors.quantity ? smsInvalidFieldClass : ""}`}
                      placeholder="1"
                      disabled={loading}
                      {...(errors.quantity ? { "aria-invalid": "true" as const } : {})}
                    />
                    {errors.quantity && (
                      <p className={smsErrorTextClass}>
                        <AlertCircle className="h-4 w-4" />
                        {errors.quantity}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">Group & Location</h3>
                  <p className={smsHelperClass}>Group assets by team, document type, or inventory location.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={smsLabelClass}>Group</label>
                    <input
                      type="text"
                      title="Asset group"
                      value={formData.category || ''}
                      onChange={(e) => updateFormField('category', e.target.value || undefined)}
                      className={`${smsInputClass} ${errors.category ? smsInvalidFieldClass : ""}`}
                      placeholder="e.g. Vehicle documents, Hard cards, Office equipment"
                      disabled={loading}
                      maxLength={64}
                      {...(errors.category ? { "aria-invalid": "true" as const } : {})}
                    />
                    {errors.category && (
                      <p className={smsErrorTextClass}>
                        <AlertCircle className="h-4 w-4" />
                        {errors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={smsLabelClass}>Location</label>
                    <input
                      type="text"
                      title="Location"
                      value={formData.location || ''}
                      onChange={(e) => updateFormField('location', e.target.value || undefined)}
                      className={`${smsInputClass} ${errors.location ? smsInvalidFieldClass : ""}`}
                      placeholder="e.g. Phnom Penh Office"
                      disabled={loading}
                      maxLength={128}
                      {...(errors.location ? { "aria-invalid": "true" as const } : {})}
                    />
                    {errors.location && (
                      <p className={smsErrorTextClass}>
                        <AlertCircle className="h-4 w-4" />
                        {errors.location}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">Status & Assignment</h3>
                  <p className={smsHelperClass}>Keep new assets Available unless they are already assigned or sent out.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className={smsLabelClass}>
                      Assigned To {formData.status !== 'Available' ? '*' : ''}
                    </label>
                    <input
                      type="text"
                      list="asset-assignee-options"
                      title="Assigned to"
                      value={formData.assignedTo || ''}
                      onChange={(e) => updateFormField('assignedTo', e.target.value || undefined)}
                      className={`${smsInputClass} ${errors.assignedTo ? smsInvalidFieldClass : ""}`}
                      placeholder={formData.status === 'Available' ? 'Optional for available assets' : 'Select or enter assignee'}
                      disabled={loading || formData.status === 'Available'}
                      maxLength={128}
                      {...(errors.assignedTo ? { "aria-invalid": "true" as const } : {})}
                    />
                    <datalist id="asset-assignee-options" data-no-translate>
                      {users.map((settingsUser) => (
                        <option
                          key={settingsUser.username}
                          value={settingsUser.username}
                          label={formatSmsUserLabel(settingsUser)}
                        />
                      ))}
                    </datalist>
                    {errors.assignedTo && (
                      <p className={smsErrorTextClass}>
                        <AlertCircle className="h-4 w-4" />
                        {errors.assignedTo}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className={smsLabelClass}>Status</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {assetStatusOptions.map((status) => (
                        <label
                          key={status}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ring-1 transition-colors ${
                            formData.status === status
                              ? "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800"
                              : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={status}
                            checked={formData.status === status}
                            onChange={() => handleStatusChange(status)}
                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                            disabled={loading}
                          />
                          <span>{statusLabels[status]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">Media</h3>
                  <p className={smsHelperClass}>Use a clear photo of the actual asset and attach a document link if needed.</p>
                </div>

                <label className={smsLabelClass}>Image (Optional)</label>
                <div className={`${smsDropzoneClass} ${errors.image ? "border-red-500 bg-red-50 dark:border-red-700 dark:bg-red-900/20" : ""} text-center`}>
                  <input
                    id="image-upload"
                    type="file"
                    title="Upload asset image"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageUpload}
                    disabled={loading}
                    className="hidden"
                  />
                  <label
                    htmlFor="image-upload"
                    className={`flex flex-col items-center gap-2 rounded-lg p-5 text-sm text-gray-600 transition-colors dark:text-gray-300 ${
                      loading
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">Upload Image</p>
                      <p className={smsHelperClass}>Use a clear photo of the actual asset. PNG, JPG, or WebP up to 10MB.</p>
                    </div>
                    {uploadProgress > 0 && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%`, flexShrink: 0 }}
                        />
                      </div>
                    )}
                  </label>
                </div>
                {imagePreview && (
                  <div className="mt-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3 ring-1 ring-gray-200 dark:bg-gray-800/50 dark:ring-gray-700">
                    <Image
                      src={imagePreview!}
                      alt="Asset preview"
                      width={80}
                      height={80}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-800 dark:text-gray-200">{formData.imageUrl}</p>
                      <button
                        type="button"
                        onClick={removeImage}
                        title="Remove image"
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                {errors.image && (
                  <p className={smsErrorTextClass}>
                    <AlertCircle className="h-4 w-4" />
                    {errors.image}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">Notes & References</h3>
                  <p className={smsHelperClass}>Optional details for purchasing, audit, or handover records.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={smsLabelClass}>Description</label>
                    <textarea
                      title="Description"
                      rows={4}
                      value={formData.description || ''}
                      onChange={(e) => updateFormField('description', e.target.value || undefined)}
                      className={`${smsTextareaClass} resize-y ${errors.description ? smsInvalidFieldClass : ""}`}
                      placeholder="Additional details about this asset..."
                      disabled={loading}
                      maxLength={1000}
                      {...(errors.description ? { "aria-invalid": "true" as const } : {})}
                    />
                    <div className="mt-1 flex items-center justify-between gap-3">
                      {errors.description ? (
                        <p className={smsErrorTextClass}>
                          <AlertCircle className="h-4 w-4" />
                          {errors.description}
                        </p>
                      ) : (
                        <span />
                      )}
                      <p className={smsHelperClass}>{(formData.description || '').length}/1000</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={smsLabelClass}>Reference ID</label>
                      <input
                        type="text"
                        title="Reference ID"
                        value={formData.refId || ''}
                        onChange={(e) => updateFormField('refId', e.target.value || undefined)}
                        className={`${smsInputClass} ${errors.refId ? smsInvalidFieldClass : ""}`}
                        placeholder="e.g. PO-2024-001"
                        disabled={loading}
                        maxLength={128}
                        {...(errors.refId ? { "aria-invalid": "true" as const } : {})}
                      />
                      {errors.refId && (
                        <p className={smsErrorTextClass}>
                          <AlertCircle className="h-4 w-4" />
                          {errors.refId}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={smsLabelClass}>Document URL</label>
                      <input
                        type="url"
                        title="Document URL"
                        value={formData.documentUrl || ''}
                        onChange={(e) => updateFormField('documentUrl', e.target.value || undefined)}
                        className={`${smsInputClass} ${errors.documentUrl ? smsInvalidFieldClass : ""}`}
                        placeholder="https://..."
                        disabled={loading}
                        maxLength={512}
                        {...(errors.documentUrl ? { "aria-invalid": "true" as const } : {})}
                      />
                      {errors.documentUrl && (
                        <p className={smsErrorTextClass}>
                          <AlertCircle className="h-4 w-4" />
                          {errors.documentUrl}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

          {/* Actions */}
          <div className={smsModalFooterClass}>
            <button
              type="button"
              onClick={onClose}
              className={`${smsSecondaryButtonClass} flex-1`}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`${smsPrimaryButtonClass} flex-1`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {loadingLabel}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {isEdit ? 'Update Asset' : 'Create Asset'}
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
