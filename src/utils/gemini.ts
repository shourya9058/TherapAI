// src/utils/gemini.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const API_KEY = 'AIzaSyAB2XG-dRcBiEnnAFZ1i39JJgbzy4vQC4s';
const genAI = new GoogleGenerativeAI(API_KEY);

// ─── Therapist persona ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Dr. Lucille, a warm and deeply empathetic AI therapist companion.
You are trained in CBT, Mindfulness-Based Therapy, and Person-Centered Therapy.

CORE RULES:
- Validate feelings FIRST before any advice
- Keep replies to 2-4 sentences. Short, warm, human.
- Ask only ONE gentle open-ended question per reply
- Never use bullet lists or numbered points unless asked
- Never say "As an AI" — you ARE their companion
- Never use hollow phrases like "everything will be okay"

LANGUAGE MATCHING (mandatory): Always reply in the exact same language the user writes in.
- English → conversational English
- Hindi/Devanagari → pure Hindi
- Hinglish (yaar, bas, hoon, kya, nahi, bahut) → casual Hinglish
- Punjabi → Punjabi | Marathi → Marathi | Spanish → Spanish

HINGLISH example:
User: "Yaar bahut thak gaya hoon life se"
You: "Yaar, ye thakaan sirf bahar ki nahi hoti — andar tak jaati hai. Kya chal raha hai tere saath?"

TONE: Be the friend who has a therapy degree. Warm. Real. Present.
If someone mentions wanting to hurt themselves, respond calmly and share: iCall India 9152987821.`;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Language detection ───────────────────────────────────────────────────────
function detectLanguage(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) {
    if (/आहे|असा|मला|तुम्ही/.test(text)) return 'Marathi';
    return 'Hindi';
  }
  if (/[\u0A00-\u0A7F]/.test(text)) return 'Punjabi';
  if (/\b(hola|gracias|como|estas|por favor)\b/i.test(text)) return 'Spanish';
  if (/\b(yaar|bhai|hoon|nahi|kya|acha|theek|bahut|bas|mujhe|tere|abhi)\b/i.test(text)) return 'Hinglish';
  return 'English';
}

export function getErrorMessage(userText: string): string {
  const lang = detectLanguage(userText);
  const msgs: Record<string, string> = {
    English:  "I'm having a little trouble connecting right now — please try again in a moment.",
    Hindi:    "मुझे अभी कनेक्शन में समस्या हो रही है। एक पल बाद फिर से कोशिश करें।",
    Hinglish: "Yaar, abhi connection issue hai. Ek second baad dobara try karo.",
    Spanish:  "Tengo un problema de conexión — inténtalo de nuevo en un momento.",
    Punjabi:  "ਮੈਨੂੰ ਕਨੈਕਸ਼ਨ ਸਮੱਸਿਆ ਹੈ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    Marathi:  "मला कनेक्शन समस्या आहे. पुन्हा प्रयत्न करा.",
  };
  return msgs[lang] ?? msgs['English'];
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateResponse(messages: Message[]): Promise<string> {
  if (!messages.length) throw new Error('No messages provided');



  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,  threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,  threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  ];

  // Previous conversation turns (all messages except the last one)
  const rawHistory = messages.slice(0, -1);
  const firstUserIndex = rawHistory.findIndex(m => m.role === 'user');
  const validHistory = firstUserIndex >= 0 ? rawHistory.slice(firstUserIndex) : [];

  const history = validHistory.map(m => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: m.content }],
  }));

  // Current user message — add language hint if non-English
  const lastMsg = messages[messages.length - 1];
  const lang = detectLanguage(lastMsg.content);
  const currentText = lang !== 'English'
    ? `[Please respond in ${lang}] ${lastMsg.content}`
    : lastMsg.content;

  const FALLBACK_MODELS = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
    'gemini-pro-latest'
  ];

  let lastError: any;

  for (const modelName of FALLBACK_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
      });

      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: 0.8,
          topP: 0.9,
          maxOutputTokens: 512,
        },
        safetySettings,
      });

      const result = await chat.sendMessage(currentText);
      const text = result.response.text();

      if (!text?.trim()) {
        throw new Error('Empty response from model');
      }

      // If successful, return the text immediately
      if (text.length > 900) {
        return text.split(/(?<=[.!?।])\s+/).filter(Boolean).slice(0, 4).join(' ');
      }

      return text.trim();

    } catch (err: any) {
      console.warn(`[Gemini] ${modelName} failed:`, err?.message || err);
      lastError = err;
      // If it's a model-level failure (429/503/404), it will loop and try the next model.
    }
  }

  // If ALL fallback models failed
  console.error('[Gemini] All fallback models failed. Last error:', lastError?.message || lastError);
  throw lastError;
}