import { Context } from '@netlify/functions';
import pdf from 'pdf-parse';
import { checkPasscode } from './_utils.js';

interface FormulaItem {
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
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return new Response(
                JSON.stringify({ message: 'Content type must be multipart/form-data' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        const formData = await req.formData();
        const file = formData.get('pdf') as File;

        if (!file) {
            return new Response(JSON.stringify({ message: 'No PDF file uploaded' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse PDF text
        const pdfData = await pdf(buffer);
        const fullText = pdfData.text || '';

        // Robust chunking with overlap (chunk size 1000, overlap 200)
        const chunks: string[] = [];
        const chunkSize = 1000;
        const overlap = 200;
        let startIndex = 0;

        while (startIndex < fullText.length) {
            const endIndex = Math.min(startIndex + chunkSize, fullText.length);
            let chunk = fullText.substring(startIndex, endIndex);

            // Clean consecutive white spaces
            chunk = chunk.replace(/\s+/g, ' ').trim();
            if (chunk.length > 50) {
                chunks.push(chunk);
            }

            startIndex += chunkSize - overlap;
        }

        // Extracted Math Formulas (Regex looking for $...$ and $$...$$ LaTeX symbols)
        const formulas: FormulaItem[] = [];
        const inlineRegex = /\$([^$]+)\$/g;
        const displayRegex = /\$\$([^$]+)\$\$/g;

        let match;
        const seenFormulas = new Set<string>();

        // 1. Process Display Math ($$ ... $$)
        while ((match = displayRegex.exec(fullText)) !== null) {
            const equation = `$$${match[1].trim()}$$`;
            if (!seenFormulas.has(equation) && equation.length < 150) {
                seenFormulas.add(equation);
                // Find context sentence
                const matchIndex = match.index;
                const contextStart = Math.max(0, matchIndex - 120);
                const contextEnd = Math.min(fullText.length, matchIndex + match[0].length + 120);
                const context = fullText
                    .substring(contextStart, contextEnd)
                    .replace(/\s+/g, ' ')
                    .trim();
                formulas.push({ equation, context });
            }
        }

        // 2. Process Inline Math ($ ... $)
        while ((match = inlineRegex.exec(fullText)) !== null) {
            const equation = `$${match[1].trim()}$`;
            // Avoid duplicate or single character matches (like $10, $X)
            if (!seenFormulas.has(equation) && equation.length > 3 && equation.length < 80) {
                seenFormulas.add(equation);
                const matchIndex = match.index;
                const contextStart = Math.max(0, matchIndex - 120);
                const contextEnd = Math.min(fullText.length, matchIndex + match[0].length + 120);
                const context = fullText
                    .substring(contextStart, contextEnd)
                    .replace(/\s+/g, ' ')
                    .trim();
                formulas.push({ equation, context });
            }
        }

        // Return parsed elements to client for session storage
        return new Response(
            JSON.stringify({
                message: 'PDF parsed successfully',
                chunkCount: chunks.length,
                chunks: chunks.slice(0, 150), // cap to 150 chunks for memory safety
                formulas: formulas.slice(0, 15), // top 15 formulas
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            },
        );
    } catch (error: any) {
        console.error('PDF upload/parsing error:', error);
        return new Response(JSON.stringify({ message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: '/api/pdf-upload',
};
