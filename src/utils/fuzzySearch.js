export const levenshteinDistance = (s, t) => {
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const arr = [];
  for (let i = 0; i <= t.length; i++) {
    arr[i] = [i];
    for (let j = 1; j <= s.length; j++) {
      arr[i][j] =
        i === 0
          ? j
          : Math.min(
              arr[i - 1][j] + 1,
              arr[i][j - 1] + 1,
              arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
            );
    }
  }
  return arr[t.length][s.length];
};

export const getSimilarity = (s1, s2) => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - levenshteinDistance(longer, shorter)) / parseFloat(longerLength);
};

export const getFuzzyScore = (text, query) => {
  if (!query) return 1.0;
  if (!text) return 0.0;
  text = String(text).toLowerCase();
  query = String(query).toLowerCase();
  
  if (text === query) return 1.0;
  if (text.includes(query)) return 0.95; // slightly lower than perfect match to prioritize exact matches if needed
  
  let maxScore = 0;
  // Split the text into tokens to match against the query
  const tokens = text.split(/[\s/]+/); // Split by space or slash for reg numbers
  
  for (const token of tokens) {
    maxScore = Math.max(maxScore, getSimilarity(token, query));
  }
  
  maxScore = Math.max(maxScore, getSimilarity(text, query));
  return maxScore;
};

export const fuzzyMatch = (text, query, threshold = 0.7) => {
  return getFuzzyScore(text, query) >= threshold;
};
