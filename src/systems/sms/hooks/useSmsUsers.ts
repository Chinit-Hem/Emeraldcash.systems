"use client";

import { useCallback, useEffect, useState } from "react";
import type { SmsSettingsUser } from "@/systems/sms/utils/smsUsers";
import { fetchSmsUsers } from "@/systems/sms/utils/smsUsers";

type UseSmsUsersOptions = {
  enabled?: boolean;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useSmsUsers({ enabled = true }: UseSmsUsersOptions = {}) {
  const [users, setUsers] = useState<SmsSettingsUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(enabled);

  const refreshUsers = useCallback(async (signal?: AbortSignal) => {
    if (!enabled) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);

    try {
      const nextUsers = await fetchSmsUsers(signal);
      if (!signal?.aborted) setUsers(nextUsers);
    } catch (error) {
      if (!isAbortError(error) && !signal?.aborted) setUsers([]);
    } finally {
      if (!signal?.aborted) setUsersLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    const controller = new AbortController();
    void refreshUsers(controller.signal);

    return () => controller.abort();
  }, [refreshUsers]);

  return {
    users,
    usersLoading,
    refreshUsers,
  };
}
