import { downloadTextFile } from "./files.ts";

function svgToPng(svg: SVGSVGElement): Promise<string> {
  const rect = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(Math.ceil(rect.width)));
  clone.setAttribute("height", String(Math.ceil(rect.height)));
  const source = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(rect.width * 2));
      canvas.height = Math.max(1, Math.ceil(rect.height * 2));
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(url); reject(new Error("Canvas indisponível.")); return; }
      context.scale(2, 2);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, rect.width, rect.height);
      context.drawImage(image, 0, 0, rect.width, rect.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível converter o gráfico.")); };
    image.src = url;
  });
}

export async function captureChartPngs(): Promise<string[]> {
  const charts = Array.from(document.querySelectorAll<SVGSVGElement>(".chart-canvas svg"));
  return Promise.all(charts.map(svgToPng));
}

export async function downloadChartPngs(): Promise<void> {
  const charts = await captureChartPngs();
  charts.forEach((dataUrl, index) => {
    const [metadata, encoded] = dataUrl.split(",");
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: metadata.match(/data:(.*?);/)?.[1] ?? "image/png" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `hydroscale-grafico-${index + 1}.png`;
    link.click();
    URL.revokeObjectURL(url);
  });
  if (!charts.length) downloadTextFile("hydroscale-graficos-indisponiveis.txt", "Nenhum gráfico calculado está disponível para exportação.");
}
