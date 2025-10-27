/**
 * Text Analysis Utilities
 * Used for scoring founder assessment responses
 */

/**
 * Count occurrences of specific keywords in text (case-insensitive)
 */
export const countWords = (text: string, keywords: string[]): number => {
  if (!text) return 0;
  const lowerText = text.toLowerCase();
  return keywords.filter(keyword =>
    lowerText.includes(keyword.toLowerCase())
  ).length;
};

/**
 * Extract all numbers from text
 */
export const extractNumbers = (text: string): number[] => {
  if (!text) return [];
  const matches = text.match(/\d+/g);
  return matches ? matches.map(Number) : [];
};

/**
 * Check if text contains any time-related words
 */
export const hasTimeIndicators = (text: string): boolean => {
  const timeWords = ['hour', 'day', 'week', 'month', 'year', 'minute'];
  return timeWords.some(word =>
    text.toLowerCase().includes(word)
  );
};

/**
 * Check if text contains cost/money indicators
 */
export const hasCostIndicators = (text: string): boolean => {
  const costWords = ['dollar', '$', 'cost', 'expense', 'loss', 'waste', 'paid', 'price'];
  return costWords.some(word =>
    text.toLowerCase().includes(word)
  );
};

/**
 * Count specific concepts in text (more flexible than exact keyword matching)
 */
export const countConcepts = (text: string, concepts: string[]): number => {
  if (!text) return 0;
  const lowerText = text.toLowerCase();
  let count = 0;

  concepts.forEach(concept => {
    // Split multi-word concepts
    const words = concept.toLowerCase().split(' ');
    const allWordsPresent = words.every(word => lowerText.includes(word));
    if (allWordsPresent) count++;
  });

  return count;
};

/**
 * Check if text has specific examples (looks for names, numbers, dates)
 */
export const hasSpecificExamples = (text: string): boolean => {
  if (!text) return false;

  // Check for proper names (capitalized words)
  const hasProperNames = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(text);

  // Check for numbers
  const hasNumbers = /\d+/.test(text);

  // Check for quotes (indicates direct customer feedback)
  const hasQuotes = text.includes('"') || text.includes("'");

  return hasProperNames || hasNumbers || hasQuotes;
};

/**
 * Check if text contains quantified statements
 */
export const hasQuantification = (text: string): boolean => {
  if (!text) return false;

  const hasNumbers = /\d+/.test(text);
  const hasUnits = hasTimeIndicators(text) || hasCostIndicators(text);

  return hasNumbers && hasUnits;
};

/**
 * Parse duration from text (e.g., "3 years" -> 36 months)
 * Returns duration in months
 */
export const parseDuration = (text: string): number => {
  const match = text.match(/(\d+)\s*(year|month|week|day)/i);
  if (!match) return 0;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'year':
      return value * 12;
    case 'month':
      return value;
    case 'week':
      return value / 4;
    case 'day':
      return value / 30;
    default:
      return 0;
  }
};

/**
 * Calculate simple text similarity (Jaccard similarity)
 * Returns value between 0 and 1
 */
export const calculateTextSimilarity = (text1: string, text2: string): number => {
  if (!text1 || !text2) return 0;

  // Convert to word sets
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  // Calculate intersection
  const intersection = new Set([...words1].filter(word => words2.has(word)));

  // Calculate union
  const union = new Set([...words1, ...words2]);

  // Jaccard similarity
  return intersection.size / union.size;
};

/**
 * Check if text has personal experience indicators
 */
export const hasPersonalExperience = (text: string): boolean => {
  const personalIndicators = [
    'i experienced', 'i dealt with', 'my team', 'i spent',
    'i struggled', 'i had to', 'happened to me', 'i was',
    'i worked', 'my company', 'i faced', 'i encountered'
  ];

  return personalIndicators.some(indicator =>
    text.toLowerCase().includes(indicator)
  );
};

/**
 * Check if text has validation/demand indicators
 */
export const hasValidationIndicators = (text: string): boolean => {
  const validationWords = [
    'others', 'customers', 'users', 'people', 'companies',
    'asked', 'requested', 'shared', 'signed', 'committed',
    'loi', 'letter of intent', 'agreement', 'interested'
  ];

  return validationWords.some(word =>
    text.toLowerCase().includes(word)
  );
};

/**
 * Check if text contains learning indicators
 */
export const hasLearningIndicators = (text: string): boolean => {
  const learningWords = [
    'realized', 'discovered', 'feedback', 'learned',
    'found out', 'surprised', 'didn\'t expect', 'thought',
    'assumed', 'actually', 'turns out', 'wrong'
  ];

  return learningWords.some(word =>
    text.toLowerCase().includes(word)
  );
};

/**
 * Get word count
 */
export const getWordCount = (text: string): number => {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
};

/**
 * Check if text length meets minimum (with tolerance for quality over quantity)
 */
export const meetsMinimumLength = (text: string, minWords: number): boolean => {
  const wordCount = getWordCount(text);
  return wordCount >= minWords;
};
