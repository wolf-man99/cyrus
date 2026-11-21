/** Light haptic tap where supported (Android). iOS Safari ignores it silently. */
export function tap(): void {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* unsupported */
  }
}
