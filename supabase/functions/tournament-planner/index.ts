import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const HUGGING_FACE_TOKEN = Deno.env.get("HUGGING_FACE_TOKEN")
// Switching to a highly reliable, general-purpose instruction-following model
const API_URL = "https://api-inference.huggingface.co/models/google/flan-t5-xxl";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!HUGGING_FACE_TOKEN) {
      throw new Error("HUGGING_FACE_TOKEN is not set in Supabase secrets.")
    }

    const { conversation } = await req.json()
    if (!conversation) {
      throw new Error("Missing 'conversation' in the request body.")
    }

    const prompt = `
      You are Direktor AI, an expert Scrabble Tournament Director's assistant.
      Your goal is to have a friendly conversation to gather enough information to create a tournament plan.
      The final plan must be a JSON object with four keys: "name", "rounds", "days", and "suggestedSchedule".

      Based on the following conversation history:
      ${conversation}

      Decide on the next step. Your response MUST be a valid JSON object.
      - If you have enough information to create the plan, respond with: { "plan": { "name": "...", "rounds": ..., "days": ..., "suggestedSchedule": "..." } }
      - If you need more information, respond with: { "question": "Your next question here..." }
    `;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 250 } // Limit the response size
      }),
    })

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Hugging Face API Error: ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    const rawText = data[0].generated_text;

    // Extract the JSON part of the response
    const jsonMatch = rawText.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error("AI did not return a valid JSON object.");
    }

    const aiJsonResponse = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(aiJsonResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error); // Log the full error on the server
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})