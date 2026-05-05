import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Wand2, Settings } from "lucide-react";
import TemplatesTab from "@/components/lex-pilot/TemplatesTab";
import GerarDocumentosTab from "@/components/lex-pilot/GerarDocumentosTab";
import ConfiguracoesTab from "@/components/lex-pilot/ConfiguracoesTab";

export default function LexPilot() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Lex Pilot</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Preenchimento automático de documentos jurídicos
        </p>
      </div>

      <Tabs defaultValue="modelos" className="space-y-4">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="modelos" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Documentos Modelo
          </TabsTrigger>
          <TabsTrigger value="gerar" className="gap-1.5">
            <Wand2 className="h-3.5 w-3.5" /> Gerar Documentos
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modelos"><TemplatesTab /></TabsContent>
        <TabsContent value="gerar"><GerarDocumentosTab /></TabsContent>
        <TabsContent value="config"><ConfiguracoesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
