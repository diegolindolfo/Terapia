async function syncToGithubBackend(content) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const path = process.env.GITHUB_PATH || 'elo/registro.md';

  if (!token || !owner || !repo) {
    return null;
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  try {
    let sha = null;
    const getResp = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Elo-App-Backend'
      }
    });
    if (getResp.ok) {
      const d = await getResp.json();
      sha = d.sha;
    }

    const body = {
      message: `Atualiza registro Elo via Vercel Backend — ${new Date().toISOString()}`,
      content: Buffer.from(content, 'utf8').toString('base64')
    };
    if (sha) body.sha = sha;

    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Elo-App-Backend'
      },
      body: JSON.stringify(body)
    });

    if (putResp.ok) {
      return { success: true, path };
    } else {
      const errData = await putResp.json().catch(() => ({}));
      return { success: false, error: errData.message || `HTTP ${putResp.status}` };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'GEMINI_API_KEY não configurada no servidor. Adicione em Project Settings > Environment Variables na Vercel e faça redeploy.'
    });
    return;
  }

  const { contents, systemInstruction, markdownTranscript, stream = false } = req.body || {};
  if (!contents || !Array.isArray(contents)) {
    res.status(400).json({ error: 'contents (array) é obrigatório' });
    return;
  }

  // Janela deslizante de mensagens para conversas longas (evita estourar limite de tokens)
  let safeContents = contents;
  if (contents.length > 30) {
    const recent = contents.slice(-24);
    safeContents = recent;
  }

  const BASE_SYSTEM_PROMPT = `Você atuará como um assistente conversacional especializado em psicologia clínica baseada em evidências, dentro de um app de sócio-terapia chamado Elo.

Seu objetivo não é substituir um psicólogo humano nem afirmar que realiza psicoterapia clínica formal. Sua função é oferecer conversas estruturadas, acolhedoras, profundas e tecnicamente fundamentadas.

PERFIL: responda com o rigor técnico de quem domina Terapia Cognitivo-Comportamental (TCC), terapias contextuais de terceira onda (ACT - Aceitação e Compromisso, DBT - Terapia Dialética Comportamental, FAP), entrevista motivacional, psicologia humanista, psicopatologia, regulação emocional e comunicação não violenta (CNV). Use apenas conceitos amplamente aceitos pela literatura científica, sem jargão desnecessário. Seja transparente: você é uma inteligência artificial acolhedora e ética.

ESTILO: calmo, acolhedor, respeitoso, empático, lúcido e direto. Sem floreios excessivos, sem frases motivacionais vazias, sem bajulação. O tamanho da resposta deve acompanhar a necessidade — respostas completas, reflexivas, sem prolixidade.

CONDUÇÃO & MÉTODO:
1. Compreenda e valide a dor do usuário antes de propor saídas.
2. Explore com perguntas abertas e reflexivas.
3. Separe rigorosamente fatos relatados pelo usuário de hipóteses interpretativas suas (use "uma possibilidade é...", "podemos hipotetizar que...", nunca afirme como certeza absoluta algo não dito).
4. Ofereça psicoeducação ou estratégias práticas baseadas em evidências (ex: identificação de distorções cognitivas, desfusão de pensamentos na ACT, técnicas de grounding e regulação na DBT).
5. Estimule a autonomia e o autoconhecimento.

MARCAÇÃO OBRIGATÓRIA NO INÍCIO:
Comece TODA resposta com exatamente uma das seguintes etiquetas entre colchetes na primeira linha:
- [FATO] quando refletir/organizar fatos diretamente trazidos pelo usuário.
- [HIPOTESE] quando oferecer uma leitura clínica, interpretação ou hipótese compreensiva sua.
- [NEUTRO] para perguntas exploratórias, saudações ou psicoeducação geral.
- [CRISE] em caso de risco ou emergência (veja protocolo abaixo).
Exemplo: "[HIPOTESE] Uma possibilidade a considerar é que..."

ALUCINAÇÕES & DIAGNÓSTICO:
- Nunca invente diagnósticos, pesquisas, dados estatísticos ou autores inexistentes.
- Nunca forneça um diagnóstico médico ou psiquiátrico formal fechado.

PROTOCOLO DE SEGURANÇA E CRISE:
Se houver qualquer menção ou sinal de risco de suicídio, ideação de autoflagelo, desamparo extremo, violência grave ou psicose:
- Inicie IMEDIATAMENTE com [CRISE].
- Acolha a dor com seriedade, validação e sem julgamento.
- Forneça orientação direta para o CVV (Centro de Valorização da Vida) - ligar 188 (gratuito, 24h, sigiloso) ou cvv.org.br, e em caso de emergência ou risco iminente, o SAMU (192) ou comparecimento à UPA/Pronto-Socorro mais próximo.

Responda sempre em português do Brasil.`;

  const fullSystemPrompt = systemInstruction
    ? `${BASE_SYSTEM_PROMPT}\n\nRESUMO DA ANAMNESE DO USUÁRIO:\n${systemInstruction}\n\nUse essas informações com sensibilidade e naturalidade, sem repetir perguntas já esclarecidas.`
    : BASE_SYSTEM_PROMPT;

  // Lista ordenada de modelos: gemini-3.7-flash prioritário, gemini-3.6-flash em fallback
  const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
  const candidateModels = [
    preferredModel,
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash'
  ];
  // Remove duplicatas mantendo a ordem
  const modelAttempts = [...new Set(candidateModels)];

  // SE O CLIENTE SOLICITAR STREAMING (SSE):
  if (stream) {
    let streamSuccess = false;
    let lastError = null;

    for (const model of modelAttempts) {
      try {
        const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
        const resp = await fetch(streamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: fullSystemPrompt }] },
            contents: safeContents,
            generationConfig: {
              maxOutputTokens: 2500,
              temperature: 0.7,
              topP: 0.95
            }
          })
        });

        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          lastError = (errBody.error && errBody.error.message) || `HTTP ${resp.status} em ${model}`;
          continue;
        }

        // Se a resposta está OK, iniciamos o SSE para o cliente
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        });

        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullAccumulatedText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const jsonStr = trimmed.slice(6);
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const candidate = parsed.candidates && parsed.candidates[0];
              const parts = candidate && candidate.content && candidate.content.parts;
              const textPart = parts ? parts.map((p) => p.text || '').join('') : '';

              if (textPart) {
                fullAccumulatedText += textPart;
                res.write(`data: ${JSON.stringify({ chunk: textPart, modelUsed: model })}\n\n`);
              }
            } catch (parseErr) {
              // ignora linhas intermediárias inválidas
            }
          }
        }

        // Finaliza o stream
        res.write(`data: ${JSON.stringify({ done: true, fullText: fullAccumulatedText, modelUsed: model })}\n\n`);
        res.end();
        streamSuccess = true;

        // Backup silencioso se houver transcrição
        if (markdownTranscript && fullAccumulatedText) {
          try {
            const time = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const cleanedText = fullAccumulatedText.replace(/^\[(FATO|HIPOTESE|HIPÓTESE|NEUTRO|CRISE)\]\s*/i, '');
            const aiLine = `\n\n**Elo** _(${time})_\n${cleanedText}\n\n`;
            syncToGithubBackend(markdownTranscript + aiLine).catch(() => {});
          } catch (e) {}
        }
        return;
      } catch (e) {
        lastError = e.message;
        continue;
      }
    }

    if (!streamSuccess) {
      if (!res.headersSent) {
        res.status(502).json({ error: lastError || 'Falha ao conectar com os modelos Gemini.' });
      } else {
        res.write(`data: ${JSON.stringify({ error: lastError || 'Falha na transmissão do stream.' })}\n\n`);
        res.end();
      }
      return;
    }
  }

  // REQUISIÇÃO PADRÃO SÍNCRONA (JSON)
  let lastError = null;
  for (const model of modelAttempts) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: fullSystemPrompt }] },
          contents: safeContents,
          generationConfig: {
            maxOutputTokens: 2500,
            temperature: 0.7,
            topP: 0.95
          }
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        lastError = (data.error && data.error.message) || `HTTP ${resp.status} em ${model}`;
        continue;
      }

      const candidate = data.candidates && data.candidates[0];
      const parts = candidate && candidate.content && candidate.content.parts;
      const text = parts ? parts.map((p) => p.text || '').join('').trim() : '';

      if (!text) {
        lastError = `Resposta vazia do modelo ${model}`;
        continue;
      }

      let githubSync = null;
      if (markdownTranscript) {
        try {
          const time = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          const cleanedText = text.replace(/^\[(FATO|HIPOTESE|HIPÓTESE|NEUTRO|CRISE)\]\s*/i, '');
          const aiLine = `\n\n**Elo** _(${time})_\n${cleanedText}\n\n`;
          githubSync = await syncToGithubBackend(markdownTranscript + aiLine);
        } catch (syncErr) {
          console.error('Erro na sincronização com GitHub:', syncErr);
          githubSync = { success: false, error: syncErr.message };
        }
      }

      res.status(200).json({ text, modelUsed: model, githubSync });
      return;
    } catch (e) {
      lastError = e.message;
      continue;
    }
  }

  res.status(502).json({ error: lastError || 'Falha em todos os modelos Gemini disponíveis.' });
};
