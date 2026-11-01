import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

import {
  formatCurrency,
  formatMcLaneNumber,
  type ComputedItem,
} from "@/lib/order-utils"

export interface OrderPdfLine extends ComputedItem {
  finalToOrder: number
  lineTotal: number
}

interface OrderPdfInput {
  guestCount: number
  lines: OrderPdfLine[]
  total: number
}

interface TypeSection {
  type: string
  lines: OrderPdfLine[]
  cases: number
  spend: number
}

// Letter landscape, in points. Column widths add up to the printable width
// so every type section lines up down the page.
const MARGIN = 36
const COLUMN_WIDTHS = [56, 214, 164, 80, 56, 64, 86]
const COLUMN_COUNT = COLUMN_WIDTHS.length

const INK: [number, number, number] = [31, 41, 55]
const MUTED: [number, number, number] = [107, 114, 128]
const HEADING_FILL: [number, number, number] = [55, 65, 81]
const COLUMN_FILL: [number, number, number] = [229, 231, 235]
const SUBTOTAL_FILL: [number, number, number] = [243, 244, 246]
const LINE: [number, number, number] = [209, 213, 219]
const WHITE: [number, number, number] = [255, 255, 255]

const RIGHT = { halign: "right" } as const

function typeLabel(type: string) {
  const label = type.trim()
  return label ? label[0].toUpperCase() + label.slice(1) : "Other"
}

function buildSections(lines: OrderPdfLine[]): TypeSection[] {
  const byType = new Map<string, OrderPdfLine[]>()

  for (const line of lines) {
    const type = typeLabel(line.type)
    byType.set(type, [...(byType.get(type) ?? []), line])
  }

  return Array.from(byType.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, typeLines]) => ({
      type,
      lines: [...typeLines].sort(
        (a, b) =>
          a.location.localeCompare(b.location) || a.name.localeCompare(b.name),
      ),
      cases: typeLines.reduce((sum, line) => sum + line.finalToOrder, 0),
      spend: typeLines.reduce((sum, line) => sum + line.lineTotal, 0),
    }))
}

function lineRow(line: OrderPdfLine) {
  return [
    formatMcLaneNumber(line.vendorItemNumber),
    line.name,
    line.preferredName,
    line.location.trim() || "Unassigned",
    line.usagePerGuest > 0 ? line.par.toFixed(2) : "Manual",
    line.finalToOrder.toLocaleString(),
    line.price > 0 ? formatCurrency(line.lineTotal) : "-",
  ]
}

function drawHeader(doc: jsPDF, input: OrderPdfInput, orderDate: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const cases = input.lines.reduce((sum, line) => sum + line.finalToOrder, 0)

  doc.setTextColor(...INK)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text("Order Sheet", MARGIN, 48)

  doc.setTextColor(...MUTED)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(
    `${orderDate}  |  ${input.guestCount.toLocaleString()} guests  |  ${input.lines.length} items  |  ${cases.toLocaleString()} cases`,
    MARGIN,
    64,
  )

  doc.setFontSize(9)
  doc.text("TOTAL SPEND", pageWidth - MARGIN, 36, { align: "right" })

  doc.setTextColor(...INK)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(formatCurrency(input.total), pageWidth - MARGIN, 56, {
    align: "right",
  })
}

function lastTableBottom(doc: jsPDF) {
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY
}

function drawSection(doc: jsPDF, section: TypeSection, startY: number) {
  autoTable(doc, {
    startY,
    margin: { top: MARGIN, right: MARGIN, bottom: 44, left: MARGIN },
    tableWidth: COLUMN_WIDTHS.reduce((sum, width) => sum + width, 0),
    theme: "plain",
    showHead: "everyPage",
    showFoot: "lastPage",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: INK,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      lineColor: LINE,
      overflow: "linebreak",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: COLUMN_WIDTHS[0] },
      1: { cellWidth: COLUMN_WIDTHS[1] },
      2: { cellWidth: COLUMN_WIDTHS[2] },
      3: { cellWidth: COLUMN_WIDTHS[3] },
      4: { cellWidth: COLUMN_WIDTHS[4], ...RIGHT },
      5: { cellWidth: COLUMN_WIDTHS[5], ...RIGHT, fontStyle: "bold" },
      6: { cellWidth: COLUMN_WIDTHS[6], ...RIGHT },
    },
    head: [
      [
        {
          content: section.type,
          colSpan: COLUMN_COUNT,
          styles: {
            fillColor: HEADING_FILL,
            textColor: WHITE,
            fontStyle: "bold",
            fontSize: 10,
          },
        },
      ],
      [
        "Item #",
        "Name",
        "Preferred Name",
        "Location",
        { content: "Par", styles: RIGHT },
        { content: "Order Qty", styles: RIGHT },
        { content: "Amount", styles: RIGHT },
      ].map((cell) => ({
        ...(typeof cell === "string" ? { content: cell } : cell),
        styles: {
          ...(typeof cell === "string" ? {} : cell.styles),
          fillColor: COLUMN_FILL,
          fontStyle: "bold" as const,
          fontSize: 8,
        },
      })),
    ],
    body: section.lines.map(lineRow),
    foot: [
      [
        {
          content: `${section.type} subtotal`,
          colSpan: COLUMN_COUNT - 2,
          styles: RIGHT,
        },
        {
          content: section.cases.toLocaleString(),
          styles: RIGHT,
        },
        {
          content: formatCurrency(section.spend),
          styles: RIGHT,
        },
      ],
    ],
    footStyles: {
      fillColor: SUBTOTAL_FILL,
      textColor: INK,
      fontStyle: "bold",
      lineWidth: { top: 0.75 },
    },
    bodyStyles: { lineWidth: { bottom: 0.25 } },
  })
}

function drawSpendByType(
  doc: jsPDF,
  sections: TypeSection[],
  total: number,
  startY: number,
) {
  const tableWidth = 300
  const pageWidth = doc.internal.pageSize.getWidth()

  autoTable(doc, {
    startY,
    margin: {
      top: MARGIN,
      right: MARGIN,
      bottom: 44,
      left: pageWidth - MARGIN - tableWidth,
    },
    tableWidth,
    theme: "plain",
    pageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      textColor: INK,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      lineColor: LINE,
    },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 70, ...RIGHT },
      2: { cellWidth: 90, ...RIGHT },
    },
    head: [
      [
        {
          content: "Spend by type",
          colSpan: 3,
          styles: {
            fillColor: HEADING_FILL,
            textColor: WHITE,
            fontStyle: "bold",
            fontSize: 10,
          },
        },
      ],
    ],
    body: sections.map((section) => [
      section.type,
      `${section.cases.toLocaleString()} cs`,
      formatCurrency(section.spend),
    ]),
    foot: [
      [
        { content: "Total spend", colSpan: 2 },
        { content: formatCurrency(total), styles: RIGHT },
      ],
    ],
    footStyles: {
      fillColor: SUBTOTAL_FILL,
      textColor: INK,
      fontStyle: "bold",
      fontSize: 11,
      lineWidth: { top: 0.75 },
    },
    bodyStyles: { lineWidth: { bottom: 0.25 } },
  })
}

function drawPageNumbers(doc: jsPDF, orderDate: string) {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.text(`Order Sheet - ${orderDate}`, MARGIN, pageHeight - 24)
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 24, {
      align: "right",
    })
  }
}

/** Build the printable order sheet: one table per item type, then spend by type and the total. */
export function createOrderPdf(input: OrderPdfInput, date = new Date()) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "letter",
  })
  const orderDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const sections = buildSections(input.lines)

  doc.setProperties({ title: `Order Sheet - ${orderDate}` })
  drawHeader(doc, input, orderDate)

  let nextY = 82
  for (const section of sections) {
    drawSection(doc, section, nextY)
    nextY = lastTableBottom(doc) + 16
  }

  drawSpendByType(doc, sections, input.total, nextY)
  drawPageNumbers(doc, orderDate)

  return doc
}

/**
 * Phones get the share sheet, which is where Print lives and which also works
 * from a home-screen app. Everything else gets a normal file download.
 */
export async function downloadOrderPdf(
  input: OrderPdfInput,
  date = new Date(),
) {
  const fileDate = date.toLocaleDateString("en-CA")
  const fileName = `order-${fileDate}-${input.guestCount}-guests.pdf`
  const doc = createOrderPdf(input, date)
  const file = new File([doc.output("blob")], fileName, {
    type: "application/pdf",
  })

  if (
    window.matchMedia("(pointer: coarse)").matches &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (error) {
      // Closing the share sheet isn't a failure. Anything else falls back to saving.
      if (error instanceof DOMException && error.name === "AbortError") return
    }
  }

  doc.save(fileName)
}
