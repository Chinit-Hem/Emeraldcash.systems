"use client";

import { Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SmsFieldError,
  smsInputClass,
  smsInvalidFieldClass,
  smsLabelClass,
  smsLoadingFieldClass,
} from "@/systems/sms/components/SmsShared";
import { SearchClearButton } from "@/shared/components/ui/SearchClearButton";
import { formatSmsUserLabel, type SmsSettingsUser } from "@/systems/sms/utils/smsUsers";

type SmsMovementUserFieldProps = {
  label: string;
  value: string;
  error?: string;
  datalistId: string;
  title: string;
  placeholder: string;
  users: SmsSettingsUser[];
  usersLoading: boolean;
  loading: boolean;
  readOnlyDisplayValue?: string;
  extraOption?: { value: string; label: string } | null;
  onChange: (value: string) => void;
};

type SmsUserOption = {
  value: string;
  label: string;
  role?: string | null;
  email?: string | null;
};

function getVisibleUserOptions(
  users: SmsSettingsUser[],
  value: string,
  extraOption?: { value: string; label: string } | null
): SmsUserOption[] {
  const query = value.trim().toLowerCase();
  const options: SmsUserOption[] = [
    ...(extraOption ? [{ ...extraOption }] : []),
    ...users.map((settingsUser) => ({
      value: settingsUser.username,
      label: formatSmsUserLabel(settingsUser),
      role: settingsUser.role,
      email: settingsUser.email,
    })),
  ];

  if (!query) return options.slice(0, 12);

  return options
    .filter((option) =>
      [option.value, option.label, option.role, option.email]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(query))
    )
    .slice(0, 12);
}

export const SmsMovementUserField = memo(function SmsMovementUserField({
  label,
  value,
  error,
  datalistId,
  title,
  placeholder,
  users,
  usersLoading,
  loading,
  readOnlyDisplayValue,
  extraOption,
  onChange,
}: SmsMovementUserFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const visibleOptions = useMemo(
    () => getVisibleUserOptions(users, value, extraOption),
    [extraOption, users, value]
  );
  const updateDropdownPlacement = useCallback(() => {
    if (typeof window === "undefined" || !inputRef.current) return;

    const rect = inputRef.current.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const spaceBelow = viewportTop + viewportHeight - rect.bottom;
    const spaceAbove = rect.top - viewportTop;

    setDropUp(spaceBelow < 260 && spaceAbove > spaceBelow);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    updateDropdownPlacement();
    const placementTimer = window.setTimeout(updateDropdownPlacement, 150);
    const viewport = window.visualViewport;

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", updateDropdownPlacement);
    viewport?.addEventListener("resize", updateDropdownPlacement);
    viewport?.addEventListener("scroll", updateDropdownPlacement);

    return () => {
      window.clearTimeout(placementTimer);
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", updateDropdownPlacement);
      viewport?.removeEventListener("resize", updateDropdownPlacement);
      viewport?.removeEventListener("scroll", updateDropdownPlacement);
    };
  }, [dropdownOpen, updateDropdownPlacement]);

  return (
    <div ref={containerRef} className="relative">
      <label className={smsLabelClass}>
        {label} <span className="text-red-500">*</span>
      </label>
      {readOnlyDisplayValue ? (
        <input
          type="text"
          title={label}
          value={readOnlyDisplayValue}
          className={smsInputClass}
          disabled
        />
      ) : usersLoading ? (
        <div className={smsLoadingFieldClass}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading users...
        </div>
      ) : (
        <>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              title={title}
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                setDropdownOpen(true);
                updateDropdownPlacement();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && dropdownOpen && visibleOptions[0]) {
                  event.preventDefault();
                  onChange(visibleOptions[0].value);
                  setDropdownOpen(false);
                }
                if (event.key === "Escape") {
                  setDropdownOpen(false);
                }
              }}
              className={`${smsInputClass} pr-12 ${error ? smsInvalidFieldClass : ""}`}
              placeholder={placeholder}
              disabled={loading}
              autoComplete="off"
              maxLength={128}
              role="combobox"
              aria-expanded={dropdownOpen}
              aria-controls={datalistId}
              {...(error ? { "aria-invalid": "true" as const } : {})}
            />
            {!loading && value && (
              <SearchClearButton
                onClear={() => {
                  onChange("");
                  setDropdownOpen(false);
                }}
                label={`Clear ${label.toLowerCase()}`}
                className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2"
              />
            )}
          </div>
          {!loading && dropdownOpen && (
            <div
              id={datalistId}
              role="listbox"
              className={`absolute z-30 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700 ${
                dropUp ? "bottom-full mb-1" : "top-full mt-1"
              }`}
            >
              {visibleOptions.length > 0 ? (
                visibleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(option.value);
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-emerald-50 aria-selected:bg-emerald-50 dark:hover:bg-emerald-900/20 dark:aria-selected:bg-emerald-900/20"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-900 dark:text-white" data-no-translate>
                        {option.label}
                      </span>
                      {option.email && (
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400" data-no-translate>
                          {option.email}
                        </span>
                      )}
                    </span>
                    {option.role && (
                      <span className="flex-shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {option.role}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No matching users
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
