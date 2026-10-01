import type { ExperimentalPoint, VesselInput } from "../types/hydrodynamics.ts";

export const referenceExerciseInput: VesselInput = {
  caseName: "Exercício acadêmico de validação",
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

export const referenceExercisePoints: ExperimentalPoint[] = [
  { id: "referencia-1", modelSpeed: 1.5, modelResistance: 18 },
];

export const referenceExerciseRounded = {
  Lp: 129,
  Sp: 3375,
  Vp: 8.22,
  Fr: 0.23,
  ReModel: 5.66e6,
  RePrototype: 8.91e8,
  CfModel: 3.32e-3,
  CfPrototype: 1.553e-3,
  CtModel: 4.267e-3,
  CrModel: 0.947e-3,
  CtPrototypeFroude: 2.5e-3,
  resistanceFroudeKN: 292,
  powerFroudeKW: 2400,
  CwModel: 0.449e-3,
  CtPrototypeHughes: 2.235e-3,
  resistanceHughesKN: 261,
  powerHughesKW: 2147,
} as const;
