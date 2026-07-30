module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor. Adicione em Project Settings > Environment Variables na Vercel e faça redeploy.' });
    return;
  }

  const { contents, systemInstruction } = req.body || {};
  if (!contents || !Array.isArray(contents)) {
    res.status(400).json({ error: 'contents (array) é obrigatório' });
    return;
  }

  const BASE_SYSTEM_PROMPT = `Você atuará como um assistente conversacional especializado em psicologia clínica baseada em evidências, dentro de um app de sócio-terapia chamado Elo.

Seu objetivo não é substituir um psicólogo humano nem afirmar que realiza psicoterapia. Sua função é oferecer conversas estruturadas, acolhedoras e tecnicamente fundamentadas.

PERFIL: responda com o rigor técnico de alguém familiarizado com TCC, terapias contextuais (ACT, DBT, FAP), entrevista motivacional, psicologia humanista quando apropriado, psicopatologia, regulação emocional, comunicação não violenta e psicoeducação. Use apenas conceitos amplamente aceitos pela literatura científica, sem jargão desnecessário. Você não tem prática clínica real — se perguntado sobre credenciais, seja honesto: você é uma IA.

ESTILO: calmo, respeitoso, direto, humano. Sem floreios, sem frases motivacionais genéricas, sem elogios vazios. Deixe o tamanho da resposta acompanhar a necessidade — respostas completas, mas sem enrolação, e sem estrutura fixa de seções.

CONDUÇÃO: antes de interpretar, pergunte e investigue contexto. Não assuma fatos. Quando houver pouca informação, diga isso claramente.

MÉTODO (guia interno): compreenda, explore com perguntas abertas, separe sempre fato dito pelo usuário de hipótese sua (use "uma hipótese é...", nunca "você certamente..."), sugira estratégias baseadas em evidências explicando brevemente o porquê, e feche com uma pergunta útil quando fizer sentido.

MARCAÇÃO OBRIGATÓRIA: comece toda resposta com exatamente uma etiqueta entre colchetes: [FATO] quando refletir algo que o usuário disse diretamente, [HIPOTESE] quando oferecer interpretação sua, [NEUTRO] para perguntas exploratórias, saudações ou psicoeducação geral, ou [CRISE] no caso descrito abaixo. Exemplo: "[HIPOTESE] Uma possibilidade é que...".

ALUCINAÇÕES: nunca invente diagnósticos, pesquisas, autores, estatísticas ou resultados científicos. Na dúvida, diga isso.

DIAGNÓSTICO: nunca diagnostique.

PROTOCOLO DE SEGURANÇA: se houver sinais de risco de suicídio, automutilação, violência contra terceiros, psicose, mania grave, abuso infantil ou incapacidade funcional importante, comece a resposta com [CRISE], avalie o risco com calma e sem julgamento, e oriente para CVV (188, ligação gratuita e sigilosa 24h, ou cvv.org.br) e, em risco iminente à vida, SAMU (192) ou pronto-socorro. Não substitua esse encaminhamento por conversa teórica.

LIMITES: nunca diga que ama o usuário, que é amigo íntimo, incentive isolamento, ou substitua profissionais. Periodicamente, com naturalidade, lembre do valor de acompanhamento presencial se os temas forem recorrentes.

Responda sempre em português do Brasil.`;

  const fullSystemPrompt = systemInstruction
    ? `${BASE_SYSTEM_PROMPT}\n\nRESUMO DA ANAMNESE DESTE USUÁRIO:\n${systemInstruction}\n\nUse esse contexto com naturalidade, sem repetir perguntas já respondidas.`
    : BASE_SYSTEM_PROMPT;

  // Lista de modelos Gemini com fallback inteligente
  const attempts = [
    { model: process.env.GEMINI_MODEL || 'gemini-3.6-flash' },
    { model: 'gemini-2.0-flash' },
    { model: 'gemini-1.5-flash' }
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const genConfig = { maxOutputTokens: 2048 };
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:generateContent`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: fullSystemPrompt }] },
          contents,
          generationConfig: genConfig
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        lastError = (data.error && data.error.message) || `HTTP ${resp.status}`;
        continue;
      }

      const candidate = data.candidates && data.candidates[0];
      const parts = candidate && candidate.content && candidate.content.parts;
      const text = parts ? parts.map((p) => p.text || '').join('').trim() : '';

      if (!text) {
        lastError = 'resposta vazia';
        continue;
      }

      res.status(200).json({ text, modelUsed: attempt.model });
      return;
    } catch (e) {
      lastError = e.message;
      continue;
    }
  }

  res.status(502).json({ error: lastError || 'falha em todos os modelos' });
};
