import {
  AreaChart,
  BarChart3,
  BookOpen,
  Calculator,
  ClipboardCheck,
  FileInput,
  FlaskConical,
  Gauge,
  Info,
  LayoutDashboard,
  Scale,
} from "lucide-react";

import type { AppSection } from "../types/app.ts";

const navigation: Array<{ id: AppSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Painel", icon: LayoutDashboard },
  { id: "input", label: "Embarcação", icon: FileInput },
  { id: "experiments", label: "Ensaios", icon: FlaskConical },
  { id: "results", label: "Resultados", icon: Calculator },
  { id: "memory", label: "Memória de cálculo", icon: BookOpen },
  { id: "charts", label: "Gráficos", icon: AreaChart },
  { id: "comparison", label: "Comparação", icon: BarChart3 },
  { id: "validation", label: "Validação", icon: ClipboardCheck },
  { id: "case-study", label: "Estudo de caso", icon: Scale },
  { id: "about", label: "Metodologia", icon: Info },
];

interface SidebarProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
}

export function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Gauge size={22} /></div>
        <div><strong>HydroScale</strong><span>engenharia naval</span></div>
      </div>
      <nav aria-label="Navegação principal">
        <p className="nav-label">Espaço de trabalho</p>
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={activeSection === id ? "nav-link active" : "nav-link"}
            onClick={() => onNavigate(id)}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <span className="status-dot" /> Motor matemático validado
      </div>
    </aside>
  );
}
