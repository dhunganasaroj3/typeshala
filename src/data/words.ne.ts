// Nepali (romanized) corpus. The Devanagari `dev` field is computed at module
// load by the transliteration engine so it always matches the canonical roman
// keystroke sequence used for grading.
import { toDevanagari } from '../engine/transliterate'

export interface NeWord {
  /** Canonical roman keystroke sequence (what is graded). */
  roman: string
  /** Devanagari rendering, computed from `roman` by the engine. */
  dev: string
  /** Optional English gloss. */
  en?: string
}

const mk = (roman: string, en?: string): NeWord => ({
  roman,
  dev: toDevanagari(roman),
  en,
})

// Tier 1 — bare-consonant / inherent-a simple words.
export const NE_TIER1: NeWord[] = [
  mk('ghara', 'house'),
  mk('mana', 'mind'),
  mk('kalama', 'pen'),
  mk('sadaka', 'road'),
  mk('nagara', 'city'),
  mk('jala', 'water'),
  mk('phala', 'fruit'),
  mk('bana', 'forest'),
  mk('dhana', 'wealth'),
  mk('kamala', 'lotus'),
  mk('samaya', 'time'),
  mk('barpha', 'snow'),
  mk('rata', 'night'),
  mk('hala', 'plough'),
  mk('tala', 'pond'),
  mk('payara', 'love'),
]

// Tier 2 — matra (vowel sign) words.
export const NE_TIER2: NeWord[] = [
  mk('aamaa', 'mother'),
  mk('didii', 'elder sister'),
  mk('guru', 'teacher'),
  mk('mero', 'my'),
  mk('baaTo', 'path'),
  mk('paanii', 'water'),
  mk('haawaa', 'wind'),
  mk('kitaaba', 'book'),
  mk('phula', 'flower'),
  mk('saathii', 'friend'),
  mk('dherai', 'many'),
  mk('thulo', 'big'),
  mk('saano', 'small'),
  mk('raamro', 'good'),
  mk('naako', 'nose'),
  mk('aakaasha', 'sky'),
]

// Tier 3 — nasal / sign words (anusvara `*`, chandrabindu `~`, visarga `H`).
export const NE_TIER3: NeWord[] = [
  mk('sa*saara', 'world'),
  mk('gaau~', 'village'),
  mk('haa~sa', 'goose'),
  mk('chandra', 'moon'),
  mk('a*sha', 'part'),
  mk('si*ha', 'lion'),
  mk('ba*sha', 'lineage'),
  mk('duHkha', 'sorrow'),
  mk('su~Ga', 'snout'),
  mk('ra*ga', 'colour'),
  mk('ti~Ga', 'mountain peak'),
  mk('chi~Do', 'pinch'),
]

// Tier 4 — conjunct (half-letter) words.
export const NE_TIER4: NeWord[] = [
  mk('namaste', 'greetings'),
  mk('mitra', 'friend'),
  mk('gyaana', 'knowledge'),
  mk('vidyaalaya', 'school'),
  mk('prashna', 'question'),
  mk('raamro', 'good'),
  mk('shree', 'sir / honorific'),
  mk('vidyaarthii', 'student'),
  mk('svatantra', 'free'),
  mk('chhaatra', 'student'),
  mk('raaShTra', 'nation'),
  mk('saahitya', 'literature'),
  mk('sa*skriti', 'culture'),
  mk('pustaka', 'book'),
]

// Tier 5 — verb endings (trailing halanta).
export const NE_TIER5: NeWord[] = [
  mk('chha', 'is'),
  mk('chhan', 'are'),
  mk('garchha', 'does'),
  mk('garchhan', 'they do'),
  mk('garnuhos', 'please do'),
  mk('gardaichhu', 'I am doing'),
  mk('khaanchhu', 'I eat'),
  mk('jaanchha', 'goes'),
  mk('aaunchha', 'comes'),
  mk('baschha', 'sits'),
  mk('hunchha', 'becomes'),
  mk('paryo', 'happened'),
]

// ~20 full sentences. Roman includes '.' which the engine renders as danda (।).
export const NE_SENTENCES: NeWord[] = [
  mk('namaste. tapaaii*laaii kasto chha.', 'Hello. How are you?'),
  mk('mero naama ke ho.', 'What is my name?'),
  mk('ma nepaalii hu~.', 'I am Nepali.'),
  mk('yo mero desha ho.', 'This is my country.'),
  mk('haamii skuula jaanchhau~.', 'We go to school.'),
  mk('aaja maausama raamro chha.', 'Today the weather is good.'),
  mk('timii kahaa~ jaa~dai chhau.', 'Where are you going?'),
  mk('malaaii nepaalii khaanaa man parchha.', 'I like Nepali food.'),
  mk('uhaa~ haamro guru hunuhunchha.', 'He is our teacher.'),
  mk('kitaaba paDhnu raamro baani ho.', 'Reading books is a good habit.'),
  mk('paharaa baaTa paanii jharchha.', 'Water falls from the cliff.'),
  mk('saathiiharu sa~ga khelnu ramaailo hunchha.', 'Playing with friends is fun.'),
  mk('bihaana sabai jana uThchhan.', 'Everyone wakes up in the morning.'),
  mk('haamii sadhai~ satya bolnu parchha.', 'We must always speak the truth.'),
  mk('phulaharu baginchaa maa phulchhan.', 'Flowers bloom in the garden.'),
  mk('aakaasha maa taaraaharu Tilmilaauchhan.', 'Stars twinkle in the sky.'),
  mk('mehanata gare saphalataa paainchha.', 'With effort, success is found.'),
  mk('nepaala sundara desha ho.', 'Nepal is a beautiful country.'),
  mk('himaala dekhi taraai samma.', 'From the mountains to the plains.'),
  mk('hijo ma ghara maa thie~.', 'Yesterday I was at home.'),
]

// ~10 proverbs (ukhaan).
export const NE_PROVERBS: NeWord[] = [
  mk('jasto ropyo, tyastai phalchha.', 'As you sow, so you reap.'),
  mk('hatra patra, mukha chhyaapra.', 'Haste makes waste.'),
  mk('baagha aayo baagha aayo.', 'Crying wolf.'),
  mk('khaane mukha laaii junga le chhekdaina.', 'A moustache cannot block a hungry mouth.'),
  mk('hera laaii siruphula.', 'Beauty is in the eye of the beholder.'),
  mk('kaaga kartaalii.', 'A useless racket.'),
  mk('jaki laai taki.', 'Tit for tat.'),
  mk('dubai haata ma laDDu.', 'The best of both worlds.'),
  mk('bhainsi aagaadi biin bajaaunu.', 'Casting pearls before swine.'),
  mk('aafnu dhaaka, aafnu shaakha.', 'Each to their own.'),
]
