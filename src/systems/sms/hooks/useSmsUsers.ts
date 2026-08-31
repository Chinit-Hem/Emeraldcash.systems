"use client";

import { useCallback, useEffect, useState } from "react";
import type { SmsSettingsUser } from "@/systems/sms/utils/smsUsers";
import { fetchSmsUsers } from "@/systems/sms/utils/smsUsers";

type UseSmsUsersOptions = {
  enabled?: boolean;
};

const CACHE_TTL_MS = 30_000;
let cachedUsers: SmsSettingsUser[] | null = null;
let cachedUsersAt = 0;
let usersRequest: Promise<SmsSettingsUser[]> | null = null;

function loadUsers(force = false): Promise<SmsSettingsUser[]> {
  if (!force && cachedUsers && Date.now() - cachedUsersAt < CACHE_TTL_MS) {
    return Promise.resolve(cachedUsers);
  }
  if (!force && usersRequest) return usersRequest;

  const request = fetchSmsUsers().then((users) => {
    cachedUsers = users;
    cachedUsersAt = Date.now();
    return users;
  }).finally(() => {
    if (usersRequest === request) usersRequest = null;
  });
  usersRequest = request;
  return request;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useSmsUsers({ enabled = true }: UseSmsUsersOptions = {}) {
  const [users, setUsers] = useState<SmsSettingsUser[]>(() => cachedUsers || []);
  const [usersLoading, setUsersLoading] = useState(enabled && !cachedUsers);

  const requestUsers = useCallback(async (force: boolean, signal?: AbortSignal) => {
    if (!enabled) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);

    try {
      const nextUsers = await loadUsers(force);
      if (!signal?.aborted) setUsers(nextUsers);
    } catch (error) {
      if (!isAbortError(error) && !signal?.aborted) setUsers([]);
    } finally {
      if (!signal?.aborted) setUsersLoading(false);
    }
  }, [enabled]);

  const refreshUsers = useCallback(
    (signal?: AbortSignal) => requestUsers(true, signal),
    [requestUsers]
  );

  useEffect(() => {
    const controller = new AbortController();
    void requestUsers(false, controller.signal);

    return () => controller.abort();
  }, [requestUsers]);

  return {
    users,
    usersLoading,
    refreshUsers,
  };
}
