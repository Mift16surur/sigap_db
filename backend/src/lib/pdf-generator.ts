/**
 * SIGAP App — Standalone PDF Document Generator (PDF 1.4 ISO Compliant)
 * Menghasilkan berkas binary PDF rekam medis obstetri murni berbasis vektor & teks asli
 * tanpa ketergantungan library eksternal (Zero external dependencies).
 */

export interface PdfTextOptions {
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  color?: [number, number, number]; // RGB 0.0 - 1.0
  align?: "left" | "center" | "right";
  width?: number;
}

export interface PdfRectOptions {
  fillColor?: [number, number, number];
  strokeColor?: [number, number, number];
  lineWidth?: number;
}

export class SimplePdfDocument {
  pages: { commands: string[] }[] = [];
  pageWidth = 595.28;  // A4 standard width (pt)
  pageHeight = 841.89; // A4 standard height (pt)
  margin = 36;         // 0.5 inch (36 pt)
  contentWidth: number;
  currentY: number;

  constructor() {
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.currentY = this.margin;
    this.addPage();
  }

  addPage() {
    this.pages.push({ commands: [] });
    this.currentY = this.margin;
  }

  get currentPage() {
    return this.pages[this.pages.length - 1];
  }

  // Konversi Y dari titik atas (0 = top margin) ke sistem koordinat PDF (0 = bottom)
  py(yFromTop: number) {
    return this.pageHeight - yFromTop;
  }

  escapeText(str: string) {
    if (!str) return "";
    return String(str)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[\r\n]+/g, " ");
  }

  checkPageBreak(neededHeight: number) {
    if (this.currentY + neededHeight > this.pageHeight - this.margin - 25) {
      this.addPage();
    }
  }

  drawRect(x: number, yFromTop: number, width: number, height: number, options: PdfRectOptions = {}) {
    const y = this.py(yFromTop + height);
    const cmds: string[] = [];
    if (options.fillColor) {
      const [r, g, b] = options.fillColor;
      cmds.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    }
    if (options.strokeColor) {
      const [r, g, b] = options.strokeColor;
      cmds.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
    }
    if (options.lineWidth !== undefined) {
      cmds.push(`${options.lineWidth.toFixed(2)} w`);
    }
    cmds.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`);

    if (options.fillColor && options.strokeColor) {
      cmds.push("B");
    } else if (options.fillColor) {
      cmds.push("f");
    } else {
      cmds.push("S");
    }
    this.currentPage.commands.push(cmds.join(" "));
  }

  drawLine(x1: number, y1FromTop: number, x2: number, y2FromTop: number, options: PdfRectOptions = {}) {
    const y1 = this.py(y1FromTop);
    const y2 = this.py(y2FromTop);
    const cmds: string[] = [];
    if (options.strokeColor) {
      const [r, g, b] = options.strokeColor;
      cmds.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
    }
    if (options.lineWidth !== undefined) {
      cmds.push(`${options.lineWidth.toFixed(2)} w`);
    }
    cmds.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    this.currentPage.commands.push(cmds.join(" "));
  }

  drawText(text: string, x: number, yFromTop: number, options: PdfTextOptions = {}) {
    const fontSize = options.fontSize || 9.5;
    const font = options.bold ? "/F2" : options.italic ? "/F3" : "/F1";
    const y = this.py(yFromTop);
    const escaped = this.escapeText(text);

    let drawX = x;
    // Estimasi sederhana rata tengah / kanan jika lebar ditentukan
    if (options.width && options.align === "center") {
      const estTextWidth = escaped.length * (fontSize * 0.52);
      drawX = x + Math.max(0, (options.width - estTextWidth) / 2);
    } else if (options.width && options.align === "right") {
      const estTextWidth = escaped.length * (fontSize * 0.52);
      drawX = x + Math.max(0, options.width - estTextWidth);
    }

    const cmds: string[] = [];
    if (options.color) {
      const [r, g, b] = options.color;
      cmds.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    } else {
      cmds.push("0.05 0.05 0.05 rg");
    }
    cmds.push(`BT ${font} ${fontSize.toFixed(2)} Tf ${drawX.toFixed(2)} ${y.toFixed(2)} Td (${escaped}) Tj ET`);
    this.currentPage.commands.push(cmds.join(" "));
  }

  // Draw wrapped paragraph
  drawWrappedText(text: string, x: number, yFromTop: number, maxWidth: number, options: PdfTextOptions = {}) {
    const fontSize = options.fontSize || 9;
    const lineHeight = fontSize * 1.35;
    const approxCharWidth = fontSize * 0.52;
    const maxCharsPerLine = Math.max(15, Math.floor(maxWidth / approxCharWidth));

    const words = (text || "").split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const w of words) {
      if ((currentLine + (currentLine ? " " : "") + w).length <= maxCharsPerLine) {
        currentLine += (currentLine ? " " : "") + w;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);

    let currentY = yFromTop;
    for (const line of lines) {
      this.drawText(line, x, currentY, options);
      currentY += lineHeight;
    }
    return currentY - yFromTop; // return total height consumed
  }

  // Gambar Header Seksi Berwarna Biru SIGAP
  drawSectionHeader(title: string, stepNumber: string) {
    this.checkPageBreak(38);
    const height = 22;
    const y = this.currentY;

    // Background header seksi biru muda
    this.drawRect(this.margin, y, this.contentWidth, height, {
      fillColor: [0.93, 0.96, 1.0], // blue-50
      strokeColor: [0.55, 0.73, 0.98], // blue-300
      lineWidth: 1,
    });

    // Lingkaran nomor
    this.drawRect(this.margin + 4, y + 3, 16, 16, {
      fillColor: [0.14, 0.34, 0.84], // blue-600
      strokeColor: [0.14, 0.34, 0.84],
    });
    this.drawText(stepNumber, this.margin + 9, y + 14, {
      fontSize: 9,
      bold: true,
      color: [1, 1, 1],
    });

    // Judul
    this.drawText(title, this.margin + 26, y + 14.5, {
      fontSize: 10,
      bold: true,
      color: [0.11, 0.25, 0.65], // blue-800
    });

    this.currentY += height + 4;
  }

  // Draw 2-column or 4-column key-value grid
  drawField(label: string, value: string, x: number, y: number, width: number, isBoldValue = false) {
    this.drawText(label, x, y, { fontSize: 7.5, color: [0.45, 0.5, 0.55] });
    this.drawText(value || "-", x, y + 10.5, {
      fontSize: 8.5,
      bold: isBoldValue,
      color: isBoldValue ? [0.1, 0.1, 0.15] : [0.2, 0.2, 0.25],
    });
  }

  toBuffer(): Buffer {
    // Tambahkan footer halaman (Nomor Hal & Catatan SIGAP)
    const totalPages = this.pages.length;
    this.pages.forEach((page, idx) => {
      const pageNumStr = `Halaman ${idx + 1} dari ${totalPages}`;
      const footerY = this.pageHeight - 20;

      // Garis footer
      const yLine = this.py(this.pageHeight - 28);
      page.commands.push(`0.8 0.85 0.9 RG 0.5 w ${this.margin} ${yLine.toFixed(2)} m ${(this.pageWidth - this.margin).toFixed(2)} ${yLine.toFixed(2)} l S`);

      // Teks footer
      const yText = this.py(footerY);
      page.commands.push(`BT /F1 7.5 Tf 0.5 0.55 0.6 rg ${this.margin} ${yText.toFixed(2)} Td (SIGAP App - Sistem Pendukung Keputusan Klinis Obstetri Terpadu) Tj ET`);
      page.commands.push(`BT /F1 7.5 Tf 0.5 0.55 0.6 rg ${(this.pageWidth - this.margin - 80).toFixed(2)} ${yText.toFixed(2)} Td (${pageNumStr}) Tj ET`);
    });

    const objects: string[] = [];
    const addObject = (content: string) => {
      objects.push(content);
      return objects.length;
    };

    // 1: Catalog
    addObject("<< /Type /Catalog /Pages 2 0 R >>");

    // 2: Placeholder for Pages
    addObject("");

    // 3, 4, 5: Fonts
    const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const fontItalicId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>");

    const pageObjIds: number[] = [];

    this.pages.forEach((page) => {
      const streamContent = page.commands.join("\n");
      const streamLen = Buffer.byteLength(streamContent, "utf8");
      const streamObj = `<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream`;
      const streamObjId = addObject(streamObj);

      const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents ${streamObjId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontItalicId} 0 R >> >> >>`;
      const pageObjId = addObject(pageObj);
      pageObjIds.push(pageObjId);
    });

    // Update Pages object (id 2)
    const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(" ");
    objects[1] = `<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjIds.length} >>`;

    // Serialize to PDF byte buffer
    let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets: number[] = [];

    for (let i = 0; i < objects.length; i++) {
      const objId = i + 1;
      offsets.push(Buffer.byteLength(output, "latin1"));
      output += `${objId} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(output, "latin1");
    output += `xref\n0 ${objects.length + 1}\n`;
    output += "0000000000 65535 f \n";
    for (let i = 0; i < offsets.length; i++) {
      const offsetStr = String(offsets[i]).padStart(10, "0");
      output += `${offsetStr} 00000 n \n`;
    }

    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    output += `startxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(output, "latin1");
  }
}
