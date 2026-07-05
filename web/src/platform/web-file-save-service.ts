export interface FileSaveOptions {
  content: string;
  filename: string;
  mimeType: string;
}

export class WebFileSaveService {
  save(options: FileSaveOptions): void {
    const blob = new Blob([options.content], { type: options.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
