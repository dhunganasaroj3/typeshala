// Roman -> Devanagari mapping tables (Ashesh-style case conventions).

export const VIRAMA = '्' // ्

export const CONSONANTS: Record<string, string> = {
  k: 'क', kh: 'ख', g: 'ग', gh: 'घ', G: 'ङ',
  ch: 'च', c: 'च', chh: 'छ', Ch: 'छ', j: 'ज', z: 'ज', jh: 'झ', Y: 'ञ',
  T: 'ट', Th: 'ठ', D: 'ड', Dh: 'ढ', N: 'ण',
  t: 'त', th: 'थ', d: 'द', dh: 'ध', n: 'न',
  p: 'प', ph: 'फ', f: 'फ', b: 'ब', bh: 'भ', m: 'म',
  y: 'य', r: 'र', l: 'ल', w: 'व', v: 'व',
  sh: 'श', Sh: 'ष', S: 'ष', s: 'स', h: 'ह',
  x: 'क्ष', ksh: 'क्ष', gy: 'ज्ञ',
}

export const VOWELS: Record<string, string> = {
  a: 'अ', aa: 'आ', A: 'आ', i: 'इ', ii: 'ई', ee: 'ई', I: 'ई',
  u: 'उ', uu: 'ऊ', oo: 'ऊ', U: 'ऊ', e: 'ए', ai: 'ऐ', o: 'ओ', au: 'औ', Ri: 'ऋ',
}

export const MATRAS: Record<string, string> = {
  a: '', aa: 'ा', A: 'ा', i: 'ि', ii: 'ी', ee: 'ी', I: 'ी',
  u: 'ु', uu: 'ू', oo: 'ू', U: 'ू', e: 'े', ai: 'ै', o: 'ो', au: 'ौ', Ri: 'ृ',
}

export const OTHERS: Record<string, string> = {
  M: 'ं', '*': 'ं', '~': 'ँ', H: 'ः', '.': '।', '|': '।', '/': '',
  '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
  '5': '५', '6': '६', '7': '७', '8': '८', '9': '९',
}

export const MAX_TOKEN = 3
