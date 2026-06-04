export type SmsSettingsUser = {
  username: string;
  full_name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  profile_picture?: string | null;
  staff_id?: number | null;
};

export function formatSmsUserLabel(user: SmsSettingsUser): string {
  return user.full_name ? `${user.full_name} (@${user.username})` : `@${user.username}`;
}

export async function fetchSmsUsers(signal?: AbortSignal): Promise<SmsSettingsUser[]> {
  const response = await fetch("/api/auth/users", { signal });
  const data = await response.json().catch(() => ({}));

  return data.ok && Array.isArray(data.users) ? data.users : [];
}
