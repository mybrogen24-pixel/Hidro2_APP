import { Download, FileUp, Save } from "lucide-react";
import type { ChangeEvent } from "react";

import { Field } from "../components/Field.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import type { CaseStudyInfo, ProjectData } from "../types/app.ts";
import { downloadTextFile } from "../utils/files.ts";

interface CaseStudyPageProps {
  caseStudy: CaseStudyInfo;
  project: ProjectData;
  onChange: (caseStudy: CaseStudyInfo) => void;
  onLoadProject: (project: ProjectData) => void;
}

export function CaseStudyPage({ caseStudy, project, onChange, onLoadProject }: CaseStudyPageProps) {
  const update = <Key extends keyof CaseStudyInfo>(key: Key, value: string) => onChange({ ...caseStudy, [key]: value });
  const saveProject = () => downloadTextFile("hydroscale-estudo.json", JSON.stringify(project, null, 2), "application/json");
  const importProject = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { onLoadProject(JSON.parse(String(reader.result)) as ProjectData); } catch { /* invalid files are intentionally ignored */ } };
    reader.readAsText(file);
    event.target.value = "";
  };
  return <><PageHeader eyebrow="Literatura e persistência" title="Estudo de caso" description="Registre a origem dos dados e salve o conjunto completo para retomá-lo ou compartilhá-lo." actions={<><label className="button secondary file-button"><FileUp size={16} /> Importar projeto<input type="file" accept="application/json,.json" onChange={importProject} /></label><button className="button primary" onClick={saveProject}><Download size={16} /> Exportar projeto</button></>} /><section className="study-layout"><div className="panel form-panel"><div className="section-heading"><div><h2>Referência do estudo</h2><p>Informações para rastrear a fonte experimental.</p></div><Save size={18} /></div><div className="form-grid"><Field label="Artigo ou fonte" type="text" value={caseStudy.source} onChange={(value) => update("source", String(value))} /><Field label="Autores" type="text" value={caseStudy.authors} onChange={(value) => update("authors", String(value))} /><Field label="Ano" type="text" value={caseStudy.year} onChange={(value) => update("year", String(value))} /><label className="field"><span>Observações</span><textarea value={caseStudy.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Hipóteses, configuração do tanque, particularidades do casco…" rows={6} /></label></div></div><aside className="panel study-note"><p className="eyebrow">Armazenamento local</p><h2>Projeto salvo neste navegador</h2><p>Os dados da embarcação, as propriedades do fluido, os ensaios e este registro são preservados automaticamente no dispositivo.</p></aside></section></>;
}
