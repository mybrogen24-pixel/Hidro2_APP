import { ArrowRight, Gauge, ShipWheel, Waves, Zap } from "lucide-react";

import { EmptyState } from "../components/EmptyState.tsx";
import { MetricCard } from "../components/MetricCard.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import type { AppSection } from "../types/app.ts";
import type { ExtrapolationResult, PrototypeGeometry, VesselInput } from "../types/hydrodynamics.ts";
import { formatNumber, formatUnit } from "../utils/formatters.ts";

interface DashboardPageProps {
  vessel: VesselInput;
  geometry: PrototypeGeometry | null;
  results: readonly ExtrapolationResult[];
  onNavigate: (section: AppSection) => void;
}

export function DashboardPage({ vessel, geometry, results, onNavigate }: DashboardPageProps) {
  const maxResult = results.reduce<ExtrapolationResult | undefined>(
    (highest, item) => (!highest || item.powerFroudeW > highest.powerFroudeW ? item : highest),
    undefined,
  );
  const frRange = results.length
    ? `${formatNumber(Math.min(...results.map((result) => result.Fr)), 3)} — ${formatNumber(Math.max(...results.map((result) => result.Fr)), 3)}`
    : "—";

  return (
    <>
      <PageHeader
        eyebrow="Calculadora modelo-protótipo"
        title={vessel.caseName || "Novo estudo hidrodinâmico"}
        description="Extrapolação de resistência e potência efetiva com os métodos de Froude e Hughes."
        actions={<button className="button primary dashboard-configure-button" onClick={() => onNavigate("input")}>Configurar caso <ArrowRight size={15} /></button>}
      />

      <section className="metric-grid" aria-label="Resumo do caso">
        <MetricCard icon={ShipWheel} label="Comprimento do protótipo" value={geometry ? formatUnit(geometry.prototypeLength, "m") : "—"} helper={geometry?.prototypeLengthSource === "override" ? "valor informado" : "por escala"} />
        <MetricCard icon={Waves} label="Área molhada do protótipo" value={geometry ? formatUnit(geometry.prototypeWettedArea, "m²") : "—"} helper={geometry?.prototypeWettedAreaSource === "override" ? "valor informado" : "por escala"} tone="blue" />
        <MetricCard icon={Gauge} label="Faixa de Froude" value={frRange} helper={`${results.length} ensaio${results.length === 1 ? "" : "s"} calculado${results.length === 1 ? "" : "s"}`} tone="slate" />
        <MetricCard icon={Zap} label="Potência máxima · Froude" value={maxResult ? formatUnit(maxResult.powerFroudeKW, "kW", 1) : "—"} helper={maxResult ? `a ${formatUnit(maxResult.Vp, "m/s")}` : "aguardando ensaios"} tone="amber" />
      </section>

      {results.length ? (
        <section className="dashboard-band">
          <div className="panel highlight-panel">
            <div className="panel-kicker"><span className="status-dot" /> Resultados atualizados</div>
            <h2>Leitura rápida</h2>
            <p>Para o maior ponto ensaiado, o método de Froude estima <strong>{formatUnit(maxResult!.resistanceFroudeKN, "kN", 1)}</strong>; Hughes estima <strong>{formatUnit(maxResult!.resistanceHughesKN, "kN", 1)}</strong>.</p>
            <button className="text-button" onClick={() => onNavigate("results")}>Abrir tabela completa <ArrowRight size={16} /></button>
          </div>
          <div className="panel formula-panel">
            <p className="eyebrow">Premissas ativas</p>
            <dl>
              <div><dt>Escala geométrica</dt><dd>λ = {formatNumber(vessel.scale, 3)}</dd></div>
              <div><dt>Fator de forma</dt><dd>k = {formatNumber(vessel.formFactor, 3)}</dd></div>
              <div><dt>Precisão interna</dt><dd>sem arredondamentos</dd></div>
            </dl>
          </div>
        </section>
      ) : (
        <EmptyState
          icon={Waves}
          title="O caso ainda não tem resultados"
          description="Preencha as características da embarcação e inclua ao menos uma medição experimental de resistência do modelo."
          action={<button className="button primary" onClick={() => onNavigate("experiments")}>Adicionar ensaio</button>}
        />
      )}
    </>
  );
}
