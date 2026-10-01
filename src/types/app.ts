import type { ExperimentalPoint, VesselInput } from "./hydrodynamics.ts";

export type AppSection =
  | "dashboard"
  | "input"
  | "experiments"
  | "results"
  | "memory"
  | "charts"
  | "comparison"
  | "validation"
  | "case-study"
  | "about";

export interface CaseStudyInfo {
  source: string;
  authors: string;
  year: string;
  notes: string;
}

export interface ProjectData {
  vessel: VesselInput;
  experimentalPoints: ExperimentalPoint[];
  caseStudy: CaseStudyInfo;
}
