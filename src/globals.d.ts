export {};

declare global {
  interface Window {
    __lastExportBlobSize__?: number;
    __lastExportFileName__?: string;
    musicGeneratorExport?: () => void;
    musicGeneratorCreateExportBlobSize?: () => number;
  }
}
