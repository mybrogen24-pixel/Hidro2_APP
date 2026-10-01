import { Info } from "lucide-react";

import { Field } from "../components/Field.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import type { VesselInput } from "../types/hydrodynamics.ts";

interface InputPageProps {
  vessel: VesselInput;
  onChange: (next: VesselInput) => void;
}

export function InputPage({ vessel, onChange }: InputPageProps) {
  const update = <Key extends keyof VesselInput>(key: Key, value: VesselInput[Key]) => onChange({ ...vessel, [key]: value });
  const updateOptional = (key: "prototypeLengthOverride" | "prototypeWettedAreaOverride", value: number) => {
    onChange({ ...vessel, [key]: value > 0 ? value : undefined });
  };

  return (
    <>
      <PageHeader eyebrow="Dados de entrada" title="Características da embarcação" description="Todas as equações internas operam em unidades SI. Valores do protótipo podem ser obtidos por escala ou informados pela literatura." />
      <div className="input-layout">
        <section className="panel form-panel">
          <div className="section-heading"><div><h2>Identificação e geometria</h2><p>Escala geométrica aplicada ao modelo ensaiado.</p></div></div>
          <div className="form-grid two-columns">
            <Field label="Nome do caso" type="text" value={vessel.caseName} onChange={(value) => update("caseName", String(value))} />
            <Field label="Escala geométrica" unit="λ" value={vessel.scale} min={0} onChange={(value) => update("scale", Number(value))} />
            <Field label="Comprimento do modelo" unit="Lm · m" value={vessel.modelLength} min={0} onChange={(value) => update("modelLength", Number(value))} />
            <Field label="Área molhada do modelo" unit="Sm · m²" value={vessel.modelWettedArea} min={0} onChange={(value) => update("modelWettedArea", Number(value))} />
            <Field label="Comprimento do protótipo" unit="Lp · m" value={vessel.prototypeLengthOverride ?? ""} min={0} hint="Opcional: substitui λ · Lm" onChange={(value) => updateOptional("prototypeLengthOverride", Number(value))} />
            <Field label="Área molhada do protótipo" unit="Sp · m²" value={vessel.prototypeWettedAreaOverride ?? ""} min={0} hint="Opcional: substitui λ² · Sm" onChange={(value) => updateOptional("prototypeWettedAreaOverride", Number(value))} />
          </div>
        </section>
        <section className="panel form-panel">
          <div className="section-heading"><div><h2>Fluido e semelhança</h2><p>Informe viscosidades cinemáticas, em m²/s.</p></div></div>
          <div className="form-grid two-columns">
            <Field label="Fator de forma" unit="k" value={vessel.formFactor} step={0.01} onChange={(value) => update("formFactor", Number(value))} />
            <Field label="Gravidade" unit="g · m/s²" value={vessel.gravity} min={0} step={0.01} onChange={(value) => update("gravity", Number(value))} />
            <Field label="Densidade no ensaio" unit="ρm · kg/m³" value={vessel.modelDensity} min={0} onChange={(value) => update("modelDensity", Number(value))} />
            <Field label="Densidade do protótipo" unit="ρp · kg/m³" value={vessel.prototypeDensity} min={0} onChange={(value) => update("prototypeDensity", Number(value))} />
            <Field label="Viscosidade cinemática no ensaio" unit="νm · m²/s" value={vessel.modelKinematicViscosity} min={0} onChange={(value) => update("modelKinematicViscosity", Number(value))} />
            <Field label="Viscosidade cinemática do protótipo" unit="νp · m²/s" value={vessel.prototypeKinematicViscosity} min={0} onChange={(value) => update("prototypeKinematicViscosity", Number(value))} />
          </div>
        </section>
      </div>
      <aside className="notice"><Info size={18} /><p><strong>Rastreabilidade:</strong> a velocidade do protótipo é sempre calculada por Vp = Vm √λ. Um Lp informado que divirja de λLm será sinalizado, pois deixa de conservar exatamente a igualdade de Froude.</p></aside>
    </>
  );
}
