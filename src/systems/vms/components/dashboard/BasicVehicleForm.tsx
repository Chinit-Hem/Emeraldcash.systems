"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback, type LabelHTMLAttributes } from 'react';
import { Button } from '@/shared/components/ui/button';
import { GlassInput as Input } from '@/shared/components/ui/glass/GlassInput';
import { ImageInput } from '@/shared/components/ui/ImageInput';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

import { Car, DollarSign, FileText, ImagePlus, Loader2, ShieldCheck } from 'lucide-react';
import { TAX_TYPE_OPTIONS, COLOR_OPTIONS } from '@/shared/types/types';
import type { Vehicle } from '@/shared/types/types';
import { getVehicleImageUrls, mergeVehicleImages } from '@/systems/vms/utils/vehicle-helpers';
import { vehicleSchema, type VehicleFormData } from '@/systems/vms/components/dashboard/vehicleSchema';
import type { SubmitHandler } from 'react-hook-form';
import { useEffect } from 'react';

function Label({ className = '', ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-sm font-medium text-slate-700 dark:text-slate-300 ${className}`}
      {...props}
    />
  );
}

function FormSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/50 md:p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
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
  const [imageValues, setImageValues] = useState<string[]>(() =>
    getVehicleImageUrls(mergeVehicleImages(vehicle.Images, vehicle.Image), "w800-h600")
  );
  const [imagesDirty, setImagesDirty] = useState(false);

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
  const optionalNumber = {
    setValueAs: (value: string) => value === '' ? null : Number(value),
  };

  // Watch PriceNew for auto-calc
  const priceNew = watch('PriceNew');
  const price40 = watch('Price40');
  const price70 = watch('Price70');
  useEffect(() => {
    if (typeof priceNew === 'number' && Number.isFinite(priceNew) && priceNew > 0) {
      const price40 = Math.round(priceNew * 0.4 * 100) / 100;
      const price70 = Math.round(priceNew * 0.7 * 100) / 100;
      setValue('Price40', price40);
      setValue('Price70', price70);
      return;
    }

    setValue('Price40', null);
    setValue('Price70', null);
  }, [priceNew, setValue]);

  const formatCalculatedPrice = (value: number | null) => (
    typeof value === 'number' && Number.isFinite(value)
      ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "Auto calculated"
  );

  useEffect(() => {
    const nextImages = getVehicleImageUrls(mergeVehicleImages(vehicle.Images, vehicle.Image), "w800-h600");
    setImageValues(nextImages);
    setImagesDirty(false);
    setValue('Image', nextImages[0] || '', { shouldDirty: false, shouldValidate: true });
  }, [setValue, vehicle.Image, vehicle.Images, vehicle.VehicleId]);

  const handleImagesChange = useCallback((values: string[]) => {
    setImageValues(values);
    setImagesDirty(true);
    setValue('Image', values[0] || '', { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  const onFormSubmit: SubmitHandler<VehicleFormData> = useCallback(async (data: VehicleFormData) => {

    try {
      await onSubmit({ ...data, Image: imageValues[0] || '', Images: imageValues }, null);
    } catch {
      // Parent update hooks already surface submit errors in the form.
    }
  }, [imageValues, onSubmit]);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {modalTitle}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
          Vehicle information
        </h2>
      </div>

      <FormSection
        title="Vehicle details"
        description="Core information used in search, records, and vehicle display."
        icon={<Car className="h-5 w-5" />}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="Brand">Brand</Label>
            <Input id="Brand" autoComplete="off" {...register('Brand')} />
            {errors.Brand && <p className="text-sm text-red-500">{errors.Brand.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="Model">Model</Label>
            <Input id="Model" autoComplete="off" {...register('Model')} />
            {errors.Model && <p className="text-sm text-red-500">{errors.Model.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="Category">Category</Label>
            <Select
              defaultValue={vehicle.Category || 'Cars'}
              onValueChange={(val) => setValue('Category', val as 'Cars' | 'Motorcycles' | 'TukTuks', { shouldDirty: true, shouldValidate: true })}
            >
              <SelectTrigger id="Category" className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cars">Cars</SelectItem>
                <SelectItem value="Motorcycles">Motorcycles</SelectItem>
                <SelectItem value="TukTuks">TukTuks</SelectItem>
              </SelectContent>
            </Select>
            {errors.Category && <p className="text-sm text-red-500">{errors.Category.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="Plate">Plate #</Label>
            <Input id="Plate" autoComplete="off" {...register('Plate')} />
            {errors.Plate && <p className="text-sm text-red-500">{errors.Plate.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="Year">Year</Label>
            <Input id="Year" type="number" inputMode="numeric" {...register('Year', optionalNumber)} />
            {errors.Year && <p className="text-sm text-red-500">{errors.Year.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="Color">Color</Label>
            <Select
              defaultValue={vehicle.Color || 'White'}
              onValueChange={(val) => setValue('Color', val, { shouldDirty: true, shouldValidate: true })}
            >
              <SelectTrigger id="Color" className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <SelectValue placeholder="Select color" />
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
      </FormSection>

      <FormSection
        title="Pricing"
        description="40% and 70% values are recalculated automatically when the new price changes."
        icon={<DollarSign className="h-5 w-5" />}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="PriceNew">Price New ($)</Label>
            <Input id="PriceNew" type="number" inputMode="decimal" {...register('PriceNew', optionalNumber)} />
          </div>
          <input type="hidden" {...register('Price40', optionalNumber)} />
          <input type="hidden" {...register('Price70', optionalNumber)} />
          <div className="space-y-2">
            <Label>Price 40% ($)</Label>
            <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {formatCalculatedPrice(price40)}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Price 70% ($)</Label>
            <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {formatCalculatedPrice(price70)}
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Image"
        description="Upload one or more clear vehicle photos. The first photo is used in lists."
        icon={<ImagePlus className="h-5 w-5" />}
      >
        <ImageInput
          values={imageValues}
          value={imageValues[0] || ''}
          onChange={(value) => handleImagesChange(value ? [value] : [])}
          onChangeMany={handleImagesChange}
          multiple
          maxImages={12}
          maxSizeMB={10}
          helperText="Drag & drop, click to upload, paste image URL, or Ctrl+V to paste image"
        />
      </FormSection>

      <FormSection
        title="Status"
        description="Operational classification for tax and condition reporting."
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="TaxType">Tax Type</Label>
            <Select
              defaultValue={vehicle.TaxType || 'Standard'}
              onValueChange={(val) => setValue('TaxType', val, { shouldDirty: true, shouldValidate: true })}
            >
              <SelectTrigger id="TaxType" className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <SelectValue placeholder="Select tax type" />
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
            <Select
              defaultValue={vehicle.Condition || 'New'}
              onValueChange={(val) => setValue('Condition', val, { shouldDirty: true, shouldValidate: true })}
            >
              <SelectTrigger id="Condition" className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <SelectValue placeholder="Select condition" />
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
      </FormSection>

      <FormSection
        title="Notes"
        description="Optional internal description for this vehicle record."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-2">
          <Label htmlFor="Description">Description</Label>
          <textarea
            id="Description"
            rows={4}
            {...register('Description')}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      </FormSection>

      {submitError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          <p>{submitError}</p>
          <Button type="button" variant="ghost" size="sm" onClick={onClearError} className="mt-2">
            Dismiss
          </Button>
        </div>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/90 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 md:-mx-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-h-5 text-sm text-slate-500 dark:text-slate-400">
            {isDirty || imagesDirty ? "Unsaved changes detected" : "No unsaved changes"}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="min-w-32"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={(!isDirty && !imagesDirty) || isSubmitting}
              className="min-w-40"
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
        </div>
      </div>
    </form>
  );
}
