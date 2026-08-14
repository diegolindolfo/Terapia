const { syncToGithub } = require('./_lib/github');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  // Sem variáveis configuradas, não é erro — significa que o backup automático
  // está desligado. O chat continua funcionando normalmente sem isso.
  if (!token || !owner || !repo) {
    res.status(200).json({
      skipped: true,
      reason: 'Backup no GitHub não configurado. Defina GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO nas variáveis de ambiente da Vercel.'
    });
    return;
  }

  const { content } = req.body || {};
  if (!content) {
    res.status(400).json({ error: 'content é obrigatório' });
    return;
  }

  try {
    const result = await syncToGithub(content);

    if (result.skipped) {
      res.status(200).json(result);
      return;
    }

    if (!result.success) {
      res.status(502).json({ error: result.error });
      return;
    }

    res.status(200).json({ ok: true, commit: result.commit || null });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
