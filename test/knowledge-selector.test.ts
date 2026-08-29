import { selectRelevantKnowledge } from '../src/utils/knowledge-selector';

describe('Knowledge Selector', () => {
  const mockKnowledge = [
    {
      id: 'k1',
      botId: 'bot_1',
      title: 'Opening Hours',
      content: 'We are open Monday to Friday from 8:30 AM until 5 PM.',
      createdAt: '2026-08-29'
    },
    {
      id: 'k2',
      botId: 'bot_1',
      title: 'Phone Support',
      content: 'Call us at 1-800-555-0123 for immediate assistance.',
      createdAt: '2026-08-29'
    },
    {
      id: 'k3',
      botId: 'bot_1',
      title: 'Pricing',
      content: 'Plans start at $9/month with unlimited features.',
      createdAt: '2026-08-29'
    },
  ];

  test('should select relevant knowledge by keyword match', () => {
    const result = selectRelevantKnowledge('What time do you open?', mockKnowledge, 5);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toBe('Opening Hours');
  });

  test('should match on phone keyword', () => {
    const result = selectRelevantKnowledge('How do I call support?', mockKnowledge, 5);
    expect(result.some(k => k.title === 'Phone Support')).toBe(true);
  });

  test('should return empty array when no knowledge exists', () => {
    const result = selectRelevantKnowledge('hello', [], 5);
    expect(result).toEqual([]);
  });

  test('should limit results to maxRecords', () => {
    const result = selectRelevantKnowledge('help', mockKnowledge, 1);
    expect(result.length).toBeLessThanOrEqual(1);
  });

  test('should prioritize title matches', () => {
    const result = selectRelevantKnowledge('hours opening', mockKnowledge, 5);
    expect(result[0].title).toBe('Opening Hours');
  });
});