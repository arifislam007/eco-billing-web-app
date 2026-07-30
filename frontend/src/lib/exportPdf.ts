import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";

/** Renders a DOM node to a canvas and drops it into a single-page PDF sized
 * to match, then downloads it. Reuses the same capture path as "Export as
 * Image" (html-to-image) so PDF/PNG output always stay visually identical.
 * JPEG at high quality, not PNG - an uncompressed PNG of a full-page capture
 * runs 8-10MB for what should be a one-page document; JPEG brings that down
 * to a few hundred KB with no visible difference on this kind of content
 * (flat white background, text and rules - not photographic). */
export async function exportElementAsPdf(element: HTMLElement, filename: string) {
  const canvas = await toCanvas(element, { pixelRatio: 2, backgroundColor: "#ffffff" });

  const pdf = new jsPDF({
    orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
    compress: true,
  });
  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.92),
    "JPEG",
    0,
    0,
    canvas.width,
    canvas.height,
    undefined,
    "MEDIUM"
  );
  pdf.save(filename);
}
