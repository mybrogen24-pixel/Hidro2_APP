import { jsPDF } from "jspdf";

import type { CaseStudyInfo } from "../types/app.ts";
import type { ExtrapolationResult, PrototypeGeometry, VesselInput } from "../types/hydrodynamics.ts";
import { captureChartPngs } from "./charts.ts";

function addLine(doc: jsPDF, text: string, y: number): number {
  const lines = doc.splitTextToSize(text, 174);
  doc.text(lines, 18, y);
  return y + lines.length * 5.5;
}

export async function exportPdfReport(
  vessel: VesselInput,
  geometry: PrototypeGeometry | null,
  results: readonly ExtrapolationResult[],
  caseStudy: CaseStudyInfo,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(6, 24, 42);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("HydroScale", 18, 15);
  doc.setFontSize(9);
  doc.text("Relatório de extrapolação hidrodinâmica modelo-protótipo", 18, 23);
  doc.setTextColor(20, 38, 51);
  let y = 44;
  doc.setFontSize(13);
  doc.text(vessel.caseName || "Estudo hidrodinâmico", 18, y);
  y += 8;
  doc.setFontSize(9);
  y = addLine(doc, `Gerado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date())}. Cálculos internos executados em SI, sem arredondamentos intermediários.`, y);
  y += 5;
  doc.setFontSize(11);
  doc.text("Dados de entrada", 18, y);
  y += 7;
  doc.setFontSize(9);
  y = addLine(doc, `Lm = ${vessel.modelLength} m | Sm = ${vessel.modelWettedArea} m² | λ = ${vessel.scale} | k = ${vessel.formFactor} | g = ${vessel.gravity} m/s²`, y);
  y = addLine(doc, `ρm = ${vessel.modelDensity} kg/m³ | νm = ${vessel.modelKinematicViscosity} m²/s | ρp = ${vessel.prototypeDensity} kg/m³ | νp = ${vessel.prototypeKinematicViscosity} m²/s`, y);
  if (geometry) y = addLine(doc, `Lp = ${geometry.prototypeLength} m (${geometry.prototypeLengthSource === "scaled" ? "por escala" : "informado"}) | Sp = ${geometry.prototypeWettedArea} m² (${geometry.prototypeWettedAreaSource === "scaled" ? "por escala" : "informada"})`, y);
  y += 5;
  doc.setFontSize(11);
  doc.text("Resultados", 18, y);
  y += 7;
  doc.setFontSize(8);
  results.forEach((result, index) => {
    if (y > 270) { doc.addPage(); y = 20; }
    y = addLine(doc, `Ensaio ${index + 1}: Vm=${result.Vm} m/s, RTm=${result.RTm} N, Fr=${result.Fr.toPrecision(7)}, Vp=${result.Vp.toPrecision(7)} m/s, Ctₘ=${result.CtModel.toExponential(6)}, Ctₚ Froude=${result.CtPrototypeFroude.toExponential(6)}, Ctₚ Hughes=${result.CtPrototypeHughes.toExponential(6)}, RT Froude=${(result.resistanceFroudeN / 1000).toFixed(3)} kN, RT Hughes=${(result.resistanceHughesN / 1000).toFixed(3)} kN, PE Froude=${(result.powerFroudeW / 1000).toFixed(3)} kW, PE Hughes=${(result.powerHughesW / 1000).toFixed(3)} kW.`, y);
  });
  y += 4;
  if (y > 265) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.text("Métodos", 18, y);
  y += 7;
  doc.setFontSize(9);
  y = addLine(doc, "Froude: Ct = Cf + Cr, Cr,p = Cr,m. Hughes: Ct = (1+k)Cf + Cw, Cw,p = Cw,m. Cf é calculado pela linha ITTC-1957 com log10(Re).", y);
  if (caseStudy.source || caseStudy.authors || caseStudy.year || caseStudy.notes) {
    y += 5;
    doc.setFontSize(11);
    doc.text("Registro do estudo de caso", 18, y);
    y += 7;
    doc.setFontSize(9);
    y = addLine(doc, `Fonte: ${caseStudy.source || "não informada"}. Autores: ${caseStudy.authors || "não informados"}. Ano: ${caseStudy.year || "não informado"}.`, y);
    addLine(doc, `Observações: ${caseStudy.notes || "nenhuma"}.`, y);
  }
  const chartPngs = await captureChartPngs();
  if (chartPngs.length) {
    chartPngs.forEach((chart, index) => {
      doc.addPage();
      doc.setFontSize(12);
      doc.text(`Gráfico ${index + 1}`, 18, 18);
      doc.addImage(chart, "PNG", 18, 26, 174, 130);
    });
  }
  doc.save("hydroscale-relatorio.pdf");
}
