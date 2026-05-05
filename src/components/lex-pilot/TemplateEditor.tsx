import { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Heading1, Heading2,
  ArrowLeft, Save, Loader2, Plus,
} from "lucide-react";
import { VARIABLE_LIST, CATEGORIAS } from "./types";
import type { LexTemplate } from "./types";

// Variable highlight extension
function findVariables(doc: any) {
  const decorations: any[] = [];
  doc.descendants((node: any, pos: number) => {
    if (node.isText && node.text) {
      const regex = /\{\{[^}]+\}\}/g;
      let match;
      while ((match = regex.exec(node.text)) !== null) {
        decorations.push(
          Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
            class: "lex-variable",
          })
        );
      }
    }
  });
  return DecorationSet.create(doc, decorations);
}

const VariableHighlight = Extension.create({
  name: "variableHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("variableHighlight"),
        state: {
          init(_, { doc }) { return findVariables(doc); },
          apply(tr, old) { return tr.docChanged ? findVariables(tr.doc) : old; },
        },
        props: {
          decorations(state) { return this.getState(state); },
        },
      }),
    ];
  },
});

interface Props {
  template: LexTemplate | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function TemplateEditor({ template, onSaved, onCancel }: Props) {
  const isEdit = !!template;
  const { user } = useAuth();
  const [nome, setNome] = useState(template?.nome || "");
  const [categoria, setCategoria] = useState(template?.categoria || "Outros");
  const [customVar, setCustomVar] = useState("");
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      VariableHighlight,
    ],
    content: template?.conteudo || "<p></p>",
    editorProps: {
      attributes: {
        class: "min-h-[400px] outline-none px-4 py-3 text-sm leading-relaxed",
      },
    },
  });

  const insertVariable = useCallback((varKey: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(varKey).run();
  }, [editor]);

  const insertCustomVariable = () => {
    if (!customVar.trim()) return;
    const key = `{{${customVar.trim().toUpperCase().replace(/\s+/g, "_")}}}`;
    insertVariable(key);
    setCustomVar("");
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Nome do documento é obrigatório");
      return;
    }
    if (!editor) return;
    setSaving(true);
    const conteudo = editor.getHTML();
    const payload = { nome, categoria, conteudo, updated_at: new Date().toISOString() };

    if (isEdit) {
      const { error } = await supabase
        .from("lex_templates" as any)
        .update(payload)
        .eq("id", template!.id);
      if (error) toast.error("Erro ao salvar modelo");
      else { toast.success("Modelo salvo"); onSaved(); }
    } else {
      const { error } = await supabase
        .from("lex_templates" as any)
        .insert({ ...payload, user_id: user?.id });
      if (error) toast.error("Erro ao criar modelo");
      else { toast.success("Modelo criado"); onSaved(); }
    }
    setSaving(false);
  };

  if (!editor) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>

      {/* Name & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Nome do documento</Label>
          <Input className="notion-input mt-1" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Contrato de Honorários" />
        </div>
        <div>
          <Label>Categoria</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Editor + Variables Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Editor */}
        <div className="border rounded-lg bg-card overflow-hidden lex-editor">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
            <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
              <AlignJustify className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </div>
          <EditorContent editor={editor} />
        </div>

        {/* Variables panel */}
        <div className="border rounded-lg bg-card p-4 space-y-3 h-fit">
          <h3 className="text-sm font-semibold">Variáveis</h3>
          <p className="text-xs text-muted-foreground">Clique para inserir no texto</p>
          <div className="space-y-1">
            {VARIABLE_LIST.map((v) => (
              <button
                key={v.key}
                onClick={() => insertVariable(v.key)}
                className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors group"
              >
                <span className="lex-variable text-[11px]">{v.key}</span>
                <span className="block text-muted-foreground mt-0.5 text-[10px]">{v.label}</span>
              </button>
            ))}
          </div>
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-medium">Variável personalizada</p>
            <div className="flex gap-1">
              <Input
                value={customVar}
                onChange={(e) => setCustomVar(e.target.value)}
                placeholder="VALOR_CAUSA"
                className="h-7 text-xs"
                onKeyDown={(e) => e.key === "Enter" && insertCustomVariable()}
              />
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={insertCustomVariable}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
