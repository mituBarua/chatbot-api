import { Knowledge } from '../types';

export function selectRelevantKnowledge(
  userMessage: string,
  allKnowledge: Knowledge[],
  maxRecords: number = 5
): Knowledge[] {
  if (allKnowledge.length === 0) return [];

  // Split user message into keywords
  const userWords = userMessage
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2); // Ignore short words like "a", "is", etc.

  // Score each knowledge record
  const scored = allKnowledge.map(k => {
    // Count keyword matches in title and content
    const titleMatches = userWords.filter(word =>
      k.title.toLowerCase().includes(word)
    ).length;

    const contentMatches = userWords.filter(word =>
      k.content.toLowerCase().includes(word)
    ).length;

    // Title matches are worth more
    const score = titleMatches * 2 + contentMatches;

    return { ...k, score };
  });

  // Sort by score (descending), then by recency
  const sorted = scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Return top N records
  return sorted.slice(0, maxRecords).map(({ score, ...k }) => k);
}