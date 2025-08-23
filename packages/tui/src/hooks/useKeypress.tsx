import { useInput } from "ink";
import { useCallback } from "react";

export interface KeypressEvent {
  key: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

export interface UseKeypressOptions {
  isActive?: boolean;
  ignoreRepeat?: boolean;
}

export type KeypressHandler = (event: KeypressEvent) => void;

export const useKeypress = (
  handler: KeypressHandler,
  options: UseKeypressOptions = {}
) => {
  const { isActive = true, ignoreRepeat = true } = options;

  const handleInput = useCallback(
    (input: string, key: any) => {
      if (!isActive) return;

      // Convert Ink's key object to our standardized format
      const event: KeypressEvent = {
        key: input || key.name || "",
        ctrl: Boolean(key.ctrl),
        meta: Boolean(key.meta),
        shift: Boolean(key.shift),
        alt: Boolean(key.alt),
      };

      handler(event);
    },
    [handler, isActive]
  );

  useInput(handleInput, { isActive });
};

// Predefined key combinations
export const Keys = {
  ESCAPE: { key: "escape" },
  ENTER: { key: "return" },
  SPACE: { key: "space" },
  TAB: { key: "tab" },
  BACKSPACE: { key: "backspace" },
  DELETE: { key: "delete" },
  UP: { key: "upArrow" },
  DOWN: { key: "downArrow" },
  LEFT: { key: "leftArrow" },
  RIGHT: { key: "rightArrow" },
  CTRL_C: { key: "c", ctrl: true },
  CTRL_D: { key: "d", ctrl: true },
  CTRL_Z: { key: "z", ctrl: true },
  CTRL_A: { key: "a", ctrl: true },
  CTRL_E: { key: "e", ctrl: true },
} as const;

// Helper function to check if key matches pattern
export const matchesKey = (
  event: KeypressEvent,
  pattern: Partial<KeypressEvent>
): boolean => {
  return Object.entries(pattern).every(([key, value]) => {
    return event[key as keyof KeypressEvent] === value;
  });
};

// Hook for handling specific key combinations
export const useKeyboardShortcuts = (
  shortcuts: Record<
    string,
    { key: Partial<KeypressEvent>; handler: () => void }
  >,
  isActive = true
) => {
  useKeypress(
    (event) => {
      Object.values(shortcuts).forEach(({ key, handler }) => {
        if (matchesKey(event, key)) {
          handler();
        }
      });
    },
    { isActive }
  );
};
