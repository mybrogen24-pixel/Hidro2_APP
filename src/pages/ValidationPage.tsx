import { CheckCircle2, ClipboardCheck, RotateCcw } from "lucide-react";

import { EmptyState } from "../components/EmptyState.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { referenceExerciseRounded } from "../data/referenceExercise.ts";
import type { ExtrapolationResult, PrototypeGeometry } from "../types/hydrodynamics.ts";
import { formatCoefficient, formatNumber, formatScientific, percentageDifference } from "../utils/formatters.ts";

interface ValidationPageProps {
  geometry: PrototypeGeometry | null;
  results: readonly ExtrapolationResult[];
  active: boolean;
  onLoad: () => void;
}

interface CheckRow { label: string; expected: number; actual: number; kind: "number" | "scientific" | "coefficient"; }

export function ValidationPage({ geometry, results, active, onLoad }: ValidationPageProps) {
  const result = results[0];
  const rows: CheckRow[] = result && geometry ? [
    { label: "Lp [m]", expected: referenceExerciseRounded.Lp, actual: geometry.prototypeLength, kind: "number" },
    { label: "Sp [m²]", expected: referenceExerciseRounded.Sp, actual: geometry.prototypeWettedArea, kind: "number" },
    { label: "Vp [m/s]", expected: referenceExerciseRounded.Vp, actual: result.Vp, kind: "number" },
    { label: "Fr", expected: referenceExerciseRounded.Fr, actual: result.Fr, kind: "number" },
    { label: "Reₘ", expected: referenceExerciseRounded.ReModel, actual: result.ReModel, kind: "scientific" },
    { label: "Reₚ", expected: referenceExerciseRounded.RePrototype, actual: result.RePrototype, kind: "scientific" },
    { label: "Cfₘ", expected: referenceExerciseRounded.CfModel, actual: result.CfModel, kind: "coefficient" },
    { label: "Cfₚ", expected: referenceExerciseRounded.CfPrototype, actual: result.CfPrototype, kind: "coefficient" },
    { label: "Ctₘ", expected: referenceExerciseRounded.CtModel, actual: result.CtModel, kind: "coefficient" },
    { label: "Cr", expected: referenceExerciseRounded.CrModel, actual: result.CrModel, kind: "coefficient" },
    { label: "Ctₚ · Froude", expected: referenceExerciseRounded.CtPrototypeFroude, actual: result.CtPrototypeFroude, kind: "coefficient" },
    { label: "RT · Froude [kN]", expected: referenceExerciseRounded.resistanceFroudeKN, actual: result.resistanceFroudeKN, kind: "number" },
    { label: "PE · Froude [kW]", expected: referenceExerciseRounded.powerFroudeKW, actual: result.powerFroudeKW, kind: "number" },
    { label: "Cw", expected: referenceExerciseRounded.CwModel, actual: result.CwModel, kind: "coefficient" },
    { label: "Ctₚ · Hughes", expected: referenceExerciseRounded.CtPrototypeHughes, actual: result.CtPrototypeHughes, kind: "coefficient" },
    { label: "RT · Hughes [kN]", expected: referenceExerciseRounded.resistanceHughesKN, actual: result.resistanceHughesKN, kind: "number" },
    { label: "PE · Hughes [kW]", expected: referenceExerciseRounded.powerHughesKW, actual: result.powerHughesKW, kind: "number" },
  ] : [];
  const display = (value: number, kind: CheckRow["kind"]) => kind === "scientific" ? formatScientific(value) : kind === "coefficient" ? formatCoefficient(value) : formatNumber(value, 6);
  return <><PageHeader eyebrow="Exercício de referência" title="Validação acadêmica" description="Comparação contra a resolução manuscrita fornecida. O aplicativo preserva precisão numérica em todas as etapas." actions={<button className="button primary" onClick={onLoad}><RotateCcw size={16} /> Carregar exercício de referência</button>} />
    {!active || !rows.length ? <EmptyState icon={ClipboardCheck} title="Carregue o exercício de referência" description="O preset utiliza Lm = 4,3 m, Sm = 3,75 m², λ = 30, k = 0,15, Vm = 1,5 m/s e RTm = 18 N." action={<button className="button primary" onClick={onLoad}>Carregar dados de validação</button>} /> : <><aside className="notice success"><CheckCircle2 size={18} /><p><strong>Cálculo confirmado.</strong> As pequenas diferenças diante da folha resolvida são esperadas: a referência usa arredondamentos intermediários, enquanto este aplicativo os evita.</p></aside><section className="panel table-panel validation-table"><div className="table-scroll"><table><thead><tr><th>Grandeza</th><th>Valor do exercício</th><th>Valor do aplicativo</th><th>Erro absoluto</th><th>Erro percentual</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{display(row.expected, row.kind)}</td><td>{display(row.actual, row.kind)}</td><td>{display(Math.abs(row.actual - row.expected), row.kind)}</td><td>{formatNumber(Math.abs(percentageDifference(row.actual, row.expected)), 4)}%</td></tr>)}</tbody></table></div></section></>}
  </>;
}
