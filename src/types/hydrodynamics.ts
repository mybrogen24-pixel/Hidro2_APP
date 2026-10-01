export type PrototypeValueSource = "scaled" | "override";

export interface VesselInput {
  caseName: string;
  modelLength: number;
  modelWettedArea: number;
  scale: number;
  formFactor: number;
  modelDensity: number;
  modelKinematicViscosity: number;
  prototypeDensity: number;
  prototypeKinematicViscosity: number;
  gravity: number;
  prototypeLengthOverride?: number;
  prototypeWettedAreaOverride?: number;
}

export interface ExperimentalPoint {
  id: string;
  modelSpeed: number;
  modelResistance: number;
}

export interface PrototypeGeometry {
  prototypeLength: number;
  prototypeWettedArea: number;
  prototypeLengthSource: PrototypeValueSource;
  prototypeWettedAreaSource: PrototypeValueSource;
}

export interface ExtrapolationResult {
  id: string;
  Vm: number;
  RTm: number;
  Fr: number;
  FrPrototype: number;
  froudeEqualityError: number;
  Vp: number;
  VpKnots: number;
  ReModel: number;
  RePrototype: number;
  CfModel: number;
  CfPrototype: number;
  CtModel: number;
  CrModel: number;
  CrPrototype: number;
  CtPrototypeFroude: number;
  resistanceFroudeN: number;
  resistanceFroudeKN: number;
  powerFroudeW: number;
  powerFroudeKW: number;
  powerFroudeMW: number;
  powerFroudeHp: number;
  CvModel: number;
  CwModel: number;
  CwPrototype: number;
  CvPrototype: number;
  CtPrototypeHughes: number;
  resistanceHughesN: number;
  resistanceHughesKN: number;
  powerHughesW: number;
  powerHughesKW: number;
  powerHughesMW: number;
  powerHughesHp: number;
  warnings: string[];
}
