import { GoogleGenAI, Type } from "@google/genai";
import { CopyInput, Lead, ContractInput } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async generateCopy(input: CopyInput): Promise<string> {
    const prompt = `
      Atue como um Copywriter Sênior especializado em Direct Response e Neuromarketing.
      Gere DUAS opções de mensagens de prospecção comercial altamente persuasivas, humanizadas e naturais.
      
      Dados do Contexto:
      - Remetente: ${input.userName}
      - Nicho/Mercado: ${input.niche}
      - Nome do Lead: ${input.contactName}
      - Problema/Dor do Lead: ${input.leadProblem}
      - Solução Proposta: ${input.solution}
      - Diferencial Competitivo: ${input.differential}
      - Objetivo Final: ${input.goal}
      - Tom de Voz: ${input.tone}

      Regras: 
      1. Curtas, diretas, sem clichês de vendas.
      2. Foque em iniciar uma conversa.
      3. NÃO use asteriscos (**) para negrito.
      4. Separe as duas opções com a tag exata: [DIVIDER]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 },
      },
    });

    return response.text || "Erro ao gerar copy.";
  },

  async generateContract(input: ContractInput): Promise<string> {
    const prompt = `
      Atue como um Especialista em Legal Design e Direito Civil Brasileiro.
      Gere um CONTRATO DE PRESTAÇÃO DE SERVIÇOS pronto para uso, sem ruídos.

      REGRAS CRÍTICAS DE SAÍDA:
      - NÃO use hashtags (#), emojis ou comentários meta-lingüísticos.
      - NÃO use "Markdown de título" exagerado. Use apenas CAIXA ALTA para os nomes das cláusulas.
      - NÃO inclua introduções como "Aqui está o seu contrato" ou conclusões.
      - A saída deve começar diretamente no TÍTULO DO CONTRATO.
      - Use negrito (**) APENAS para termos definidos e valores importantes.
      - O texto deve ser estritamente profissional, objetivo e sem "juridiquês" arcaico.
      - Ao final do contrato, antes das assinaturas, inclua o local e a data conforme fornecido.

      DADOS:
      - Serviço: ${input.serviceName}
      - Contratada: ${input.providerName} (ID: ${input.providerId})
      - Contratante: ${input.clientName} (ID: ${input.clientId})
      - Valor: R$ ${input.value}
      - Prazo: ${input.deadline} dias
      - Local: ${input.location}
      - Data: ${input.date}
      - Multas: ${input.delayFine ? "Mora de 2%" : "Isento"} e ${input.defaultFine ? "Rescisória de 20%" : "Isento"}
      - Extras: ${input.extraInfo || "Nenhum"}

      Estruture em CLÁUSULAS numeradas.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 },
      },
    });

    // Post-processing to ensure no hashtags remain
    let cleanText = response.text || "";
    cleanText = cleanText.replace(/#/g, '').trim();
    
    return cleanText || "Erro ao gerar a minuta do contrato.";
  },

  async searchLeads(niche: string, location: string, page: number = 1): Promise<Lead[]> {
    const prompt = `
      SDR INTELLIGENCE - PESQUISA DE MERCADO REAIS (GOOGLE SEARCH GROUNDING)
      Localização de Busca: ${location}
      Nicho/Mercado: ${niche}
      Página de Resultados: ${page}

      Instrução: Você deve atuar como um motor de busca de leads. Pesquise no Google Maps e Instagram por empresas reais.
      Retorne uma lista de 25-30 estabelecimentos únicos por página.
      
      Para cada estabelecimento, extraia obrigatoriamente:
      1. Nome oficial da empresa.
      2. Descrição curta do serviço (especialidade).
      3. Rating médio (0.0 a 5.0).
      4. URL do perfil do Instagram E o Handle (ex: @empresa).
      5. Link wa.me (WhatsApp Business) E o número formatado (ex: (11) 99999-9999).
      6. Endereço físico completo e formatado.

      Retorne APENAS um JSON válido. No inclua texto explicativo.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              instagram: { type: Type.STRING },
              instagramHandle: { type: Type.STRING },
              whatsapp: { type: Type.STRING },
              whatsappNumber: { type: Type.STRING },
              address: { type: Type.STRING },
            },
            required: ["id", "name", "address", "whatsapp", "instagram", "instagramHandle", "whatsappNumber"]
          }
        }
      }
    });

    try {
      const text = response.text || "[]";
      const jsonStr = text.includes('```json') ? text.split('```json')[1].split('```')[0] : text;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Erro no processamento dos leads:", e);
      return [];
    }
  }
};