import { useCallback, useEffect, useRef } from "react";
import { Keyboard, Platform, TextInput } from "react-native";

// Recheck after both keyboard animation and viewport resize, including when
// focus moves between fields while the keyboard is already open.
export default function useKeyboardForm() {
  const scrollRef = useRef(null);
  const frame = useRef(null);
  const revealFocusedInput = useCallback(() => {
    if (Platform.OS === "web") return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const input = TextInput.State.currentlyFocusedInput();
      if (input && Keyboard.isVisible()) {
        scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(input, 24, true);
      }
    });
  }, []);

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", revealFocusedInput);
    const changed = Keyboard.addListener("keyboardDidChangeFrame", revealFocusedInput);
    return () => {
      shown.remove();
      changed.remove();
      cancelAnimationFrame(frame.current);
    };
  }, [revealFocusedInput]);

  return { scrollRef, revealFocusedInput };
}
