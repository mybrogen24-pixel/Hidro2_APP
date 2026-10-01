import { ArrowDownUp, Copy, Download, FileUp, Plus, Trash2, Upload } from "lucide-react";
import Papa from "papaparse";
import type { ChangeEvent } from "react";

import { EmptyState } from "../components/EmptyState.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import type { ExperimentalPoint } from "../types/hydrodynamics.ts";
import { downloadTextFile } from "../utils/files.ts";

interface ExperimentsPageProps {
  points: readonly ExperimentalPoint[];
  onChange: (points: ExperimentalPoint[]) => void;
}

export function ExperimentsPage({ points, onChange }: ExperimentsPageProps) {
  const addPoint = () => onChange([...points, { id: crypto.randomUUID(), modelSpeed: 0, modelResistance: 0 }]);
  const updatePoint = (id: string, key: "modelSpeed" | "modelResistance", value: number) => onChange(points.map((point) => point.id === id ? { ...point, [key]: value } : point));
  const importCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const imported = data
          .map((row) => ({
            id: crypto.randomUUID(),
            modelSpeed: Number(row.velocidade_modelo),
            modelResistance: Number(row.resistencia_total_modelo),
          }))
          .filter((point) => Number.isFinite(point.modelSpeed) && Number.isFinite(point.modelResistance));
        if (imported.length) onChange([...points, ...imported]);
      },
    });
    event.target.value = "";
  };
  const exportTemplate = () => downloadTextFile("modelo-dados-experimentais.csv", "velocidade_modelo,resistencia_total_modelo\n0.889,3.908\n");

  return (
    <>
      <PageHeader
        eyebrow="Medições de tanque"
        title="Dados experimentais do modelo"
        description="Cada linha é uma medição independente: a aplicação não interpola nem inventa resistência experimental."
        actions={<><button className="button secondary" onClick={exportTemplate}><Download size={16} /> Modelo CSV</button><label className="button secondary file-button"><Upload size={16} /> Importar CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} /></label><button className="button primary" onClick={addPoint}><Plus size={17} /> Novo ensaio</button></>}
      />
      {points.length ? (
        <section className="panel table-panel">
          <div className="table-toolbar"><span>{points.length} ponto{points.length === 1 ? "" : "s"} experimental{points.length === 1 ? "" : "is"}</span><button className="text-button" onClick={() => onChange([...points].sort((a, b) => a.modelSpeed - b.modelSpeed))}><ArrowDownUp size={15} /> Ordenar por velocidade</button></div>
          <div className="table-scroll"><table><thead><tr><th>Ensaio</th><th>Vm <small>m/s</small></th><th>RTm <small>N</small></th><th aria-label="Ações" /></tr></thead><tbody>
            {points.map((point, index) => <tr key={point.id}><td><span className="index-chip">{index + 1}</span></td><td><input className="table-input" type="number" min="0" step="any" value={point.modelSpeed} onChange={(event) => updatePoint(point.id, "modelSpeed", Number(event.target.value))} /></td><td><input className="table-input" type="number" min="0" step="any" value={point.modelResistance} onChange={(event) => updatePoint(point.id, "modelResistance", Number(event.target.value))} /></td><td className="row-actions"><button aria-label="Duplicar ensaio" onClick={() => onChange([...points, { ...point, id: crypto.randomUUID() }])}><Copy size={16} /></button><button className="danger" aria-label="Excluir ensaio" onClick={() => onChange(points.filter((item) => item.id !== point.id))}><Trash2 size={16} /></button></td></tr>)}
          </tbody></table></div>
          <button className="add-row" onClick={addPoint}><Plus size={16} /> Adicionar linha</button>
        </section>
      ) : <EmptyState icon={FileUp} title="Nenhuma medição inserida" description="Adicione uma linha manualmente ou importe um CSV com as colunas velocidade_modelo e resistencia_total_modelo." action={<button className="button primary" onClick={addPoint}>Adicionar primeiro ensaio</button>} />}
    </>
  );
}
