// English typing curriculum — 20 lessons across 7 units.
import type { Lesson, LessonItem } from '../types'
import { enWordsForKeys } from './words.en'

const STARS = { two: 0.97, three: 0.99 }
const MIN = 0.95

const it = (s: string): LessonItem => ({ roman: s })

/** Build word drill items from the set of currently unlocked keys. */
function words(allowed: string, n: number): LessonItem[] {
  return enWordsForKeys(allowed).slice(0, n).map(it)
}

export const EN_LESSONS: Lesson[] = [
  // ---- Home Row (en-01..05) ----
  {
    id: 'en-01', lang: 'en', unit: 'Home Row', title: 'f and j',
    newKeys: ['f', 'j'], minAccuracy: MIN, stars: STARS,
    items: [
      it('fff'), it('jjj'), it('fjf'), it('jfj'), it('ffjj'), it('jjff'),
      it('fjfj'), it('jffj'), it('ffj'), it('jjf'), it('fjjf'), it('jfjf'),
    ],
  },
  {
    id: 'en-02', lang: 'en', unit: 'Home Row', title: 'd and k',
    newKeys: ['d', 'k'], minAccuracy: MIN, stars: STARS,
    items: [
      it('ddd'), it('kkk'), it('dkd'), it('kdk'), it('ddkk'), it('kkdd'),
      it('fjdk'), it('dkfj'), it('jdkf'), it('kfjd'), it('dadd'), it('kakk'),
    ],
  },
  {
    id: 'en-03', lang: 'en', unit: 'Home Row', title: 's and l',
    newKeys: ['s', 'l'], minAccuracy: MIN, stars: STARS,
    items: [
      it('sss'), it('lll'), it('sls'), it('lsl'), it('sskl'), it('lldf'),
      it('asdf'), it('jkl'), it('flask'), it('lass'), it('sad'), it('all'),
    ],
  },
  {
    id: 'en-04', lang: 'en', unit: 'Home Row', title: 'a and semicolon',
    newKeys: ['a', ';'], minAccuracy: MIN, stars: STARS,
    items: [
      it('aaa'), it(';;;'), it('a;a'), it(';a;'), it('asdf'), it('jkl;'),
      it('ask'), it('lad'), it('sad'), it('dad'), it('lass'), it('flask'),
    ],
  },
  {
    id: 'en-05', lang: 'en', unit: 'Home Row', title: 'g and h',
    newKeys: ['g', 'h'], minAccuracy: MIN, stars: STARS,
    items: [
      it('ggg'), it('hhh'), it('ghg'), it('hgh'), it('gas'), it('has'),
      it('had'), it('hash'), it('half'), it('glad'),
      ...words('asdfghjkl', 6),
    ],
  },
  // ---- Top Row (en-06..09) ----
  {
    id: 'en-06', lang: 'en', unit: 'Top Row', title: 'e and i',
    newKeys: ['e', 'i'], minAccuracy: MIN, stars: STARS,
    items: [
      it('eee'), it('iii'), it('eie'), it('iei'), it('die'), it('she'),
      it('like'), it('life'), it('side'), it('idea'), it('field'), it('shield'),
    ],
  },
  {
    id: 'en-07', lang: 'en', unit: 'Top Row', title: 'r and u',
    newKeys: ['r', 'u'], minAccuracy: MIN, stars: STARS,
    items: [
      it('rrr'), it('uuu'), it('rur'), it('uru'), it('rude'), it('sure'),
      it('true'), it('hour'), it('rule'), it('user'), it('ruler'), it('aside'),
    ],
  },
  {
    id: 'en-08', lang: 'en', unit: 'Top Row', title: 't and y',
    newKeys: ['t', 'y'], minAccuracy: MIN, stars: STARS,
    items: [
      it('ttt'), it('yyy'), it('tyt'), it('yty'), it('try'), it('they'),
      it('style'), it('dusty'), it('hasty'), it('utility'), it('layer'), it('truly'),
    ],
  },
  {
    id: 'en-09', lang: 'en', unit: 'Top Row', title: 'w o q p',
    newKeys: ['w', 'o', 'q', 'p'], minAccuracy: MIN, stars: STARS,
    items: [
      it('woo'), it('quo'), it('pop'), it('power'), it('quote'), it('owls'),
      it('proud'), it('write'), it('wisely'), it('output'), it('purpose'), it('quietly'),
    ],
  },
  // ---- Bottom Row (en-10..12) ----
  {
    id: 'en-10', lang: 'en', unit: 'Bottom Row', title: 'n and m',
    newKeys: ['n', 'm'], minAccuracy: MIN, stars: STARS,
    items: [
      it('nnn'), it('mmm'), it('nmn'), it('mnm'), it('name'), it('main'),
      it('mind'), it('money'), it('moment'), it('manner'), it('minute'), it('common'),
    ],
  },
  {
    id: 'en-11', lang: 'en', unit: 'Bottom Row', title: 'v c b',
    newKeys: ['v', 'c', 'b'], minAccuracy: MIN, stars: STARS,
    items: [
      it('vvv'), it('ccc'), it('bbb'), it('vcb'), it('voice'), it('brave'),
      it('cabin'), it('became'), it('cover'), it('vibrant'), it('combine'), it('balance'),
    ],
  },
  {
    id: 'en-12', lang: 'en', unit: 'Bottom Row', title: 'x z comma period',
    newKeys: ['x', 'z', ',', '.'], minAccuracy: MIN, stars: STARS,
    items: [
      it('xxx'), it('zzz'), it('x,z'), it('z.x'), it('zebra'), it('mixed'),
      it('crazy'), it('maze'), it('boxed'), it('fuzzy'), it('lazy, dozy.'), it('vexed, zoned.'),
    ],
  },
  // ---- Shift & Caps (en-13..14) ----
  {
    id: 'en-13', lang: 'en', unit: 'Shift & Caps', title: 'Capital letters',
    newKeys: ['Shift'], minAccuracy: MIN, stars: STARS,
    items: [
      it('The cat sat on the mat.'),
      it('She walked to the park today.'),
      it('We are learning to type well.'),
      it('My name is on the list.'),
      it('Read a book every single day.'),
      it('Type slowly and stay accurate.'),
      it('Good habits build over time.'),
      it('Every morning brings a chance.'),
      it('Practice makes you much faster.'),
      it('Keep your eyes on the screen.'),
    ],
  },
  {
    id: 'en-14', lang: 'en', unit: 'Shift & Caps', title: 'Proper names',
    newKeys: ['Shift'], minAccuracy: MIN, stars: STARS,
    items: [
      it('Anna and Ravi went to Pokhara.'),
      it('London and Paris are in Europe.'),
      it('Mount Everest is in Nepal.'),
      it('Maria spoke with John on Monday.'),
      it('The Ganges flows through India.'),
      it('Sara visited Tokyo last August.'),
      it('David and Emma study at Oxford.'),
      it('Kathmandu is a busy capital city.'),
      it('Sam left for Berlin on Friday.'),
      it('The Amazon is a mighty river.'),
    ],
  },
  // ---- Punctuation (en-15..16) ----
  {
    id: 'en-15', lang: 'en', unit: 'Punctuation', title: 'Apostrophe and quotes',
    newKeys: ["'", '"'], minAccuracy: MIN, stars: STARS,
    items: [
      it("It's a lovely day, isn't it?"),
      it('"Hello," she said with a smile.'),
      it("Don't forget to lock the door."),
      it('"Stop," he shouted from afar.'),
      it("We can't wait for the weekend."),
      it("That's the best idea you've had."),
      it('"Run!" they cried in unison.'),
      it("I'm sure you'll do just fine."),
      it("She's reading a writer's notes."),
      it('"Yes," I replied without doubt.'),
    ],
  },
  {
    id: 'en-16', lang: 'en', unit: 'Punctuation', title: 'Marks and symbols',
    newKeys: ['!', '?', '-', ':', ';'], minAccuracy: MIN, stars: STARS,
    items: [
      it('Wait! Did you hear that sound?'),
      it('Bring three things: pen, paper, ink.'),
      it('The well-known author arrived; we clapped.'),
      it('Is it ready? Yes - almost done!'),
      it('Note: practice daily; rest weekly.'),
      it('What a day! How time flies, right?'),
      it('Left-handed people type too; no problem.'),
      it('Ready? Set - go! The race began.'),
      it('Remember: slow is smooth; smooth is fast.'),
      it('Up-to-date notes help a lot, truly!'),
    ],
  },
  // ---- Numbers (en-17..18) ----
  {
    id: 'en-17', lang: 'en', unit: 'Numbers', title: 'Number row I',
    newKeys: ['5', '6', '4', '7'], minAccuracy: MIN, stars: STARS,
    items: [
      it('456'), it('567'), it('45 67'), it('747'), it('654'), it('476'),
      it('I have 4 pens and 5 books.'),
      it('Room 67 is on floor 4.'),
      it('We met at 5:45 in the hall.'),
      it('Buy 6 apples and 7 oranges.'),
    ],
  },
  {
    id: 'en-18', lang: 'en', unit: 'Numbers', title: 'Number row II',
    newKeys: ['3', '8', '2', '9', '1', '0'], minAccuracy: MIN, stars: STARS,
    items: [
      it('123'), it('890'), it('102'), it('938'), it('210'), it('389'),
      it('The year was 1990, a cold one.'),
      it('Call me at 9 or after 10 today.'),
      it('There are 28 days in February.'),
      it('Pages 12 to 38 are required.'),
    ],
  },
  // ---- Flow (en-19..20) ----
  {
    id: 'en-19', lang: 'en', unit: 'Flow', title: 'Paragraph drill',
    newKeys: [], minAccuracy: MIN, stars: STARS,
    items: [
      it('Typing well is a skill that grows with patience.'),
      it('Focus on accuracy first, and speed will follow.'),
      it('Each keystroke is a small step toward mastery.'),
      it('Keep your wrists relaxed and your eyes forward.'),
      it('A steady rhythm beats a frantic burst of speed.'),
      it('Mistakes are normal; learn from them and move on.'),
      it('The best typists make typing look effortless.'),
      it('With daily practice, your fingers learn the way.'),
      it('Trust the muscle memory you are building now.'),
      it('Soon the keyboard will feel like a part of you.'),
    ],
  },
  {
    id: 'en-20', lang: 'en', unit: 'Flow', title: 'Capstone test',
    newKeys: [], minAccuracy: MIN, stars: STARS,
    items: [
      it('The quick brown fox jumps over the lazy dog.'),
      it('Pack my box with five dozen liquor jugs.'),
      it('How vexingly quick daft zebras jump!'),
      it('Sphinx of black quartz, judge my vow.'),
      it('Bright vixens jump; dozy fowl quack.'),
      it('The five boxing wizards jump quickly.'),
      it('Jackdaws love my big sphinx of quartz.'),
      it('We promptly judged antique ivory buckles.'),
      it('A mad boxer shot a quick, gloved jab.'),
      it('Crazy Fredrick bought many very exquisite pearls.'),
      it('Jinxed wizards pluck ivy from the big quilt.'),
      it('The job requires extra pluck and zeal from every young wage earner.'),
    ],
  },
]
