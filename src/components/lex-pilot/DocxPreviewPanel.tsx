import { useRef, useEffect, useCallback, useState } from "react";
import { renderAsync } from "docx-preview";

interface Props {
  docxData: ArrayBuffer | null;
  onTextSelected: (text: string) => void;
  mappings: Array<{ find: string; replace: string }>;
}

export default function DocxPreviewPanel({ docxData, onTextSelected, mappings }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const highlightMappedText = useCallback(() => {
    if (!containerRef.current) return;
    // Remove existing highlights
    containerRef.current.querySelectorAll(".lex-mapped-var").forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.getAttribute("data-original") || ""), el);
        parent.normalize();
      }
    });

    // Apply highlights for each mapping
    for (const mapping of mappings) {
      highlightTextInContainer(containerRef.current, mapping.find, mapping.replace);
    }
  }, [mappings]);

  // Render docx when data changes
  useEffect(() => {
    if (!docxData || !containerRef.current) return;
    setLoading(true);
    renderAsync(docxData, containerRef.current, undefined, {
      className: "docx-preview-container",
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
    })
      .then(() => highlightMappedText())
      .finally(() => setLoading(false));
  }, [docxData, highlightMappedText]);

  // Re-highlight when mappings change
  useEffect(() => {
    highlightMappedText();
  }, [highlightMappedText]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (text.length > 0) {
      onTextSelected(text);
    }
  }, [onTextSelected]);

  return (
    <div className="relative border rounded-lg bg-white overflow-auto max-h-[70vh]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="docx-preview-wrapper p-4 min-h-[400px]"
      />
    </div>
  );
}

/**
 * Finds and highlights text in the rendered preview DOM.
 * Wraps matched text in a styled span with the variable name.
 */
function highlightTextInContainer(container: HTMLElement, findText: string, replaceVar: string) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const nodesToReplace: { node: Text; index: number }[] = [];

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const idx = node.textContent?.indexOf(findText) ?? -1;
    if (idx !== -1) {
      nodesToReplace.push({ node, index: idx });
    }
  }

  // Process in reverse to avoid invalidating indices
  for (let i = nodesToReplace.length - 1; i >= 0; i--) {
    const { node: textNode, index } = nodesToReplace[i];
    const before = textNode.textContent!.substring(0, index);
    const after = textNode.textContent!.substring(index + findText.length);

    const span = document.createElement("span");
    span.className = "lex-mapped-var";
    span.setAttribute("data-original", findText);
    span.textContent = replaceVar;
    span.style.cssText =
      "background: #dbeafe; color: #1d4ed8; padding: 1px 4px; border-radius: 3px; font-weight: 600; font-size: 0.85em;";

    const parent = textNode.parentNode!;
    if (after) parent.insertBefore(document.createTextNode(after), textNode.nextSibling);
    parent.insertBefore(span, textNode.nextSibling);
    textNode.textContent = before;
  }
}
