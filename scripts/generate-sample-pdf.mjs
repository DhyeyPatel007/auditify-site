import { jsPDF } from "jspdf";
import fs from "node:fs";

// Colors (RGB)
const COLOR_PAPER = [247, 243, 234]; // #F7F3EA
const COLOR_SURFACE = [255, 255, 255];
const COLOR_INK = [28, 25, 21]; // #1C1915
const COLOR_INK_MUTED = [74, 68, 60]; // #4A443C
const COLOR_LINE = [229, 223, 208]; // #E5DFD0
const COLOR_LINE_STRONG = [211, 202, 180]; // #D3CAB4
const COLOR_VERMILION = [201, 58, 27]; // #C93A1B
const COLOR_WARN = [148, 97, 23]; // #946117
const COLOR_PASS = [46, 125, 79]; // #2E7D4F

const report = {
  host: "example.com",
  url: "https://example.com",
  score: 72,
  grade: "C",
  checksRun: 36,
  scannedAt: new Date().toISOString(),
  summary: { pass: 24, warn: 8, fail: 4 },
  issues: [
    {
      id: "perf-cls",
      title: "Cumulative Layout Shift Too High",
      severity: "FAIL",
      metric: "0.42 (poor)",
      detail:
        "Elements shifted significantly while the page was loading. Large shifts disorient users, cause accidental clicks, and harm core web vitals rankings.",
      fix: "Specify explicit width and height aspect ratios on all image, video, and iframe tags to reserve layout space before assets load.",
    },
    {
      id: "sec-csp",
      title: "Missing Content-Security-Policy Header",
      severity: "FAIL",
      metric: "header missing",
      detail:
        "The web server does not send a Content-Security-Policy (CSP) response header. Without CSP, the browser cannot defend against cross-site scripting (XSS) and malicious code injection.",
      fix: "Configure your reverse proxy, CDN, or web server to return a strict Content-Security-Policy header restricting script and object sources.",
    },
    {
      id: "perf-img",
      title: "Heavy Image Payloads Detected",
      severity: "WARN",
      metric: "2.4 MB total",
      detail:
        "Uncompressed images dominate initial page weight. On mobile 4G networks, this increases First Contentful Paint by up to 2.1 seconds.",
      fix: "Convert PNG and JPEG images to WebP/AVIF formats and configure lazy-loading (loading=\"lazy\") on images below the viewport.",
    },
    {
      id: "seo-desc",
      title: "Short Meta Description Tag",
      severity: "WARN",
      metric: "42 characters",
      detail:
        "The meta description is too brief to provide an enticing snippet in search engine results pages.",
      fix: "Expand the description to 120-155 characters summarizing the page value proposition with clear search keywords.",
    },
    {
      id: "sec-hsts",
      title: "HSTS Header Missing Max-Age Preload",
      severity: "WARN",
      metric: "partial HSTS",
      detail:
        "Strict-Transport-Security is enabled but lacks the includeSubDomains and preload directives required for HSTS browser preloading.",
      fix: "Update Strict-Transport-Security to: max-age=63072000; includeSubDomains; preload.",
    },
    {
      id: "a11y-contrast",
      title: "Muted Text Contrast In Footer Links",
      severity: "FAIL",
      metric: "3.2:1 ratio",
      detail:
        "Footer navigation elements fail WCAG 2.1 AA minimum contrast requirements (minimum 4.5:1 required for body text).",
      fix: "Darken secondary text color from #8C857A to at least #595349 against the light background.",
    },
  ],
};

const doc = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4",
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 18;
const contentWidth = pageWidth - margin * 2;
let currentPage = 1;

function paintPageBackground() {
  doc.setFillColor(COLOR_PAPER[0], COLOR_PAPER[1], COLOR_PAPER[2]);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(COLOR_VERMILION[0], COLOR_VERMILION[1], COLOR_VERMILION[2]);
  doc.setLineWidth(1.2);
  doc.line(margin, 8, pageWidth - margin, 8);
}

function renderPageFooter() {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLOR_INK_MUTED[0], COLOR_INK_MUTED[1], COLOR_INK_MUTED[2]);
  doc.text(
    `Auditify · Official Web Audit Report · ${report.host}`,
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
doc.setTextColor(COLOR_VERMILION[0], COLOR_VERMILION[1], COLOR_VERMILION[2]);
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
const dateStr = new Date(report.scannedAt).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
doc.text(`Target: ${report.url}   |   Date: ${dateStr}`, margin, y);
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
doc.setDrawColor(COLOR_VERMILION[0], COLOR_VERMILION[1], COLOR_VERMILION[2]);
doc.setLineWidth(1);
doc.roundedRect(stampX, stampY, 26, 20, 2, 2, "FD");

doc.setFont("times", "bold");
doc.setFontSize(16);
doc.setTextColor(COLOR_VERMILION[0], COLOR_VERMILION[1], COLOR_VERMILION[2]);
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

doc.setTextColor(COLOR_VERMILION[0], COLOR_VERMILION[1], COLOR_VERMILION[2]);
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
  const isFail = issue.severity === "FAIL";
  const detailLines = doc.splitTextToSize(issue.detail, contentWidth - 16);
  const fixLines = doc.splitTextToSize(issue.fix, contentWidth - 26);
  const estimatedHeight = 24 + detailLines.length * 4.2 + fixLines.length * 4.2;

  if (y + estimatedHeight > pageHeight - 16) {
    renderPageFooter();
    doc.addPage();
    currentPage++;
    paintPageBackground();
    y = 18;
  }

  doc.setFillColor(COLOR_SURFACE[0], COLOR_SURFACE[1], COLOR_SURFACE[2]);
  doc.setDrawColor(COLOR_LINE[0], COLOR_LINE[1], COLOR_LINE[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, estimatedHeight, 2, 2, "FD");

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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
  doc.text(issue.title, margin + 22, y + 8.5);

  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_INK_MUTED[0], COLOR_INK_MUTED[1], COLOR_INK_MUTED[2]);
  doc.text(issue.metric, margin + contentWidth - 5, y + 8.5, { align: "right" });

  let textY = y + 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_INK_MUTED[0], COLOR_INK_MUTED[1], COLOR_INK_MUTED[2]);
  doc.text(detailLines, margin + 6, textY);
  textY += detailLines.length * 4.2 + 2;

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

const buffer = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync("public/sample-auditify-report.pdf", buffer);
fs.writeFileSync("sample-auditify-report.pdf", buffer);
console.log("Sample PDF successfully generated (public/sample-auditify-report.pdf and sample-auditify-report.pdf)");
