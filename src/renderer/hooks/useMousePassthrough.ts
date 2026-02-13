// ─────────────────────────────────────────────────────────
// useMousePassthrough — Renderer-side click-through logic
// §3-A Click-Through State Machine & §5-3 Flicker Mitigation
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { IPC_CHANNELS } from '../../shared/types';
import { MOUSE_TOGGLE_DEBOUNCE_MS } from '../../shared/constants';

type PassthroughState = 'PASS_THROUGH' | 'INTERACTIVE';

/**
 * Watches global mouse movement and toggles click-through
 * depending on whether the cursor is over an interactive element.
 *
 * When `ui.isInteractive` is true (settings panel explicitly open),
 * this hook yields control — it won't flip back to pass-through.
 *
 * §5-3 — A debounce timer prevents flicker when the cursor
 * straddles the boundary of an interactive element.
 */
export function useMousePassthrough(): void {
  const stateRef = useRef<PassthroughState>('PASS_THROUGH');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInteractive = useStore((s) => s.ui.isInteractive);

  const setIgnoreMouse = useCallback((ignore: boolean) => {
    window.electronAPI?.send(IPC_CHANNELS.SET_IGNORE_MOUSE, {
      ignore,
      forward: true,
    });
  }, []);

  // When the store says interactive (settings open), keep window clickable
  // and sync the local state ref so we don't fight it.
  useEffect(() => {
    if (isInteractive) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      stateRef.current = 'INTERACTIVE';
    }
  }, [isInteractive]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      // If settings panel is explicitly open, don't toggle anything
      if (useStore.getState().ui.isInteractive) return;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const isInteractiveEl =
        el instanceof HTMLInputElement ||
        el instanceof HTMLButtonElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement)?.dataset?.interactive === 'true';

      if (isInteractiveEl && stateRef.current === 'PASS_THROUGH') {
        // Cancel any pending return-to-passthrough
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        stateRef.current = 'INTERACTIVE';
        setIgnoreMouse(false);
      } else if (!isInteractiveEl && stateRef.current === 'INTERACTIVE') {
        // Debounce to avoid flicker on element borders (§5-3)
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          stateRef.current = 'PASS_THROUGH';
          setIgnoreMouse(true);
        }, MOUSE_TOGGLE_DEBOUNCE_MS);
      }
    }

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [setIgnoreMouse]);
}
