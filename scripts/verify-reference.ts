import { calculateAllPoints } from "../src/calculations/hydrodynamics.ts";
import type { ExperimentalPoint, VesselInput } from "../src/types/hydrodynamics.ts";

const input: VesselInput = {
  caseName: "Exercício acadêmico - modelo-protótipo",
  modelLength: 4.3,
  modelWettedArea: 3.75,
  scale: 30,
  formFactor: 0.15,
  modelDensity: 1000,
  prototypeDensity: 1025,
  modelKinematicViscosity: 1.14e-6,
  prototypeKinematicViscosity: 1.19e-6,
  gravity: 9.81,
};

const experimentalPoints: ExperimentalPoint[] = [
  { id: "Ensaio 1", modelSpeed: 1.5, modelResistance: 18 },
];

// Formatting is exclusively for terminal presentation. The engine never rounds intermediate values.
const format = (value: number): string => value.toPrecision(12);

const table = calculateAllPoints(input, experimentalPoints).map((result) => ({
  Fr: format(result.Fr),
  Vp: format(result.Vp),
  Re_m: format(result.ReModel),
  Re_p: format(result.RePrototype),
  Cf_m: format(result.CfModel),
  Cf_p: format(result.CfPrototype),
  Ct_m: format(result.CtModel),
  Cr: format(result.CrModel),
  Cw: format(result.CwModel),
  Ct_p_Froude: format(result.CtPrototypeFroude),
  Ct_p_Hughes: format(result.CtPrototypeHughes),
  RT_Froude: format(result.resistanceFroudeN),
  RT_Hughes: format(result.resistanceHughesN),
  PE_Froude: format(result.powerFroudeW),
  PE_Hughes: format(result.powerHughesW),
}));

console.table(table);
