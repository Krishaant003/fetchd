const GEMINI_MODEL = 'gemini-flash-latest';

function endpoint(): string {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}

export async function generateCompatibilityNote(viewerText: string, targetText: string): Promise<string> {
  const prompt = [
    'You write short compatibility notes for a two-sided shelter-dog adoption app.',
    'Two profiles are shown below - the viewer\'s own profile, and the profile they are currently looking at.',
    '',
    'VIEWER\'S PROFILE:',
    viewerText,
    '',
    'PROFILE THEY ARE VIEWING:',
    targetText,
    '',
    'Write exactly ONE sentence (max ~25 words) pointing out a single concrete, checkable connection between the two texts above - something a reader could verify by re-reading both profiles.',
    '',
    'Rules:',
    '- Ground it ONLY in details actually stated in the two texts. Never invent traits, preferences, or facts not present in the text.',
    '- Never give a match/no-match verdict, a percentage, or words like "great match" / "not right for you".',
    '- Frame it as informational, not a judgment - state the connection, let the reader draw their own conclusion.',
    '- It can be flattering or a genuine heads-up - whichever is more specific and true to the text, not whichever sounds nicer.',
    '- If the OTHER profile mentions something specific (e.g. noise sensitivity, energy level, needs a yard) but the VIEWER\'S profile doesn\'t say enough to compare against it, don\'t guess - instead, ask the viewer to add that detail. Phrase it as a direct, friendly question about their own profile, e.g. "Rex needs a lot of exercise - how much daily activity can you offer?"',
    '- If NEITHER text has enough specific detail to support a grounded observation or a useful question, respond with exactly: "Not enough detail yet to spot a specific connection."',
    '- Output ONLY the sentence itself. No preamble, no labels, no quotation marks.',
    '',
    'Example 1 (grounded observation):',
    'VIEWER\'S PROFILE: "I work from home and live in a quiet apartment with no other pets."',
    'PROFILE THEY ARE VIEWING: "Rex is a 4-year-old lab mix, great with people, gets anxious around loud noises and other dogs."',
    'Output: Rex\'s noise-sensitivity could work well with your quiet apartment,though it\'s worth confirming he\'d be comfortable being home during your work calls.',
    '',
    'Example 2 (missing detail, ask a question):',
    'VIEWER\'S PROFILE: "I live in a house with a small backyard."',
    'PROFILE THEY ARE VIEWING: "Rex is a high-energy 2-year-old who needs at least an hour of exercise a day."',
    'Output: Rex needs at least an hour of daily exercise - how much active time could you realistically give him each day?',
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
