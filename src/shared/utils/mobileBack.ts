export const MOBILE_BACK_REQUEST_EVENT = "emeraldcash:mobile-back-request";

export function dispatchMobileBackRequest(): boolean {
  if (typeof window === "undefined") return false;

  const event = new CustomEvent(MOBILE_BACK_REQUEST_EVENT, {
    cancelable: true,
  });

  window.dispatchEvent(event);
  return event.defaultPrevented;
}
