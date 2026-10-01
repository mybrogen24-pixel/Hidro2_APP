import { useMemo, useState } from "react";
import { AlertTriangle, FileDown, FlaskConical, Plus, RefreshCcw } from "lucide-react";

import { Sidebar } from "./components/Sidebar.tsx";
import { calculateAllPoints, calculatePrototypeGeometry } from "./calculations/hydrodynamics.ts";
import { referenceExerciseInput, referenceExercisePoints } from "./data/referenceExercise.ts";
import { useProjectStorage } from "./hooks/useProjectStorage.ts";
import { AboutPage } from "./pages/AboutPage.tsx";
import { CalculationMemoryPage } from "./pages/CalculationMemoryPage.tsx";
import { CaseStudyPage } from "./pages/CaseStudyPage.tsx";
import { ChartsPage } from "./pages/ChartsPage.tsx";
import { ComparisonPage } from "./pages/ComparisonPage.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { ExperimentsPage } from "./pages/ExperimentsPage.tsx";
import { InputPage } from "./pages/InputPage.tsx";
import { ResultsPage } from "./pages/ResultsPage.tsx";
import { ValidationPage } from "./pages/ValidationPage.tsx";
import type { AppSection, ProjectData } from "./types/app.ts";
import type { ExtrapolationResult, PrototypeGeometry } from "./types/hydrodynamics.ts";
import { resultsToCsv } from "./utils/csv.ts";
import { downloadTextFile } from "./utils/files.ts";
import { exportPdfReport } from "./utils/report.ts";

const blankProject: ProjectData = {
  vessel: {
    caseName: "",
    modelLength: 0,
    modelWettedArea: 0,
    scale: 0,
    formFactor: 0,
    modelDensity: 0,
    modelKinematicViscosity: 0,
    prototypeDensity: 0,
    prototypeKinematicViscosity: 0,
    gravity: 9.81,
  },
  experimentalPoints: [],
  caseStudy: { source: "", authors: "", year: "", notes: "" },
};

interface CalculationState {
  results: ExtrapolationResult[];
  geometry: PrototypeGeometry | null;
  error: string | null;
}

function evaluate(project: ProjectData): CalculationState {
  try {
    const geometry = calculatePrototypeGeometry(project.vessel);
    if (!project.experimentalPoints.length) return { geometry, results: [], error: null };
    return { geometry, results: calculateAllPoints(project.vessel, project.experimentalPoints), error: null };
  } catch (error) {
    return { geometry: null, results: [], error: error instanceof Error ? error.message : "Não foi possível calcular este caso." };
  }
}

export function App() {
  const [project, setProject] = useProjectStorage(blankProject);
  const [section, setSection] = useState<AppSection>("dashboard");
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [referenceLoaded, setReferenceLoaded] = useState(false);
  const calculation = useMemo(() => evaluate(project), [project]);

  const loadReference = () => {
    setProject({ ...blankProject, vessel: referenceExerciseInput, experimentalPoints: referenceExercisePoints });
    setSelectedResultId(referenceExercisePoints[0].id);
    setReferenceLoaded(true);
  };
  const exportCsv = () => downloadTextFile("hydroscale-resultados.csv", resultsToCsv(calculation.results), "text/csv;charset=utf-8");
  const exportPdf = () => void exportPdfReport(project.vessel, calculation.geometry, calculation.results, project.caseStudy);
  const openMemory = (id: string) => { setSelectedResultId(id); setSection("memory"); };
  const clearProject = () => {
    if (window.confirm("Limpar todas as entradas e ensaios deste projeto?")) {
      setProject(blankProject);
      setSelectedResultId(null);
      setReferenceLoaded(false);
      setSection("dashboard");
    }
  };
  const renderPage = () => {
    switch (section) {
      case "dashboard": return <DashboardPage vessel={project.vessel} geometry={calculation.geometry} results={calculation.results} onNavigate={setSection} />;
      case "input": return <InputPage vessel={project.vessel} onChange={(vessel) => setProject({ ...project, vessel })} />;
      case "experiments": return <ExperimentsPage points={project.experimentalPoints} onChange={(experimentalPoints) => setProject({ ...project, experimentalPoints })} />;
      case "results": return <ResultsPage results={calculation.results} onExportCsv={exportCsv} onExportPdf={exportPdf} onOpenMemory={openMemory} />;
      case "memory": return <CalculationMemoryPage vessel={project.vessel} geometry={calculation.geometry} results={calculation.results} selectedId={selectedResultId} onSelect={setSelectedResultId} />;
      case "charts": return <ChartsPage results={calculation.results} />;
      case "comparison": return <ComparisonPage results={calculation.results} />;
      case "validation": return <ValidationPage geometry={calculation.geometry} results={calculation.results} active={referenceLoaded} onLoad={loadReference} />;
      case "case-study": return <CaseStudyPage caseStudy={project.caseStudy} project={project} onChange={(caseStudy) => setProject({ ...project, caseStudy })} onLoadProject={(loadedProject) => { setProject(loadedProject); setReferenceLoaded(false); }} />;
      case "about": return <AboutPage />;
    }
  };

  return <div className="app-shell">
    <Sidebar activeSection={section} onNavigate={setSection} />
    <main className="main-content">
      <div className="topbar"><div><span className="topbar-case">{project.vessel.caseName || "Projeto sem nome"}</span><span className="topbar-divider" /> <span>unidades SI</span></div><div className="topbar-actions"><button className="ghost-button" onClick={loadReference}><FlaskConical size={15} /> Exercício de referência</button><button className="ghost-button" onClick={clearProject}><RefreshCcw size={15} /> Novo projeto</button>{calculation.results.length ? <button className="ghost-button" onClick={exportCsv}><FileDown size={15} /> Exportar CSV</button> : null}</div></div>
      {calculation.error ? <aside className="calculation-error"><AlertTriangle size={18} /><div><strong>Dados incompletos ou inválidos</strong><p>{calculation.error}</p></div></aside> : null}
      {renderPage()}
    </main>
  </div>;
}
