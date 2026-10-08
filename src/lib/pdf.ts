/**
 * Branded PDF generator for Auditify reports.
 * Aesthetics: Paper (#F7F3EA), Ink (#1C1915), Vermilion (#C93A1B).
 * Design language: "Report card, not dashboard."
 */

import { jsPDF } from "jspdf";

export type PDFReportData = {
  host: string;
  url: string;
  score: number;
  grade: string;
  checksRun: number;
  scannedAt?: string;
  summary: { pass: number; warn: number; fail: number };
  issues: Array<{
    id: string;
    title: string;
    severity: "FAIL" | "WARN";
    metric: string;
    detail: string;
    fix: string;
  }>;
  // Agency white-label (optional)
  agencyName?: string;
  agencyColor?: string; // hex like "#C93A1B"
};

// Colors (RGB)
const COLOR_PAPER = [247, 243, 234] as const; // #F7F3EA
const COLOR_SURFACE = [255, 255, 255] as const;
const COLOR_INK = [28, 25, 21] as const; // #1C1915
const COLOR_INK_MUTED = [74, 68, 60] as const; // #4A443C
const COLOR_LINE = [229, 223, 208] as const; // #E5DFD0
const COLOR_LINE_STRONG = [211, 202, 180] as const; // #D3CAB4
const COLOR_VERMILION = [201, 58, 27] as const; // #C93A1B
const COLOR_WARN = [148, 97, 23] as const; // #946117
const COLOR_PASS = [46, 125, 79] as const; // #2E7D4F

export function createAuditifyPDF(report: PDFReportData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Agency white-label: use custom brand color and name if provided
  const brandName = report.agencyName?.trim() || "Auditify";
  const brandColor: readonly [number, number, number] = (() => {
    const hex = report.agencyColor?.trim();
    if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) {
      return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      ] as const;
    }
    return COLOR_VERMILION;
  })();

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174mm

  let currentPage = 1;

  function paintPageBackground() {
    doc.setFillColor(COLOR_PAPER[0], COLOR_PAPER[1], COLOR_PAPER[2]);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Top paper edge border rule (agency brand color)
    doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setLineWidth(1.2);
    doc.line(margin, 8, pageWidth - margin, 8);
  }

  function renderPageFooter() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLOR_INK_MUTED[0], COLOR_INK_MUTED[1], COLOR_INK_MUTED[2]);
    doc.text(
      `${brandName} · Official Web Audit Report · ${report.host}`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `Page ${currentPage}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" }
    );
  }

  paintPageBackground();

  let y = 20;

  // Header Eyebrow
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.text("AUDITIFY CONFIDENTIAL REPORT", margin, y);
  y += 6;

  // Title & Host
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
  doc.text("Website Inspection Report", margin, y);
  y += 6;

  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLOR_INK_MUTED[0], COLOR_INK_MUTED[1], COLOR_INK_MUTED[2]);
  const dateStr = report.scannedAt
    ? new Date(report.scannedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  doc.text(`Target: https://${report.host}   |   Date: ${dateStr}`, margin, y);
  y += 8;

  // Scorecard Banner Box
  const cardHeight = 36;
  doc.setFillColor(COLOR_SURFACE[0], COLOR_SURFACE[1], COLOR_SURFACE[2]);
  doc.setDrawColor(COLOR_LINE_STRONG[0], COLOR_LINE_STRONG[1], COLOR_LINE_STRONG[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 3, 3, "FD");

  // Big Score number
  doc.setFont("times", "bold");
  doc.setFontSize(44);
  doc.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
  doc.text(`${report.score}`, margin + 8, y + 25);

  doc.setFont("courier", "normal");
  doc.setFontSize(12);
  doc.setTextColor(COLOR_INK_MUTED[0], COLOR_INK_MUTED[1], COLOR_INK_MUTED[2]);
  doc.text("/100", margin + 42, y + 24);

  // Grade Stamp
  const stampX = margin + 65;
  const stampY = y + 8;
  doc.setFillColor(COLOR_PAPER[0], COLOR_PAPER[1], COLOR_PAPER[2]);
  doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setLineWidth(1);
  doc.roundedRect(stampX, stampY, 26, 20, 2, 2, "FD");

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.text(report.grade, stampX + 13, stampY + 14, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("GRADE", stampX + 13, stampY + 6, { align: "center" });

  // Summary Pill breakdown on right
  const rightX = margin + 104;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
  doc.text("CHECKS SUMMARY", rightX, y + 10);

  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.setTextColor(COLOR_PASS[0], COLOR_PASS[1], COLOR_PASS[2]);
  doc.text(`[✓] ${report.summary.pass} PASS`, rightX, y + 18);

  doc.setTextColor(COLOR_WARN[0], COLOR_WARN[1], COLOR_WARN[2]);
  doc.text(`[!] ${report.summary.warn} WARN`, rightX, y + 25);

  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.text(`[✗] ${report.summary.fail} FAIL`, rightX, y + 32);

  y += cardHeight + 10;

  // Section Header: Detailed Findings
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
  doc.text(`Actionable Findings (${report.issues.length} detected)`, margin, y);
  y += 3;

  doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  // Issues loop
  for (let idx = 0; idx < report.issues.length; idx++) {
    const issue = report.issues[idx];

    // Estimate box height
    const isFail = issue.severity === "FAIL";
    const detailLines = doc.splitTextToSize(issue.detail, contentWidth - 16);
    const fixLines = doc.splitTextToSize(issue.fix, contentWidth - 26);
    const estimatedHeight = 24 + detailLines.length * 4.2 + fixLines.length * 4.2;

    // Check page overflow
    if (y + estimatedHeight > pageHeight - 16) {
      renderPageFooter();
      doc.addPage();
      currentPage++;
      paintPageBackground();
      y = 18;
    }

    // Issue card
    doc.setFillColor(COLOR_SURFACE[0], COLOR_SURFACE[1], COLOR_SURFACE[2]);
    doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth, estimatedHeight, 2, 2, "FD");

    // Severity badge
    const badgeColor = isFail ? COLOR_VERMILION : COLOR_WARN;
    doc.setFillColor(
      isFail ? 254 : 255,
      isFail ? 242 : 249,
      isFail ? 239 : 235
    );
    doc.setDrawColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin + 4, y + 4, 15, 6, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    doc.text(issue.severity, margin + 11.5, y + 8.2, { align: "center" });

    // Issue title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
    doc.text(issue.title, margin + 22, y + 8.5);

    // Metric tag
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_INK_MUTED[0], COLOR_INK_MUTED[1], COLOR_INK_MUTED[2]);
    doc.text(issue.metric, margin + contentWidth - 5, y + 8.5, { align: "right" });

    // Detail text
    let textY = y + 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_INK_MUTED[0], COLOR_INK_MUTED[1], COLOR_INK_MUTED[2]);
    doc.text(detailLines, margin + 6, textY);
    textY += detailLines.length * 4.2 + 2;

    // Actionable fix banner
    doc.setFillColor(COLOR_PAPER[0], COLOR_PAPER[1], COLOR_PAPER[2]);
    doc.setDrawColor(COLOR_LINE_STRONG[0], COLOR_LINE_STRONG[1], COLOR_LINE_STRONG[2]);
    doc.setLineWidth(0.3);
    const fixBoxHeight = fixLines.length * 4.2 + 4;
    doc.roundedRect(margin + 6, textY, contentWidth - 12, fixBoxHeight, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
    doc.text("The Fix:", margin + 9, textY + 3.8);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
    doc.text(fixLines, margin + 23, textY + 3.8);

    y += estimatedHeight + 4;
  }

  renderPageFooter();
  return doc;
}

export function downloadReportPDF(report: PDFReportData, filename?: string): void {
  const doc = createAuditifyPDF(report);
  const name = filename || `auditify-${report.host}-report.pdf`;
  doc.save(name);
}
