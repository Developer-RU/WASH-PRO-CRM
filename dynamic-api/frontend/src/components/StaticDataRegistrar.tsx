import { useLocation } from 'react-router-dom';
import { useRegisterStaticDataMode } from '../context/LiveModeContext';

const LIVE_PATHS = new Set(['/', '/system']);

/** Shows "статические данные" in the header on pages without auto-refresh. */
export function StaticDataRegistrar() {
  const { pathname } = useLocation();
  useRegisterStaticDataMode(!LIVE_PATHS.has(pathname));
  return null;
}
