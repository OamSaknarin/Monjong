import { toPng } from 'html-to-image';
import domToImage from 'dom-to-image-more';
import jsPDF from 'jspdf';

export interface ExportPdfOptions {
  container: HTMLElement;
  filename: string;
  isLandscape?: boolean;
  onProgress?: (isGenerating: boolean) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Capture an HTMLElement to PNG Data URL using html-to-image (with dom-to-image-more fallback)
 * Completely avoids html2canvas modern CSS color parser crashes (oklab, oklch, etc.)
 */
export async function captureElementToPng(element: HTMLElement): Promise<string> {
  try {
    return await toPng(element, {
      quality: 0.98,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
        boxShadow: 'none',
        border: 'none',
        margin: '0 auto'
      }
    });
  } catch (err1) {
    console.warn('html-to-image capture failed, trying dom-to-image-more fallback:', err1);
    try {
      return await domToImage.toPng(element, {
        bgcolor: '#ffffff',
        quality: 1,
        style: {
          boxShadow: 'none',
          border: 'none',
          margin: '0 auto'
        }
      });
    } catch (err2) {
      console.error('dom-to-image also failed:', err2);
      throw err2;
    }
  }
}

/**
 * Converts modern CSS color functions (oklch, oklab, lab, lch, light-dark) in CSS strings
 * to browser-supported rgb()/rgba() strings.
 */
export function replaceModernColorsWithRgb(cssText: string): string {
  if (!cssText) return cssText;
  if (!/(oklch|oklab|lab|lch|light-dark)/i.test(cssText)) return cssText;

  return cssText.replace(/(oklch|oklab|lab|lch|light-dark)\(([^)]+)\)/gi, (match) => {
    try {
      const temp = document.createElement('div');
      temp.style.color = match;
      document.body.appendChild(temp);
      const computed = getComputedStyle(temp).color;
      document.body.removeChild(temp);

      if (computed && computed !== match && !/(oklch|oklab|lab|lch)/i.test(computed)) {
        return computed;
      }
    } catch {
      // Fallback
    }

    if (match.includes('/')) {
      const parts = match.split('/');
      const alpha = parseFloat(parts[parts.length - 1]) || 1;
      return `rgba(100, 116, 139, ${alpha})`;
    }
    return 'rgb(100, 116, 139)';
  });
}

export function replaceOklchWithRgb(cssText: string): string {
  return replaceModernColorsWithRgb(cssText);
}

export const sanitizeColorsForHtml2Canvas = (clonedDoc: Document) => {
  const styles = Array.from(clonedDoc.querySelectorAll('style'));
  styles.forEach((style) => {
    if (style.textContent && /(oklch|oklab|lab|lch|light-dark)/i.test(style.textContent)) {
      style.textContent = replaceModernColorsWithRgb(style.textContent);
    }
  });

  const allElements = Array.from(clonedDoc.querySelectorAll<HTMLElement>('*'));
  allElements.forEach((el) => {
    const styleAttr = el.getAttribute('style');
    if (styleAttr && /(oklch|oklab|lab|lch|light-dark)/i.test(styleAttr)) {
      el.setAttribute('style', replaceModernColorsWithRgb(styleAttr));
    }
  });
};

export const sanitizeOklchForHtml2Canvas = sanitizeColorsForHtml2Canvas;

/**
 * Print elements with 100% exact preview styles
 * Copies all compiled Tailwind CSS, fonts, SVG styles, and custom rules
 */
/**
 * Print elements with 100% exact preview styles
 * Uses an isolated hidden iframe with form value synchronization,
 * complete stylesheet injection, transform normalization, and automatic PDF fallback.
 */
/**
 * Print elements directly in the browser without downloading any files
 * Renders high-resolution exact preview sheets into an isolated print iframe
 */
export const printElement = async (
  container: HTMLElement,
  title: string,
  isLandscape: boolean = false,
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
): Promise<boolean> => {
  if (!container) return false;

  try {
    // 1. Gather all document stylesheets, fonts, and inline styles
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    let sheets = Array.from(container.querySelectorAll<HTMLElement>('.a4-sheet'));
    if (sheets.length === 0) {
      sheets = [container];
    }

    const clonedContent = sheets.map((sheet) => {
      const clone = sheet.cloneNode(true) as HTMLElement;
      clone.style.margin = '0 auto';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.transform = 'none';
      return `<div class="print-page-wrapper">${clone.outerHTML}</div>`;
    }).join('\n');

    // Remove any previous print iframe
    const existingIframe = document.getElementById('hidden-print-iframe');
    if (existingIframe) existingIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'hidden-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = '0px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      throw new Error('Cannot access print iframe document');
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title || 'พิมพ์เอกสาร'}</title>
  ${styles}
  <style>
    @page {
      size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
      margin: 6mm 8mm;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print-page-wrapper {
        page-break-after: always !important;
        break-after: page !important;
        width: 100% !important;
        min-height: auto !important;
        display: block !important;
        box-sizing: border-box !important;
        padding: 0 !important;
        margin: 0 auto !important;
      }
      .print-page-wrapper:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      .a4-sheet {
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        width: 100% !important;
        max-width: ${isLandscape ? '297mm' : '210mm'} !important;
      }
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: 'Sarabun', 'Prompt', system-ui, -apple-system, sans-serif;
    }
    .print-page-wrapper {
      page-break-after: always;
      break-after: page;
      display: block;
      margin: 0 auto;
    }
    .print-page-wrapper:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .a4-sheet {
      box-shadow: none !important;
      border: none !important;
    }
  </style>
</head>
<body>
  ${clonedContent}
</body>
</html>`;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Trigger instant print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        if (showToast) {
          showToast('เปิดหน้าต่างสั่งพิมพ์แล้ว', 'success');
        }
      } catch (errPrint) {
        console.warn('Iframe print error, falling back to window.print():', errPrint);
        window.print();
      }
    }, 50);

    setTimeout(() => {
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (e) {
        // ignore
      }
    }, 60000);

    return true;
  } catch (err) {
    console.error('printElement error, using direct print fallback:', err);
    try {
      window.print();
      if (showToast) {
        showToast('เปิดหน้าต่างสั่งพิมพ์แล้ว', 'success');
      }
      return true;
    } catch (e2) {
      if (showToast) {
        showToast('ไม่สามารถเปิดหน้าต่างสั่งพิมพ์ได้', 'error');
      }
      return false;
    }
  }
};

export interface ExportImageOptions {
  container: HTMLElement;
  filename: string;
  format?: 'png' | 'jpeg';
  onProgress?: (isGenerating: boolean) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Normalizes zoom and CSS transformations on container during capture to ensure
 * pixel-perfect 1:1 render matching exact A4 dimensions without zoom distortion.
 */
async function withNormalizedContainer<T>(container: HTMLElement, fn: () => Promise<T>): Promise<T> {
  const originalZoom = container.style.zoom;
  const originalTransform = container.style.transform;
  const originalTransition = container.style.transition;

  try {
    container.style.zoom = '1';
    container.style.transform = 'none';
    container.style.transition = 'none';

    // Allow browser reflow
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));

    return await fn();
  } finally {
    container.style.zoom = originalZoom;
    container.style.transform = originalTransform;
    container.style.transition = originalTransition;
  }
}

/**
 * Generate and download PDF that matches preview 100% without distortion or squishing
 */
export const downloadPdfFromContainer = async ({
  container,
  filename,
  isLandscape = false,
  onProgress,
  showToast
}: ExportPdfOptions) => {
  if (!container) return;
  if (onProgress) onProgress(true);

  try {
    await withNormalizedContainer(container, async () => {
      let sheets = Array.from(container.querySelectorAll<HTMLElement>('.a4-sheet'));
      if (sheets.length === 0) {
        sheets = [container];
      }

      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;

      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        const imgData = await captureElementToPng(sheet);

        if (i > 0) {
          pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
        }

        // Measure true image natural dimensions to preserve exact aspect ratio without stretching
        const img = new Image();
        img.src = imgData;
        await new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });

        const imgWidth = img.naturalWidth || sheet.offsetWidth || 1;
        const imgHeight = img.naturalHeight || sheet.offsetHeight || 1;
        const imgRatio = imgWidth / imgHeight;
        const pageRatio = pageWidth / pageHeight;

        let renderWidth = pageWidth;
        let renderHeight = pageHeight;
        let offsetX = 0;
        let offsetY = 0;

        // If aspect ratio difference is negligible (< 3%), fill entire page
        if (Math.abs(imgRatio - pageRatio) < 0.03) {
          renderWidth = pageWidth;
          renderHeight = pageHeight;
          offsetX = 0;
          offsetY = 0;
        } else if (imgRatio > pageRatio) {
          // Wider than page: fit width, scale height proportionately
          renderWidth = pageWidth;
          renderHeight = pageWidth / imgRatio;
          offsetY = (pageHeight - renderHeight) / 2;
        } else {
          // Taller than page: fit height, scale width proportionately
          renderHeight = pageHeight;
          renderWidth = pageHeight * imgRatio;
          offsetX = (pageWidth - renderWidth) / 2;
        }

        pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');
      }

      pdf.save(filename);
      if (showToast) showToast('สร้างและดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว', 'success');
    });
  } catch (err) {
    console.error('Error generating PDF:', err);
    if (showToast) showToast('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF', 'error');
  } finally {
    if (onProgress) onProgress(false);
  }
};

/**
 * Generate and download high-resolution PNG image from container sheets
 */
export const downloadImageFromContainer = async ({
  container,
  filename,
  format = 'png',
  onProgress,
  showToast
}: ExportImageOptions) => {
  if (!container) return;
  if (onProgress) onProgress(true);

  try {
    await withNormalizedContainer(container, async () => {
      let sheets = Array.from(container.querySelectorAll<HTMLElement>('.a4-sheet'));
      if (sheets.length === 0) {
        sheets = [container];
      }

      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        const imgData = await captureElementToPng(sheet);

        const link = document.createElement('a');
        const pageSuffix = sheets.length > 1 ? `_หน้า${i + 1}` : '';
        const baseName = filename.replace(/\.(png|jpe?g)$/i, '');
        link.download = `${baseName}${pageSuffix}.${format}`;
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (i < sheets.length - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      if (showToast) showToast('ส่งออกและดาวน์โหลดรูปภาพเรียบร้อยแล้ว', 'success');
    });
  } catch (err) {
    console.error('Error generating Image:', err);
    if (showToast) showToast('เกิดข้อผิดพลาดในการส่งออกรูปภาพ', 'error');
  } finally {
    if (onProgress) onProgress(false);
  }
};

