import { BlockMath } from "react-katex";
import { Calculator, ChevronDown } from "lucide-react";

import { EmptyState } from "../components/EmptyState.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import type { ExtrapolationResult, PrototypeGeometry, VesselInput } from "../types/hydrodynamics.ts";
import { formatCoefficient, formatNumber, formatScientific, formatUnit } from "../utils/formatters.ts";

interface CalculationMemoryPageProps {
  vessel: VesselInput;
  geometry: PrototypeGeometry | null;
  results: readonly ExtrapolationResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function Step({ title, formula, substitution, result }: { title: string; formula: string; substitution: string; result: string }) {
  return <article className="calculation-step"><h3>{title}</h3><div className="math"><BlockMath math={formula} /></div><p className="substitution">{substitution}</p><strong>{result}</strong></article>;
}

export function CalculationMemoryPage({ vessel, geometry, results, selectedId, onSelect }: CalculationMemoryPageProps) {
  const selected = results.find((result) => result.id === selectedId) ?? results[0];
  if (!selected || !geometry) return <><PageHeader eyebrow="Rastreabilidade" title="Memória de cálculo" description="Selecione um ensaio para acompanhar cada etapa da extrapolação." /><EmptyState icon={Calculator} title="Nenhum cálculo disponível" description="A memória é gerada automaticamente após a inclusão de dados válidos do caso e de um ensaio experimental." /></>;
  return <>
    <PageHeader eyebrow="Rastreabilidade" title="Memória de cálculo" description="Apenas a apresentação é arredondada. O motor mantém os valores completos em todas as etapas." actions={<label className="select-control">Ensaio<select value={selected.id} onChange={(event) => onSelect(event.target.value)}>{results.map((result, index) => <option key={result.id} value={result.id}>Ensaio {index + 1} · Vm {formatNumber(result.Vm, 3)} m/s</option>)}</select><ChevronDown size={15} /></label>} />
    <section className="memory-summary panel"><div><span>Modelo</span><strong>Vm = {formatUnit(selected.Vm, "m/s", 4)} · RTm = {formatUnit(selected.RTm, "N", 4)}</strong></div><div><span>Protótipo</span><strong>Lp = {formatUnit(geometry.prototypeLength, "m", 4)} · Sp = {formatUnit(geometry.prototypeWettedArea, "m²", 4)}</strong></div><div><span>Semelhança</span><strong>Frₘ = {formatNumber(selected.Fr, 8)} · Frₚ = {formatNumber(selected.FrPrototype, 8)}</strong></div></section>
    <section className="calculation-grid">
      <Step title="1. Escala geométrica" formula={String.raw`L_p = \lambda L_m, \qquad S_p = \lambda^2 S_m`} substitution={`Lp = ${formatNumber(vessel.scale, 8)} × ${formatNumber(vessel.modelLength, 8)}; Sp = ${formatNumber(vessel.modelWettedArea, 8)} × ${formatNumber(vessel.scale, 8)}²`} result={`Lp = ${formatUnit(geometry.prototypeLength, "m", 6)}; Sp = ${formatUnit(geometry.prototypeWettedArea, "m²", 6)}`} />
      <Step title="2. Número de Froude" formula={String.raw`Fr_m = \frac{V_m}{\sqrt{gL_m}} = Fr_p`} substitution={`Frₘ = ${formatNumber(selected.Vm, 10)} / √(${formatNumber(vessel.gravity, 10)} × ${formatNumber(vessel.modelLength, 10)})`} result={`Frₘ = ${formatNumber(selected.Fr, 10)}; Frₚ = ${formatNumber(selected.FrPrototype, 10)}`} />
      <Step title="3. Velocidade equivalente" formula={String.raw`V_p = V_m\sqrt{\lambda}`} substitution={`Vp = ${formatNumber(selected.Vm, 10)} × √${formatNumber(vessel.scale, 10)}`} result={`Vp = ${formatUnit(selected.Vp, "m/s", 8)} (${formatUnit(selected.VpKnots, "kn", 5)})`} />
      <Step title="4. Números de Reynolds" formula={String.raw`Re = \frac{VL}{\nu}`} substitution={`Reₘ = ${formatNumber(selected.Vm, 8)} × ${formatNumber(vessel.modelLength, 8)} / ${vessel.modelKinematicViscosity}; Reₚ = ${formatNumber(selected.Vp, 8)} × ${formatNumber(geometry.prototypeLength, 8)} / ${vessel.prototypeKinematicViscosity}`} result={`Reₘ = ${formatScientific(selected.ReModel)}; Reₚ = ${formatScientific(selected.RePrototype)}`} />
      <Step title="5. Atrito ITTC-1957" formula={String.raw`C_f = \frac{0.075}{(\log_{10} Re - 2)^2}`} substitution="Aplicada individualmente a Reₘ e Reₚ com logaritmo decimal." result={`Cfₘ = ${formatCoefficient(selected.CfModel)}; Cfₚ = ${formatCoefficient(selected.CfPrototype)}`} />
      <Step title="6. Coeficiente total do modelo" formula={String.raw`C_{Tm} = \frac{RT_m}{0.5\rho_m S_m V_m^2}`} substitution={`Ctₘ = ${formatNumber(selected.RTm, 10)} / (0.5 × ${formatNumber(vessel.modelDensity, 10)} × ${formatNumber(vessel.modelWettedArea, 10)} × ${formatNumber(selected.Vm, 10)}²)`} result={`Ctₘ = ${formatCoefficient(selected.CtModel)}`} />
      <Step title="7. Método de Froude" formula={String.raw`C_{Rm}=C_{Tm}-C_{Fm}; \quad C_{Rp}=C_{Rm}; \quad C_{Tp}=C_{Fp}+C_{Rp}`} substitution={`Crₘ = ${formatCoefficient(selected.CtModel)} − ${formatCoefficient(selected.CfModel)}`} result={`Cr = ${formatCoefficient(selected.CrModel)}; Ctₚ = ${formatCoefficient(selected.CtPrototypeFroude)}`} />
      <Step title="8. Método de Hughes" formula={String.raw`C_T=(1+k)C_f+C_w`} substitution={`Cvₘ = (1 + ${formatNumber(vessel.formFactor, 8)}) × ${formatCoefficient(selected.CfModel)}; Cwₘ = Ctₘ − Cvₘ`} result={`Cw = ${formatCoefficient(selected.CwModel)}; Ctₚ = ${formatCoefficient(selected.CtPrototypeHughes)}`} />
      <Step title="9. Resistência do protótipo" formula={String.raw`RT_p=0.5\rho_pS_pV_p^2C_{Tp}`} substitution="Calculada em N antes da conversão para kN." result={`Froude: ${formatUnit(selected.resistanceFroudeN, "N", 4)} · Hughes: ${formatUnit(selected.resistanceHughesN, "N", 4)}`} />
      <Step title="10. Potência efetiva" formula={String.raw`PE = RT_pV_p`} substitution="Calculada em W usando resistência em N e velocidade em m/s." result={`Froude: ${formatUnit(selected.powerFroudeW, "W", 4)} · Hughes: ${formatUnit(selected.powerHughesW, "W", 4)}`} />
    </section>
  </>;
}
