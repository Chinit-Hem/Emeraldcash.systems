"use client";

import { useEffect } from "react";

const selectableInputTypes = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

export default function SelectFieldTextOnFocus() {
  useEffect(() => {
    const getSelectableField = (target: EventTarget | null) => {
      if (target instanceof HTMLTextAreaElement) return target;
      if (target instanceof HTMLInputElement && selectableInputTypes.has(target.type)) return target;
      return null;
    };

    const selectExistingValue = (event: FocusEvent) => {
      const field = getSelectableField(event.target);

      if (
        !field ||
        field.disabled ||
        field.readOnly ||
        !field.value ||
        field.dataset.selectOnFocus === "false"
      ) return;

      window.requestAnimationFrame(() => {
        if (document.activeElement !== field) return;
        try {
          field.select();
        } catch {
          // Some browser-specific input modes do not expose text selection.
        }
      });
    };

    const clearSelectionBeforeSecondClick = (event: PointerEvent) => {
      const field = getSelectableField(event.target);
      if (!field || document.activeElement !== field || !field.value) return;

      const hasFullSelection = field.selectionStart === 0 && field.selectionEnd === field.value.length;
      if (!hasFullSelection) return;

      try {
        // Clear the first-focus selection before the browser performs its
        // native pointer action, which then places the caret at the click.
        field.setSelectionRange(0, 0);
      } catch {
        // Number and browser-specific input modes may not expose a caret API.
      }
    };

    document.addEventListener("focusin", selectExistingValue);
    document.addEventListener("pointerdown", clearSelectionBeforeSecondClick, true);
    return () => {
      document.removeEventListener("focusin", selectExistingValue);
      document.removeEventListener("pointerdown", clearSelectionBeforeSecondClick, true);
    };
  }, []);

  return null;
}
