// ── Bootcamp JSON generator prompt builder ────────────────────────────────────
//
// Used by:
//   - /api/bootcamp-gen  (app-side generation via GitHub Models)
//   - /bootcamp/generate (copy-to-Claude prompt with full gold standard)

// ── 3 gold-standard examples (Q1, Q2, Q4) embedded ───────────────────────────
// These are extracted from bootcamp_test1.json and kept here so
// the prompt can work without loading the full file at runtime.

export const GOLD_EXAMPLES = [
  {
    id: "sentence_completion_test1_q01",
    question_number: 1,
    section: "sentence_completion",
    source: "SENTENCE COMPLETION TEST 1.pdf",
    question_text: "____ that the major cancer killer, lung cancer, is strongly influenced by diet.",
    options: {
      A: "The latest statistical evidence",
      B: "However obvious it may seem",
      C: "There is much evidence to suggest",
      D: "As smokers love to point out",
      E: "The consumption of fruit and vegetables ensures"
    },
    correct_answer: "C",
    question_type: "sentence_completion",
    logic_type: "noun_clause_completion",
    expected_direction: "complete statement with 'that' clause",
    difficulty: 2,
    guided_solve: {
      locked_flow: true,
      hide_options_until_logic_selected: true,
      steps: [
        { step: 1, title: "Soru tipini bul", prompt_tr: "Boşluk cümlenin neresinde? Başta mı, sonda mı, relative clause mı, şart mı?", expected_user_action: "question_type_guess" },
        { step: 2, title: "İpucu kelimeleri yakala", prompt_tr: "Cümlede yön veren kelimeleri bul: because, as, when, if, such, that, who, which vb.", expected_user_action: "clue_detection" },
        { step: 3, title: "Mantık türünü seç", prompt_tr: "Bu soru devam mı, zıtlık mı, sebep mi, sonuç mu, şart mı, relative clause mı istiyor?", expected_user_action: "logic_selection" },
        { step: 4, title: "Şıkları aç ve ele", prompt_tr: "Şıkları ancak mantığı seçtikten sonra gör. Her şık cümlenin yapısına ve anlamına uyuyor mu?", expected_user_action: "option_elimination" },
        { step: 5, title: "Karar ver", prompt_tr: "Doğru şık hem grammar hem anlam hem de cümle yönü açısından uymalı.", expected_user_action: "answer_selection" }
      ],
      clue_highlights: [
        { text: "that", color: "blue", why_tr: "'that' öncesinde 'There is evidence to suggest' gibi bir ana cümle gerekir." },
        { text: "is strongly influenced by diet", color: "green", why_tr: "Bir iddia/kanıt cümlesi kuruluyor." }
      ],
      decision_rule_tr: "Boşluktan sonra 'that + full clause' geliyorsa, öncesinde 'There is evidence to suggest' gibi bir yapı çok doğal olur.",
      short_explanation_tr: "Doğru cevap C. 'There is much evidence to suggest that...' yapısı akademik İngilizcede çok yaygındır.",
      memory_trick_tr: "that görünce kapı arala: öncesinde 'There is evidence to suggest' gibi ana cümle ararsın.",
      mini_lesson_tr: "Bu soru bağlaç değil; 'that-clause' tamamlayan ana cümle sorusu.",
      option_analysis: {
        A: "Eksik cümle olur: 'The latest statistical evidence that...' tamamlanmıyor.",
        B: "Although/However yapısı devamında ana cümle ister; burada yapı bozuk.",
        C: "Doğru. 'There is much evidence to suggest that...' tam cümle kurar.",
        D: "'As smokers love to point out that...' yapı bozuk.",
        E: "'ensures that' gramer olarak mümkün olsa da anlam ters ve cümle fazla iddialı olur."
      }
    },
    ui_instruction: {
      show_colored_clues: true,
      color_legend: { blue: "grammar / structural clue", green: "meaning clue", orange: "logic connector", red: "trap / mismatch" },
      preferred_layout: ["question_stem","pre_decision_questions","colored_clues","logic_map","options_after_unlock","option_analysis_table","memory_card"]
    }
  },
  {
    id: "sentence_completion_test1_q02",
    question_number: 2,
    section: "sentence_completion",
    source: "SENTENCE COMPLETION TEST 1.pdf",
    question_text: "Some comets have such long orbits ____.",
    options: {
      A: "while some asteroids may be burnt-up comets",
      B: "in case they come from a region outside the Solar System",
      C: "since they are often visible from the Earth",
      D: "that they pass near the Earth only once every million years",
      E: "just as their dust tails stretch up to 10 million kilometres across the sky"
    },
    correct_answer: "D",
    question_type: "sentence_completion",
    logic_type: "result_structure",
    expected_direction: "such + adjective + noun + that result",
    difficulty: 1,
    guided_solve: {
      locked_flow: true,
      hide_options_until_logic_selected: true,
      steps: [
        { step: 1, title: "Soru tipini bul", prompt_tr: "Boşluk cümlenin neresinde? Başta mı, sonda mı, relative clause mı, şart mı?", expected_user_action: "question_type_guess" },
        { step: 2, title: "İpucu kelimeleri yakala", prompt_tr: "Cümlede yön veren kelimeleri bul: because, as, when, if, such, that, who, which vb.", expected_user_action: "clue_detection" },
        { step: 3, title: "Mantık türünü seç", prompt_tr: "Bu soru devam mı, zıtlık mı, sebep mi, sonuç mu, şart mı, relative clause mı istiyor?", expected_user_action: "logic_selection" },
        { step: 4, title: "Şıkları aç ve ele", prompt_tr: "Şıkları ancak mantığı seçtikten sonra gör. Her şık cümlenin yapısına ve anlamına uyuyor mu?", expected_user_action: "option_elimination" },
        { step: 5, title: "Karar ver", prompt_tr: "Doğru şık hem grammar hem anlam hem de cümle yönü açısından uymalı.", expected_user_action: "answer_selection" }
      ],
      clue_highlights: [
        { text: "such long orbits", color: "blue", why_tr: "such + adjective + noun yapısı genelde 'that' ile sonuç ister." },
        { text: "long orbits", color: "green", why_tr: "Uzun yörünge sonucu: Dünya yakınından çok seyrek geçer." }
      ],
      decision_rule_tr: "'such ... that' = öyle ... ki. Bu yapıda doğru devam genelde sonucu verir.",
      short_explanation_tr: "Doğru cevap D. 'such long orbits that...' yapısı hem grammar hem anlam olarak tamamlar.",
      memory_trick_tr: "such uzun bir yay gibi düşün: ok mutlaka 'that' sonucuna gider.",
      mini_lesson_tr: "Bu soru 'such ... that' result pattern sorusu.",
      option_analysis: {
        A: "while zıtlık/karşılaştırma getirir, 'such' yapısını tamamlamaz.",
        B: "in case ihtimal/önlem anlamı verir; yapı uymaz.",
        C: "since sebep verir; 'such long orbits' sonucu istiyor.",
        D: "Doğru. Uzun yörünge sonucu Dünya yakınından nadiren geçer.",
        E: "just as karşılaştırma/eşzamanlılık verir; sonuç yapısı değil."
      }
    },
    ui_instruction: {
      show_colored_clues: true,
      color_legend: { blue: "grammar / structural clue", green: "meaning clue", orange: "logic connector", red: "trap / mismatch" },
      preferred_layout: ["question_stem","pre_decision_questions","colored_clues","logic_map","options_after_unlock","option_analysis_table","memory_card"]
    }
  },
  {
    id: "sentence_completion_test1_q04",
    question_number: 4,
    section: "sentence_completion",
    source: "SENTENCE COMPLETION TEST 1.pdf",
    question_text: "The personnel officer is looking for someone _____.",
    options: {
      A: "that they are willing to do a great deal of travelling",
      B: "who has a real talent for organization",
      C: "until he finds someone who really is suitable",
      D: "since at present several positions are available",
      E: "whether they have the right qualifications"
    },
    correct_answer: "B",
    question_type: "sentence_completion",
    logic_type: "relative_clause",
    expected_direction: "someone + who",
    difficulty: 1,
    guided_solve: {
      locked_flow: true,
      hide_options_until_logic_selected: true,
      steps: [
        { step: 1, title: "Soru tipini bul", prompt_tr: "Boşluk cümlenin neresinde? Başta mı, sonda mı, relative clause mı, şart mı?", expected_user_action: "question_type_guess" },
        { step: 2, title: "İpucu kelimeleri yakala", prompt_tr: "Cümlede yön veren kelimeleri bul: because, as, when, if, such, that, who, which vb.", expected_user_action: "clue_detection" },
        { step: 3, title: "Mantık türünü seç", prompt_tr: "Bu soru devam mı, zıtlık mı, sebep mi, sonuç mu, şart mı, relative clause mı istiyor?", expected_user_action: "logic_selection" },
        { step: 4, title: "Şıkları aç ve ele", prompt_tr: "Şıkları ancak mantığı seçtikten sonra gör. Her şık cümlenin yapısına ve anlamına uyuyor mu?", expected_user_action: "option_elimination" },
        { step: 5, title: "Karar ver", prompt_tr: "Doğru şık hem grammar hem anlam hem de cümle yönü açısından uymalı.", expected_user_action: "answer_selection" }
      ],
      clue_highlights: [
        { text: "someone", color: "blue", why_tr: "Kişi anlatılıyorsa 'who' relative clause beklenir." },
        { text: "is looking for", color: "green", why_tr: "Aranan kişinin niteliği gelecek." }
      ],
      decision_rule_tr: "'someone' sonrası kişiyi tanımlayan ifade geliyorsa 'who + verb' doğal seçimdir.",
      short_explanation_tr: "Doğru cevap B. Personel görevlisi organizasyon yeteneği olan birini arıyor.",
      memory_trick_tr: "someone görünce mini alarm: 'who?' Kimi arıyoruz?",
      mini_lesson_tr: "Relative clause tanıma sorusu.",
      option_analysis: {
        A: "that they... kişi uyumu bozuk; someone tekil ama they ve yapı sorunlu.",
        B: "Doğru. 'someone who has...' kişiyi tanımlar.",
        C: "until zaman cümlesi verir ama 'looking for someone' nesnesini tamamlamaz.",
        D: "since sebep verir, aranan kişiyi tanımlamaz.",
        E: "whether dolaylı soru yapısı; 'someone whether...' olmaz."
      }
    },
    ui_instruction: {
      show_colored_clues: true,
      color_legend: { blue: "grammar / structural clue", green: "meaning clue", orange: "logic connector", red: "trap / mismatch" },
      preferred_layout: ["question_stem","pre_decision_questions","colored_clues","logic_map","options_after_unlock","option_analysis_table","memory_card"]
    }
  }
]

// ── System prompt ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(examples: typeof GOLD_EXAMPLES = GOLD_EXAMPLES): string {
  return `You are a master YDS (Turkish University English Exam) teacher and JSON dataset builder.

Your task: convert raw YDS sentence completion questions into a rich, structured learning JSON.

CRITICAL RULES:
1. Return ONLY a valid JSON array — no explanations, no markdown, no code fences.
2. Every field below is REQUIRED. Never omit, shorten, or simplify.
3. All Turkish fields (_tr suffix) must be written in natural, clear Turkish.
4. clue_highlights must reference EXACT substrings from question_text.
5. option_analysis must explain EVERY option (A through E) — why it fits or why it doesn't.
6. memory_trick_tr must be a simple, memorable image or rule a student can recall instantly.
7. mini_lesson_tr must name the grammar/logic pattern and why it matters.
8. logic_type must be one of: noun_clause_completion | result_structure | condition | relative_clause | contrast | cause_result | continuation | time_sequence | indirect_question | contrast_surprise | parallel_structure | comparison | elaboration
9. Clue colors: blue=grammar/structure, green=meaning, orange=logic connector, red=trap/mismatch
10. difficulty: 1=easy, 2=medium, 3=hard

REQUIRED JSON STRUCTURE PER QUESTION:
{
  "id": "sentence_completion_<test>_q<number>",
  "question_number": <integer>,
  "section": "sentence_completion",
  "source": "<source filename>",
  "question_text": "<exact question with ____ for blank>",
  "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
  "correct_answer": "<A|B|C|D|E>",
  "question_type": "sentence_completion",
  "logic_type": "<see list above>",
  "expected_direction": "<one phrase describing what blank needs>",
  "difficulty": <1|2|3>,
  "guided_solve": {
    "locked_flow": true,
    "hide_options_until_logic_selected": true,
    "steps": [
      { "step": 1, "title": "Soru tipini bul", "prompt_tr": "Boşluk cümlenin neresinde? Başta mı, sonda mı, relative clause mı, şart mı?", "expected_user_action": "question_type_guess" },
      { "step": 2, "title": "İpucu kelimeleri yakala", "prompt_tr": "Cümlede yön veren kelimeleri bul: because, as, when, if, such, that, who, which vb.", "expected_user_action": "clue_detection" },
      { "step": 3, "title": "Mantık türünü seç", "prompt_tr": "Bu soru devam mı, zıtlık mı, sebep mi, sonuç mu, şart mı, relative clause mı istiyor?", "expected_user_action": "logic_selection" },
      { "step": 4, "title": "Şıkları aç ve ele", "prompt_tr": "Şıkları ancak mantığı seçtikten sonra gör. Her şık cümlenin yapısına ve anlamına uyuyor mu?", "expected_user_action": "option_elimination" },
      { "step": 5, "title": "Karar ver", "prompt_tr": "Doğru şık hem grammar hem anlam hem de cümle yönü açısından uymalı.", "expected_user_action": "answer_selection" }
    ],
    "clue_highlights": [
      { "text": "<exact substring from question_text>", "color": "<blue|green|orange|red>", "why_tr": "<specific explanation why this word/phrase is a clue>" }
    ],
    "decision_rule_tr": "<concrete grammar/logic rule that identifies the correct answer — 1-2 sentences>",
    "short_explanation_tr": "<full explanation starting with 'Doğru cevap X.' then why — 2-3 sentences>",
    "memory_trick_tr": "<vivid, simple image or rule in Turkish — one sentence>",
    "mini_lesson_tr": "<name the pattern + why it matters — one sentence>",
    "option_analysis": {
      "A": "<explain exactly why A fits or doesn't — grammar + meaning + logic>",
      "B": "<explain exactly why B fits or doesn't — grammar + meaning + logic>",
      "C": "<explain exactly why C fits or doesn't — grammar + meaning + logic>",
      "D": "<explain exactly why D fits or doesn't — grammar + meaning + logic>",
      "E": "<explain exactly why E fits or doesn't — grammar + meaning + logic>"
    }
  },
  "ui_instruction": {
    "show_colored_clues": true,
    "color_legend": { "blue": "grammar / structural clue", "green": "meaning clue", "orange": "logic connector", "red": "trap / mismatch" },
    "preferred_layout": ["question_stem","pre_decision_questions","colored_clues","logic_map","options_after_unlock","option_analysis_table","memory_card"]
  }
}

GOLD STANDARD EXAMPLES (match this depth and quality exactly):
${JSON.stringify(examples, null, 2)}`
}

// ── Parse raw question text ────────────────────────────────────────────────────
// Accepts various paste formats from PDF extraction

export interface RawQuestion {
  number: number
  text: string
  options: Record<string, string>
  correct?: string
}

export function parseRawQuestions(raw: string): RawQuestion[] {
  const results: RawQuestion[] = []

  // Normalize whitespace
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  let current: Partial<RawQuestion> | null = null

  const pushCurrent = () => {
    if (current?.number && current.text && current.options && Object.keys(current.options).length >= 4) {
      results.push(current as RawQuestion)
    }
    current = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Question number detector: "1.", "Q1:", "Question 1:", "1)"
    const qMatch = line.match(/^(?:Q(?:uestion)?\s*)?(\d+)[.):\s]\s*(.*)/)
    if (qMatch && !line.match(/^[A-E][.)]/i)) {
      // Check if the rest looks like a sentence (not an option)
      const rest = qMatch[2].trim()
      if (rest.length > 20 || rest.includes('____') || rest.includes('---') || rest.includes('...')) {
        pushCurrent()
        current = { number: parseInt(qMatch[1]), text: rest, options: {} }
        continue
      }
    }

    if (!current) continue

    // Option detector: A) B) C) D) E) or A. B. C. etc.
    const optMatch = line.match(/^([A-E])[.):\s]\s*(.+)/)
    if (optMatch) {
      if (!current.options) current.options = {}
      current.options[optMatch[1].toUpperCase()] = optMatch[2].trim()
      continue
    }

    // Correct answer: "Answer: C", "Correct: C", "Cevap: C"
    const ansMatch = line.match(/(?:answer|correct|cevap|doğru)[:\s]+([A-E])/i)
    if (ansMatch) {
      current.correct = ansMatch[1].toUpperCase()
      continue
    }

    // Question text continuation (multi-line question)
    if (!current.options || Object.keys(current.options).length === 0) {
      if (!line.match(/^[A-E][.)]/i) && line.length > 5) {
        current.text = (current.text || '') + ' ' + line
      }
    }
  }

  pushCurrent()
  return results
}

// ── Build user message for AI ──────────────────────────────────────────────────

export function buildUserMessage(
  questions: RawQuestion[],
  testName: string,
  startNumber: number
): string {
  const formatted = questions.map((q, i) => {
    const num = startNumber + i
    const opts = Object.entries(q.options)
      .map(([k, v]) => `  "${k}": "${v}"`)
      .join(',\n')
    const correct = q.correct ? `\nCorrect answer: ${q.correct}` : ''
    return `Question ${num}:
Text: "${q.text}"
Options:
${opts}${correct}`
  }).join('\n\n---\n\n')

  return `Convert the following ${questions.length} YDS sentence completion question(s) into the JSON format.

Source file: "${testName}"
Start numbering from question_number: ${startNumber}

Use id format: "sentence_completion_<test_slug>_q<padded_number>"
Example: "sentence_completion_test2_q01"

Questions to convert:

${formatted}

Return ONLY a JSON array with ${questions.length} question object(s). No explanations.`
}

// ── Full Claude prompt (for copy-to-clipboard) ─────────────────────────────────
// Embeds all 25 gold standard questions for maximum quality

export async function buildFullClaudePrompt(
  newQuestionsText: string,
  goldStandardJson: string
): Promise<string> {
  return `You are a master YDS (Turkish University English Exam) teacher and JSON dataset builder.

CRITICAL RULES:
1. Return ONLY a valid JSON array — no explanations, no markdown, no code fences.
2. Every field is REQUIRED. Never omit, shorten, or simplify.
3. All Turkish fields (_tr suffix) must be natural, clear Turkish.
4. clue_highlights must reference EXACT substrings from question_text.
5. option_analysis must explain EVERY option (A through E).
6. memory_trick_tr: simple memorable image or rule a student can recall in seconds.
7. mini_lesson_tr: name the pattern, explain why it matters.
8. Clue colors: blue=grammar/structure, green=meaning, orange=logic connector, red=trap
9. difficulty: 1=easy 2=medium 3=hard
10. logic_type: noun_clause_completion | result_structure | condition | relative_clause | contrast | cause_result | continuation | time_sequence | indirect_question | contrast_surprise | parallel_structure | comparison | elaboration

====================================================
GOLD STANDARD REFERENCE (25 questions — match this depth exactly):
====================================================

${goldStandardJson}

====================================================
NEW QUESTIONS TO CONVERT:
====================================================

${newQuestionsText}

====================================================

Return ONLY a valid JSON array. Match or exceed the quality of the reference.`
}
