// Type declarations for modules without built-in types

declare module 'pdf-parse' {
    interface PDFInfo {
        PDFFormatVersion?: string;
        IsAcroFormPresent?: boolean;
        IsXFAPresent?: boolean;
        Title?: string;
        Author?: string;
        Subject?: string;
        Creator?: string;
        Producer?: string;
        CreationDate?: string;
        ModDate?: string;
    }

    interface PDFMetadata {
        _metadata?: Record<string, unknown>;
    }

    interface PDFData {
        numpages: number;
        numrender: number;
        info: PDFInfo;
        metadata: PDFMetadata | null;
        version: string;
        text: string;
    }

    interface PDFOptions {
        pagerender?: (pageData: unknown) => string;
        max?: number;
        version?: string;
    }

    function pdfParse(
        dataBuffer: Buffer | ArrayBuffer,
        options?: PDFOptions,
    ): Promise<PDFData>;

    export = pdfParse;
}
