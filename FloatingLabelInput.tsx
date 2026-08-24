import React, { forwardRef, useId } from 'react';
import { twMerge } from 'tailwind-merge';

interface FloatingLabelInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, id, error, className, ...rest }, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const baseInputClasses =
    'peer block w-full appearance-none rounded-xl border-slate-300 bg-slate-50 px-4 pb-2.5 pt-5 text-base text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:opacity-70';
  const errorInputClasses =
    'border-rose-500 focus:border-rose-500 focus:ring-rose-500';
  const baseLabelClasses =
    'absolute left-4 top-4 z-10 origin-[0] -translate-y-4 scale-75 transform text-base text-slate-500 duration-200 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-emerald-600';
  const errorLabelClasses = 'text-rose-600 peer-focus:text-rose-600';

  return (
    <div className="relative w-full">
      <input
        id={inputId}
        ref={ref}
        className={twMerge(
          baseInputClasses,
          error && errorInputClasses,
          className
        )}
        placeholder=" " // Required for the peer-placeholder-shown selector to work
        {...rest}
      />
      <label
        htmlFor={inputId}
        className={twMerge(baseLabelClasses, error && errorLabelClasses)}
      >
        {label}
      </label>
      {error && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-500">
          {error}
        </p>
      )}
    </div>
  );
  }
);
FloatingLabelInput.displayName = 'FloatingLabelInput';

export default FloatingLabelInput;