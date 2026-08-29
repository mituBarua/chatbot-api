export interface AIServiceOptions {
  model?: string;
  maxTokens?: number;
}

export class AIService {
  private model = '@cf/mistral/mistral-7b-instruct-v0.1';
  private maxTokens = 256;
  private isDev = false;

  constructor(private ai: any, options?: AIServiceOptions) {
    this.isDev = !ai;
    
    console.log(`[AIService] AI available: ${!!ai}`);
    if (options?.model) this.model = options.model;
    if (options?.maxTokens) this.maxTokens = options.maxTokens;
  }

  async generateReply(prompt: string): Promise<string> {
    try {
      if (this.isDev) {
        console.log('[AI] Using mock reply (dev mode)');
        return this.mockReply(prompt);
      }

      console.log(`[AI] Calling real ${this.model}...`);
      
      const response = await this.ai.run(this.model, {
        prompt: prompt,
        max_tokens: this.maxTokens,
      });

      const reply = response.result?.response || '';
      if (!reply) throw new Error('Empty response from AI');
      
      return reply.trim();
    } catch (error: any) {
      const msg = error?.message || String(error);
      
      if (msg.includes('remotely') || msg.includes('not supported')) {
        console.log('[AI] Remote call not available, using mock');
        return this.mockReply(prompt);
      }

      console.error('[AI] Error:', msg);
      throw new Error(`Failed to generate AI response: ${msg}`);
    }
  }

  private mockReply(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('time') || lowerPrompt.includes('close') || lowerPrompt.includes('open')) {
      return 'We are open Monday to Friday from 8:30 AM until 5 PM.';
    }

    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      return 'Hello! How can I help you today?';
    }

    if (lowerPrompt.includes('help')) {
      return 'I am here to help! Please let me know what you need.';
    }

    if (lowerPrompt.includes('price') || lowerPrompt.includes('cost')) {
      return 'I do not have pricing information available. Please contact us directly for pricing details.';
    }

    return 'Thank you for your question. I appreciate your inquiry. How else can I assist you?';
  }
}