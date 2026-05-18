"use client";

import { compressImage } from '@/lib/compressImage';
import { generateShortUUID } from '@/lib/uuid';
import { Loader2, Save, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

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
  title: string;
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
  const [formData, setFormData] = useState<Omit<SmsAsset, 'id'>>({
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
        assignedTo: initialData?.assignedTo || undefined,
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

    // Optional field max lengths
    if (formData.itemCode && formData.itemCode.length > 64) newErrors.itemCode = 'Item code too long (max 64 characters)';
    if (formData.category && formData.category.length > 64) newErrors.category = 'Category too long (max 64 characters)';
    if (formData.location && formData.location.length > 128) newErrors.location = 'Location too long (max 128 characters)';
    if (formData.assignedTo && formData.assignedTo.length > 128) newErrors.assignedTo = 'Assigned to too long (max 128 characters)';
    if (formData.description && formData.description.length > 1000) newErrors.description = 'Description too long (max 1000 characters)';
    if (formData.refId && formData.refId.length > 128) newErrors.refId = 'Reference ID too long (max 128 characters)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB
      setErrors({ ...errors, image: 'File too large (max 10MB)' });
      return;
    }

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

      setFormData({ ...formData, imageUrl });
      setImagePreview(imageUrl);
      setErrors({ ...errors, image: '' });
    } catch (err) {
      setErrors({
        ...errors,
        image: err instanceof Error ? err.message : 'Upload failed',
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const result = await onSave(formData);

    if (result.success) {
      onClose();
    } else {
      // Merge field-level errors from API response with existing errors
      const fieldErrors = result.errors || {};
      setErrors({ 
        ...errors, 
        ...fieldErrors,
        general: fieldErrors && Object.keys(fieldErrors).length > 0 
          ? 'Please fix the errors below.'
          : (result.error || 'Save failed')
      });
    }
    setLoading(false);
  };

  const removeImage = () => {
    setFormData({ ...formData, imageUrl: undefined });
    setImagePreview(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-8 pb-4 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent">
              {title}
            </h2>
<button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-2xl transition-all group"
              disabled={loading}
              title="Close modal"
            >
              <X className="w-5 h-5 text-slate-500 group-hover:text-slate-700" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {errors.general && (
            <div className="p-4 bg-amber-100 border border-amber-200 rounded-2xl text-amber-800 text-sm">
              {errors.general}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Asset Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/70 backdrop-blur-sm"
                placeholder="e.g. Office Laptop Dell XPS"
                disabled={loading}
              />
              {errors.name && <p className="mt-1 text-xs text-amber-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Item Code</label>
              <input
                type="text"
                value={formData.itemCode || ''}
                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/70 backdrop-blur-sm"
                placeholder="e.g. DELL-XPS-13-2024"
                disabled={loading}
              />
            </div>
          </div>

          {/* Type & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Type *</label>
              <input
                list="asset-types"
                type="text"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/70 backdrop-blur-sm"
                placeholder="Select or type a type..."
                disabled={loading}
              />
              <datalist id="asset-types">
                <option value="Electronics" />
                <option value="Furniture" />
                <option value="Vehicle" />
                <option value="Tool" />
                <option value="Office Supply" />
                <option value="Other" />
              </datalist>
              {errors.type && <p className="mt-1 text-xs text-amber-600">{errors.type}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/70 backdrop-blur-sm"
                placeholder="e.g. Laptop, Desk Chair"
              />
            </div>
          </div>

          {/* Quantity, Location, Assigned */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                max="999"
                value={formData.quantity || 1}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/70 backdrop-blur-sm"
                placeholder="1"
              />
              {errors.quantity && <p className="mt-1 text-xs text-amber-600">{errors.quantity}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/70 backdrop-blur-sm"
                placeholder="e.g. Phnom Penh Office"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Assigned To</label>
              <input
                type="text"
                value={formData.assignedTo || ''}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/70 backdrop-blur-sm"
                placeholder="e.g. John Doe"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-4">Status</label>
            <div className="flex flex-wrap gap-3">
              {(['Available', 'In Use', 'Borrowed', 'Out', 'Not Returned'] as const).map((status) => (
                <label key={status} className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={formData.status === status}
                    onChange={() => setFormData({ ...formData, status })}
                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    disabled={loading}
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 capitalize">
                    {status.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-4">Image (Optional)</label>
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center hover:border-emerald-300 transition-all bg-gradient-to-b from-slate-50/50 to-white/70">
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={loading}
                className="hidden"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center gap-3 p-6 hover:bg-emerald-50/50 rounded-2xl transition-all group"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-200 transition-all">
                  <Upload className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Upload Image</p>
                  <p className="text-xs text-slate-500">PNG, JPG up to 10MB</p>
                </div>
{uploadProgress > 0 && (
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%`, flexShrink: 0 }}
                    />
                  </div>
                )}
              </label>
            </div>
            {imagePreview && (
              <div className="mt-4 flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                <Image
                  src={imagePreview!}
                  alt="Asset preview"
                  width={80}
                  height={80}
                  className="object-cover rounded-2xl shadow-md w-20 h-20"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-800 truncate">{formData.imageUrl}</p>
<button
                    type="button"
                    onClick={removeImage}
                    title="Remove image"
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium -mt-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
            {errors.image && <p className="mt-2 text-xs text-amber-600">{errors.image}</p>}
          </div>

          {/* Description & Ref */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
              <textarea
                rows={4}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-vertical bg-white/70 backdrop-blur-sm"
                placeholder="Additional details about this asset..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Reference ID</label>
              <input
                type="text"
                value={formData.refId || ''}
                onChange={(e) => setFormData({ ...formData, refId: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/70 backdrop-blur-sm"
                placeholder="e.g. PO-2024-001"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-200 sticky bottom-0 bg-white/95 backdrop-blur-sm px-1 -mx-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 font-semibold transition-all disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl font-bold hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
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
  );
}
