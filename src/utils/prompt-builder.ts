import { Conversation } from '../types';

export interface PromptContext {
  systemPrompt: string;
  knowledge: Array<{ title: string; content: string }>;
  conversationHistory: Conversation[];
  userMessage: string;
}

export function buildPrompt(context: PromptContext): string {
  let prompt = '';

  // System prompt
  prompt += context.systemPrompt + '\n\n';

  // Add knowledge if available
  if (context.knowledge.length > 0) {
    prompt += '## Knowledge Base\n';
    context.knowledge.forEach(k => {
      prompt += `- **${k.title}**: ${k.content}\n`;
    });
    prompt += '\n';
  }

  // Add conversation history if available
  if (context.conversationHistory.length > 0) {
    prompt += '## Recent Conversation\n';
    context.conversationHistory.forEach(msg => {
      prompt += `Customer: ${msg.userMessage}\nAssistant: ${msg.aiReply}\n`;
    });
    prompt += '\n';
  }

  // Current user message
  prompt += `Customer: ${context.userMessage}\nAssistant:`;

  return prompt;
}