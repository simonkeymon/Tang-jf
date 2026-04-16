import { createAIService } from '../ai.service.js';

describe('AI service mock mode', () => {
  it('chat returns a structured mock response', async () => {
    const aiService = createAIService();

    const response = await aiService.chat([{ role: 'user', content: '你好' }]);

    expect(response.provider).toBe('mock');
    expect(response.model).toBe('mock-gpt');
    expect(response.content).toBe('Mock response for: 你好');
    expect(response.usage.totalTokens).toBeGreaterThan(0);
  });

  it('chatWithVision accepts image input and returns structured response', async () => {
    const aiService = createAIService();

    const response = await aiService.chatWithVision(
      [{ role: 'user', content: '请分析这张食物图片' }],
      [{ url: 'https://example.com/food.jpg' }],
    );

    expect(response.provider).toBe('mock');
    expect(response.content).toContain('Mock vision analysis');
    expect(response.content).toContain('1 image');
  });

  it('stream yields deterministic chunked output', async () => {
    const aiService = createAIService();
    const chunks: string[] = [];
    let doneChunks = 0;

    for await (const chunk of aiService.stream([{ role: 'user', content: 'stream test' }], {
      mockResponse: 'alpha beta',
    })) {
      if (chunk.done) {
        doneChunks += 1;
      } else {
        chunks.push(chunk.content);
      }
    }

    expect(chunks).toEqual(['alpha', ' beta']);
    expect(doneChunks).toBe(1);
  });

  it('tracks usage totals after chat calls', async () => {
    const aiService = createAIService();

    await aiService.chat([{ role: 'user', content: 'hello usage' }]);
    await aiService.chat([{ role: 'user', content: 'hello usage again' }]);

    const usage = aiService.getUsage();

    expect(usage.requestCount).toBe(2);
    expect(usage.totalTokens).toBeGreaterThan(0);
  });

  it('applies user config over defaults', async () => {
    const aiService = createAIService();

    const response = await aiService.chat([{ role: 'user', content: 'custom model' }], {
      provider: 'mock',
      model: 'custom-mock-model',
      mockResponse: 'custom output',
    });

    expect(response.model).toBe('custom-mock-model');
    expect(response.content).toBe('custom output');
  });

  it('supports chatForUser with resolved runtime config', async () => {
    const aiService = createAIService({
      getUserConfig: () => null,
      setUserConfig: () => {
        throw new Error('not implemented');
      },
      getPlatformConfig: () => null,
      setPlatformConfig: () => {
        throw new Error('not implemented');
      },
      getRuntimeConfigForUser: () => ({
        provider: 'mock',
        model: 'resolved-user-model',
        mockResponse: 'resolved output',
      }),
    });

    const response = await aiService.chatForUser('user-1', [{ role: 'user', content: 'resolved' }]);

    expect(response.model).toBe('resolved-user-model');
    expect(response.content).toBe('resolved output');
  });

  it('falls back to mock override when saved runtime config fails', async () => {
    const aiService = createAIService({
      getUserConfig: () => null,
      setUserConfig: () => {
        throw new Error('not implemented');
      },
      getPlatformConfig: () => null,
      setPlatformConfig: () => {
        throw new Error('not implemented');
      },
      getRuntimeConfigForUser: () => ({
        provider: 'openai-compatible',
        baseUrl: 'http://127.0.0.1:9/v1',
        apiKey: 'bad-key',
        model: 'broken-model',
      }),
    });

    const response = await aiService.chatForUser(
      'user-1',
      [{ role: 'user', content: 'fallback please' }],
      { mockResponse: 'fallback output' },
    );

    expect(response.provider).toBe('mock');
    expect(response.content).toBe('fallback output');
  });

  it('enforces simple rate limiting', async () => {
    const aiService = createAIService();

    await aiService.chat([{ role: 'user', content: 'r1' }], { model: 'rate-limit-model' });
    await aiService.chat([{ role: 'user', content: 'r2' }], { model: 'rate-limit-model' });
    await aiService.chat([{ role: 'user', content: 'r3' }], { model: 'rate-limit-model' });
    await aiService.chat([{ role: 'user', content: 'r4' }], { model: 'rate-limit-model' });
    await aiService.chat([{ role: 'user', content: 'r5' }], { model: 'rate-limit-model' });

    await expect(
      aiService.chat([{ role: 'user', content: 'r6' }], { model: 'rate-limit-model' }),
    ).rejects.toThrow('AI rate limit exceeded');
  });
});
