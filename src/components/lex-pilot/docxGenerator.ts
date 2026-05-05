import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Header, ImageRun,
} from "docx";
import type { LexClient, LexOfficeSettings } from "./types";
import { formatCpf } from "@/lib/formatters";

export function replaceVariables(html: string, client: LexClient): string {
  const today = new Date();
  const todayExtended = today.toLocaleDateString("pt-BR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const todayNumeric = today.toLocaleDateString("pt-BR");

  const endereco = [client.rua, client.numero, client.complemento, client.bairro, client.cidade, client.estado]
    .filter(Boolean).join(", ");

  const rg = [client.rg, client.rg_emissor, client.rg_uf].filter(Boolean).join(" / ");

  const cpfFormatted = client.cpf ? formatCpf(client.cpf) : (client.cnpj || "");

  const qualificacao = [
    client.nome_completo,
    client.nacionalidade || "brasileiro(a)",
    client.estado_civil,
    client.profissao,
    `portador(a) do CPF nº ${cpfFormatted}`,
    rg ? `e RG nº ${rg}` : null,
    `residente e domiciliado(a) em ${endereco}`,
  ].filter(Boolean).join(", ");

  const assinatura = `<br/><br/>____________________________<br/>${client.nome_completo}`;

  const replacements: Record<string, string> = {
    "{{NOME}}": client.nome_completo,
    "{{CPF}}": cpfFormatted,
    "{{RG}}": rg || "",
    "{{DATA_NASCIMENTO}}": client.data_nascimento
      ? new Date(client.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR")
      : "",
    "{{ESTADO_CIVIL}}": client.estado_civil || "",
    "{{PROFISSAO}}": client.profissao || "",
    "{{NACIONALIDADE}}": client.nacionalidade || "",
    "{{EMAIL}}": client.email || "",
    "{{TELEFONE}}": client.telefone || "",
    "{{ENDERECO_COMPLETO}}": endereco,
    "{{CIDADE}}": client.cidade || "",
    "{{ESTADO}}": client.estado || "",
    "{{DATA_HOJE}}": todayExtended,
    "{{DATA_HOJE_NUMERICA}}": todayNumeric,
    "{{CAMPO_ASSINATURA}}": assinatura,
    "{{QUALIFICACAO_COMPLETA}}": qualificacao,
  };

  let result = html;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value);
  }
  return result;
}

// HTML -> DOCX conversion
export async function generateDocx(
  html: string,
  settings: LexOfficeSettings | null
): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const children = parseNodes(doc.body);

  // Build header
  const headerChildren: Paragraph[] = [];
  if (settings) {
    if (settings.nome_escritorio) {
      headerChildren.push(
        new Paragraph({
          children: [new TextRun({ text: settings.nome_escritorio, bold: true, size: 24 })],
          alignment: AlignmentType.CENTER,
        })
      );
    }
    const subParts = [settings.oab, settings.endereco, settings.telefone, settings.email, settings.site]
      .filter(Boolean);
    if (subParts.length > 0) {
      headerChildren.push(
        new Paragraph({
          children: [new TextRun({ text: subParts.join(" | "), size: 16, color: "666666" })],
          alignment: AlignmentType.CENTER,
        })
      );
    }
    headerChildren.push(new Paragraph({ children: [] })); // spacer
  }

  const document = new Document({
    sections: [
      {
        headers: headerChildren.length > 0
          ? { default: new Header({ children: headerChildren }) }
          : undefined,
        children,
      },
    ],
  });

  return await Packer.toBlob(document);
}

function parseNodes(parent: Element): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text })] }));
      }
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "br") {
      paragraphs.push(new Paragraph({ children: [] }));
      continue;
    }

    if (tag.match(/^h[1-6]$/)) {
      const level = parseInt(tag[1]);
      const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };
      paragraphs.push(
        new Paragraph({
          heading: headingMap[level],
          children: extractRuns(el),
          alignment: getAlignment(el),
        })
      );
      continue;
    }

    if (tag === "p") {
      paragraphs.push(
        new Paragraph({
          children: extractRuns(el),
          alignment: getAlignment(el),
        })
      );
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const items = el.querySelectorAll(":scope > li");
      items.forEach((li, idx) => {
        paragraphs.push(
          new Paragraph({
            children: extractRuns(li as HTMLElement),
            bullet: tag === "ul" ? { level: 0 } : undefined,
            numbering: tag === "ol" ? { reference: "default-numbering", level: 0 } : undefined,
          })
        );
      });
      continue;
    }

    // Fallback: treat as paragraph
    if (el.textContent?.trim()) {
      paragraphs.push(new Paragraph({ children: extractRuns(el) }));
    }
  }

  return paragraphs;
}

function extractRuns(el: Element): TextRun[] {
  const runs: TextRun[] = [];

  function walk(node: Node, styles: { bold?: boolean; italic?: boolean; underline?: boolean }) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (!text) return;
      runs.push(
        new TextRun({
          text,
          bold: styles.bold,
          italics: styles.italic,
          underline: styles.underline ? {} : undefined,
        })
      );
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const child = node as HTMLElement;
    const tag = child.tagName.toLowerCase();

    const newStyles = { ...styles };
    if (tag === "strong" || tag === "b") newStyles.bold = true;
    if (tag === "em" || tag === "i") newStyles.italic = true;
    if (tag === "u") newStyles.underline = true;

    for (const c of Array.from(child.childNodes)) {
      walk(c, newStyles);
    }
  }

  for (const child of Array.from(el.childNodes)) {
    walk(child, {});
  }

  return runs;
}

function getAlignment(el: Element): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const style = (el as HTMLElement).style?.textAlign;
  switch (style) {
    case "center": return AlignmentType.CENTER;
    case "right": return AlignmentType.RIGHT;
    case "justify": return AlignmentType.JUSTIFIED;
    default: return undefined;
  }
}

/**
 * Builds a key→value map of client data for use with docxtemplater.
 * Keys are variable names WITHOUT braces (e.g., "NOME", "CPF").
 */
export function buildClientDataMap(client: LexClient): Record<string, string> {
  const today = new Date();
  const cpfFormatted = client.cpf ? formatCpf(client.cpf) : (client.cnpj || "");
  const endereco = [client.rua, client.numero, client.complemento, client.bairro, client.cidade, client.estado]
    .filter(Boolean).join(", ");
  const rg = [client.rg, client.rg_emissor, client.rg_uf].filter(Boolean).join(" / ");

  return {
    NOME: client.nome_completo,
    CPF: cpfFormatted,
    RG: rg || "",
    DATA_NASCIMENTO: client.data_nascimento
      ? new Date(client.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR")
      : "",
    ESTADO_CIVIL: client.estado_civil || "",
    PROFISSAO: client.profissao || "",
    NACIONALIDADE: client.nacionalidade || "",
    EMAIL: client.email || "",
    TELEFONE: client.telefone || "",
    ENDERECO_COMPLETO: endereco,
    CIDADE: client.cidade || "",
    ESTADO: client.estado || "",
    DATA_HOJE: today.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }),
    DATA_HOJE_NUMERICA: today.toLocaleDateString("pt-BR"),
    CAMPO_ASSINATURA: `____________________________\n${client.nome_completo}`,
    QUALIFICACAO_COMPLETA: [
      client.nome_completo,
      client.nacionalidade || "brasileiro(a)",
      client.estado_civil,
      client.profissao,
      `portador(a) do CPF nº ${cpfFormatted}`,
      rg ? `e RG nº ${rg}` : null,
      `residente e domiciliado(a) em ${endereco}`,
    ].filter(Boolean).join(", "),
  };
}
