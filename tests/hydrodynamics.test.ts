import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateAllPoints,
  calculateFroude,
  calculateITTCFrictionCoefficient,
  calculatePrototypeArea,
  calculatePrototypeLength,
  calculatePrototypeSpeed,
  calculateReynolds,
  calculateTotalResistanceCoefficient,
} from "../src/calculations/hydrodynamics.ts";
import type { ExperimentalPoint, VesselInput } from "../src/types/hydrodynamics.ts";

const referenceInput: VesselInput = {
  caseName: "Exercício acadêmico",
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

const referencePoint: ExperimentalPoint = {
  id: "reference-1",
  modelSpeed: 1.5,
  modelResistance: 18,
};

function approximatelyEqual(actual: number, expected: number, tolerance = 1e-12): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("geometric scale relations use Lp=lambda*Lm and Sp=lambda^2*Sm", () => {
  assert.equal(calculatePrototypeLength(4.3, 30), 129);
  assert.equal(calculatePrototypeArea(3.75, 30), 3375);
});

test("Froude-similar velocity respects Fr_model = Fr_prototype", () => {
  const Vm = 1.5;
  const Vp = calculatePrototypeSpeed(Vm, 30);
  approximatelyEqual(Vp, Vm * Math.sqrt(30));
  approximatelyEqual(calculateFroude(Vm, 4.3, 9.81), calculateFroude(Vp, 129, 9.81));
});

test("Reynolds uses kinematic viscosity and ITTC-1957 uses base-10 logarithm", () => {
  const reynolds = calculateReynolds(1.5, 4.3, 1.14e-6);
  approximatelyEqual(reynolds, (1.5 * 4.3) / 1.14e-6);
  approximatelyEqual(
    calculateITTCFrictionCoefficient(reynolds),
    0.075 / (Math.log10(reynolds) - 2) ** 2,
  );
});

test("Ct_model is taken directly from the measured model resistance", () => {
  approximatelyEqual(
    calculateTotalResistanceCoefficient(18, 1000, 3.75, 1.5),
    18 / (0.5 * 1000 * 3.75 * 1.5 ** 2),
  );
});

test("reference exercise preserves all Froude and Hughes identities with full precision", () => {
  const [result] = calculateAllPoints(referenceInput, [referencePoint]);

  approximatelyEqual(result.Fr, result.FrPrototype);
  approximatelyEqual(result.Vp, result.Vm * Math.sqrt(referenceInput.scale));
  approximatelyEqual(result.CrModel, result.CtModel - result.CfModel);
  approximatelyEqual(result.CrPrototype, result.CrModel);
  approximatelyEqual(result.CtPrototypeFroude, result.CfPrototype + result.CrPrototype);
  approximatelyEqual(result.CvModel, (1 + referenceInput.formFactor) * result.CfModel);
  approximatelyEqual(result.CwModel, result.CtModel - result.CvModel);
  approximatelyEqual(result.CwPrototype, result.CwModel);
  approximatelyEqual(result.CvPrototype, (1 + referenceInput.formFactor) * result.CfPrototype);
  approximatelyEqual(result.CtPrototypeHughes, result.CvPrototype + result.CwPrototype);
  approximatelyEqual(result.powerFroudeW, result.resistanceFroudeN * result.Vp);
  approximatelyEqual(result.powerHughesW, result.resistanceHughesN * result.Vp);
  approximatelyEqual(result.resistanceFroudeKN, result.resistanceFroudeN / 1000);
  approximatelyEqual(result.resistanceHughesKN, result.resistanceHughesN / 1000);
});

test("reference exercise agrees with the hand-calculated values within their published rounding", () => {
  const [result] = calculateAllPoints(referenceInput, [referencePoint]);

  approximatelyEqual(result.Fr, 0.23, 0.002);
  approximatelyEqual(result.Vp, 8.22, 0.01);
  approximatelyEqual(result.ReModel, 5.66e6, 5_000);
  approximatelyEqual(result.RePrototype, 8.91e8, 500_000);
  approximatelyEqual(result.CfModel, 3.32e-3, 0.00001);
  approximatelyEqual(result.CfPrototype, 1.553e-3, 0.00001);
  approximatelyEqual(result.CtModel, 4.267e-3, 0.00001);
  approximatelyEqual(result.CrModel, 0.947e-3, 0.00001);
  approximatelyEqual(result.CtPrototypeFroude, 2.5e-3, 0.00001);
  approximatelyEqual(result.resistanceFroudeKN, 292, 0.5);
  approximatelyEqual(result.powerFroudeKW, 2400, 5);
  approximatelyEqual(result.CwModel, 0.449e-3, 0.00001);
  approximatelyEqual(result.CtPrototypeHughes, 2.235e-3, 0.00001);
  approximatelyEqual(result.resistanceHughesKN, 261, 0.5);
  approximatelyEqual(result.powerHughesKW, 2147, 5);
});

test("each experimental point is calculated independently", () => {
  const results = calculateAllPoints(referenceInput, [
    referencePoint,
    { id: "second", modelSpeed: 1.2, modelResistance: 10 },
  ]);

  assert.equal(results.length, 2);
  approximatelyEqual(results[1].Fr, calculateFroude(1.2, 4.3, 9.81));
  approximatelyEqual(
    results[1].CtModel,
    calculateTotalResistanceCoefficient(10, 1000, 3.75, 1.2),
  );
  assert.notEqual(results[0].CtModel, results[1].CtModel);
});
