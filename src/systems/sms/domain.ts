export const SMS_DOMAIN = {
  key: "sms",
  name: "Asset Inventory",
} as const;

export type SmsDomainKey = typeof SMS_DOMAIN.key;
