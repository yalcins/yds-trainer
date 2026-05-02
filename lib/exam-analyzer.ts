import type { ExamData, ExamQuestion } from './types'
import { getAdaptiveStore } from './adaptive-store'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExamMeta {
  id: string
  name: string
  date: string
  totalScore: number
  correct: number
  total: number
}

export interface SectionStat {
  key: string
  label: string
  total: number
  wrong: number
  correct: number
  accuracy: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  patterns: Record<string, number>
  wrongQuestions: ExamQuestion[]
}

export interface PatternStat {
  pattern: string
  label: string
  frequency: number
  sections: string[]
  wrongQuestions: ExamQuestion[]
  severity: 'critical' | 'major' | 'minor'
  tip: string
}

export interface MistakeType {
  type: 'dangerous_misconception' | 'weak_knowledge' | 'fifty_fifty' | 'careless' | 'unknown'
  label: string
  icon: string
  color: string
  count: number
  questions: ExamQuestion[]
  description: string
}

export interface WeaknessItem {
  rank: number
  category: string
  sectionKey: string
  accuracy: number
  wrongCount: number
  totalCount: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  subWeaknesses: string[]
  recommendation: string
  weeklyGoal: string
  estimatedHours: number
}

export interface MissingPattern {
  rank: number
  pattern: string
  label: string
  frequency: number
  crossExam: boolean
  examples: string[]
  howToFix: string
  relatedPatterns: string[]
}

export interface DayPlan {
  day: number
  label: string
  focus: string
  sessionType: string
  duration: string
  activities: string[]
  targetPattern: string
  expectedImprovement: string
}

export interface AdaptiveSet {
  id: string
  title: string
  icon: string
  focus: string
  questions: ExamQuestion[]
  targetWeakness: string
  estimatedTime: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface PersonalStrategy {
  profileSummary: string
  estimatedTargetScore: number
  daysToTarget: number
  topWeaknesses: WeaknessItem[]
  topPatterns: MissingPattern[]
  dailyPlan: DayPlan[]
  adaptiveSets: AdaptiveSet[]
  mistakeTypes: MistakeType[]
  quickWins: string[]
  hardChallenges: string[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  fill_blank_vocab:    'Kelime Bilgisi',
  cloze:               'Cloze (Bütünlük)',
  sentence_completion: 'Cümle Tamamlama',
  translation:         'Çeviri',
  reading:             'Okuduğunu Anlama',
  paragraph_completion:'Paragraf Tamamlama',
  paragraph_questions: 'Paragraf Soruları',
}

const SECTION_ORDER = [
  'fill_blank_vocab','cloze','sentence_completion','translation',
  'reading','paragraph_completion','paragraph_questions',
]

const PATTERN_INFO: Record<string, { label: string; tip: string; related: string[] }> = {
  'verb + preposition collocations': {
    label: 'Fiil+Edat Kalıpları',
    tip: 'Sabit kalıplar: conform TO, result IN, differ FROM, attribute TO, interfere WITH',
    related: ['lexical cohesion', 'context-based synonym'],
  },
  'context-based synonym': {
    label: 'Bağlam Eşanlamlısı',
    tip: 'Genel anlamı değil, bağlama ÖZEL anlamı düşün. forever chemicals → endure (süre), not accelerate (hız)',
    related: ['connotation (positive/negative)', 'vocabulary in context'],
  },
  'connotation (positive/negative)': {
    label: 'Anlam Tonu (Pozitif/Negatif)',
    tip: 'Cümle olumlu mu olumsuz mu? Bağlam hangi tonu gerektiriyor?',
    related: ['context-based synonym'],
  },
  'contrast markers': {
    label: 'Zıtlık Bağlaçları',
    tip: 'however = ZITLIK, therefore = NEDEN-SONUÇ, furthermore = EK BİLGİ — karıştırma!',
    related: ['cause-effect', 'discourse markers'],
  },
  'cause-effect': {
    label: 'Neden-Sonuç Bağlaçları',
    tip: 'therefore/thus = sonuç | because/since = sebep | as a result = sonuç — yönü kontrol et',
    related: ['contrast', 'discourse markers'],
  },
  'contrast': {
    label: 'Zıtlık / Karşıtlık',
    tip: 'however/nevertheless = güçlü zıt | although/even though = kabul+zıt | whereas/while = iki taraf karşılaştırma',
    related: ['contrast markers', 'exemplification'],
  },
  'exemplification': {
    label: 'Örnek Verme',
    tip: 'for example/for instance = genel → özel. Seçenek önceki genel fikre örnek vermeli',
    related: ['elaboration'],
  },
  'elaboration': {
    label: 'Genişletme / Açıklama',
    tip: 'moreover/furthermore = daha fazla kanıt. Önceki fikirle AYNI yönde ilerle',
    related: ['exemplification'],
  },
  'discourse markers': {
    label: 'Söylem İşaretleri',
    tip: 'Bağlaçların doğru mantık tipini belirler — önce öncesi-sonrasını oku, sonra seç',
    related: ['cause-effect', 'contrast markers'],
  },
  'verb tense consistency': {
    label: 'Zaman Tutarlılığı',
    tip: 'Geçmiş zaman bağlamı → simple past. since/for → present perfect. already/just → present perfect',
    related: ['lexical cohesion'],
  },
  'lexical cohesion': {
    label: 'Kelime Bütünlüğü',
    tip: 'Metin boyunca aynı konudan bahsediliyor — seçenek konuyu sürdürmeli',
    related: ['logical flow', 'topic continuity'],
  },
  'main idea': {
    label: 'Ana Fikir Soruları',
    tip: 'Tek cümleye odaklanma — tüm paragrafın "ana iddiası" ne? Çok spesifik seçenekler yanlış',
    related: ['tone/purpose', 'inference'],
  },
  'detail question': {
    label: 'Ayrıntı Soruları',
    tip: 'Metinde DOĞRUDAN yazılı olan bilgiyi bul. Çıkarım YAPMA — sadece metni oku',
    related: ['inference'],
  },
  'inference': {
    label: 'Çıkarım Soruları',
    tip: 'Metinde açıkça yazılmayan ama ima edilen anlam. "It can be inferred that..." → bağlam+mantık',
    related: ['main idea', 'tone/purpose'],
  },
  'vocabulary in context': {
    label: 'Bağlamda Kelime',
    tip: 'Kelimeyi bilmesen de bağlamdan anlayabilirsin. Cümlenin öncesi + sonrası ipucu verir',
    related: ['context-based synonym'],
  },
  'tone/purpose': {
    label: 'Ton / Amaç Soruları',
    tip: 'Yazarın tutumu: objective/critical/optimistic/pessimistic? Amaç: inform/persuade/entertain?',
    related: ['main idea', 'inference'],
  },
  'logical flow': {
    label: 'Mantıksal Akış',
    tip: 'Cümle öncesine ve sonrasına uymalı. Konuyu değiştiren seçenekler yanlış',
    related: ['cohesion devices', 'topic continuity'],
  },
  'cohesion devices': {
    label: 'Bağlantı Araçları',
    tip: 'this/these/it → önceki cümleye referans. Doğru seçenek aynı öğeye gönderim yapmalı',
    related: ['logical flow', 'lexical cohesion'],
  },
  'topic continuity': {
    label: 'Konu Sürekliliği',
    tip: 'Paragrafın ana konusundan AYRILMA. Yeni konu getiren seçenek her zaman yanlış',
    related: ['cohesion devices', 'logical flow'],
  },
  'author purpose': {
    label: 'Yazar Amacı',
    tip: 'Neden yazdı? Okuyucuya ne söylüyor? Genel + spesifik ayrımına dikkat',
    related: ['tone/purpose', 'main idea'],
  },
  'paragraph organization': {
    label: 'Paragraf Yapısı',
    tip: 'Giriş/gelişme/sonuç akışını bul. Boşluk paragraf içinde nerede?',
    related: ['logical flow'],
  },
  'supporting details': {
    label: 'Destekleyici Ayrıntılar',
    tip: 'Ana fikri destekleyen kanıtları bul. Kanıt metinde DOĞRUDAN verilmeli',
    related: ['detail question'],
  },
  'negative questions': {
    label: 'Negatif Sorular (EXCEPT/NOT)',
    tip: '"EXCEPT" veya "NOT" içeren sorularda doğru olmayan şıkkı bul — tüm şıkları kontrol et',
    related: ['detail question'],
  },
}

// ── Core analysis ─────────────────────────────────────────────────────────────

export function analyzeExams(exams: ExamData[]): {
  metas: ExamMeta[]
  sectionStats: SectionStat[]
  patternStats: PatternStat[]
  mistakeTypes: MistakeType[]
} {
  // Build meta
  const metas: ExamMeta[] = exams.map((e, i) => ({
    id: `exam_${i + 1}`,
    name: e.meta?.exam ?? `YDS Sınav ${i + 1}`,
    date: `2026-0${i + 1}-01`,
    totalScore: (e.meta?.total_correct ?? 0) * 1.25,
    correct: e.meta?.total_correct ?? 0,
    total: e.questions?.length ?? 80,
  }))

  // Aggregate all questions across exams
  const allQuestions = exams.flatMap(e => e.questions ?? [])
  const allWrong     = allQuestions.filter(q => !q.is_correct)

  // Section stats
  const sectionMap: Record<string, ExamQuestion[]> = {}
  const sectionTotal: Record<string, number>       = {}
  allQuestions.forEach(q => {
    const s = q.section_key
    if (!sectionMap[s]) { sectionMap[s] = []; sectionTotal[s] = 0 }
    sectionTotal[s]++
    if (!q.is_correct) sectionMap[s].push(q)
  })

  const sectionStats: SectionStat[] = SECTION_ORDER
    .filter(s => sectionTotal[s] > 0)
    .map(s => {
      const wrongQs  = sectionMap[s] ?? []
      const total    = sectionTotal[s] ?? 0
      const accuracy = total > 0 ? (total - wrongQs.length) / total : 1

      // Aggregate patterns
      const patterns: Record<string, number> = {}
      wrongQs.forEach(q => {
        (q.common_patterns ?? []).forEach(p => {
          patterns[p] = (patterns[p] ?? 0) + 1
        })
      })

      const priority: SectionStat['priority'] =
        accuracy < 0.35 ? 'critical' :
        accuracy < 0.50 ? 'high' :
        accuracy < 0.70 ? 'medium' : 'low'

      return {
        key: s,
        label: SECTION_LABELS[s] ?? s,
        total,
        wrong: wrongQs.length,
        correct: total - wrongQs.length,
        accuracy,
        priority,
        patterns,
        wrongQuestions: wrongQs,
      }
    })

  // Pattern stats (across exams)
  const patternMap: Record<string, { qs: ExamQuestion[]; sections: Set<string> }> = {}
  allWrong.forEach(q => {
    (q.common_patterns ?? []).forEach(p => {
      if (!patternMap[p]) patternMap[p] = { qs: [], sections: new Set() }
      patternMap[p].qs.push(q)
      patternMap[p].sections.add(q.section_key)
    })
  })

  const patternStats: PatternStat[] = Object.entries(patternMap)
    .sort((a, b) => b[1].qs.length - a[1].qs.length)
    .map(([pattern, data]) => {
      const info = PATTERN_INFO[pattern]
      return {
        pattern,
        label: info?.label ?? pattern,
        frequency: data.qs.length,
        sections: [...data.sections],
        wrongQuestions: data.qs,
        severity: data.qs.length >= 10 ? 'critical' : data.qs.length >= 6 ? 'major' : 'minor',
        tip: info?.tip ?? 'Bu kalıpla ilgili daha fazla pratik yap',
      }
    })

  // Mistake types (using adaptive store if available)
  const mistakeTypes = buildMistakeTypes(allWrong, allQuestions)

  return { metas, sectionStats, patternStats, mistakeTypes }
}

function buildMistakeTypes(allWrong: ExamQuestion[], allQuestions: ExamQuestion[]): MistakeType[] {
  // Try to get confidence data from adaptive store
  let store: ReturnType<typeof getAdaptiveStore> | null = null
  try { store = getAdaptiveStore() } catch {}

  const dangerous: ExamQuestion[] = []
  const weak: ExamQuestion[]      = []
  const fiftyFifty: ExamQuestion[] = []
  const careless: ExamQuestion[]   = []
  const unknown: ExamQuestion[]    = []

  allWrong.forEach(q => {
    const review = store?.questionReviews[q.question_number]
    const attempts = store?.attempts.filter(a => a.questionId === q.question_number) ?? []

    if (review?.lastConfidence === 'high' || attempts.some(a => a.errorType === 'dangerous_misconception')) {
      dangerous.push(q)
    } else if (review?.masteryScore !== undefined && review.masteryScore < 30) {
      weak.push(q)
    } else if (attempts.length > 1 && attempts.filter(a => a.isCorrect).length > 0 && attempts.filter(a => !a.isCorrect).length > 0) {
      fiftyFifty.push(q)
    } else if (attempts.some(a => a.confidence === 'low' && !a.isCorrect)) {
      weak.push(q)
    } else {
      // Heuristic: if correct answer and user answer are semantically close
      unknown.push(q)
    }
  })

  // If no store data, use heuristics
  if (!store) {
    allWrong.forEach(q => unknown.push(q))
    dangerous.length = 0; weak.length = 0; fiftyFifty.length = 0; careless.length = 0
  }

  return [
    {
      type: 'dangerous_misconception' as const,
      label: 'Tehlikeli Yanılgı',
      icon: '🚨',
      color: 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B]',
      count: dangerous.length,
      questions: dangerous,
      description: 'Yüksek güvenle yanlış cevapladın — yanlış "kural" oluşturmuşsun',
    },
    {
      type: 'weak_knowledge' as const,
      label: 'Zayıf Bilgi',
      icon: '⚠️',
      color: 'border-amber-400 bg-amber-50 text-amber-700',
      count: weak.length,
      questions: weak,
      description: 'Düşük güvenle yanlış — bilmiyordun ve tahmin ettin',
    },
    {
      type: 'fifty_fifty' as const,
      label: '50-50 Belirsizlik',
      icon: '🎲',
      color: 'border-[#FFD900] bg-[#FFF9DB] text-amber-700',
      count: fiftyFifty.length,
      questions: fiftyFifty,
      description: 'Bazen doğru bazen yanlış — kavramı tam oturtamadın',
    },
    {
      type: 'careless' as const,
      label: 'Dikkatsizlik',
      icon: '🙈',
      color: 'border-purple-400 bg-purple-50 text-purple-700',
      count: careless.length,
      questions: careless,
      description: 'Biliyordun ama hız/dikkatsizlik yüzünden yanlış seçtin',
    },
    {
      type: 'unknown' as const,
      label: 'Bilinmeyen / Sınav Yanlışı',
      icon: '❓',
      color: 'border-[#E5E5E5] bg-[#F8F8F8] text-[#AFAFAF]',
      count: unknown.length,
      questions: unknown,
      description: 'Pratik henüz yapılmadı — kategorize edilmemiş hatalar',
    },
  ].filter(t => t.count > 0)
}

// ── Personal weakness profile ─────────────────────────────────────────────────

export function generateWeaknessProfile(sectionStats: SectionStat[]): WeaknessItem[] {
  const sorted = [...sectionStats].sort((a, b) => a.accuracy - b.accuracy)

  return sorted.slice(0, 5).map((s, i) => {
    const wrongRate = Math.round((1 - s.accuracy) * 100)

    const subWeaknesses: string[] = Object.entries(s.patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([p]) => PATTERN_INFO[p]?.label ?? p)

    const recommendation = getRecommendation(s.key, s.accuracy)
    const weeklyGoal     = getWeeklyGoal(s.key, s.accuracy)
    const estimatedHours = Math.ceil((1 - s.accuracy) * 10)

    return {
      rank: i + 1,
      category: s.label,
      sectionKey: s.key,
      accuracy: Math.round(s.accuracy * 100),
      wrongCount: s.wrong,
      totalCount: s.total,
      priority: s.priority,
      subWeaknesses,
      recommendation,
      weeklyGoal,
      estimatedHours,
    }
  })
}

function getRecommendation(section: string, accuracy: number): string {
  const recs: Record<string, string> = {
    sentence_completion: 'Bağlaç mantığını önce öğren: however/therefore/although farkını sıfırdan çalış. "Öncesi ne söylüyor? Sonrası ne söylüyor?" sorusunu her soruda sor.',
    cloze: 'Cloze geçmişi için: discourse markers (zıt/ek/neden) + zaman tutarlılığı. Her cümlede bağlacı düşün, sonra grameri kontrol et.',
    reading: 'OKUMA: Her soru için metne dön. Ana fikir = tüm paragrafı temsil eden cümle. Çıkarım = açıkça yazılmayan ama ima edilen. "EXCEPT" sorularında tüm şıkları kontrol et.',
    fill_blank_vocab: 'Kelime: Anlam alanlarını grupla (süre/hız/güç/açıklama). Sabit kalıpları ezberle: endure/remain/persist (süre), accelerate/boost (hız).',
    paragraph_completion: 'Paragraf tamamlama: Önceki + sonraki cümleyi birlikte oku. Konuyu değiştiren seçenekler kesinlikle yanlış. Referans kelimelere (this/these) dikkat et.',
    paragraph_questions: '"EXCEPT/NOT" sorularını işaretle. Metinde DOĞRUDAN yazılı olanı bul — yorum yapma.',
    translation: 'Çeviri: Clause sırasını doğru çevir. Pasif yapıları aktif olarak ifade et. Teknik terimleri tam karşılıklarıyla öğren.',
  }
  return recs[section] ?? 'Bu bölüme odaklan ve pratik yap.'
}

function getWeeklyGoal(section: string, accuracy: number): string {
  if (accuracy < 0.35) return `Haftada 3 seans · ${SECTION_LABELS[section] ?? section} doğruluğunu %50\'ye çıkar`
  if (accuracy < 0.55) return `Haftada 2 seans · ${SECTION_LABELS[section] ?? section} doğruluğunu %65\'e çıkar`
  return `Haftada 1 seans · ${SECTION_LABELS[section] ?? section} doğruluğunu %75\'e çıkar`
}

// ── Top missing patterns ──────────────────────────────────────────────────────

export function generateTopPatterns(patternStats: PatternStat[], exams: ExamData[]): MissingPattern[] {
  // A pattern is "cross-exam" if it appears in 2+ exams
  const crossExamPatterns = new Set<string>()
  if (exams.length > 1) {
    const patternsByExam = exams.map(e =>
      new Set(e.questions.filter(q => !q.is_correct).flatMap(q => q.common_patterns ?? []))
    )
    patternStats.forEach(p => {
      const appearCount = patternsByExam.filter(ps => ps.has(p.pattern)).length
      if (appearCount >= 2) crossExamPatterns.add(p.pattern)
    })
  }

  return patternStats.slice(0, 10).map((p, i) => {
    const info = PATTERN_INFO[p.pattern]
    const examples = p.wrongQuestions
      .slice(0, 2)
      .map(q => `Q${q.question_number}: ${q.question_text?.slice(0, 60) ?? '?'}...`)

    return {
      rank: i + 1,
      pattern: p.pattern,
      label: info?.label ?? p.pattern,
      frequency: p.frequency,
      crossExam: crossExamPatterns.has(p.pattern),
      examples,
      howToFix: info?.tip ?? 'Bu kalıpla daha fazla pratik yap',
      relatedPatterns: (info?.related ?? []).map(r => PATTERN_INFO[r]?.label ?? r),
    }
  })
}

// ── Daily training plan ───────────────────────────────────────────────────────

export function generateDailyPlan(weaknesses: WeaknessItem[], patterns: MissingPattern[]): DayPlan[] {
  const top3 = weaknesses.slice(0, 3)

  const plans: DayPlan[] = [
    {
      day: 1,
      label: 'Pazartesi',
      focus: top3[0]?.category ?? 'Cümle Tamamlama',
      sessionType: 'Guided Solve',
      duration: '25 dk',
      activities: [
        '🧠 "Benimle Çöz" — ' + (top3[0]?.category ?? 'Cümle Tamamlama') + ' soruları',
        '🔗 Bağlaç mantığı: however vs therefore vs although',
        '📖 3 hafıza kartı öğren',
      ],
      targetPattern: patterns[0]?.label ?? 'Discourse Markers',
      expectedImprovement: '+10% doğruluk artışı',
    },
    {
      day: 2,
      label: 'Salı',
      focus: top3[0]?.category ?? 'Cümle Tamamlama',
      sessionType: 'Practice + Review',
      duration: '20 dk',
      activities: [
        '⚡ Adaptif pratik — yanlış soruları tekrar et',
        '🔄 Dün öğrenilen 3 kartı tekrar et',
        '✍️ Üretim modu: seçeneksiz doldurma',
      ],
      targetPattern: patterns[1]?.label ?? 'Contrast Markers',
      expectedImprovement: 'Önceki gün öğrendiklerini pekiştir',
    },
    {
      day: 3,
      label: 'Çarşamba',
      focus: top3[1]?.category ?? 'Cloze',
      sessionType: 'Guided Solve',
      duration: '25 dk',
      activities: [
        '🧠 "Benimle Çöz" — ' + (top3[1]?.category ?? 'Cloze') + ' soruları',
        '⚙️ Zaman tutarlılığı: simple past vs present perfect',
        '📖 3 yeni hafıza kartı',
      ],
      targetPattern: patterns[2]?.label ?? 'Verb Tense',
      expectedImprovement: '+10% Cloze doğruluğu',
    },
    {
      day: 4,
      label: 'Perşembe',
      focus: top3[1]?.category ?? 'Cloze',
      sessionType: 'Word Lab + Patterns',
      duration: '20 dk',
      activities: [
        '🔤 Kelime Lab — bu haftanın kelimelerini quiz et',
        '📌 Kalıp kartları: discourse markers',
        '🔄 Tekrar kuyruğunu temizle',
      ],
      targetPattern: patterns[3]?.label ?? 'Lexical Cohesion',
      expectedImprovement: 'Kelime haznesi pekiştirme',
    },
    {
      day: 5,
      label: 'Cuma',
      focus: top3[2]?.category ?? 'Okuduğunu Anlama',
      sessionType: 'Reading Focus',
      duration: '30 dk',
      activities: [
        '📄 Okuma — 2 metin × 5 soru',
        '🎯 Ana fikir sorusu stratejisi uygula',
        '🔍 Çıkarım soruları: metinde kanıt bul',
      ],
      targetPattern: patterns[4]?.label ?? 'Main Idea',
      expectedImprovement: '+8% Okuma doğruluğu',
    },
    {
      day: 6,
      label: 'Cumartesi',
      focus: 'Tam Pratik',
      sessionType: 'Mixed Session',
      duration: '40 dk',
      activities: [
        '⚡ 15 soruluk adaptif seans (tüm kategoriler)',
        '📊 Haftalık ilerlemeye bak',
        '⭐ Bu haftanın Golden 5\'lerini tekrar et',
      ],
      targetPattern: 'Karma — tüm hafta özeti',
      expectedImprovement: 'Haftalık kazanımları konsolide et',
    },
    {
      day: 7,
      label: 'Pazar',
      focus: 'Dinlenme + Hızlı Tekrar',
      sessionType: 'Light Review',
      duration: '10 dk',
      activities: [
        '🔄 Sadece tekrar kuyruğunu kontrol et',
        '🃏 Hafıza kartlarını hızlı gözden geçir',
        '😴 Beyni dinlendir — overload yapma',
      ],
      targetPattern: 'Tüm hafta özeti',
      expectedImprovement: 'Uzun süreli hafızaya alma',
    },
  ]

  return plans
}

// ── Adaptive training sets ────────────────────────────────────────────────────

export function buildAdaptiveSets(
  sectionStats: SectionStat[],
  allExams: ExamData[]
): AdaptiveSet[] {
  const allQuestions = allExams.flatMap(e => e.questions ?? [])
  const sets: AdaptiveSet[] = []

  // Sort sections by priority (worst first)
  const sorted = [...sectionStats].sort((a, b) => a.accuracy - b.accuracy)

  for (const section of sorted.slice(0, 5)) {
    const wrongQs = section.wrongQuestions.slice(0, 5)
    if (wrongQs.length === 0) continue

    // Fill to 5 with correct questions from same section
    const correctQs = allQuestions
      .filter(q => q.section_key === section.key && q.is_correct)
      .slice(0, Math.max(0, 5 - wrongQs.length))

    const setQs = [...wrongQs, ...correctQs].slice(0, 5)

    sets.push({
      id: `set_${section.key}`,
      title: section.label + ' Antrenmanı',
      icon: getSectionIcon(section.key),
      focus: getTopPatternName(section.patterns),
      questions: setQs,
      targetWeakness: section.label,
      estimatedTime: '8-12 dk',
      difficulty: section.accuracy < 0.40 ? 'hard' : section.accuracy < 0.65 ? 'medium' : 'easy',
    })
  }

  return sets
}

function getSectionIcon(key: string): string {
  const icons: Record<string, string> = {
    fill_blank_vocab: '📖',
    cloze: '🧩',
    sentence_completion: '🔗',
    translation: '🌐',
    reading: '📄',
    paragraph_completion: '📝',
    paragraph_questions: '🔍',
  }
  return icons[key] ?? '📚'
}

function getTopPatternName(patterns: Record<string, number>): string {
  const top = Object.entries(patterns).sort((a, b) => b[1] - a[1])[0]
  if (!top) return 'Genel pratik'
  return PATTERN_INFO[top[0]]?.label ?? top[0]
}

// ── Full personal strategy ────────────────────────────────────────────────────

export function generatePersonalStrategy(
  exams: ExamData[],
  sectionStats: SectionStat[],
  patternStats: PatternStat[],
): PersonalStrategy {
  const weaknesses = generateWeaknessProfile(sectionStats)
  const topPatterns = generateTopPatterns(patternStats, exams)
  const dailyPlan   = generateDailyPlan(weaknesses, topPatterns)
  const adaptiveSets = buildAdaptiveSets(sectionStats, exams)
  const mistakeTypes = buildMistakeTypes(
    exams.flatMap(e => e.questions.filter(q => !q.is_correct)),
    exams.flatMap(e => e.questions),
  )

  const avgScore = exams.reduce((s, e) => s + (e.meta?.total_correct ?? 0) * 1.25, 0) / exams.length
  const targetScore = 55
  const scoreGap    = targetScore - avgScore
  const daysToTarget = Math.max(14, Math.ceil(scoreGap * 3))

  const quickWins: string[] = []
  const hardChallenges: string[] = []

  sectionStats.forEach(s => {
    if (s.accuracy >= 0.60 && s.accuracy < 0.80) {
      quickWins.push(`${s.label}: sadece %${Math.round((1-s.accuracy)*100)} daha doğru → +${s.wrong} puan`)
    }
    if (s.accuracy < 0.40) {
      hardChallenges.push(`${s.label}: köklü çalışma gerekli (%${Math.round(s.accuracy*100)} doğruluk)`)
    }
  })

  const profileSummary = buildProfileSummary(exams, avgScore, weaknesses[0])

  return {
    profileSummary,
    estimatedTargetScore: Math.round(avgScore + Math.min(scoreGap * 0.7, 15)),
    daysToTarget,
    topWeaknesses: weaknesses,
    topPatterns,
    dailyPlan,
    adaptiveSets,
    mistakeTypes,
    quickWins,
    hardChallenges,
  }
}

function buildProfileSummary(exams: ExamData[], avgScore: number, topWeakness?: WeaknessItem): string {
  const examCount = exams.length
  const scoreText = `${examCount} sınav ortalaması: ${avgScore.toFixed(1)} puan`
  const weakText  = topWeakness ? `En kritik zayıflık: ${topWeakness.category} (%${topWeakness.accuracy} doğruluk)` : ''
  const targetGap = Math.max(0, 55 - avgScore)
  const gapText   = `55 puana ulaşmak için ${Math.ceil(targetGap / 1.25)} soru daha doğru lazım`
  return [scoreText, weakText, gapText].filter(Boolean).join(' · ')
}
