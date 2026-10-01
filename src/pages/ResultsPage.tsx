import { ChevronRight, Download, FileText, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "../components/EmptyState.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import type { ExtrapolationResult } from "../types/hydrodynamics.ts";
import { formatCoefficient, formatNumber, formatScientific, formatUnit } from "../utils/formatters.ts";

type ColumnId = "re" | "cf" | "coefficients" | "resistance" | "power";
const defaults: Record<ColumnId, boolean> = { re: true, cf: true, coefficients: true, resistance: true, power: true };

interface ResultsPageProps {
  results: readonly ExtrapolationResult[];
  onExportCsv: () => void;
  onExportPdf: () => void;
  onOpenMemory: (id: string) => void;
}

export function ResultsPage({ results, onExportCsv, onExportPdf, onOpenMemory }: ResultsPageProps) {
  const [visible, setVisible] = useState(defaults);
  return (
    <>
      <PageHeader eyebrow="Extrapolação calculada" title="Tabela final de resultados" description="Coeficientes, resistência e potência são calculados em precisão completa; a formatação abaixo é somente visual." actions={<><button className="button secondary" onClick={onExportCsv}><Download size={16} /> CSV</button><button className="button primary" onClick={onExportPdf}><FileText size={16} /> Relatório PDF</button></>} />
      {results.length ? <section className="panel table-panel">
        <div className="table-toolbar"><span>{results.length} resultado{results.length === 1 ? "" : "s"}</span><details className="column-picker"><summary><SlidersHorizontal size={15} /> Colunas</summary><div>{(Object.keys(visible) as ColumnId[]).map((key) => <label key={key}><input type="checkbox" checked={visible[key]} onChange={() => setVisible({ ...visible, [key]: !visible[key] })} /> {({ re: "Reynolds", cf: "Atrito", coefficients: "Coeficientes", resistance: "Resistência", power: "Potência" } as Record<ColumnId, string>)[key]}</label>)}</div></details></div>
        <div className="table-scroll"><table className="results-table"><thead><tr><th>Ensaio</th><th>Vm<br /><small>m/s</small></th><th>RTm<br /><small>N</small></th><th>Fr</th><th>Vp<br /><small>m/s · nós</small></th>{visible.re ? <><th>Reₘ</th><th>Reₚ</th></> : null}{visible.cf ? <><th>Cfₘ</th><th>Cfₚ</th></> : null}{visible.coefficients ? <><th>Ctₘ</th><th>Crₘ</th><th>Cwₘ</th><th>Ctₚ Froude</th><th>Ctₚ Hughes</th></> : null}{visible.resistance ? <><th>RT Froude<br /><small>kN</small></th><th>RT Hughes<br /><small>kN</small></th></> : null}{visible.power ? <><th>PE Froude<br /><small>kW</small></th><th>PE Hughes<br /><small>kW</small></th></> : null}<th /></tr></thead><tbody>
          {results.map((result, index) => <tr key={result.id}><td><span className="index-chip">{index + 1}</span></td><td>{formatNumber(result.Vm, 3)}</td><td>{formatNumber(result.RTm, 3)}</td><td>{formatNumber(result.Fr, 4)}</td><td>{formatNumber(result.Vp, 3)}<small>{formatNumber(result.VpKnots, 2)} kn</small></td>{visible.re ? <><td>{formatScientific(result.ReModel)}</td><td>{formatScientific(result.RePrototype)}</td></> : null}{visible.cf ? <><td>{formatCoefficient(result.CfModel)}</td><td>{formatCoefficient(result.CfPrototype)}</td></> : null}{visible.coefficients ? <><td>{formatCoefficient(result.CtModel)}</td><td>{formatCoefficient(result.CrModel)}</td><td>{formatCoefficient(result.CwModel)}</td><td>{formatCoefficient(result.CtPrototypeFroude)}</td><td>{formatCoefficient(result.CtPrototypeHughes)}</td></> : null}{visible.resistance ? <><td>{formatNumber(result.resistanceFroudeKN, 2)}</td><td>{formatNumber(result.resistanceHughesKN, 2)}</td></> : null}{visible.power ? <><td>{formatNumber(result.powerFroudeKW, 1)}</td><td>{formatNumber(result.powerHughesKW, 1)}</td></> : null}<td><button className="icon-button" title="Abrir memória de cálculo" onClick={() => onOpenMemory(result.id)}><ChevronRight size={17} /></button></td></tr>)}
        </tbody></table></div>
        {results.some((result) => result.warnings.length) ? <div className="warning-list">{results.flatMap((result) => result.warnings).filter((warning, index, all) => all.indexOf(warning) === index).map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
      </section> : <EmptyState icon={FileText} title="Resultados indisponíveis" description="Inclua dados válidos de geometria, fluido e ao menos um ensaio experimental para calcular a extrapolação." />}
    </>
  );
}
