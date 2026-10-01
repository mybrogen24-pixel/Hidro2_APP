import type {
  ExperimentalPoint,
  ExtrapolationResult,
  PrototypeGeometry,
  VesselInput,
} from "../types/hydrodynamics.ts";

const KNOTS_PER_METRE_PER_SECOND = 1.943844492;
const WATTS_PER_HP = 745.699872;

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

function assertPositive(value: number, label: string): void {
  assertFiniteNumber(value, label);
  if (value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

function assertNonNegative(value: number, label: string): void {
  assertFiniteNumber(value, label);
  if (value < 0) {
    throw new Error(`${label} must be greater than or equal to zero.`);
  }
}

/** Returns Lp = lambda * Lm, without presentation rounding. */
export function calculatePrototypeLength(modelLength: number, scale: number): number {
  assertPositive(modelLength, "Model length");
  assertPositive(scale, "Scale");
  return scale * modelLength;
}

/** Returns Sp = lambda^2 * Sm, without presentation rounding. */
export function calculatePrototypeArea(modelWettedArea: number, scale: number): number {
  assertPositive(modelWettedArea, "Model wetted area");
  assertPositive(scale, "Scale");
  return modelWettedArea * scale ** 2;
}

export function calculatePrototypeGeometry(input: VesselInput): PrototypeGeometry {
  const scaledLength = calculatePrototypeLength(input.modelLength, input.scale);
  const scaledArea = calculatePrototypeArea(input.modelWettedArea, input.scale);

  if (input.prototypeLengthOverride !== undefined) {
    assertPositive(input.prototypeLengthOverride, "Prototype length override");
  }
  if (input.prototypeWettedAreaOverride !== undefined) {
    assertPositive(input.prototypeWettedAreaOverride, "Prototype wetted area override");
  }

  return {
    prototypeLength: input.prototypeLengthOverride ?? scaledLength,
    prototypeWettedArea: input.prototypeWettedAreaOverride ?? scaledArea,
    prototypeLengthSource: input.prototypeLengthOverride === undefined ? "scaled" : "override",
    prototypeWettedAreaSource:
      input.prototypeWettedAreaOverride === undefined ? "scaled" : "override",
  };
}

export function calculateFroude(velocity: number, length: number, gravity: number): number {
  assertPositive(velocity, "Velocity");
  assertPositive(length, "Characteristic length");
  assertPositive(gravity, "Gravity");
  return velocity / Math.sqrt(gravity * length);
}

/** Froude-similar prototype velocity: Vp = Vm * sqrt(lambda). */
export function calculatePrototypeSpeed(modelSpeed: number, scale: number): number {
  assertPositive(modelSpeed, "Model speed");
  assertPositive(scale, "Scale");
  return modelSpeed * Math.sqrt(scale);
}

/** Reynolds number based on kinematic viscosity nu [m^2/s]. */
export function calculateReynolds(velocity: number, length: number, kinematicViscosity: number): number {
  assertPositive(velocity, "Velocity");
  assertPositive(length, "Characteristic length");
  assertPositive(kinematicViscosity, "Kinematic viscosity");
  return (velocity * length) / kinematicViscosity;
}

/** ITTC-1957 friction line: Cf = 0.075 / (log10(Re) - 2)^2. */
export function calculateITTCFrictionCoefficient(reynolds: number): number {
  assertPositive(reynolds, "Reynolds number");
  const denominator = (Math.log10(reynolds) - 2) ** 2;
  if (denominator === 0) {
    throw new Error("Reynolds number of 100 makes the ITTC-1957 formula undefined.");
  }
  return 0.075 / denominator;
}

/** Experimental model coefficient: Ct = RTm / (0.5 * rho_m * Sm * Vm^2). */
export function calculateTotalResistanceCoefficient(
  resistance: number,
  density: number,
  wettedArea: number,
  velocity: number,
): number {
  assertNonNegative(resistance, "Resistance");
  assertPositive(density, "Density");
  assertPositive(wettedArea, "Wetted area");
  assertPositive(velocity, "Velocity");
  return resistance / (0.5 * density * wettedArea * velocity ** 2);
}

export function calculateResistance(
  density: number,
  wettedArea: number,
  velocity: number,
  totalResistanceCoefficient: number,
): number {
  assertPositive(density, "Density");
  assertPositive(wettedArea, "Wetted area");
  assertPositive(velocity, "Velocity");
  assertFiniteNumber(totalResistanceCoefficient, "Total resistance coefficient");
  return 0.5 * density * wettedArea * velocity ** 2 * totalResistanceCoefficient;
}

export function calculateEffectivePower(resistanceN: number, velocity: number): number {
  assertFiniteNumber(resistanceN, "Resistance");
  assertPositive(velocity, "Velocity");
  return resistanceN * velocity;
}

export function calculateFroudeMethod(
  ctModel: number,
  cfModel: number,
  cfPrototype: number,
): { crModel: number; crPrototype: number; ctPrototype: number } {
  assertFiniteNumber(ctModel, "Model total resistance coefficient");
  assertFiniteNumber(cfModel, "Model friction coefficient");
  assertFiniteNumber(cfPrototype, "Prototype friction coefficient");
  const crModel = ctModel - cfModel;
  // Froude extrapolation preserves the model residual coefficient at equal Fr.
  const crPrototype = crModel;
  return { crModel, crPrototype, ctPrototype: cfPrototype + crPrototype };
}

export function calculateHughesMethod(
  ctModel: number,
  cfModel: number,
  cfPrototype: number,
  formFactor: number,
): {
  cvModel: number;
  cwModel: number;
  cwPrototype: number;
  cvPrototype: number;
  ctPrototype: number;
} {
  assertFiniteNumber(ctModel, "Model total resistance coefficient");
  assertFiniteNumber(cfModel, "Model friction coefficient");
  assertFiniteNumber(cfPrototype, "Prototype friction coefficient");
  assertFiniteNumber(formFactor, "Form factor");
  const cvModel = (1 + formFactor) * cfModel;
  const cwModel = ctModel - cvModel;
  const cwPrototype = cwModel;
  const cvPrototype = (1 + formFactor) * cfPrototype;
  return {
    cvModel,
    cwModel,
    cwPrototype,
    cvPrototype,
    ctPrototype: cvPrototype + cwPrototype,
  };
}

export function validateVesselInput(input: VesselInput): void {
  assertPositive(input.modelLength, "Model length");
  assertPositive(input.modelWettedArea, "Model wetted area");
  assertPositive(input.scale, "Scale");
  assertFiniteNumber(input.formFactor, "Form factor");
  assertPositive(input.modelDensity, "Model density");
  assertPositive(input.modelKinematicViscosity, "Model kinematic viscosity");
  assertPositive(input.prototypeDensity, "Prototype density");
  assertPositive(input.prototypeKinematicViscosity, "Prototype kinematic viscosity");
  assertPositive(input.gravity, "Gravity");
  calculatePrototypeGeometry(input);
}

export function calculatePoint(input: VesselInput, point: ExperimentalPoint): ExtrapolationResult {
  validateVesselInput(input);
  assertPositive(point.modelSpeed, "Model speed");
  assertNonNegative(point.modelResistance, "Model resistance");

  const geometry = calculatePrototypeGeometry(input);
  const Vm = point.modelSpeed;
  const RTm = point.modelResistance;
  const Vp = calculatePrototypeSpeed(Vm, input.scale);
  const Fr = calculateFroude(Vm, input.modelLength, input.gravity);
  const FrPrototype = calculateFroude(Vp, geometry.prototypeLength, input.gravity);
  const froudeEqualityError = Math.abs(Fr - FrPrototype);
  const ReModel = calculateReynolds(Vm, input.modelLength, input.modelKinematicViscosity);
  const RePrototype = calculateReynolds(
    Vp,
    geometry.prototypeLength,
    input.prototypeKinematicViscosity,
  );
  const CfModel = calculateITTCFrictionCoefficient(ReModel);
  const CfPrototype = calculateITTCFrictionCoefficient(RePrototype);
  const CtModel = calculateTotalResistanceCoefficient(
    RTm,
    input.modelDensity,
    input.modelWettedArea,
    Vm,
  );
  const froude = calculateFroudeMethod(CtModel, CfModel, CfPrototype);
  const hughes = calculateHughesMethod(CtModel, CfModel, CfPrototype, input.formFactor);

  // Resistance stays in N and power stays in W until these output-only conversions.
  const resistanceFroudeN = calculateResistance(
    input.prototypeDensity,
    geometry.prototypeWettedArea,
    Vp,
    froude.ctPrototype,
  );
  const resistanceHughesN = calculateResistance(
    input.prototypeDensity,
    geometry.prototypeWettedArea,
    Vp,
    hughes.ctPrototype,
  );
  const powerFroudeW = calculateEffectivePower(resistanceFroudeN, Vp);
  const powerHughesW = calculateEffectivePower(resistanceHughesN, Vp);

  const warnings: string[] = [];
  if (froude.crModel < 0 || hughes.cwModel < 0) {
    warnings.push(
      "Atenção: foi obtido um coeficiente residual/de ondas negativo. Verifique os dados experimentais, propriedades do fluido, fator de forma e hipóteses utilizadas.",
    );
  }
  if (input.formFactor < 0) {
    warnings.push("Atenção: o fator de forma k é negativo; confirme se essa hipótese é intencional.");
  }
  if (geometry.prototypeLengthSource === "override" && froudeEqualityError > 1e-12) {
    warnings.push(
      "Atenção: o comprimento do protótipo informado diverge da escala geométrica; Vp continua escalado por lambda e Frm não coincide exatamente com Frp.",
    );
  }

  return {
    id: point.id,
    Vm,
    RTm,
    Fr,
    FrPrototype,
    froudeEqualityError,
    Vp,
    VpKnots: Vp * KNOTS_PER_METRE_PER_SECOND,
    ReModel,
    RePrototype,
    CfModel,
    CfPrototype,
    CtModel,
    CrModel: froude.crModel,
    CrPrototype: froude.crPrototype,
    CtPrototypeFroude: froude.ctPrototype,
    resistanceFroudeN,
    resistanceFroudeKN: resistanceFroudeN / 1000,
    powerFroudeW,
    powerFroudeKW: powerFroudeW / 1000,
    powerFroudeMW: powerFroudeW / 1e6,
    powerFroudeHp: powerFroudeW / WATTS_PER_HP,
    CvModel: hughes.cvModel,
    CwModel: hughes.cwModel,
    CwPrototype: hughes.cwPrototype,
    CvPrototype: hughes.cvPrototype,
    CtPrototypeHughes: hughes.ctPrototype,
    resistanceHughesN,
    resistanceHughesKN: resistanceHughesN / 1000,
    powerHughesW,
    powerHughesKW: powerHughesW / 1000,
    powerHughesMW: powerHughesW / 1e6,
    powerHughesHp: powerHughesW / WATTS_PER_HP,
    warnings,
  };
}

/** Evaluates each experimental speed independently; it never interpolates or reuses another point. */
export function calculateAllPoints(
  input: VesselInput,
  points: readonly ExperimentalPoint[],
): ExtrapolationResult[] {
  validateVesselInput(input);
  return points.map((point) => calculatePoint(input, point));
}
