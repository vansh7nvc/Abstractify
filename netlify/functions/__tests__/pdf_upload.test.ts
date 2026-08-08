import { describe, it, expect, vi, beforeEach } from 'vitest';
import pdfUploadHandler from '../pdf-upload.js';

vi.mock('pdf-parse', () => {
    return {
        default: async (buffer: Buffer) => {
            const text = buffer ? buffer.toString('utf-8') : '';
            return { text };
        },
    };
});

describe('pdf-upload.ts endpoint', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handles OPTIONS CORS request', async () => {
        const req = new Request('http://localhost/api/pdf-upload', { method: 'OPTIONS' });
        const res = await pdfUploadHandler(req, {} as any);
        expect(res.status).toBe(200);
    });

    it('returns 400 if Content-Type is not multipart/form-data', async () => {
        const req = new Request('http://localhost/api/pdf-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const res = await pdfUploadHandler(req, {} as any);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.message).toBe('Content type must be multipart/form-data');
    });

    it('returns 400 if no pdf file in formData', async () => {
        const formData = {
            get: (_key: string) => null,
        };

        const req = new Request('http://localhost/api/pdf-upload', {
            method: 'POST',
            headers: { 'content-type': 'multipart/form-data; boundary=---boundary' },
        });
        vi.spyOn(req, 'formData').mockResolvedValue(formData as any);

        const res = await pdfUploadHandler(req, {} as any);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.message).toBe('No PDF file uploaded');
    });

    it('parses uploaded PDF file, creates text chunks and extracts LaTeX formulas', async () => {
        const samplePdfContent = `
            Abstract of research paper on neural network architectures.
            Here is an inline equation $E = mc^2$ within text context.
            And here is a display equation $$W_{ij} = \\sum_{k=1}^N x_k y_k$$ in central block context.
            ${'Long research text filler. '.repeat(50)}
        `;

        const pdfBuffer = Buffer.from(samplePdfContent, 'utf-8');
        const mockFile = {
            arrayBuffer: async () => pdfBuffer,
        };

        const formData = {
            get: (key: string) => (key === 'pdf' ? mockFile : null),
        };

        const req = new Request('http://localhost/api/pdf-upload', {
            method: 'POST',
            headers: { 'content-type': 'multipart/form-data; boundary=---boundary' },
        });
        vi.spyOn(req, 'formData').mockResolvedValue(formData as any);

        const res = await pdfUploadHandler(req, {} as any);
        expect(res.status).toBe(200);
        const data = await res.json();

        expect(data.message).toBe('PDF parsed successfully');
        expect(data.chunkCount).toBeGreaterThan(0);
        expect(data.formulas.length).toBeGreaterThan(0);
    });
});
