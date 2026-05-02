import type { ExamQuestion } from './types'
import { WORD_DB } from './word-db'

// ── Question Type ─────────────────────────────────────────────────────────────

export type QuestionType =
  | 'VOCAB'
  | 'LINKER'
  | 'GRAMMAR'
  | 'PREPOSITION'
  | 'SENTENCE_COMPLETION'
  | 'PARAGRAPH_COMPLETION'
  | 'CLOZE'

const LINKER_LIST = [
  'however','furthermore','therefore','moreover','nevertheless','consequently',
  'hence','thus','otherwise','besides','nonetheless','instead','accordingly',
  'similarly','likewise','in addition','in fact','on the contrary','even so',
  'for example','for instance','that is','as a result','what is more',
  'in other words','that said','despite','although','even though','whereas',
  'while','since','because','so that','as long as','in case','once','unless',
  'until','whether','just as','as much as','as if','as long as',
  'on behalf of','instead of','rather than','in comparison with','irrespective of',
  'in pursuit of','with regard to','in contrast with','as a result of',
  'except for','with the aim of',
]

const GRAMMAR_PATTERNS = [
  /^to\s+\w+/i,
  /^having\s+\w+/i,
  /^\w+ing\b/,
  /^been\s+\w+/i,
  /^(could|would|should|might|must|may|can|will|had|have|has)\b/i,
  /^(was|were)\s+\w+/i,
]

const PREPOSITIONS = ['in','on','at','by','with','of','for','to','from','about','into',
  'onto','upon','through','over','under','between','among','during','within',
  'beyond','against','towards','until','off','from','towards']

export function detectQuestionType(q: ExamQuestion): QuestionType {
  if (q.section_key === 'sentence_completion') return 'SENTENCE_COMPLETION'
  if (q.section_key === 'paragraph_completion') return 'PARAGRAPH_COMPLETION'
  if (q.section_key === 'cloze') {
    // Cloze can contain linkers, grammar, prepositions, or vocab
    // Fall through to detect
  }

  const opts = Object.values(q.options).map(o => o.toLowerCase().trim())

  // Check linkers
  const linkerCount = opts.filter(o => LINKER_LIST.some(l => o === l || o.startsWith(l)))
  if (linkerCount.length >= 3) return 'LINKER'

  // Check grammar
  const grammarCount = opts.filter(o => GRAMMAR_PATTERNS.some(p => p.test(o)))
  if (grammarCount.length >= 3) return 'GRAMMAR'

  // Check prepositions (single word or double like "beyond / over")
  const prepCount = opts.filter(o => {
    const parts = o.split('/').map(p => p.trim())
    return parts.some(p => PREPOSITIONS.includes(p))
  })
  if (prepCount.length >= 3) return 'PREPOSITION'

  // Check compound linkers / phrase linkers
  const phraseLinkerCount = opts.filter(o => o.includes(' of ') || o.includes(' for ') || o.includes(' with '))
  if (phraseLinkerCount.length >= 3) return 'LINKER'

  return 'VOCAB'
}

// ── Strategy ──────────────────────────────────────────────────────────────────

export interface Strategy {
  label: string
  icon: string
  color: string
  description: string
  mainClue: string
}

export function getMainStrategy(type: QuestionType, q: ExamQuestion): Strategy {
  const text = q.question_text?.toLowerCase() ?? ''
  const correct = (q.options[q.correct_answer] ?? '').toLowerCase()

  if (type === 'VOCAB') {
    const hasNeg  = /not|never|without|fail|prevent|block/.test(text)
    const hasDur  = /for a long time|years|remain|still|permanent|forever|always/.test(text)
    const hasColl = /\b(of|in|on|with|for|to|from)\b/.test(text.slice(0, 50))

    if (hasDur) return {
      label: 'SÜRE / KALICILIK', icon: '⏳', color: 'border-violet-400 bg-violet-50',
      description: 'Uzun süre kalmayı veya dayanmayı anlatan bir fiil gerekiyor',
      mainClue: 'Süre ifadeleri (for a long time, forever, remain) → duration fiili seç',
    }
    if (hasNeg) return {
      label: 'OLUMSUZ BAĞLAM', icon: '🚫', color: 'border-red-400 bg-red-50',
      description: 'Bağlamda olumsuz veya engelleyici anlam var',
      mainClue: 'Olumsuzluk belirteçleri → negatif anlam taşıyan kelimeyi seç',
    }
    return {
      label: 'BAĞLAM ANLAMI', icon: '🔍', color: 'border-amber-400 bg-amber-50',
      description: 'Cümlenin genel anlamına uygun kelimeyi bul',
      mainClue: 'Öncesi + sonrası → hangi semantik alan (hız/süre/güç/açıklama)?',
    }
  }

  if (type === 'LINKER') {
    const hasContrast = /however|although|but|yet|despite|while/.test(text + correct)
    const hasCause    = /therefore|thus|since|because|consequently/.test(text + correct)
    const hasAddition = /moreover|furthermore|also|addition/.test(text + correct)
    const hasPurpose  = /so that|in order to|aim|purpose/.test(text + correct)

    if (hasContrast) return {
      label: 'ZITLIK MANTIKI', icon: '↔️', color: 'border-[#1CB0F6] bg-blue-50',
      description: 'İki cümle birbiriyle çelişiyor — zıtlık bağlacı gerekiyor',
      mainClue: '"önceki fikir OLUMSUZ mu OLUMLU mu?" → tersini ifade edecek seçenek',
    }
    if (hasCause) return {
      label: 'NEDEN-SONUÇ', icon: '➡️', color: 'border-[#58CC02] bg-[#F0FFF0]',
      description: 'Birinin sonucu veya sebebi gösterilecek',
      mainClue: 'therefore/thus = sonuç | because/since = sebep → mantık yönüne bak',
    }
    if (hasAddition) return {
      label: 'EK BİLGİ', icon: '➕', color: 'border-purple-400 bg-purple-50',
      description: 'Önceki fikre destek ekleniyor',
      mainClue: 'moreover/furthermore = aynı yönde devam → öncekiyle zıtlaşmıyor',
    }
    if (hasPurpose) return {
      label: 'AMAÇ / SONUÇ', icon: '🎯', color: 'border-teal-400 bg-teal-50',
      description: 'Bir eylem veya amacın bağlacı',
      mainClue: 'so that / in order to = niyet ve amaç → gelecekteki beklenti',
    }
    return {
      label: 'BAĞLAÇ MANTIKI', icon: '🔗', color: 'border-[#FFD900] bg-[#FFF9DB]',
      description: 'İki cümle arasındaki ilişkiyi belirle',
      mainClue: 'Önce: Cümle 1 ne diyor? Sonra: Cümle 2 ne diyor? Aralarındaki ilişki?',
    }
  }

  if (type === 'GRAMMAR') return {
    label: 'DİLBİLGİSİ YAPISI', icon: '⚙️', color: 'border-gray-400 bg-gray-50',
    description: 'Fiil formu, zaman veya yapı seçimi gerekiyor',
    mainClue: 'Özne aktif mi pasif mi? Zaman tutarlı mı? -ing / to / V3 / V1 hangisi?',
  }

  if (type === 'PREPOSITION') return {
    label: 'EDAT KALIPLARI', icon: '🔧', color: 'border-rose-400 bg-rose-50',
    description: 'Fiil+edat veya isim+edat sabit kalıpları',
    mainClue: 'Önceki fiili bul → sabit edatı var mı? (conform TO, result IN, differ FROM)',
  }

  if (type === 'SENTENCE_COMPLETION') {
    const hasHowever = /however/.test(text)
    const hasTherefore = /therefore/.test(text)
    const hasAlthough = /although|even though/.test(text)
    if (hasHowever) return {
      label: 'ZITLIK: however', icon: '↔️', color: 'border-[#1CB0F6] bg-blue-50',
      description: '"however" var — boşluk önceki fikirle ZIT bir bilgi içermeli',
      mainClue: 'Sonraki cümle → ne söylüyor? Boşluk bununla çelişmeli',
    }
    if (hasTherefore) return {
      label: 'NEDEN: therefore', icon: '➡️', color: 'border-[#58CC02] bg-[#F0FFF0]',
      description: '"therefore" var — boşluk SONUCU doğuran nedeni içermeli',
      mainClue: 'therefore\'un sağındaki cümle → bunu doğuracak neden ne? Boşluk o neden.',
    }
    if (hasAlthough) return {
      label: 'KABUL-ZIT: although', icon: '🔄', color: 'border-rose-400 bg-rose-50',
      description: '"although/even though" var — iki zıt gerçek aynı cümlede',
      mainClue: 'Cümlenin bir yarısını oku → diğer yarı ZITLIK içermeli',
    }
    return {
      label: 'KONU DEVAMLIĞI', icon: '📝', color: 'border-amber-400 bg-amber-50',
      description: 'Cümleyi konusuna uygun biçimde tamamla',
      mainClue: 'Cümlenin konusunu belirle → hangi seçenek konuyu sürdürüyor?',
    }
  }

  return {
    label: 'PARAGRAF BÜTÜNLÜĞÜ', icon: '📄', color: 'border-teal-400 bg-teal-50',
    description: 'Paragrafın akışını bozmayacak cümleyi seç',
    mainClue: 'Önceki ve sonraki cümleleri oku → hangi seçenek araya sığıyor?',
  }
}

// ── Key clues ─────────────────────────────────────────────────────────────────

export interface KeyClue {
  text: string
  type: string
  explanation: string
  color: string
}

export function getKeyClues(q: ExamQuestion): KeyClue[] {
  const text = q.question_text ?? ''
  const clues: KeyClue[] = []

  // Duration/permanence clues
  const durMatch = text.match(/for a long time|for decades|for centuries|forever|permanently|lasting|long-lasting|remain|persist/gi)
  if (durMatch) durMatch.forEach(m => clues.push({
    text: m, type: 'Süre/Kalıcılık', color: 'bg-violet-200 text-violet-900',
    explanation: 'Uzun süre kalma → duration fiili (endure, remain, persist)',
  }))

  // Contrast clues
  const contMatch = text.match(/however|although|but\b|yet\b|despite|in spite|whereas|while|nevertheless|even though/gi)
  if (contMatch) contMatch.forEach(m => clues.push({
    text: m, type: 'Zıtlık', color: 'bg-blue-200 text-blue-900',
    explanation: 'Zıtlık işareti → önceki fikrin tersi geliyor',
  }))

  // Cause-result clues
  const causeMatch = text.match(/therefore|thus|hence|consequently|as a result|because|since\b|due to/gi)
  if (causeMatch) causeMatch.forEach(m => clues.push({
    text: m, type: 'Neden-Sonuç', color: 'bg-green-200 text-green-900',
    explanation: 'Nedensellik işareti → sebep veya sonuç ilişkisi',
  }))

  // Purpose clues
  const purpMatch = text.match(/so that|in order to|to achieve|to prevent|with the aim/gi)
  if (purpMatch) purpMatch.forEach(m => clues.push({
    text: m, type: 'Amaç', color: 'bg-teal-200 text-teal-900',
    explanation: 'Amaç ifadesi → ne için yapıldığını gösteriyor',
  }))

  // Negative context
  const negMatch = text.match(/not\b|never|without|fail to|prevent|stop\b|block\b|inhibit/gi)
  if (negMatch) negMatch.forEach(m => clues.push({
    text: m, type: 'Olumsuzluk', color: 'bg-red-200 text-red-900',
    explanation: 'Olumsuz bağlam → seçenek bağlama uymalı',
  }))

  // Known key terms (from YDS patterns)
  const keyTermMatch = text.match(/forever chemicals|climate change|global warming|biodiversity|ecosystem|empirical|hypothesis/gi)
  if (keyTermMatch) keyTermMatch.forEach(m => clues.push({
    text: m, type: 'Anahtar Terim', color: 'bg-amber-200 text-amber-900',
    explanation: `"${m}" → bu terimin gerektirdiği anlam alanını düşün`,
  }))

  return clues.filter((c, i, arr) => arr.findIndex(x => x.text.toLowerCase() === c.text.toLowerCase()) === i)
    .slice(0, 5)
}

// ── Thinking steps ────────────────────────────────────────────────────────────

export interface ThinkingStep {
  id: number
  prompt: string
  subPrompt: string
  answer: string
  highlight?: string   // text to highlight in question
}

export function buildThinkingSteps(q: ExamQuestion): ThinkingStep[] {
  const type = detectQuestionType(q)
  const text  = q.question_text ?? ''
  const correct = q.options[q.correct_answer] ?? ''
  const correctLower = correct.toLowerCase()
  const entry = WORD_DB[correctLower] ?? WORD_DB[correct] ?? null

  if (type === 'VOCAB') {
    const clues = getKeyClues(q)
    const clueTexts = clues.map(c => `"${c.text}"`).join(', ')
    return [
      {
        id: 1, prompt: 'Boşluğa hangi kelime türü gerekiyor?',
        subPrompt: 'İsim mi, fiil mi, sıfat mı, zarf mı?',
        answer: detectPartsOfSpeech(text, q),
        highlight: '----',
      },
      {
        id: 2, prompt: 'Cümlede bağlamı daraltan ipucu kelimeler neler?',
        subPrompt: 'Boşluk öncesi ve sonrasına dikkatle bak',
        answer: clues.length > 0
          ? `İpucu kelimeler: ${clueTexts}. Bu kelimeler semantik alanı daraltıyor.`
          : 'Açık ipucu yok — genel bağlamdan anlam alanını çıkar.',
      },
      {
        id: 3, prompt: 'Boşluğun anlam alanı ne?',
        subPrompt: 'Olumlu mu olumsuz mu? Süre mi hız mı? Eylem mi açıklama mı?',
        answer: entry
          ? `"${correct}" (${entry.meaning_tr}) → ${entry.field} anlamı gerekiyor`
          : `Bağlamdan: "${correct}" burada en uygun anlam alanını dolduruyor`,
      },
      {
        id: 4, prompt: 'Her seçeneği anlam alanıyla karşılaştır',
        subPrompt: 'Hangi seçenek bağlamla en iyi örtüşüyor? Diğerleri neden uymuyor?',
        answer: `Doğru cevap: ${q.correct_answer}) ${correct}${entry ? ` — "${entry.meaning_tr}"` : ''}`,
      },
    ]
  }

  if (type === 'LINKER') {
    return [
      {
        id: 1, prompt: 'Boşluktan ÖNCE ne söyleniyor?',
        subPrompt: 'Cümlenin ilk kısmını oku. Ana fikri özetle.',
        answer: `Boşluk öncesi: "${text.split('----')[0]?.slice(-80).trim() || text.slice(0, 80)}..."`,
      },
      {
        id: 2, prompt: 'Boşluktan SONRA ne söyleniyor?',
        subPrompt: 'İkinci kısmı oku. İki cümle arasında nasıl bir ilişki var?',
        answer: `Boşluk sonrası: "${text.split('----')[1]?.slice(0, 80).trim() || '...cümlenin geri kalanı'}"`,
      },
      {
        id: 3, prompt: 'İki kısım arasındaki mantıksal ilişki ne?',
        subPrompt: 'Zıtlık mı? Neden-Sonuç mu? Ek bilgi mi? Amaç mı?',
        answer: detectLinkerLogic(text, correct),
      },
      {
        id: 4, prompt: 'Hangi bağlaç bu ilişkiyi en doğru ifade eder?',
        subPrompt: 'Seçenekleri mantık tipiyle eşleştir',
        answer: `${q.correct_answer}) "${correct}" bu ilişkiye uyuyor`,
      },
    ]
  }

  if (type === 'GRAMMAR') {
    return [
      {
        id: 1, prompt: 'Cümlenin öznesi ne? Aktif mi, pasif mi?',
        subPrompt: 'Subject + [blank] yapısını analiz et',
        answer: detectSubjectVoice(text),
      },
      {
        id: 2, prompt: 'Cümlede zaman bağlacı var mı?',
        subPrompt: 'before, after, when, already, just, since, for gibi kelimeler',
        answer: detectTimeMarker(text),
      },
      {
        id: 3, prompt: 'Hangi fiil formu gramer kuralına uyuyor?',
        subPrompt: 'to-inf / -ing / V3 / perfect / passive — hangisi mantıklı?',
        answer: detectCorrectForm(correct),
      },
      {
        id: 4, prompt: 'Diğer formlar neden yanlış?',
        subPrompt: 'Her yanlış formu bir kuralla eleyebiliyor musun?',
        answer: `Doğru form: "${correct}" — ${detectCorrectForm(correct)}`,
      },
    ]
  }

  if (type === 'PREPOSITION') {
    return [
      {
        id: 1, prompt: 'Boşluktan önce gelen fiil veya isim ne?',
        subPrompt: 'Sabit edat kalıpları fiil veya isimle birlikte öğrenilir',
        answer: `Boşluk öncesi: "${text.split('----')[0]?.trim().slice(-30) ?? '?'}"`,
      },
      {
        id: 2, prompt: 'Bu kelime hangi edatla çalışır?',
        subPrompt: 'Bilinen kalıplar: conform TO, result IN, differ FROM, associated WITH',
        answer: `Doğru edat: "${correct}" — bu bağlamda gerekli edat bu`,
      },
      {
        id: 3, prompt: 'Edattan sonra ne geliyor? (yer, zaman, soyut kavram)',
        subPrompt: 'Edat seçimi sonrasını da etkiler',
        answer: `"${correct}" → ${text.split('----')[1]?.trim().slice(0, 40) ?? '?'}`,
      },
      {
        id: 4, prompt: 'Diğer edatlar neden yanlış?',
        subPrompt: 'Her edatın farklı bir işlevi var — bağlamla örtüşüyor mu?',
        answer: `Doğru edat kalıbı: "${correct}"`,
      },
    ]
  }

  if (type === 'SENTENCE_COMPLETION') {
    const hasConnector = text.match(/(however|therefore|although|even though|as a result|thus|so that)/i)
    return [
      {
        id: 1, prompt: 'Cümledeki bağlacı/bağlantı kelimesini bul',
        subPrompt: 'however / therefore / although / as a result / otherwise gibi...',
        answer: hasConnector
          ? `Bağlaç bulundu: "${hasConnector[0]}" → mantık tipini belirliyor`
          : 'Açık bağlaç yok — genel konuyu ve akışı takip et',
      },
      {
        id: 2, prompt: 'Bu bağlaç ne tür bir mantık gerektiriyor?',
        subPrompt: 'however = zıtlık | therefore = sonuç | although = kabul-zıt',
        answer: hasConnector ? detectLinkerLogic(text, hasConnector[0]) : 'Konu sürekliliği gerekiyor',
      },
      {
        id: 3, prompt: 'Cümlenin KONUSU ne? (konu tutarlılığı zorunlu)',
        subPrompt: 'Doğru seçenek mutlaka AYNI konudan bahsetmeli',
        answer: `Konu: "${text.slice(0, 60)}..."`,
      },
      {
        id: 4, prompt: 'Her seçeneği: (1) konu uyumu (2) mantık tipi ile test et',
        subPrompt: 'Önce konu uyumsuzlarını at, sonra mantık tipini kontrol et',
        answer: `Doğru: ${q.correct_answer}) "${correct.slice(0, 80)}..."`,
      },
    ]
  }

  // PARAGRAPH_COMPLETION / CLOZE
  return [
    {
      id: 1, prompt: 'Paragrafın / metnin ana konusu ne?',
      subPrompt: 'Tüm cümleleri oku, ana temayı belirle',
      answer: `Konu: "${text.slice(0, 80)}..."`,
    },
    {
      id: 2, prompt: 'Boşluğun etrafındaki cümleler ne söylüyor?',
      subPrompt: 'Önceki cümle + sonraki cümle → boşluk köprü görevi görüyor',
      answer: `Bağlam analizi gerekiyor — cümleleri dikkatlice oku`,
    },
    {
      id: 3, prompt: 'Hangi seçenek akışı bozmadan araya giriyor?',
      subPrompt: 'Konu sürekliliği + ton uyumu + dilbilgisi uyumu',
      answer: `Doğru: ${q.correct_answer}) "${correct.slice(0, 80)}"`,
    },
  ]
}

// ── Helper functions ──────────────────────────────────────────────────────────

function detectPartsOfSpeech(text: string, q: ExamQuestion): string {
  const correct = (q.options[q.correct_answer] ?? '').toLowerCase()
  const suffixes: Record<string, string> = {
    tion: 'İsim gerekiyor (soneki: -tion)',
    ness: 'İsim gerekiyor (soneki: -ness)',
    ment: 'İsim gerekiyor (soneki: -ment)',
    ity:  'İsim gerekiyor (soneki: -ity)',
    ance: 'İsim gerekiyor (soneki: -ance)',
    ence: 'İsim gerekiyor (soneki: -ence)',
    ly:   'Zarf gerekiyor (soneki: -ly)',
    ful:  'Sıfat gerekiyor (soneki: -ful)',
    ive:  'Sıfat gerekiyor (soneki: -ive)',
    ent:  'Sıfat gerekiyor (soneki: -ent)',
    ant:  'Sıfat gerekiyor (soneki: -ant)',
  }
  for (const [suffix, label] of Object.entries(suffixes)) {
    if (correct.endsWith(suffix)) return label
  }
  if (/\b(the|a|an)\s+----/.test(text.toLowerCase())) return 'İsim gerekiyor (article öncesinde boşluk var)'
  if (/\b(is|was|were|are|be)\s+----/.test(text.toLowerCase())) return 'Sıfat veya isim gerekiyor'
  return 'Fiil gerekiyor (özne + boşluk kalıbı)'
}

function detectLinkerLogic(text: string, connector: string): string {
  const c = connector.toLowerCase()
  if (/however|but\b|yet\b|nevertheless|nonetheless|although|even though|whereas|while|despite/.test(c))
    return 'ZITLIK: önceki fikrin tersini söylüyor'
  if (/therefore|thus|hence|consequently|as a result|so\b/.test(c))
    return 'NEDEN-SONUÇ: önceki durumun mantıksal sonucu'
  if (/moreover|furthermore|in addition|also|besides/.test(c))
    return 'EK BİLGİ: önceki fikri aynı yönde destekliyor'
  if (/for example|for instance|such as/.test(c))
    return 'ÖRNEK: önceki genel fikre somut örnek veriyor'
  if (/so that|in order to|with the aim/.test(c))
    return 'AMAÇ: bir eylemin neden yapıldığını gösteriyor'
  if (/since\b|because|due to/.test(c))
    return 'SEBEP: neden olduğunu açıklıyor'
  if (/as long as|in case|unless|whether/.test(c))
    return 'KOŞUL: gerçekleşme şartını bildiriyor'
  return 'Bağlaç mantığını bağlamdan analiz et'
}

function detectSubjectVoice(text: string): string {
  if (/is\s+----|-ed\s+by|was\s+----/.test(text.toLowerCase()))
    return 'Pasif yapı: konu eylemden etkileniyor → V3 (past participle)'
  if (/have\s+been|has\s+been/.test(text.toLowerCase()))
    return 'Present Perfect Passive: geçmişten günümüze süren eylem → been + V3'
  if (/will\s+have\s+been/.test(text.toLowerCase()))
    return 'Future Perfect: gelecekte tamamlanmış olacak eylem'
  return 'Özne aktif: kendi eylemini yapıyor → active voice'
}

function detectTimeMarker(text: string): string {
  const markers = text.match(/(since|for|already|just|recently|by the time|before|after|when|while|once)/gi)
  if (!markers) return 'Belirgin zaman işareti yok — genel bağlamı kullan'
  const m = markers[0].toLowerCase()
  if (m === 'since' || m === 'for') return `"${markers[0]}" → Present Perfect gerekiyor (süregelen eylem)`
  if (m === 'already' || m === 'just') return `"${markers[0]}" → Present Perfect (tamamlanmış yakın eylem)`
  if (m === 'before' || m === 'by the time') return `"${markers[0]}" → Past Perfect (önce tamamlanmış)`
  return `"${markers[0]}" bulunan zaman bağlacı → gramer formunu belirliyor`
}

function detectCorrectForm(correct: string): string {
  const c = correct.toLowerCase().trim()
  if (/^to\s/.test(c)) return 'to-infinitive: amaç bildiriyor veya isim tümlecidir'
  if (/^having\s/.test(c)) return 'Perfect participle: önceki eylemi tamamlandı gösterir'
  if (/^being\s/.test(c)) return '-ing edilgen: devam eden pasif eylem'
  if (/ing$/.test(c.split(' ').pop() ?? '')) return '-ing: aktif devam eden eylem veya sıfat'
  if (/ed$/.test(c)) return 'V3: tamamlanmış veya edilgen eylem (past participle)'
  return 'Özel dilbilgisi yapısı — bağlam belirliyor'
}

// ── Option analysis ───────────────────────────────────────────────────────────

export interface FullOptionAnalysis {
  letter: string
  text: string
  meaning_tr: string
  isCorrect: boolean
  fitScore: number     // 0-100
  whyFits: string
  whyNot: string
  trapAlert?: string
  cluesFound: string[]
  collocations: string[]
}

export function analyzeAllOptions(q: ExamQuestion): FullOptionAnalysis[] {
  return Object.entries(q.options).map(([letter, text]) => {
    const key     = text.toLowerCase().trim()
    const entry   = WORD_DB[key] ?? WORD_DB[text] ?? null
    const isCorrect = letter === q.correct_answer

    const meaning_tr = entry?.meaning_tr ?? generateFallbackMeaning(text, q)
    const collocations = entry?.collocations ?? []
    const cluesFound: string[] = []

    let whyFits = ''
    let whyNot  = ''
    let trapAlert: string | undefined

    if (isCorrect) {
      whyFits = entry
        ? `"${text}" (${entry.meaning_tr}) — ${entry.field} anlam alanı bu bağlamla örtüşüyor`
        : `"${text}" cümlenin anlam bütünlüğünü ve dil kurallarını karşılıyor`
      whyNot = ''
    } else {
      // Generate smart why-not based on correct answer's entry
      const correctKey   = (q.options[q.correct_answer] ?? '').toLowerCase()
      const correctEntry = WORD_DB[correctKey] ?? null

      if (entry?.trap_word === correctKey || entry?.trap_word === q.options[q.correct_answer]) {
        trapAlert = `Klasik tuzak: "${text}" vs "${q.options[q.correct_answer]}" — anlam farkını öğren!`
      }

      whyFits = entry
        ? `"${text}" (${entry.meaning_tr}) → ilk bakışta uyabilir gibi görünüyor`
        : `"${text}" yüzeysel bir okumada uygun gibi hissettiriyor`

      whyNot = entry?.trap_explanation
        ?? (correctEntry
          ? `Bağlam "${correctEntry.field}" gerektirir, ama "${text}" "${entry?.field ?? '?'}" alanından geliyor`
          : `"${text}" bu cümlenin anlam veya mantık yapısına uymuyor`)
    }

    return {
      letter, text, meaning_tr, isCorrect,
      fitScore: isCorrect ? 95 : Math.floor(Math.random() * 30 + 10),
      whyFits, whyNot, trapAlert, cluesFound, collocations,
    }
  })
}

function generateFallbackMeaning(text: string, q: ExamQuestion): string {
  // Grammar forms
  const t = text.toLowerCase().trim()
  if (/^to\s/.test(t)) return `${text} → to-infinitive (amaç/isim tümlecidir)`
  if (/^having\s/.test(t)) return `${text} → Perfect participle (önce tamamlandı)`
  if (/ing$/.test(t)) return `${text} → -ing form (aktif/devam)`
  if (/^(is|are|was|were)\s+\w+ed/.test(t)) return `${text} → pasif yapı`

  // Preposition pairs
  if (t.includes('/')) {
    const parts = t.split('/').map(p => p.trim())
    return parts.join(' + ') + ' (edat çifti)'
  }

  // Phrase linkers
  if (t.includes(' ')) return `"${text}" (bağlaç/kalıp ifadesi)`

  return `"${text}" (anlam bilinmiyor — bağlamdan çıkar)`
}

// ── Memory card ───────────────────────────────────────────────────────────────

export interface MemoryCard {
  word: string
  meaning_tr: string
  memory_trick: string
  mini_story: string
  visual_prompt: string
  collocations: string[]
  trap_words: string[]
  example_sentence: string
  pattern: string
}

export function generateMemoryCard(q: ExamQuestion): MemoryCard {
  const correct = q.options[q.correct_answer] ?? ''
  const key     = correct.toLowerCase().trim()
  const entry   = WORD_DB[key] ?? WORD_DB[correct] ?? null

  if (entry) {
    return {
      word: correct,
      meaning_tr: entry.meaning_tr,
      memory_trick: entry.memory_trick,
      mini_story: generateMiniStory(correct, entry, q),
      visual_prompt: generateVisualPrompt(correct, entry),
      collocations: entry.collocations,
      trap_words: entry.trap_word ? [entry.trap_word] : [],
      example_sentence: entry.template_sentences[0]?.replace('____', correct) ?? '',
      pattern: (q.common_patterns ?? []).join(' · ') || entry.field,
    }
  }

  // Fallback for unknown words
  return {
    word: correct,
    meaning_tr: '(anlam bağlamdan çıkarılabilir)',
    memory_trick: `"${correct}" → kelimeyi parçalara ayır ve Türkçe benzer sesle ilişkilendir`,
    mini_story: `Hayal et: "${correct}" kelimesi bu cümlede kullanılıyor: "${q.question_text?.slice(0, 80)}"`,
    visual_prompt: `A vivid image representing the concept of "${correct}" in context`,
    collocations: [],
    trap_words: [],
    example_sentence: q.question_text?.replace('----', correct) ?? '',
    pattern: (q.common_patterns ?? []).join(' · '),
  }
}

function generateMiniStory(word: string, entry: WordEntry, q: ExamQuestion): string {
  const stories: Record<string, string> = {
    endure: 'Bir PFA molekülü yağmur görüyor, güneş görüyor, rüzgâr görüyor — ama hâlâ orada duruyor. Yüzyıllar geçiyor, o hâlâ "endure" ediyor çevrede.',
    resilient: 'Kıyı kasabası her fırtınada hasar görüyor — ama her seferinde toparlanıyor. İnsanlar "resilient" bir topluluk oluşturmuş.',
    accelerate: 'Sosyal medya platformu kurulduğu anda haberler ışık hızında yayıldı. Platform bilginin yayılmasını "accelerate" etti.',
    enforcement: 'Çevre yasası kâğıt üzerinde vardı ama kimse uygulamıyordu. Yeni bakan "enforcement" mekanizmasını devreye soktu.',
    degradation: 'Orman giderek yok oluyor — toprak erozyona uğruyor, su kirleniysor. Bu çevre "degradation"unun somut görüntüsü.',
    embark_on: 'Araştırmacı sabah laboratuvarın kapısını açtı ve yeni bir yolculuğa çıktı. O gün büyük bir projeye "embark on" etti.',
  }
  return stories[word.toLowerCase().replace(' ', '_')]
    ?? `Hayal et: Bir sınav sorusunda boşlukta "${word}" görüyorsun. "${entry.meaning_tr}" demek — bağlamda anlıyorsun.`
}

function generateVisualPrompt(word: string, entry: WordEntry): string {
  return `A clear visual metaphor for "${word}": imagine ${entry.memory_trick.split('→')[1]?.trim() ?? entry.meaning_tr}. Style: simple, memorable, educational cartoon.`
}

// ── Golden 5 ──────────────────────────────────────────────────────────────────

export interface GoldenItem {
  icon: string
  label: string
  value: string
  type: 'word' | 'pattern' | 'rule' | 'trap' | 'connector'
}

export function generateGolden5(q: ExamQuestion): GoldenItem[] {
  const items: GoldenItem[] = []
  const correct = q.options[q.correct_answer] ?? ''
  const correctKey = correct.toLowerCase().trim()
  const correctEntry = WORD_DB[correctKey] ?? null

  // 1. Correct answer + meaning
  items.push({
    icon: '✅', type: 'word', label: correct,
    value: correctEntry?.meaning_tr ?? 'Bağlamdan çıkar',
  })

  // 2. Best distractor + meaning
  const distractors = Object.entries(q.options)
    .filter(([l]) => l !== q.correct_answer)
    .slice(0, 2)

  for (const [, text] of distractors) {
    const k = text.toLowerCase().trim()
    const e = WORD_DB[k] ?? null
    if (e) {
      items.push({ icon: '⚠️', type: 'trap', label: text, value: e.meaning_tr })
    }
  }

  // 3. Pattern
  const patterns = q.common_patterns ?? []
  if (patterns.length > 0) {
    items.push({ icon: '📌', type: 'pattern', label: 'Kalıp', value: patterns[0] })
  }

  // 4. Decision rule (from how_to_solve)
  const rule = q.how_to_solve_this_type?.[0]
  if (rule) {
    items.push({ icon: '🎯', type: 'rule', label: 'Karar Kuralı', value: rule })
  }

  // Fill to 5
  if (items.length < 5 && correctEntry?.memory_trick) {
    items.push({ icon: '🧠', type: 'word', label: 'Hafıza Hilesi', value: correctEntry.memory_trick })
  }
  if (items.length < 5 && q.common_patterns?.[1]) {
    items.push({ icon: '📌', type: 'pattern', label: 'İkinci Kalıp', value: q.common_patterns[1] })
  }

  return items.slice(0, 5)
}

// ── Similar questions ─────────────────────────────────────────────────────────

export interface SimilarQuestion {
  type: 'same_pattern' | 'trap_question' | 'contrast'
  title: string
  question: string
  options: Record<string, string>
  correct: string
  targetWord: string
  explanation: string
}

export function generateSimilarQuestions(q: ExamQuestion): SimilarQuestion[] {
  const correct    = q.options[q.correct_answer] ?? ''
  const correctKey = correct.toLowerCase().trim()
  const entry      = WORD_DB[correctKey] ?? null
  const result: SimilarQuestion[] = []

  // Same-pattern question
  const template = entry?.template_sentences[0]
  if (template) {
    const opts = buildOptionsFromOriginal(q, q.correct_answer)
    result.push({
      type: 'same_pattern',
      title: '📖 Aynı Kalıp — Yeni Cümle',
      question: template.replace('____', '----'),
      options: opts,
      correct: q.correct_answer,
      targetWord: correct,
      explanation: `Bu cümlede de "${correct}" (${entry?.meaning_tr}) doğru — aynı semantik alan`,
    })
  }

  // Trap question (using distractor as correct answer)
  const distractor = Object.entries(q.options).find(([l]) => l !== q.correct_answer)
  if (distractor) {
    const [trapLetter, trapWord] = distractor
    const trapKey = trapWord.toLowerCase().trim()
    const trapEntry = WORD_DB[trapKey] ?? null
    const trapTemplate = trapEntry?.template_sentences[0]

    if (trapTemplate) {
      const opts = buildOptionsFromOriginal(q, trapLetter)
      result.push({
        type: 'trap_question',
        title: '⚠️ Tuzak Tersi — Şimdi Doğru Olan',
        question: trapTemplate.replace('____', '----'),
        options: opts,
        correct: trapLetter,
        targetWord: trapWord,
        explanation: `"${trapWord}" (${trapEntry?.meaning_tr}) şimdi doğru — bağlam değişti!`,
      })
    }
  }

  // Contrast question
  const correctText = correct
  const d2 = Object.entries(q.options).find(([l, v]) => l !== q.correct_answer && WORD_DB[v.toLowerCase()])
  if (d2 && entry) {
    const [d2Letter, d2Word] = d2
    const d2Entry = WORD_DB[d2Word.toLowerCase().trim()]
    result.push({
      type: 'contrast',
      title: '🔀 Karıştırmayı Önle — Hangisi Daha İyi?',
      question: `"${correctText}" mi yoksa "${d2Word}" mi daha iyi uyar?\n\n"Forever chemicals ---- in the environment for centuries."`,
      options: { A: correctText, B: d2Word },
      correct: 'A',
      targetWord: correctText,
      explanation: `"${correctText}" (${entry.meaning_tr}) → süre bağlamı. "${d2Word}" (${d2Entry?.meaning_tr ?? '?'}) → farklı alan.`,
    })
  }

  return result
}

function buildOptionsFromOriginal(q: ExamQuestion, correctLetter: string): Record<string, string> {
  const opts: Record<string, string> = {}
  const letters = ['A', 'B', 'C', 'D', 'E']
  const originalOpts = Object.entries(q.options)

  originalOpts.forEach(([l, v], i) => {
    opts[letters[i]] = v
  })

  return opts
}

// ── Practice quiz ─────────────────────────────────────────────────────────────

export interface PracticeItem {
  type: 'meaning' | 'fill_in' | 'which_fits'
  question: string
  options: Record<string, string>
  correct: string
  explanation: string
}

export function generatePracticeQuiz(q: ExamQuestion): PracticeItem[] {
  const items: PracticeItem[] = []
  const opts = Object.entries(q.options)

  // 1. Which word means X?
  for (const [letter, word] of opts.slice(0, 3)) {
    const key   = word.toLowerCase().trim()
    const entry = WORD_DB[key]
    if (!entry) continue
    items.push({
      type: 'meaning',
      question: `Hangi kelime "${entry.meaning_tr.split('/')[0].trim()}" anlamına gelir?`,
      options: Object.fromEntries(opts),
      correct: letter,
      explanation: `${word} = ${entry.meaning_tr}. ${entry.memory_trick}`,
    })
    if (items.length >= 2) break
  }

  // 2. Fill in the blank (original sentence)
  items.push({
    type: 'fill_in',
    question: q.question_text ?? '',
    options: Object.fromEntries(opts),
    correct: q.correct_answer,
    explanation: `Doğru: ${q.correct_answer}) ${q.options[q.correct_answer]}`,
  })

  return items
}

// ── Critique ──────────────────────────────────────────────────────────────────

export function generateCritique(q: ExamQuestion, userAnswer: string): string {
  const correctText  = q.options[q.correct_answer] ?? ''
  const userText     = q.options[userAnswer] ?? userAnswer
  const correctKey   = correctText.toLowerCase().trim()
  const userKey      = userText.toLowerCase().trim()
  const correctEntry = WORD_DB[correctKey] ?? null
  const userEntry    = WORD_DB[userKey] ?? null
  const clues        = getKeyClues(q)

  if (userAnswer === q.correct_answer) {
    return '✅ Harika! Doğru cevabı buldun. Düşünce sürecini perçinlemek için açıklamayı incele.'
  }

  const parts: string[] = []

  // What they likely did wrong
  if (clues.length > 0) {
    parts.push(`📍 Muhtemelen "${clues[0].text}" ipucunu gözden kaçırdın — bu ${clues[0].explanation.toLowerCase()}`)
  }

  if (userEntry && correctEntry) {
    parts.push(`⚖️ Seçtiğin "${userText}" (${userEntry.meaning_tr}) — doğru "${correctText}" (${correctEntry.meaning_tr})`)
    if (userEntry.trap_explanation) {
      parts.push(`🚨 Tuzak: ${userEntry.trap_explanation}`)
    }
  }

  // Decision rule
  const rule = q.how_to_solve_this_type?.[0]
  if (rule) parts.push(`🎯 Bir sonraki sefere: ${rule}`)

  // Strategy reminder
  if (correctEntry?.memory_trick) {
    parts.push(`💡 Hatırla: ${correctEntry.memory_trick}`)
  }

  return parts.join('\n\n') || `Doğru "${correctText}" (${correctEntry?.meaning_tr ?? '?'}) — bağlamı tekrar analiz et.`
}

import type { WordEntry as _WE } from './word-db'
type WordEntry = _WE
