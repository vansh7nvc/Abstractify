import { Context } from '@netlify/functions';
import { getApiKey, callGemini, checkPasscode } from './_utils.js';

interface ExplainMathRequest {
    equation: string;
    context: string;
}

export default async (req: Request, context: Context) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const unauthorized = checkPasscode(req.headers);
    if (unauthorized) return unauthorized;

    try {
        const body = (await req.json()) as ExplainMathRequest;
        const { equation, context: mathContext } = body;

        if (!equation) {
            return new Response(JSON.stringify({ message: 'Equation parameter is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const geminiKey = getApiKey(req.headers, 'gemini');
        if (!geminiKey) {
            return new Response(
                JSON.stringify({
                    breakdown:
                        '1. W: Synaptic weight matrix.\n2. i, j: Presynaptic and postsynaptic neuron indices.\n3. Requires Gemini API Key in Settings to extract dynamic parameter details.',
                    analogy:
                        'Think of synaptic weights as the thickness of a bridge between two islands (neurons). A thicker bridge allows more cars (signals) to pass through quickly.',
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                },
            );
        }

        const prompt = `You are an academic mathematics explainer. Break down the following mathematical equation/formula found in an academic research paper.

Equation:
${equation}

Surrounding Context:
${mathContext}

De-jargonize the formula. Explain each variable and the overall purpose of the equation using a simple physical analogy.
Provide your response in JSON format. Do not add markdown backticks outside of the JSON. It must match this schema:
{
  "breakdown": "A bulleted string listing each symbol/variable and what it represents.",
  "analogy": "A simple, creative, physical or real-world analogy describing what the overall equation does."
}
`;

        const responseText = await callGemini(prompt, 'application/json', geminiKey);

        // Clean JSON formatting if Gemini adds markdown codeblocks
        const cleanedText = responseText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        const result = JSON.parse(cleanedText) as { breakdown: string; analogy: string };

        return new Response(JSON.stringify(result), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error: any) {
        console.error('Explain Math API error:', error);
        return new Response(JSON.stringify({ message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: '/api/pdf-explain-math',
};
