import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator } from "lucide-react";
import { HistoricoCalculos } from "@/components/calculadora/shared/HistoricoCalculos";
import { CorrecaoMonetariaForm } from "@/components/calculadora/civel/CorrecaoMonetariaForm";
import { CumprimentoSentencaForm } from "@/components/calculadora/civel/CumprimentoSentencaForm";
import { PrecatorioForm } from "@/components/calculadora/civel/PrecatorioForm";
import { RescisaoForm } from "@/components/calculadora/trabalhista/RescisaoForm";
import { HorasExtrasForm } from "@/components/calculadora/trabalhista/HorasExtrasForm";
import { LiquidacaoSentencaForm } from "@/components/calculadora/trabalhista/LiquidacaoSentencaForm";
import { DosimetriaForm } from "@/components/calculadora/penal/DosimetriaForm";
import { ProgressaoForm } from "@/components/calculadora/penal/ProgressaoForm";
import { PresscricaoForm } from "@/components/calculadora/penal/PresscricaoForm";
import { HaveresForm } from "@/components/calculadora/empresarial/HaveresForm";
import { AmortizacaoForm } from "@/components/calculadora/empresarial/AmortizacaoForm";
import { LucrosCessantesForm } from "@/components/calculadora/empresarial/LucrosCessantesForm";
import { FalenciaRateioForm } from "@/components/calculadora/empresarial/FalenciaRateioForm";
import { SimplesNacionalForm } from "@/components/calculadora/tributario/SimplesNacionalForm";
import { IcmsForm } from "@/components/calculadora/tributario/IcmsForm";
import { PisCofinsForm } from "@/components/calculadora/tributario/PisCofinsForm";
import { IrpjCsllForm } from "@/components/calculadora/tributario/IrpjCsllForm";
import { OutrosTributosForm } from "@/components/calculadora/tributario/OutrosTributosForm";
import { HonorariosContratuaisForm } from "@/components/calculadora/honorarios/HonorariosContratuaisForm";
import { HonorariosSucumbenciaisForm } from "@/components/calculadora/honorarios/HonorariosSucumbenciaisForm";
import { HonorariosAlimentosForm } from "@/components/calculadora/honorarios/HonorariosAlimentosForm";
import { IndicesBanner } from "@/components/calculadora/shared/IndicesBanner";

export default function Calculadora() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calculadora Jurídica</h1>
          <p className="text-sm text-muted-foreground">
            Cálculos jurídicos precisos para todas as áreas do direito
          </p>
        </div>
      </div>

      <IndicesBanner />

      <Tabs defaultValue="civel" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="trabalhista">Trabalhista</TabsTrigger>
          <TabsTrigger value="civel">Cível</TabsTrigger>
          <TabsTrigger value="penal">Penal</TabsTrigger>
          <TabsTrigger value="empresarial">Empresarial</TabsTrigger>
          <TabsTrigger value="tributario">Tributário</TabsTrigger>
          <TabsTrigger value="honorarios">Honorários</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="trabalhista" className="mt-6">
          <Tabs defaultValue="rescisao">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="rescisao">Rescisão</TabsTrigger>
              <TabsTrigger value="horasextras">Horas Extras</TabsTrigger>
              <TabsTrigger value="liquidacao">Liquidação de Sentença</TabsTrigger>
            </TabsList>
            <TabsContent value="rescisao">
              <RescisaoForm />
            </TabsContent>
            <TabsContent value="horasextras">
              <HorasExtrasForm />
            </TabsContent>
            <TabsContent value="liquidacao">
              <LiquidacaoSentencaForm />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="civel" className="mt-6">
          <Tabs defaultValue="correcao">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="correcao">Correção Monetária</TabsTrigger>
              <TabsTrigger value="cumprimento">Cumprimento de Sentença</TabsTrigger>
              <TabsTrigger value="precatorio">Precatório / RPV</TabsTrigger>
            </TabsList>
            <TabsContent value="correcao">
              <CorrecaoMonetariaForm />
            </TabsContent>
            <TabsContent value="cumprimento">
              <CumprimentoSentencaForm />
            </TabsContent>
            <TabsContent value="precatorio">
              <PrecatorioForm />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="penal" className="mt-6">
          <Tabs defaultValue="dosimetria">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="dosimetria">Dosimetria</TabsTrigger>
              <TabsTrigger value="progressao">Progressão de Regime</TabsTrigger>
              <TabsTrigger value="prescricao">Prescrição</TabsTrigger>
            </TabsList>
            <TabsContent value="dosimetria">
              <DosimetriaForm />
            </TabsContent>
            <TabsContent value="progressao">
              <ProgressaoForm />
            </TabsContent>
            <TabsContent value="prescricao">
              <PresscricaoForm />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="empresarial" className="mt-6">
          <Tabs defaultValue="haveres">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="haveres">Apuração de Haveres</TabsTrigger>
              <TabsTrigger value="amortizacao">Price / SAC</TabsTrigger>
              <TabsTrigger value="lucros">Lucros Cessantes</TabsTrigger>
              <TabsTrigger value="falencia">Falência</TabsTrigger>
            </TabsList>
            <TabsContent value="haveres">
              <HaveresForm />
            </TabsContent>
            <TabsContent value="amortizacao">
              <AmortizacaoForm />
            </TabsContent>
            <TabsContent value="lucros">
              <LucrosCessantesForm />
            </TabsContent>
            <TabsContent value="falencia">
              <FalenciaRateioForm />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="tributario" className="mt-6">
          <Tabs defaultValue="simples">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="simples">Simples Nacional</TabsTrigger>
              <TabsTrigger value="icms">ICMS</TabsTrigger>
              <TabsTrigger value="piscofins">PIS/COFINS</TabsTrigger>
              <TabsTrigger value="irpj">IRPJ/CSLL</TabsTrigger>
              <TabsTrigger value="outros">Outros</TabsTrigger>
            </TabsList>
            <TabsContent value="simples">
              <SimplesNacionalForm />
            </TabsContent>
            <TabsContent value="icms">
              <IcmsForm />
            </TabsContent>
            <TabsContent value="piscofins">
              <PisCofinsForm />
            </TabsContent>
            <TabsContent value="irpj">
              <IrpjCsllForm />
            </TabsContent>
            <TabsContent value="outros">
              <OutrosTributosForm />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="honorarios" className="mt-6">
          <Tabs defaultValue="contratuais">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="contratuais">Contratuais</TabsTrigger>
              <TabsTrigger value="sucumbenciais">Sucumbenciais</TabsTrigger>
              <TabsTrigger value="alimentos">Alimentos</TabsTrigger>
            </TabsList>
            <TabsContent value="contratuais">
              <HonorariosContratuaisForm />
            </TabsContent>
            <TabsContent value="sucumbenciais">
              <HonorariosSucumbenciaisForm />
            </TabsContent>
            <TabsContent value="alimentos">
              <HonorariosAlimentosForm />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <HistoricoCalculos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
