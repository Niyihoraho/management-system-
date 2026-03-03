import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Generate a high-resolution PDF from a rendered HTML container element.
 *
 * The container should have child elements marked with `data-pdf-page`
 * attribute. Each marked element becomes a separate page in the PDF.
 * If no `data-pdf-page` children are found, the entire container is
 * captured as a single page.
 *
 * Uses scale=4 and PNG for maximum clarity (comparable to Puppeteer output).
 *
 * @param container - The HTML element containing the rendered report
 * @param filename  - The output filename (e.g. "report-2026.pdf")
 */
export async function generatePdf(
    container: HTMLElement,
    filename: string = "report.pdf"
): Promise<void> {
    // A4 dimensions in mm
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;

    // Scale factor: higher = sharper output
    const SCALE = 4;

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    // Find all page sections
    const pages = container.querySelectorAll<HTMLElement>("[data-pdf-page]");
    const elements = pages.length > 0 ? Array.from(pages) : [container];

    let isFirstPage = true;

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];

        const canvas = await html2canvas(el, {
            scale: SCALE,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
            width: el.scrollWidth,
            height: el.scrollHeight,
            windowWidth: el.scrollWidth,
            imageTimeout: 15000,
        });

        // Skip empty/tiny canvases
        if (canvas.height < 10) continue;

        // Use PNG for lossless, crisp quality
        const imgData = canvas.toDataURL("image/png");

        // Calculate dimensions to fit A4 width, preserving aspect ratio
        const canvasAspect = canvas.height / canvas.width;
        const pageWidth = A4_WIDTH_MM;
        const pageHeight = pageWidth * canvasAspect;

        if (!isFirstPage) {
            pdf.addPage();
        }
        isFirstPage = false;

        // If content fits in one page, just place it
        if (pageHeight <= A4_HEIGHT_MM) {
            pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
        } else {
            // Content taller than one A4 page — split across pages
            // But only add extra pages if there's meaningful content remaining
            const totalSlices = Math.ceil(pageHeight / A4_HEIGHT_MM);

            for (let p = 0; p < totalSlices; p++) {
                if (p > 0) {
                    // Only add next page if remaining content is more than 5mm
                    const remainingHeight = pageHeight - (p * A4_HEIGHT_MM);
                    if (remainingHeight < 5) break;
                    pdf.addPage();
                }

                const yOffset = -(p * A4_HEIGHT_MM);
                pdf.addImage(imgData, "PNG", 0, yOffset, pageWidth, pageHeight);
            }
        }
    }

    pdf.save(filename);
}
