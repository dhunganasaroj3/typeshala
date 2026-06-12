// Nepali (romanized) typing curriculum — 20 lessons.
// `roman` is the graded keystroke sequence; `dev` is engine-rendered Devanagari.
import type { Lesson, LessonItem } from '../types'
import { toDevanagari } from '../engine/transliterate'
import type { NeWord } from './words.ne'
import {
  NE_TIER1,
  NE_TIER2,
  NE_TIER3,
  NE_TIER4,
  NE_TIER5,
  NE_SENTENCES,
  NE_PROVERBS,
} from './words.ne'

const STARS = { two: 0.97, three: 0.99 }
const MIN = 0.95

/** Build a LessonItem from a raw roman string (dev computed by engine). */
const it = (roman: string, en?: string): LessonItem => ({
  roman,
  dev: toDevanagari(roman),
  en,
})

/** Adapt corpus NeWords into LessonItems. */
const fromWords = (ws: NeWord[]): LessonItem[] =>
  ws.map((w) => ({ roman: w.roman, dev: w.dev, en: w.en }))

export const NE_LESSONS: Lesson[] = [
  // ---- Concept (ne-01) ----
  {
    id: 'ne-01', lang: 'ne', unit: 'Concept', title: 'inherent अ (ka, ma, na)',
    newKeys: ['a', 'k', 'g', 'm', 'n', 'r', 'l', 's', 'h'], minAccuracy: MIN, stars: STARS,
    items: [
      it('ka', 'ka'), it('ma', 'ma'), it('na', 'na'), it('ra', 'ra'), it('la', 'la'),
      it('sa', 'sa'), it('ha', 'ha'), it('ga', 'ga'),
      it('kama'), it('mana', 'mind'), it('nara', 'man'), it('hala', 'plough'),
    ],
  },
  // ---- Consonants (ne-02..03) ----
  {
    id: 'ne-02', lang: 'ne', unit: 'Consonants', title: 'क ख ग घ — gutturals',
    newKeys: ['k', 'kh', 'g', 'gh'], minAccuracy: MIN, stars: STARS,
    items: [
      it('ka'), it('kha'), it('ga'), it('gha'),
      it('ghara', 'house'), it('khana', 'to eat'), it('gagana', 'sky'),
      it('kalama', 'pen'), it('nagara', 'city'), it('khela', 'game'),
      it('garala', 'poison'), it('lagana', 'devotion'),
    ],
  },
  {
    id: 'ne-03', lang: 'ne', unit: 'Consonants', title: 'च ज त द प ब — common stops',
    newKeys: ['ch', 'j', 't', 'd', 'p', 'b', 'w', 'y'], minAccuracy: MIN, stars: STARS,
    items: [
      it('cha'), it('ja'), it('ta'), it('da'), it('pa'), it('ba'), it('ya'), it('wa'),
      it('jala', 'water'), it('phala', 'fruit'), it('bana', 'forest'),
      it('payara', 'love'), it('sadaka', 'road'), it('dhana', 'wealth'),
    ],
  },
  // ---- Matras (ne-04..07), one family per lesson ----
  {
    id: 'ne-04', lang: 'ne', unit: 'Matras', title: 'आ-कार (aa)',
    newKeys: ['aa'], minAccuracy: MIN, stars: STARS,
    items: [
      it('kaa'), it('maa'), it('naa'), it('raa'), it('laa'),
      it('aamaa', 'mother'), it('haawaa', 'wind'), it('baaTo', 'path'),
      it('kitaaba', 'book'), it('saano', 'small'), it('raamro', 'good'), it('naako', 'nose'),
    ],
  },
  {
    id: 'ne-05', lang: 'ne', unit: 'Matras', title: 'इ ई (i / ii)',
    newKeys: ['i', 'ii'], minAccuracy: MIN, stars: STARS,
    items: [
      it('ki'), it('mi'), it('di'), it('kii'), it('dii'), it('nii'),
      it('didii', 'elder sister'), it('paanii', 'water'), it('saathii', 'friend'),
      it('naani', 'child'), it('siti'), it('mihina', 'fine'),
    ],
  },
  {
    id: 'ne-06', lang: 'ne', unit: 'Matras', title: 'उ ऊ (u / uu)',
    newKeys: ['u', 'uu'], minAccuracy: MIN, stars: STARS,
    items: [
      it('ku'), it('gu'), it('tu'), it('kuu'), it('duu'), it('puu'),
      it('guru', 'teacher'), it('dhulo', 'dust'), it('phula', 'flower'),
      it('thulo', 'big'), it('kukura', 'dog'), it('mukha', 'face'),
    ],
  },
  {
    id: 'ne-07', lang: 'ne', unit: 'Matras', title: 'ए ऐ ओ औ (e ai o au)',
    newKeys: ['e', 'ai', 'o', 'au'], minAccuracy: MIN, stars: STARS,
    items: [
      it('ke'), it('me'), it('ko'), it('mo'), it('kai'), it('kau'),
      it('mero', 'my'), it('dherai', 'many'), it('baato', 'path'),
      it('kaile', 'when'), it('aausadhi', 'medicine'), it('mausama', 'weather'),
    ],
  },
  // ---- Aspirates (ne-08..09) ----
  {
    id: 'ne-08', lang: 'ne', unit: 'Aspirates', title: 'ख घ छ झ (kh gh chh jh)',
    newKeys: ['kh', 'gh', 'chh', 'jh'], minAccuracy: MIN, stars: STARS,
    items: [
      it('kha'), it('gha'), it('chha'), it('jha'),
      it('khaanaa', 'food'), it('ghara', 'house'), it('chhaataa', 'umbrella'),
      it('jhola', 'bag'), it('chha', 'is'), it('majha', 'middle'),
    ],
  },
  {
    id: 'ne-09', lang: 'ne', unit: 'Aspirates', title: 'थ ध फ भ (th dh ph bh)',
    newKeys: ['th', 'dh', 'ph', 'bh'], minAccuracy: MIN, stars: STARS,
    items: [
      it('tha'), it('dha'), it('pha'), it('bha'),
      it('bhaata', 'cooked rice'), it('dudha', 'milk'), it('pharaka', 'difference'),
      it('thaalii', 'plate'), it('bhaai', 'younger brother'), it('dhana', 'wealth'),
    ],
  },
  // ---- Retroflex BOSS (ne-10..11) ----
  {
    id: 'ne-10', lang: 'ne', unit: 'Retroflex', title: 'ट ठ ड ढ ण — capitals',
    newKeys: ['T', 'Th', 'D', 'Dh', 'N'], minAccuracy: MIN, stars: STARS,
    items: [
      it('Ta'), it('Tha'), it('Da'), it('Dha'), it('Na'),
      it('Thulo', 'big'), it('Dhokaa', 'door'), it('baaTo', 'path'),
      it('ghaNTaa', 'hour'), it('khaaTa', 'bed'), it('DaaDaa', 'ridge'),
    ],
  },
  {
    id: 'ne-11', lang: 'ne', unit: 'Retroflex', title: 'minimal pairs: ता vs टा',
    newKeys: ['t', 'T', 'd', 'D'], minAccuracy: MIN, stars: STARS,
    items: [
      it('taalaa', 'lock'), it('Taalaa', 'patch'),
      it('daara'), it('Daara', 'branch'),
      it('paThaaii', 'sent'), it('paTaka', 'time'), it('kaaTnu', 'to cut'),
      it('miTho', 'tasty'), it('roTii', 'bread'), it('uThnu', 'to rise'),
    ],
  },
  // ---- Sibilants & signs (ne-12) ----
  {
    id: 'ne-12', lang: 'ne', unit: 'Sibilants', title: 'श ष स + ं ँ ः',
    newKeys: ['sh', 'Sh', 'S', 'M', '~', 'H'], minAccuracy: MIN, stars: STARS,
    items: fromWords(NE_TIER3).slice(0, 12),
  },
  // ---- Conjuncts BOSS (ne-13..14) ----
  {
    id: 'ne-13', lang: 'ne', unit: 'Conjuncts', title: 'half-letters: नमस्ते राम्रो मित्र',
    newKeys: ['conjuncts'], minAccuracy: MIN, stars: STARS,
    items: [
      it('namaste', 'greetings'), it('raamro', 'good'), it('mitra', 'friend'),
      it('prashna', 'question'), it('svatantra', 'free'), it('chhaatra', 'student'),
      it('pustaka', 'book'), it('sapna', 'dream'), it('vidyaalaya', 'school'),
      it('shabda', 'word'),
    ],
  },
  {
    id: 'ne-14', lang: 'ne', unit: 'Conjuncts', title: 'क्ष ज्ञ त्र (ksha gya tra)',
    newKeys: ['ksh', 'gy', 'tra'], minAccuracy: MIN, stars: STARS,
    items: [
      it('ksha'), it('gya'), it('tra'),
      it('gyaana', 'knowledge'), it('kshamaa', 'forgiveness'), it('mitra', 'friend'),
      it('raaShTra', 'nation'), it('vigyaana', 'science'), it('chhatra', 'umbrella'),
      it('vidyaarthii', 'student'),
    ],
  },
  // ---- Verb endings (ne-15) ----
  {
    id: 'ne-15', lang: 'ne', unit: 'Verbs', title: 'trailing halanta: छन् गर्छ गर्नुहोस्',
    newKeys: ['halanta'], minAccuracy: MIN, stars: STARS,
    items: fromWords(NE_TIER5),
  },
  // ---- Top words (ne-16..17) ----
  {
    id: 'ne-16', lang: 'ne', unit: 'Words', title: 'common words I',
    newKeys: [], minAccuracy: MIN, stars: STARS,
    items: [...fromWords(NE_TIER1), ...fromWords(NE_TIER2).slice(0, 6)],
  },
  {
    id: 'ne-17', lang: 'ne', unit: 'Words', title: 'common words II',
    newKeys: [], minAccuracy: MIN, stars: STARS,
    items: [...fromWords(NE_TIER2).slice(6), ...fromWords(NE_TIER4)],
  },
  // ---- Sentences (ne-18..19) ----
  {
    id: 'ne-18', lang: 'ne', unit: 'Sentences', title: 'everyday sentences I',
    newKeys: ['.'], minAccuracy: MIN, stars: STARS,
    items: fromWords(NE_SENTENCES.slice(0, 10)),
  },
  {
    id: 'ne-19', lang: 'ne', unit: 'Sentences', title: 'everyday sentences II + अंक',
    newKeys: ['0-9'], minAccuracy: MIN, stars: STARS,
    items: [
      ...fromWords(NE_SENTENCES.slice(10)),
      it('0123456789', 'numerals ०-९'),
    ],
  },
  // ---- Proverbs capstone (ne-20) ----
  {
    id: 'ne-20', lang: 'ne', unit: 'Proverbs', title: 'उखान capstone',
    newKeys: [], minAccuracy: MIN, stars: STARS,
    items: fromWords(NE_PROVERBS),
  },
]
