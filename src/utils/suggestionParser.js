export function parseSuggestion(suggestion) {
  const sections = {
    explanation: '',
    fixedHTML: '',
    steps: [],
    wcag: ''
  };

  // Try to split by section headers
  const explanationMatch = suggestion.match(/### Concise Technical Explanation([\s\S]*?)(?=###)/i);
  const fixedHTMLMatch = suggestion.match(/### Fixed HTML Snippet([\s\S]*?)(?=###)/i);
  const stepsMatch = suggestion.match(/### Implementation Steps([\s\S]*?)(?=###)/i);
  const wcagMatch = suggestion.match(/### WCAG Reference([\s\S]*)/i);

  if (explanationMatch) sections.explanation = explanationMatch[1].trim();
  if (fixedHTMLMatch) sections.fixedHTML = fixedHTMLMatch[1].trim();
  if (stepsMatch) {
    // Extract steps as array
    const stepsText = stepsMatch[1].trim();
    sections.steps = stepsText.split('\n')
      .map(step => step.replace(/^\d+\.\s*/, '').trim())
      .filter(step => step.length > 0);
  }
  if (wcagMatch) sections.wcag = wcagMatch[1].trim();

  // Fallback to raw suggestion if parsing fails
  if (!sections.explanation && !sections.fixedHTML) {
    return {
      explanation: suggestion,
      fixedHTML: '',
      steps: [],
      wcag: ''
    };
  }

  return sections;
}