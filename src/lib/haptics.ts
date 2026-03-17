export const haptic = {
  light: () => navigator.vibrate?.(30),
  medium: () => navigator.vibrate?.(60),
  heavy: () => navigator.vibrate?.(100),
  win: () => navigator.vibrate?.([100, 50, 100, 50, 200]),
  error: () => navigator.vibrate?.([50, 30, 50]),
};
