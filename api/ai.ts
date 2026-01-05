// api/ai.ts

type InlineFile = {
  name: string;
  mimeType: string;
  dataBase64: string;
  size: number;
};

function pickFirstTextFromGemini(json: any): string {
  // Robust extraction across candidates
  let text = "";
  if (Array.isArray(json?.candidates)) {
    for (const c of json.candidates) {
      const t = c?.content?.parts?.map((p: any) => p?.text).join(" ");
      if (t && t.trim()) {
        text = t.trim();
        break;
      }
    }
  }
  return text;
}

function isRetryableStatus(code: number) {
  return code === 429 || code === 500 || code === 502 || code === 503 || code === 504;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, persona, deepMode, file } = (req.body || {}) as {
    prompt?: string;
    persona?: string;
    deepMode?: boolean;
    file?: InlineFile | null;
  };

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Invalid or missing prompt" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not set" });
  }

  // File validation (PDF inline supported)
  let safeFile: InlineFile | null = null;
  if (file) {
    if (
      typeof file?.mimeType !== "string" ||
      typeof file?.dataBase64 !== "string" ||
      typeof file?.name !== "string" ||
      typeof file?.size !== "number"
    ) {
      return res.status(400).json({ error: "Invalid file payload" });
    }
    if (file.size > 18 * 1024 * 1024) {
      // keep under request size safety margin
      return res.status(400).json({ error: "File too large. Please upload a smaller PDF (< 18MB)." });
    }
    safeFile = file;
  }

  const personaSafe = typeof persona === "string" ? persona : "security";
  const deep = Boolean(deepMode);

  // Better output formatting for your UI parser
  const instructionText = `
You are a professional cybersecurity research assistant.

Persona: ${personaSafe}
Analysis Mode: ${deep ? "Deep" : "Standard"}

STRICT OUTPUT FORMAT (must follow exactly):

Overview:
- (3–6 bullets, concise)

Key Findings:
- (6–10 bullets)

Risks:
- (5–10 bullets, include severity tags like [LOW]/[MEDIUM]/[HIGH] at start of each bullet)

Mitigations / Next Steps:
- (8–12 bullets, actionable, defensive only)

Sources:
- (5–12 items) Prefer official sources (OWASP, NIST, CISA, vendor docs). If you can't cite, write: "No direct sources available".

Safety rules:
- No hacking instructions, no exploit steps, no malware/weaponization.
- Defensive, educational, high-level only.

User request:
${prompt.trim()}
`.trim();

  // Parts: PDF (optional) + instruction text
  const parts: any[] = [];
  if (safeFile) {
    parts.push({
      inlineData: {
        mimeType: safeFile.mimeType, // "application/pdf"
        data: safeFile.dataBase64,
      },
    });
  }
  parts.push({ text: instructionText });

  // Use multiple model IDs to maximize success (some accounts/regions differ)
  const modelCandidates = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
  ];

  // Try models in order; handle 404/unsupported; retry transient errors
  for (const model of modelCandidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    try {
      // one retry for transient errors
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0.2,
              topP: 0.9,
              maxOutputTokens: 1400,
            },
          }),
        });

        // Model not found / unsupported -> try next model
        if (r.status === 404 || r.status === 400) {
          break;
        }

        // Retry transient
        if (isRetryableStatus(r.status) && attempt === 0) {
          continue;
        }

        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          // if still failing, move to next model
          break;
        }

        const text = pickFirstTextFromGemini(json);

        if (!text) {
          return res.status(200).json({
            response:
              "No response generated. Tip: rephrase neutrally (defense-focused) or reduce PDF size. Example: “Summarize risks + mitigations for this SOC scenario.”",
            modelUsed: model,
          });
        }

        return res.status(200).json({ response: text, modelUsed: model });
      }
    } catch (err) {
      // try next model
      continue;
    }
  }

  return res.status(500).json({
    error: "Gemini request failed (all model fallbacks). Check API key, quotas, or try again.",
  });
}
