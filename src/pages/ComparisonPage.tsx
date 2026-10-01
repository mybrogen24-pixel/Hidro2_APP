import { BarChart3 } from "lucide-react";

import { EmptyState } from "../components/EmptyState.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import type { ExtrapolationResult } from "../types/hydrodynamics.ts";
import { formatNumber, formatUnit, percentageDifference } from "../utils/formatters.ts";

export function ComparisonPage({ results }: { results: readonly ExtrapolationResult[] }) {
  return <><PageHeader eyebrow="Froude × Hughes" title="Comparação de métodos" description="A diferença decorre principalmente da aplicação do fator de forma no termo viscoso do método de Hughes." />{results.length ? <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Ensaio</th><th>Fr</th><th>ΔRT <small>kN</small></th><th>ΔRT <small>%</small></th><th>ΔPE <small>kW</small></th><th>ΔPE <small>%</small></th></tr></thead><tbody>{results.map((result, index) => { const deltaR = result.resistanceFroudeKN - result.resistanceHughesKN; const deltaP = result.powerFroudeKW - result.powerHughesKW; return <tr key={result.id}><td><span className="index-chip">{index + 1}</span></td><td>{formatNumber(result.Fr, 4)}</td><td>{formatUnit(deltaR, "kN", 3)}</td><td>{formatNumber(percentageDifference(result.resistanceHughesN, result.resistanceFroudeN) * -1, 3)}%</td><td>{formatUnit(deltaP, "kW", 3)}</td><td>{formatNumber(percentageDifference(result.powerHughesW, result.powerFroudeW) * -1, 3)}%</td></tr>; })}</tbody></table></div></section> : <EmptyState icon={BarChart3} title="Comparação aguardando resultados" description="Quando houver ao menos um ensaio válido, as diferenças de resistência e potência serão apresentadas aqui." />}</>;
}
