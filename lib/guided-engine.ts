import type { ExamQuestion } from './types'

// ── Missing type detection ────────────────────────────────────────────────────

export type MissingType = 'word' | 'linker' | 'grammar' | 'preposition'

const LINKERS = [
  'however','furthermore','therefore','moreover','nevertheless','consequently',
  'hence','thus','otherwise','meanwhile','besides','nonetheless','instead',
  'indeed','accordingly','similarly','likewise','in contrast','as a result',
  'for example','for instance','that is','in addition','in fact','on the contrary',
  'even so','in turn','what is more','in other words','that said',
]

const GRAMMAR_PATTERNS = [
  /^to\s+\w+/i,           // to discover
  /^having\s+\w+/i,       // having discovered
  /^\w+ing\b/i,           // discovering
  /^(being|been)\s+\w+/i, // being discovered
  /^\w+ed\b/i,            // discovered (past participle alone)
  /^(was|were|had|have|has|will|would|could|should|might|must)\b/i,
  /^(which|who|whose|that)\s/i,
]

const PREPOSITIONS = [
  'in','on','at','by','with','of','for','to','from','about',
  'into','onto','upon','through','over','under','between','among',
  'during','within','beyond','alongside','against','towards','until',
]

export function detectMissingType(q: ExamQuestion): MissingType {
  const opts = Object.values(q.options).map(o => o.toLowerCase().trim())

  // Check if all options are linkers
  const linkerCount = opts.filter(o => LINKERS.some(l => o === l || o.startsWith(l + ',')))
  if (linkerCount.length >= 3) return 'linker'

  // Check grammar patterns (verb forms)
  const grammarCount = opts.filter(o => GRAMMAR_PATTERNS.some(p => p.test(o)))
  if (grammarCount.length >= 3) return 'grammar'

  // Check prepositions
  const prepCount = opts.filter(o => PREPOSITIONS.includes(o))
  if (prepCount.length >= 3) return 'preposition'

  // Default: vocabulary word
  return 'word'
}

export const MISSING_TYPE_INFO: Record<MissingType, {
  label: string; icon: string; color: string
  description: string; strategy: string
}> = {
  word: {
    label: 'Kelime (Anlam)', icon: '📖',
    color: 'border-violet-400 bg-violet-50',
    description: 'Boşluğa anlam/bağlam uyumlu bir kelime geliyor.',
    strategy: 'Cümlenin genel anlamını yakala → pozitif mi, negatif mi? → hangi kelime tam oturur?',
  },
  linker: {
    label: 'Bağlaç (Discourse Marker)', icon: '🔗',
    color: 'border-[#1CB0F6] bg-blue-50',
    description: 'İki cümle veya fikir arasındaki mantıksal ilişkiyi gösteren bir bağlaç geliyor.',
    strategy: 'Öncesi ve sonrasını oku → Zıtlık mı? Neden-Sonuç mu? Ek mi? → Bağlacı seç.',
  },
  grammar: {
    label: 'Dilbilgisi (Yapı)', icon: '⚙️',
    color: 'border-amber-400 bg-amber-50',
    description: 'Fiilin zaman/çekim/yöntem yapısı boşlukta.',
    strategy: 'Aktif mi pasif mi? Zaman uyumu var mı? Subject + ---- + object = mantıklı mı?',
  },
  preposition: {
    label: 'Edat (Preposition)', icon: '🔧',
    color: 'border-rose-400 bg-rose-50',
    description: 'Fiil veya isimden sonra gelen edat kalıbı boşlukta.',
    strategy: 'Önceki fiile bak → sabit kalıp var mı? (conform TO, interfere WITH, result IN...)',
  },
}

// ── Clue word extraction ──────────────────────────────────────────────────────

export interface ClueWord {
  word: string
  type: 'contrast' | 'cause' | 'result' | 'addition' | 'time' | 'negative' | 'reference' | 'emphasis'
  color: string
  explanation: string
}

const CLUE_PATTERNS: Array<{ pattern: RegExp; type: ClueWord['type']; color: string; explanation: string }> = [
  { pattern: /\b(however|although|even though|whereas|while|despite|in spite of|but|yet|on the other hand|nevertheless|nonetheless|on the contrary|in contrast)\b/gi,
    type: 'contrast', color: 'bg-blue-200 text-blue-900', explanation: 'Zıtlık işareti → iki karşıt fikir' },
  { pattern: /\b(because|since|as|due to|owing to|given that)\b/gi,
    type: 'cause', color: 'bg-orange-200 text-orange-900', explanation: 'Neden işareti → sebep açıklıyor' },
  { pattern: /\b(therefore|thus|hence|consequently|as a result|so|thereby)\b/gi,
    type: 'result', color: 'bg-green-200 text-green-900', explanation: 'Sonuç işareti → öncekinin sonucu' },
  { pattern: /\b(moreover|furthermore|in addition|besides|also|additionally|what is more)\b/gi,
    type: 'addition', color: 'bg-purple-200 text-purple-900', explanation: 'Ek bilgi → öncekini destekler' },
  { pattern: /\b(before|after|when|while|during|until|once|as soon as|by the time)\b/gi,
    type: 'time', color: 'bg-yellow-200 text-yellow-900', explanation: 'Zaman ifadesi → sıralama/eş zamanlılık' },
  { pattern: /\b(not|never|no|without|neither|nor|barely|hardly|rarely|seldom)\b/gi,
    type: 'negative', color: 'bg-red-200 text-red-900', explanation: 'Olumsuzluk → anlam tersine dönüyor' },
  { pattern: /\b(this|these|it|they|such|the same|the former|the latter|the aforementioned)\b/gi,
    type: 'reference', color: 'bg-teal-200 text-teal-900', explanation: 'Referans → önceki cümleye gönderim' },
  { pattern: /\b(only|even|especially|particularly|above all|most importantly|in particular|notably)\b/gi,
    type: 'emphasis', color: 'bg-pink-200 text-pink-900', explanation: 'Vurgu → önemli detay' },
]

export function extractClueWords(text: string): ClueWord[] {
  const found: ClueWord[] = []
  const seen = new Set<string>()

  for (const { pattern, type, color, explanation } of CLUE_PATTERNS) {
    const matches = text.matchAll(pattern)
    for (const m of matches) {
      const word = m[0].toLowerCase()
      if (!seen.has(word)) {
        seen.add(word)
        found.push({ word: m[0], type, color, explanation })
      }
    }
  }

  return found
}

export function highlightClues(text: string, clues: ClueWord[]): Array<{ text: string; clue?: ClueWord }> {
  if (!clues.length) return [{ text }]

  // Build a regex from all clue words
  const escaped = clues.map(c => c.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const combined = new RegExp(`(${escaped.join('|')})`, 'gi')

  const parts: Array<{ text: string; clue?: ClueWord }> = []
  let last = 0
  let match

  const regex = new RegExp(combined.source, 'gi')
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    const clue = clues.find(c => c.word.toLowerCase() === match![0].toLowerCase())
    parts.push({ text: match[0], clue })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })

  return parts
}

// ── Logic type (reused from sentence-trainer) ────────────────────────────────

export type LogicKey = 'contrast' | 'cause_effect' | 'addition' | 'exemplify' | 'concession' | 'topic_cont' | 'grammar_focus' | 'none'

const LOGIC_DEFINITIONS: Record<LogicKey, { label: string; icon: string; color: string; description: string }> = {
  contrast:     { label: 'Zıtlık',       icon: '↔️', color: 'border-[#1CB0F6] bg-blue-50', description: 'Önceki fikirle çelişen bir bilgi geliyor.' },
  cause_effect: { label: 'Neden-Sonuç',  icon: '➡️', color: 'border-[#58CC02] bg-[#F0FFF0]', description: 'Birinin sonucu ya da nedeni açıklanıyor.' },
  addition:     { label: 'Ek Bilgi',     icon: '➕', color: 'border-violet-400 bg-violet-50', description: 'Önceki fikre destekleyici bilgi ekleniyor.' },
  exemplify:    { label: 'Örnek',        icon: '📌', color: 'border-amber-400 bg-amber-50',  description: 'Önceki genel fikre somut örnek veriliyor.' },
  concession:   { label: 'Kabul-Zıt',   icon: '🔄', color: 'border-rose-400 bg-rose-50',    description: 'Bir gerçeği kabul edip zıt sonuç çıkarılıyor.' },
  topic_cont:   { label: 'Konu Devamı', icon: '🔗', color: 'border-[#FFD900] bg-[#FFF9DB]', description: 'Aynı konudan bahsedilmeye devam ediliyor.' },
  grammar_focus:{ label: 'Yapı Odaklı', icon: '⚙️', color: 'border-gray-400 bg-gray-50',    description: 'Dilbilgisi yapısı belirliyor — anlam ikinci planda.' },
  none:         { label: 'Belirsiz',    icon: '❓', color: 'border-[#E5E5E5] bg-white',      description: 'Bağlam net değil — cümleyi dikkatli oku.' },
}

export function detectLogicKey(q: ExamQuestion): LogicKey {
  const missingType = detectMissingType(q)
  if (missingType === 'grammar') return 'grammar_focus'

  const text = (q.question_text ?? '').toLowerCase()   // correct answer excluded — would be a spoiler

  if (/however|although|even though|whereas|while|nevertheless|but\b|yet\b|despite|in spite/.test(text)) return 'contrast'
  if (/therefore|thus|hence|as a result|consequently|because|since\b/.test(text)) return 'cause_effect'
  if (/moreover|furthermore|in addition|besides|also|additionally/.test(text)) return 'addition'
  if (/for example|for instance|such as|including/.test(text)) return 'exemplify'
  if (/although|even though|while|though|despite/.test(text)) return 'concession'
  if (/this\b|these\b|it\b|such\b|the same/.test(text)) return 'topic_cont'

  return missingType === 'word' ? 'topic_cont' : 'none'
}

export { LOGIC_DEFINITIONS }

// ── Option analysis ───────────────────────────────────────────────────────────

export interface OptionAnalysis {
  letter: string
  text: string
  isCorrect: boolean
  couldBe: string    // "Why this COULD be correct"
  whyNot: string     // "Why this is actually WRONG" (empty for correct answer)
  clues: string[]    // Clue words found in this option
  verdict: 'correct' | 'wrong' | 'suspicious'
}

// Known vocab with meanings (subset from patterns_db)
const KNOWN_VOCAB: Record<string, { tr: string; field: string }> = {
  endure:     { tr: 'dayanmak, sürmek', field: 'positive/neutral' },
  assemble:   { tr: 'toplamak, bir araya getirmek', field: 'action/group' },
  accelerate: { tr: 'hızlandırmak', field: 'speed/change' },
  elaborate:  { tr: 'ayrıntılandırmak', field: 'explanation' },
  inhibit:    { tr: 'engellemek, bastırmak', field: 'negative/blocking' },
  stimulate:  { tr: 'uyarmak, teşvik etmek', field: 'positive/trigger' },
  attribute:  { tr: 'atfetmek', field: 'causation' },
  depict:     { tr: 'tasvir etmek, betimlemek', field: 'description' },
  sustain:    { tr: 'sürdürmek, desteklemek', field: 'continuation' },
  degradation:{ tr: 'bozulma, çöküş', field: 'negative' },
  warrant:    { tr: 'gerektirmek, hak etmek', field: 'justification' },
  conform:    { tr: 'uymak, uyum sağlamak', field: 'compliance' },
  adhere:     { tr: 'bağlı kalmak, yapışmak', field: 'compliance' },
  resilient:  { tr: 'dirençli, toparlanabilen', field: 'positive/strength' },
  embark:     { tr: 'başlamak, girişmek', field: 'start/action' },
  enforce:    { tr: 'uygulamak, yaptırmak', field: 'authority' },
}

function analyzeOptionForVocab(letter: string, text: string, q: ExamQuestion): OptionAnalysis {
  const isCorrect = letter === q.correct_answer
  const optLower = text.toLowerCase()
  const qLower = (q.question_text ?? '').toLowerCase()
  const known = KNOWN_VOCAB[optLower]

  const clues: string[] = []
  if (known) clues.push(`${text} = "${known.tr}"`)

  // Detect semantic field match
  const hasNegativeContext = /not|never|no\b|fail|prevent|stop|block|avoid|lack/.test(qLower)
  const hasPositiveContext  = /important|benefit|help|support|promot|grow|improv/.test(qLower)
  const hasContinueContext  = /for a long time|years|remain|still|continue|persist|permanent/.test(qLower)

  let couldBe = ''
  let whyNot  = ''

  if (isCorrect) {
    couldBe = known
      ? `"${text}" (${known.tr}) — anlam bağlama tam uyuyor`
      : `"${text}" cümlenin bağlamına ve öznesine anlam olarak uygun`
    whyNot = ''
  } else {
    // Generate why not
    if (known) {
      couldBe = `"${text}" (${known.tr}) → ilk bakışta mantıklı görünebilir`
      if (known.field.includes('speed') || known.field.includes('change')) {
        whyNot = `"${text}" değişim/hız ifade eder, bağlam bunu desteklemiyor`
      } else if (known.field.includes('explanation')) {
        whyNot = `"${text}" ayrıntı vermek demek, cümle bağlamı bunu gerektirmiyor`
      } else if (known.field.includes('group')) {
        whyNot = `"${text}" toplama/birleştirme ifade eder, bağlam bunu gerektirmiyor`
      } else {
        whyNot = `"${text}" (${known.tr}) anlam olarak bu cümleye uymuyor`
      }
    } else {
      couldBe = `"${text}" → ilk bakışta bir anlam taşıyor`
      whyNot  = `"${text}" cümlenin özgün bağlamı ve connotation'ıyla örtüşmüyor`
    }
  }

  return {
    letter, text, isCorrect,
    couldBe, whyNot, clues,
    verdict: isCorrect ? 'correct' : 'wrong',
  }
}

function analyzeOptionForLinker(letter: string, text: string, q: ExamQuestion): OptionAnalysis {
  const isCorrect = letter === q.correct_answer
  const optLower  = text.toLowerCase().trim()

  const LINKER_MEANINGS: Record<string, { tr: string; logic: string }> = {
    however:       { tr: 'ancak, fakat', logic: 'Zıtlık — öncekiyle çelişiyor' },
    furthermore:   { tr: 'üstelik, dahası', logic: 'Ek bilgi — destekliyor' },
    therefore:     { tr: 'bu nedenle, dolayısıyla', logic: 'Neden-Sonuç — öncekinin sonucu' },
    moreover:      { tr: 'ayrıca, bunun yanı sıra', logic: 'Ek bilgi — aynı yönde' },
    nevertheless:  { tr: 'buna rağmen, yine de', logic: 'Zıtlık/Kabul — güçlü zıtlık' },
    consequently:  { tr: 'sonuç olarak', logic: 'Neden-Sonuç' },
    'for instance':{ tr: 'örneğin', logic: 'Örnek verme' },
    'for example': { tr: 'örneğin', logic: 'Örnek verme' },
    'that is':     { tr: 'yani', logic: 'Açıklama/Yeniden ifade' },
    otherwise:     { tr: 'aksi takdirde', logic: 'Koşul sonucu' },
    instead:       { tr: 'bunun yerine', logic: 'Alternatif/Zıtlık' },
    similarly:     { tr: 'benzer biçimde', logic: 'Benzetme' },
  }

  const linfo = LINKER_MEANINGS[optLower]
  const clues = linfo ? [`${text} = "${linfo.tr}" (${linfo.logic})`] : []

  let couldBe = ''
  let whyNot  = ''

  if (isCorrect) {
    couldBe = linfo
      ? `"${text}" — ${linfo.tr} → ${linfo.logic}`
      : `"${text}" iki cümle arasındaki mantıksal ilişkiyi doğru kuruyor`
    whyNot = ''
  } else {
    if (linfo) {
      couldBe = `"${text}" — ${linfo.tr} → ilk bakışta uyabilir gibi görünüyor`
      whyNot  = `Ama bağlam ${linfo.logic.includes('Zıt') ? 'neden-sonuç' : linfo.logic.includes('Neden') ? 'zıtlık' : 'farklı bir ilişki'} gerektiriyor`
    } else {
      couldBe = `"${text}" bağlacı bir mantık taşıyor`
      whyNot  = `Öncesi-sonrası ilişkisi bu bağlacı desteklemiyor`
    }
  }

  return {
    letter, text, isCorrect,
    couldBe, whyNot, clues,
    verdict: isCorrect ? 'correct' : 'wrong',
  }
}

function analyzeOptionForGrammar(letter: string, text: string, q: ExamQuestion): OptionAnalysis {
  const isCorrect = letter === q.correct_answer
  const optLower  = text.toLowerCase().trim()

  let form = ''
  if (/^to\s/.test(optLower))       form = 'to-infinitive (to + V) → amaç veya özne olarak'
  else if (/^having\s/.test(optLower)) form = 'perfect participle (having + V3) → önceki eylem tamamlanmış'
  else if (/ing$/.test(optLower.split(' ').pop() ?? '')) form = '-ing (gerund/present participle) → devam eden eylem veya özne'
  else if (/^(discovered|found|made|been|done|used|seen|taken|given|known)\b/.test(optLower)) form = 'past participle (V3) → pasif veya sıfat görev'
  else form = 'özel yapı'

  return {
    letter, text, isCorrect,
    couldBe: `${form} — bu yapı cümlede kullanılabilir`,
    whyNot: isCorrect ? '' : `Bu yapı cümledeki özne-fiil uyumuyla veya zaman mantığıyla çelişiyor`,
    clues: [],
    verdict: isCorrect ? 'correct' : 'wrong',
  }
}

export function generateOptionAnalysis(q: ExamQuestion): OptionAnalysis[] {
  const missing = detectMissingType(q)
  return Object.entries(q.options).map(([letter, text]) => {
    if (missing === 'linker') return analyzeOptionForLinker(letter, text, q)
    if (missing === 'grammar') return analyzeOptionForGrammar(letter, text, q)
    return analyzeOptionForVocab(letter, text, q)
  })
}

// ── Full step definitions ─────────────────────────────────────────────────────

export type GuidedStep =
  | 'intro'
  | 'what_missing'
  | 'clue_words'
  | 'logic_type'
  | 'option_scan'
  | 'choose'
  | 'explanation'

export const STEP_LABELS: Record<GuidedStep, string> = {
  intro:       'Hazırlık',
  what_missing:'Boşluk Tipi',
  clue_words:  'İpucu Kelimeler',
  logic_type:  'Mantık Tipi',
  option_scan: 'Seçenek Analizi',
  choose:      'Cevabını Seç',
  explanation: 'Açıklama',
}

export const STEP_ORDER: GuidedStep[] = [
  'what_missing','clue_words','logic_type','option_scan','choose','explanation',
]
