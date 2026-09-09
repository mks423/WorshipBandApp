export interface PdfPage {
  base64: string;
  width: number;
  height: number;
}

export interface PdfPageRendererHandle {
  /** Rasterizes every page of a base64-encoded PDF, resolving to one entry per page. */
  renderPages: (base64Pdf: string) => Promise<PdfPage[]>;
}
