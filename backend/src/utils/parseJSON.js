/**
 * Remove word/char repetition loops from text, even when inside a JSON string.
 */
const removeRepetitionLoop = (text) => {
  let s = text.replace(/(\b\w{3,}\b)([ \t]+\1){3,}/gi, (match, word) => word);
  s = s.replace(/([^\s])\1{5,}/g, (match, ch) => ch.repeat(2));
  return s;
};

/**
 * Extract and parse the last complete JSON object/array from LLM output.
 * Models often write planning text before the actual JSON — we want the last one.
 */
const parseJSON = (text) => {
  let s = removeRepetitionLoop(String(text ?? ''));

  // Strip markdown fences
  s = s.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  // Find the LAST '{' or '[' that starts a complete valid JSON block
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === '}' || s[i] === ']') {
      const closing = s[i];
      const opening = closing === '}' ? '{' : '[';
      for (let j = i - 1; j >= 0; j--) {
        if (s[j] === opening) {
          try {
            return JSON.parse(s.slice(j, i + 1));
          } catch (_) {}
        }
      }
    }
  }

  throw new Error(`Malformed JSON in: ${s.slice(0, 120)}`);
};

module.exports = { parseJSON, removeRepetitionLoop };
