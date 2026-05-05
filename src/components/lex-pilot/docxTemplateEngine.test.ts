import { describe, it, expect } from "vitest";
import PizZip from "pizzip";
import { applyMappingsToDocx, generateFromDocxTemplate } from "./docxTemplateEngine";

interface VariableMapping {
  find: string;
  replace: string;
}

function createTestDocx(text: string): ArrayBuffer {
  const zip = new PizZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`
  );

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text}</w:t></w:r></w:p>
  </w:body>
</w:document>`
  );

  const buf = zip.generate({ type: "arraybuffer" });
  return buf;
}

function createFragmentedDocx(): ArrayBuffer {
  const zip = new PizZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`
  );

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Contrato de João </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>da Silva</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`
  );

  return zip.generate({ type: "arraybuffer" });
}

function readDocxXml(docxBinary: ArrayBuffer): string {
  const zip = new PizZip(docxBinary);
  return zip.file("word/document.xml")!.asText();
}

describe("applyMappingsToDocx", () => {
  it("replaces text with variable placeholders in docx XML", () => {
    const docx = createTestDocx("Contrato de João da Silva");
    const mappings: VariableMapping[] = [
      { find: "João da Silva", replace: "{NOME}" },
    ];

    const result = applyMappingsToDocx(docx, mappings);
    const xml = readDocxXml(result);

    expect(xml).toContain("{NOME}");
    expect(xml).not.toContain("João da Silva");
  });

  it("returns original docx when mappings is empty", () => {
    const docx = createTestDocx("Contrato de João da Silva");
    const mappings: VariableMapping[] = [];

    const result = applyMappingsToDocx(docx, mappings);
    const xml = readDocxXml(result);

    expect(xml).toContain("Contrato de João da Silva");
  });

  it("replaces all occurrences of the same text", () => {
    const docx = createTestDocx("João apareceu e João falou");
    const mappings: VariableMapping[] = [
      { find: "João", replace: "{NOME}" },
    ];

    const result = applyMappingsToDocx(docx, mappings);
    const xml = readDocxXml(result);

    expect(xml).toContain("{NOME} apareceu e {NOME} falou");
    expect(xml).not.toContain("João");
  });

  it("handles text split across multiple runs (fragmented XML)", () => {
    const docx = createFragmentedDocx();
    const mappings: VariableMapping[] = [
      { find: "João da Silva", replace: "{NOME}" },
    ];

    const result = applyMappingsToDocx(docx, mappings);
    const xml = readDocxXml(result);

    expect(xml).toContain("{NOME}");
    expect(xml).not.toContain("João da Silva");
    expect(xml).toContain("Contrato de {NOME}");
  });
});

describe("generateFromDocxTemplate", () => {
  it("replaces placeholders with client data", () => {
    const docx = createTestDocx("Eu, {NOME}, portador do CPF {CPF}");
    const data = { NOME: "Maria Souza", CPF: "123.456.789-00" };

    const result = generateFromDocxTemplate(docx, data);
    const xml = readDocxXml(result);

    expect(xml).toContain("Maria Souza");
    expect(xml).toContain("123.456.789-00");
    expect(xml).not.toContain("{NOME}");
    expect(xml).not.toContain("{CPF}");
  });

  it("leaves unknown placeholders as-is", () => {
    const docx = createTestDocx("Nome: {NOME}, Endereço: {ENDERECO}");
    const data = { NOME: "Carlos Lima" };

    const result = generateFromDocxTemplate(docx, data);
    const xml = readDocxXml(result);

    expect(xml).toContain("Carlos Lima");
    expect(xml).toContain("{ENDERECO}");
  });
});
