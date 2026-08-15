const GEMINI_MODEL = 'gemini-2.5-flash';

function endpoint(): string {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}

export async function generateCompatibilityNote(viewerText: string, targetText: string): Promise<string> {
  const prompt = [
    'You write short compatibility notes for a shelter-dog adoption app.',
    'The viewer wrote this about themselves or their dog:',
    viewerText,
    'The profile they are looking at says:',
    targetText,
    'Write 1-2 sentences that are specific and grounded in the text above.',
    'Never give a match/no-match verdict, never use generic flattery.',
    'Point out one concrete, checkable observation - flattering or a genuine heads-up.',
  ].join('\n');

  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) {
    throw new Error(`Gemini request failed: ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini response missing text');
  }
  return text.trim();
}
