import { useEffect, useState } from "react";

import type { ProjectData } from "../types/app.ts";

const STORAGE_KEY = "hydroscale-project-v1";

export function useProjectStorage(initialValue: ProjectData): [ProjectData, (project: ProjectData) => void] {
  const [project, setProject] = useState<ProjectData>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as ProjectData) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  return [project, setProject];
}
