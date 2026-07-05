import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { WebFileSaveService } from './web-file-save-service';

describe('WebFileSaveService', () => {
  let service: WebFileSaveService;

  beforeEach(() => {
    service = new WebFileSaveService();
    document.body.innerHTML = '';
    globalThis.URL = {
      createObjectURL: vi.fn().mockReturnValue('blob:test'),
      revokeObjectURL: vi.fn(),
    } as unknown as typeof URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a download link and clicks it', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    service.save({
      content: 'hello',
      filename: 'test.txt',
      mimeType: 'text/plain',
    });
    expect(clickSpy).toHaveBeenCalled();
  });
});
