export const LMS_DOMAIN = {
  key: "lms",
  name: "Learning Management System",
} as const;

export type LmsDomainKey = typeof LMS_DOMAIN.key;
