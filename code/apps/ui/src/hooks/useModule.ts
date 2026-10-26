import { useCallback, useEffect, useState } from 'react';
import { moduleService, type ModuleDetail } from '../services/moduleService';

/** Loads one module with its members and the caller's role; `missing` on 404. */
export function useModule(moduleId: string | undefined) {
  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [missing, setMissing] = useState(false);

  const reload = useCallback(async () => {
    if (!moduleId) return;
    try {
      setModule(await moduleService.getModule(moduleId));
      setMissing(false);
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 403) setMissing(true);
    }
  }, [moduleId]);

  useEffect(() => {
    setModule(null);
    reload();
  }, [reload]);

  return { module, missing, reload };
}
