export const SMS_DOMAIN = {
  key: "sms",
  name: "Stock Management System",
} as const;

export type SmsDomainKey = typeof SMS_DOMAIN.key;
