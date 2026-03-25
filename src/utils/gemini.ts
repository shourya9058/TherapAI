// Using the latest Gemini API with improved prompting
// src/utils/gemini.ts
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL_NAME = 'gemini-2.0-flash-exp';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

const systemPrompt = `You are Lucille, a warm and compassionate AI mental health companion. Your responses should be:

CRITICAL RULES:
1. CONCISE: Keep responses 3-5 sentences (50-100 words) unless the user specifically asks for detailed advice
2. MULTILINGUAL: Automatically detect and respond in the user's language (English, Hindi, Hinglish, Spanish, Punjabi, Marathi, etc.)
3. NATURAL: Write like a caring friend having a genuine conversation
4. ACTIONABLE: When appropriate, give one simple, practical suggestion

YOUR APPROACH:
✓ Validate emotions briefly ("That sounds really tough" / "मैं समझ सकती हूं")
✓ Offer hope without dismissing pain
✓ Ask thoughtful questions to help them reflect
✓ Give practical, bite-sized advice
✓ Be warm but not overwhelming

LANGUAGE EXAMPLES:
- English: "I hear you. That must be really hard. Have you tried taking a few deep breaths when you feel overwhelmed?"
- Hindi: "मैं समझती हूं। यह बहुत मुश्किल होगा। क्या आपने कभी गहरी सांस लेने की कोशिश की है?"
- Hinglish: "I understand yaar. Bahut tough situation hai. Have you tried kuch simple breathing exercises?"
- Spanish: "Te entiendo. Debe ser muy difícil. ¿Has intentado respirar profundamente cuando te sientes así?"
- Punjabi: "ਮੈਂ ਸਮਝਦੀ ਹਾਂ। ਇਹ ਬਹੁਤ ਔਖਾ ਹੋਵੇਗਾ। ਕੀ ਤੁਸੀਂ ਡੂੰਘੀਆਂ ਸਾਹਾਂ ਲੈਣ ਦੀ ਕੋਸ਼ਿਸ਼ ਕੀਤੀ ਹੈ?"
- Marathi: "मी समजते. हे खूप कठीण असेल. तुम्ही खोल श्वास घेण्याचा प्रयत्न केला आहे का?"

AVOID:
✗ Long paragraphs or essays
✗ Multiple pieces of advice at once
✗ Overly formal or clinical language
✗ Toxic positivity or dismissing feelings
✗ Always responding in English - match their language!

SAFETY:
If someone expresses:
- Self-harm thoughts: Immediately provide crisis resources (988 Lifeline, Crisis Text Line: HOME to 741741)
- Emergency: Urge them to call emergency services or reach out to someone nearby
- Severe distress: Gently suggest professional help while staying supportive

Remember: You're here to provide comfort and gentle guidance, not to replace professional therapy. Keep it brief, warm, and in their language.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function formatMessages(messages: Message[]) {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
}

function detectLanguage(text: string): string {
  const hindiPattern = /[\u0900-\u097F]/;
  const punjabiPattern = /[\u0A00-\u0A7F]/;
  const spanishWords = /\b(hola|gracias|por favor|buenos|dias|como|estas)\b/i;
  
  if (hindiPattern.test(text)) {
    // Could be Hindi or Marathi (both use Devanagari)
    if (text.includes('आहे') || text.includes('असा') || text.includes('काय')) {
      return 'Marathi';
    }
    return 'Hindi';
  }
  
  if (punjabiPattern.test(text)) {
    return 'Punjabi';
  }
  
  if (spanishWords.test(text)) {
    return 'Spanish';
  }
  
  // Check for Hinglish (mix of English and Hindi words)
  const hinglishWords = /\b(hai|nahi|kya|acha|theek|yaar|bhai|dost|kar|ho|hoon)\b/i;
  if (hinglishWords.test(text)) {
    return 'Hinglish';
  }
  
  return 'English';
}

export async function generateResponse(messages: Message[]): Promise<string> {
  try {
    // Detect language from the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const detectedLanguage = lastUserMessage ? detectLanguage(lastUserMessage.content) : 'English';
    
    // Build conversation history
    const history = [
      {
        role: 'user' as const,
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model' as const,
        parts: [{ text: "I'm here for you. What's on your mind?" }],
      },
      ...formatMessages(messages.slice(0, -1))
    ];

    const userMessage = messages[messages.length - 1].content;
    
    // Add language hint to the current message if not English
    const messageWithHint = detectedLanguage !== 'English' 
      ? `[Respond in ${detectedLanguage}] ${userMessage}`
      : userMessage;

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          ...history,
          {
            role: 'user',
            parts: [{ text: messageWithHint }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 300, // Reduced to keep responses concise
          candidateCount: 1,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error);
      throw new Error(error.error?.message || 'Failed to generate response');
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No response generated');
    }
    
    // Ensure response isn't too long (fallback safety check)
    if (generatedText.length > 500) {
      const sentences = generatedText.split(/[.!?]+/).filter((s: string) => s.trim());
      return sentences.slice(0, 3).join('. ') + '.';
    }
    
    return generatedText;
    
  } catch (error) {
    console.error('Error in generateResponse:', error);
    
    // Return language-appropriate error message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const detectedLanguage = lastUserMessage ? detectLanguage(lastUserMessage.content) : 'English';
    
    const errorMessages: Record<string, string> = {
      'English': "I'm having trouble connecting right now. Could you try again in a moment?",
      'Hindi': "मुझे अभी कनेक्शन में समस्या हो रही है। क्या आप एक पल में फिर से कोशिश कर सकते हैं?",
      'Hinglish': "Mujhe abhi connection issue ho raha hai. Kya aap ek minute baad try kar sakte ho?",
      'Spanish': "Tengo problemas de conexión ahora. ¿Podrías intentarlo de nuevo en un momento?",
      'Punjabi': "ਮੈਨੂੰ ਹੁਣ ਕਨੈਕਸ਼ਨ ਵਿੱਚ ਸਮੱਸਿਆ ਹੋ ਰਹੀ ਹੈ। ਕੀ ਤੁਸੀਂ ਇੱਕ ਪਲ ਵਿੱਚ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰ ਸਕਦੇ ਹੋ?",
      'Marathi': "मला आता कनेक्शनमध्ये समस्या येत आहे. तुम्ही थोड्या वेळाने पुन्हा प्रयत्न करू शकता का?"
    };
    
    return errorMessages[detectedLanguage] || errorMessages['English'];
  }
}

// Log the model being used
console.log('Using Gemini model:', MODEL_NAME);