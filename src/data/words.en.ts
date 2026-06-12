// English word & sentence corpus for tests, lessons and games.

/** ~300 common English words, lowercase, letters only. */
export const EN_WORDS: string[] = [
  'the', 'be', 'to', 'of', 'and', 'in', 'that', 'have', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but',
  'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'will', 'one',
  'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
  'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time',
  'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good',
  'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only',
  'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
  'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any',
  'these', 'give', 'day', 'most', 'us', 'man', 'find', 'here', 'thing', 'many',
  'great', 'where', 'much', 'before', 'too', 'such', 'each', 'between', 'high', 'old',
  'same', 'tell', 'does', 'set', 'three', 'state', 'never', 'become', 'must', 'turn',
  'place', 'house', 'world', 'mean', 'every', 'live', 'small', 'large', 'last', 'next',
  'left', 'right', 'name', 'home', 'water', 'hand', 'part', 'eye', 'long', 'down',
  'school', 'group', 'play', 'word', 'still', 'should', 'home', 'read', 'keep', 'begin',
  'start', 'might', 'show', 'help', 'talk', 'turn', 'try', 'call', 'move', 'feel',
  'leave', 'put', 'mean', 'hold', 'open', 'walk', 'win', 'offer', 'love', 'bring',
  'gold', 'glad', 'flag', 'fall', 'dash', 'lash', 'half', 'ask', 'lass', 'flask',
  'hall', 'salad', 'shall', 'kill', 'fill', 'sad', 'lad', 'gas', 'has', 'had',
  'jak', 'slide', 'like', 'true', 'quote', 'power', 'tower', 'write', 'their', 'quiet',
  'voice', 'zebra', 'mixed', 'maze', 'value', 'box', 'crazy', 'jazz', 'buzz', 'fuzzy',
  'apple', 'table', 'chair', 'water', 'paper', 'phone', 'green', 'brown', 'black', 'white',
  'happy', 'angry', 'quick', 'slow', 'fast', 'light', 'dark', 'night', 'early', 'late',
  'sound', 'music', 'dance', 'smile', 'laugh', 'dream', 'sleep', 'awake', 'alive', 'human',
  'money', 'price', 'value', 'trade', 'buy', 'sell', 'store', 'plan', 'idea', 'point',
  'level', 'order', 'power', 'force', 'speed', 'space', 'earth', 'plant', 'river', 'ocean',
  'storm', 'cloud', 'rain', 'snow', 'wind', 'fire', 'stone', 'metal', 'glass', 'wood',
  'cloth', 'color', 'shape', 'round', 'sharp', 'flat', 'thick', 'thin', 'wide', 'deep',
  'clean', 'dirty', 'fresh', 'dry', 'wet', 'cold', 'warm', 'heat', 'cool', 'ice',
  'food', 'bread', 'fruit', 'sweet', 'sour', 'salt', 'spice', 'taste', 'drink', 'feast',
]

/** ~20 natural English sentences. */
export const EN_SENTENCES: string[] = [
  'the quick brown fox jumps over the lazy dog',
  'she sells sea shells by the sea shore',
  'a journey of a thousand miles begins with a single step',
  'all that glitters is not gold',
  'practice makes a person perfect over time',
  'the early bird catches the worm every morning',
  'better late than never but never late is better',
  'actions speak louder than words ever could',
  'a picture is worth a thousand spoken words',
  'where there is a will there is always a way',
  'the pen is mightier than the mighty sword',
  'honesty is the best policy in every situation',
  'two heads are often better than just one',
  'when in rome do as the romans tend to do',
  'every cloud has a silver lining behind it',
  'you cannot judge a book by its bright cover',
  'the grass is always greener on the other side',
  'rome was not built in a single short day',
  'an apple a day keeps the doctor far away',
  'birds of a feather flock together in the sky',
]

/** Words whose every letter is contained in allowedKeys. */
export function enWordsForKeys(allowedKeys: string): string[] {
  const allowed = new Set(allowedKeys.toLowerCase().split(''))
  return EN_WORDS.filter((w) => {
    for (const ch of w) {
      if (!allowed.has(ch)) return false
    }
    return true
  })
}
