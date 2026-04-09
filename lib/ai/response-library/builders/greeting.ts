import { CoreIntent } from "@/lib/ai/core-engine/types";

type GreetingInput = {
  intent: CoreIntent;
  userName?: string;
  latestMessage: string;
  userTurnCount: number;
};

const GREETINGS: Record<CoreIntent, { firstTurn: string[]; ongoing: string[] }> = {
  institucional_comercial: {
    firstTurn: [
      "Ola, seja bem-vindo a Identiq.",
      "Prazer em falar com voce. A Identiq esta pronta para fortalecer sua operacao com mais seguranca e inteligencia.",
      "E um prazer atender voce. Vamos estruturar a melhor abordagem para sua jornada de validacao e prevencao a fraudes.",
    ],
    ongoing: [
      "Perfeito, seguimos nesta frente.",
      "Excelente, vamos aprofundar esse ponto.",
      "Otimo, organizo isso de forma objetiva para voce.",
    ],
  },
  faq_comercial: {
    firstTurn: [
      "Ola, seja bem-vindo a Identiq.",
      "Prazer em falar com voce. Vamos direto ao que voce precisa sobre nossa solucao.",
    ],
    ongoing: [
      "Perfeito, vamos por partes.",
      "Claro, aqui vai de forma objetiva.",
    ],
  },
  suporte_operacional: {
    firstTurn: [
      "Ola. Vamos resolver isso juntos de forma objetiva.",
      "Recebi seu contexto. Vou te guiar com um passo a passo tecnico.",
    ],
    ongoing: [
      "Certo, avancando no diagnostico.",
      "Entendi. Vamos para a proxima validacao.",
    ],
  },
  integracoes_api: {
    firstTurn: [
      "Ola. Vamos estruturar sua integracao API com clareza tecnica.",
      "Perfeito, te explico a implementacao com foco em autenticacao, payload e observabilidade.",
    ],
    ongoing: [
      "Vamos aprofundar na camada tecnica.",
      "Perfeito, detalho essa etapa de integracao.",
    ],
  },
  onboarding_kyc: {
    firstTurn: [
      "Ola. Vamos organizar seu fluxo de onboarding e KYC com seguranca e consistencia.",
      "Prazer em atender voce. Vou te orientar por etapas para manter evidencia e rastreabilidade.",
    ],
    ongoing: [
      "Perfeito, avancando no fluxo.",
      "Certo, vamos tratar essa etapa com objetividade.",
    ],
  },
  aml_compliance: {
    firstTurn: [
      "Ola. Este e um tema sensivel e vou te orientar com cautela tecnica.",
      "Perfeito, vamos tratar esse ponto de AML/compliance com criterio e governanca.",
    ],
    ongoing: [
      "Entendido. Mantendo abordagem cautelosa.",
      "Perfeito, sigo com orientacao tecnica responsavel.",
    ],
  },
  handoff_humano: {
    firstTurn: [
      "Entendido. Vou conduzir sua transferencia com continuidade e contexto.",
      "Perfeito, vou envolver um especialista humano para te atender com prioridade.",
    ],
    ongoing: [
      "Certo, ja estou encaminhando para o especialista.",
      "Perfeito, preparando o handoff com os pontos essenciais.",
    ],
  },
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function pickDeterministic(items: string[], salt: string) {
  if (!items.length) {
    return "";
  }

  const hash = normalizeText(salt)
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return items[hash % items.length];
}

export function buildGreeting(input: GreetingInput) {
  const pool = GREETINGS[input.intent] ?? GREETINGS.faq_comercial;
  const isFirstTurn = input.userTurnCount <= 1;
  const baseGreeting = pickDeterministic(
    isFirstTurn ? pool.firstTurn : pool.ongoing,
    `${input.intent}:${input.latestMessage}:${input.userTurnCount}`
  );

  if (!input.userName || input.intent === "suporte_operacional" || input.intent === "integracoes_api") {
    return baseGreeting;
  }

  return `${baseGreeting} ${input.userName}.`; 
}