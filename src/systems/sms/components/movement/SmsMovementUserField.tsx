"use client";

import { Loader2 } from "lucide-react";
import { memo } from "react";
import {
  SmsFieldError,
  smsInputClass,
  smsInvalidFieldClass,
  smsLabelClass,
  smsLoadingFieldClass,
} from "@/systems/sms/components/SmsShared";
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
  return (
    <div>
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
          <input
            type="text"
            list={datalistId}
            title={title}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={`${smsInputClass} ${error ? smsInvalidFieldClass : ""}`}
            placeholder={placeholder}
            disabled={loading}
            autoComplete="off"
            maxLength={128}
            {...(error ? { "aria-invalid": "true" as const } : {})}
          />
          <datalist id={datalistId}>
            {extraOption && <option value={extraOption.value} label={extraOption.label} />}
            {users.map((settingsUser) => (
              <option
                key={settingsUser.username}
                value={settingsUser.username}
                label={formatSmsUserLabel(settingsUser)}
              />
            ))}
          </datalist>
        </>
      )}
      <SmsFieldError error={error} />
    </div>
  );
});
