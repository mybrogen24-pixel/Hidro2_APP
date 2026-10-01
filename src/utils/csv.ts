import type { ExtrapolationResult } from "../types/hydrodynamics.ts";

const columns: Array<[string, keyof ExtrapolationResult]> = [
  ["Vm_m_s", "Vm"],
  ["RTm_N", "RTm"],
  ["Fr", "Fr"],
  ["Vp_m_s", "Vp"],
  ["Vp_knots", "VpKnots"],
  ["Re_m", "ReModel"],
  ["Re_p", "RePrototype"],
  ["Cf_m", "CfModel"],
  ["Cf_p", "CfPrototype"],
  ["Ct_m", "CtModel"],
  ["Cr_m", "CrModel"],
  ["Cw_m", "CwModel"],
  ["Ct_p_Froude", "CtPrototypeFroude"],
  ["Ct_p_Hughes", "CtPrototypeHughes"],
  ["RT_Froude_N", "resistanceFroudeN"],
  ["RT_Hughes_N", "resistanceHughesN"],
  ["PE_Froude_W", "powerFroudeW"],
  ["PE_Hughes_W", "powerHughesW"],
];

export function resultsToCsv(results: readonly ExtrapolationResult[]): string {
  const header = ["ensaio", ...columns.map(([label]) => label)].join(",");
  const rows = results.map((result) =>
    [result.id, ...columns.map(([, key]) => String(result[key]))]
      .map((value) => `"${value.replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header, ...rows].join("\n");
}
