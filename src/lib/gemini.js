/**
 * Gemini AI Helper for WhatsApp Reminders & Follow-ups
 * Crafts contextual, human-like messages based on client details and past notes.
 */

export async function generateAIFollowUpReminder({
  clientName,
  scheduledTime,
  notes,
  salesPersonName,
  requirement,
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  const formattedTime = scheduledTime
    ? new Date(scheduledTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'today';

  // Graceful fallback if Gemini API key is not yet set
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key')) {
    return (
`Hello ${clientName || 'there'}! 👋

This is a friendly reminder from *AiDigitals* regarding our scheduled follow-up:
📅 *Scheduled Time:* ${formattedTime}
${salesPersonName ? `👤 *Representative:* ${salesPersonName}\n` : ''}${notes ? `📝 *Topic:* ${notes}\n` : ''}
We look forward to speaking with you! If you need to reschedule, simply reply to this message.

Best regards,
*AiDigitals Team*`
    );
  }

  const prompt = `
You are a warm, professional, and courteous customer relationship executive for "AiDigitals", a premier digital marketing, media, and technology agency.
Write a short, engaging WhatsApp reminder message to a client/lead about an upcoming scheduled call or meeting.

Lead Details:
- Client Name: ${clientName || 'Valued Client'}
- Scheduled Time: ${formattedTime}
- Representative: ${salesPersonName || 'Our Sales Specialist'}
- Discussion Topic / Notes from previous interaction: ${notes || 'Digital marketing growth & services'}
- Client Requirement: ${requirement || 'Performance marketing & digital growth'}

Guidelines:
1. Keep it concise, friendly, and professional (under 60-80 words).
2. Naturally mention the scheduled time and reference their specific requirement or previous topic if available.
3. Encourage them to reply if they need to reschedule or have questions.
4. Use standard WhatsApp formatting (*bold*, clean bullet points if needed, emojis).
5. Do NOT include markdown code blocks, placeholders, or quotes. Output ONLY the raw message body.
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250,
        }
      })
    });

    if (!response.ok) {
      console.warn('Gemini API returned error, falling back to default template:', response.status);
      return (
`Hello ${clientName || 'there'}! 👋

This is a reminder regarding our scheduled follow-up at *${formattedTime}* with AiDigitals.
${notes ? `📝 *Topic:* ${notes}\n` : ''}
We look forward to speaking with you! Please let us know if you need to reschedule.

Best regards,
*AiDigitals Team*`
      );
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (candidateText) {
      return candidateText;
    }
  } catch (err) {
    console.error('Error generating AI reminder with Gemini:', err);
  }

  // Default fallback
  return (
`Hello ${clientName || 'there'}! 👋

This is a friendly reminder from *AiDigitals* regarding our scheduled follow-up:
📅 *Scheduled Time:* ${formattedTime}

We look forward to speaking with you! Please reply if you need to reschedule.`
  );
}

/**
 * Parses customer replies to detect if they want to reschedule or have a question
 */
export async function analyzeCustomerReply({ replyText, clientName, currentScheduledTime }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `
A customer named "${clientName}" replied to our WhatsApp reminder:
"${replyText}"

Current scheduled time was: "${currentScheduledTime || 'not set'}"

Analyze their intent and return a JSON object with:
{
  "isRescheduleRequest": boolean,
  "requestedTime": string or null (e.g. "tomorrow 4 PM" or standardized if possible),
  "isInterested": boolean,
  "politeReply": string (a short, warm, professional reply acknowledging their message on behalf of AiDigitals)
}

Return ONLY valid JSON.
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(text);
    }
  } catch (err) {
    console.error('Error analyzing reply with Gemini:', err);
  }

  return null;
}
