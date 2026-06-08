"use client";

import { Loader2 } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  SmsFieldError,
  smsInputClass,
  smsInvalidFieldClass,
  smsLabelClass,
  smsLoadingFieldClass,
} from "@/systems/sms/components/SmsShared";
import type { MovementMode, SmsAssetOption } from "@/systems/sms/types/sms-movement";
import { getVisibleMovementAssets } from "@/systems/sms/utils/smsMovementAssets";

type SmsMovementAssetFieldProps = {
  mode: MovementMode;
  value: string;
  error?: string;
  loading: boolean;
  assetsLoading: boolean;
  selectableAssets: SmsAssetOption[];
  returnableAssetsCount: number;
  onSearchChange: (value: string) => void;
  onSelect: (asset: SmsAssetOption) => void;
};

export const SmsMovementAssetField = memo(function SmsMovementAssetField({
  mode,
  value,
  error,
  loading,
  assetsLoading,
  selectableAssets,
  returnableAssetsCount,
  onSearchChange,
  onSelect,
}: SmsMovementAssetFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const visibleAssets = useMemo(
    () => getVisibleMovementAssets(selectableAssets, value),
    [selectableAssets, value]
  );
  const inputLabel = mode === "return" ? "Select an assigned asset to send back" : "Select an asset or enter asset ID";

  useEffect(() => {
    if (!dropdownOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <div ref={containerRef} id="sms-movement-asset-dropdown" className="relative">
      <label className={smsLabelClass}>
        Asset <span className="text-red-500">*</span>
      </label>
      {assetsLoading ? (
        <div className={smsLoadingFieldClass}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading assets...
        </div>
      ) : mode === "return" && returnableAssetsCount === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
          No assigned assets are available to send back.
        </div>
      ) : (
        <>
          <input
            type="text"
            value={value}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            className={`${smsInputClass} ${error ? smsInvalidFieldClass : ""}`}
            placeholder={inputLabel}
            disabled={loading}
            autoComplete="off"
            title={inputLabel}
            {...(error ? { "aria-invalid": "true" as const } : {})}
          />
          {!loading && selectableAssets.length > 0 && dropdownOpen && (
            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
              {visibleAssets.length > 0 ? (
                visibleAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      onSelect(asset);
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-900 dark:text-white" data-no-translate>{asset.name}</span>
                      {asset.assignedTo && (
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                          Assigned to <span data-no-translate>{asset.assignedTo}</span>
                        </span>
                      )}
                    </span>
                    <span className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400" data-no-translate>
                      {asset.itemCode ? `(${asset.itemCode})` : asset.id.slice(0, 8)}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No matching assets
                </div>
              )}
            </div>
          )}
        </>
      )}
      <SmsFieldError error={error} />
    </div>
  );
});
