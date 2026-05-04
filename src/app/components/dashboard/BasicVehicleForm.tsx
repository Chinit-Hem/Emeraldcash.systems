"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useState, useCallback, useRef, type LabelHTMLAttributes } from 'react';
import { Button } from '@/components/ui/button';
import { GlassInput as Input } from '@/components/ui/glass/GlassInput';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Label } from '@/components/ui/label';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, X } from 'lucide-react';
import { compressImage } from '@/lib/compressImage';
import { TAX_TYPE_OPTIONS, COLOR_OPTIONS } from '@/lib/types';
import type { Vehicle } from '@/lib/types';
import { vehicleSchema, type VehicleFormData } from './vehicleSchema';
import type { SubmitHandler, UseFormReturn } from 'react-hook-form';
import { useEffect } from 'react';

function Label({ className = '', ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-sm font-medium text-slate-700 dark:text-slate-300 ${className}`}
      {...props}
    />
  );
}

interface BasicVehicleFormProps {
  vehicle: Vehicle;
  onSubmit: (data: Partial<Vehicle>, imageFile?: File | null) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError?: string | null;
  onClearError: () => void;
  modalTitle?: string;
}

export default function BasicVehicleForm({
  vehicle,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
  onClearError,
  modalTitle = 'Vehicle Form'
}: BasicVehicleFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(vehicle.Image || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      Brand: vehicle.Brand || '',
      Model: vehicle.Model || '',
      Category: vehicle.Category as 'Cars' | 'Motorcycles' | 'TukTuks' || 'Cars',
      Plate: vehicle.Plate || '',
      Year: vehicle.Year || null,
      Color: vehicle.Color || 'White',
      Condition: vehicle.Condition || 'New',
      BodyType: vehicle.BodyType || '',
      TaxType: vehicle.TaxType || 'Standard',
      PriceNew: vehicle.PriceNew || null,
      Price40: vehicle.Price40 || null,
      Price70: vehicle.Price70 || null,
      Image: vehicle.Image || '',
      Description: vehicle.Description || ''
    }
  });


  const { handleSubmit, register, formState: { errors, isDirty }, watch, setValue } = form;

  // Watch PriceNew for auto-calc
  const priceNew = watch('PriceNew');
  useEffect(() => {

    if (priceNew) {
      const price40 = Math.round(priceNew * 0.4 * 100) / 100;
      const price70 = Math.round(priceNew * 0.7 * 100) / 100;
      setValue('Price40', price40);
      setValue('Price70', price70);
    }
  }, [priceNew, setValue]);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageLoading(true);
    try {
      // Compress if >1MB
      let processedFile = file;
      if (file.size > 1024 * 1024) {
        const compressed = await compressImage(file, { maxWidth: 800, quality: 0.8 });
        processedFile = compressed.file;
      }
      const preview = URL.createObjectURL(processedFile);
      setImagePreview(preview);
      setImageFile(processedFile);
      setValue('Image', preview);
    } catch (err) {
      console.error('Image processing failed:', err);
    } finally {
      setImageLoading(false);
    }
  }, [setValue]);

  const handleRemoveImage = useCallback(() => {
    setImagePreview(null);
    setImageFile(null);
    setValue('Image', '');
  if (fileInputRef.current) fileInputRef.current.value = '';


  }, [setValue]);

  const onFormSubmit: SubmitHandler<VehicleFormData> = useCallback(async (data: VehicleFormData) => {

    try {
      await onSubmit(data, imageFile);
    } catch (err) {
      console.error('Form submit failed:', err);
    }
  }, [onSubmit, imageFile]);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <CardHeader>
        <CardTitle>{modalTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-0">
        {/* Row 1: Brand, Model, Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="Brand">Brand</Label>
            <Input id="Brand" {...register('Brand')} />
            {errors.Brand && <p className="text-sm text-red-500">{errors.Brand.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="Model">Model</Label>
            <Input id="Model" {...register('Model')} />
            {errors.Model && <p className="text-sm text-red-500">{errors.Model.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="Category">Category</Label>
            <Select onValueChange={(val) => setValue('Category', val as 'Cars' | 'Motorcycles' | 'TukTuks')}>

              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cars">Cars</SelectItem>
                <SelectItem value="Motorcycles">Motorcycles</SelectItem>
                <SelectItem value="TukTuks">TukTuks</SelectItem>
              </SelectContent>
            </Select>
            {errors.Category && <p className="text-sm text-red-500">{errors.Category.message}</p>}
          </div>
        </div>

        {/* Row 2: Plate, Year, Color */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="Plate">Plate #</Label>
            <Input id="Plate" {...register('Plate')} />
            {errors.Plate && <p className="text-sm text-red-500">{errors.Plate.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="Year">Year</Label>
            <Input id="Year" type="number" {...register('Year', { valueAsNumber: true })} />
            {errors.Year && <p className="text-sm text-red-500">{errors.Year.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="Color">Color</Label>
            <Select onValueChange={(val) => setValue('Color', val)}>

              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((color) => (
                  <SelectItem key={color.value} value={color.value}>{color.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.Color && <p className="text-sm text-red-500">{errors.Color.message}</p>}
          </div>
        </div>

        {/* Row 3: Prices */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="PriceNew">Price New ($)</Label>
            <Input id="PriceNew" type="number" {...register('PriceNew', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="Price40">Price 40% ($)</Label>
            <Input id="Price40" type="number" {...register('Price40', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="Price70">Price 70% ($)</Label>
            <Input id="Price70" type="number" {...register('Price70', { valueAsNumber: true })} />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <Label>Image</Label>
          <div className="mt-2 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-3 border border-gray-300 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
            {imageLoading && <p className="text-sm text-gray-500">Compressing image...</p>}
            {imagePreview && (
              <div className="relative mt-4 group">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={300}
                  height={200}
                  className="w-full max-w-md h-48 object-cover rounded-2xl shadow-lg"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Additional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="TaxType">Tax Type</Label>
            <Select onValueChange={(val) => setValue('TaxType', val)}>

              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAX_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="Condition">Condition</Label>
            <Select onValueChange={(val) => setValue('Condition', val)}>

              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Used">Used</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="Description">Description</Label>
          <textarea
            id="Description"
            rows={3}
            {...register('Description')}
            className="w-full p-3 border border-gray-300 rounded-xl resize-vertical"
          />
        </div>

        {submitError && (
          <div className="p-4 bg-red-100 border border-red-200 rounded-2xl text-red-800">
            {submitError}
            <Button variant="ghost" size="sm" onClick={onClearError} className="mt-2">
              Dismiss
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Vehicle'
            )}
          </Button>
        </div>

        {isDirty && (
          <p className="text-sm text-emerald-600 text-center">
            Unsaved changes detected ✓
          </p>
        )}
      </CardContent>
    </form>
  );
}
