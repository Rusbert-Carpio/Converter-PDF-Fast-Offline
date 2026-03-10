import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getPalette } from '../theme/palettes';

export function useAppTheme() {
  const { resolvedTheme } = useApp();
  return useMemo(() => getPalette(resolvedTheme), [resolvedTheme]);
}
