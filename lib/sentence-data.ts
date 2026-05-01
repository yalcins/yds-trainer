export type SentenceType = 'contrast' | 'cause' | 'result' | 'explanation' | 'continuation' | 'condition'

export interface OptionAnalysis {
  fits: boolean
  reason: string
}

export interface SentenceQuestion {
  id: string
  sentence: string           // full sentence with ____ for blank
  sentence_type: SentenceType
  clue_words: string[]       // words in the sentence that hint at the type
  before_meaning: string     // what the part before the blank means
  expected_continuation: string // what kind of continuation is expected
  options: Record<string, string>
  correct_answer: string
  option_analysis: Record<string, OptionAnalysis>
  explanation: string
  logic_rule: string
  pattern: string
}

export const SENTENCE_TYPE_META: Record<SentenceType, { label: string; icon: string; color: string; description: string }> = {
  contrast:     { label: 'Zıtlık',     icon: '↔️', color: 'bg-purple-100 text-purple-700 border-purple-200', description: 'Önceki bilgiyle çelişen, beklenmeyen bilgi' },
  cause:        { label: 'Sebep',      icon: '🔍', color: 'bg-amber-100 text-amber-700 border-amber-200',   description: 'Neden / sebep bildiren bilgi' },
  result:       { label: 'Sonuç',      icon: '➡️', color: 'bg-blue-100 text-blue-700 border-blue-200',     description: 'Önceki durumun sonucu' },
  explanation:  { label: 'Açıklama',   icon: '💡', color: 'bg-green-100 text-green-700 border-green-200',  description: 'Önceki fikri açıklayan / destekleyen bilgi' },
  continuation: { label: 'Süreklilik', icon: '➕', color: 'bg-teal-100 text-teal-700 border-teal-200',    description: 'Aynı yönde devam eden bilgi' },
  condition:    { label: 'Koşul',      icon: '⚙️', color: 'bg-rose-100 text-rose-700 border-rose-200',    description: 'Şart / koşul bildiren bilgi' },
}

export const sentenceQuestions: SentenceQuestion[] = [
  {
    id: 'sq_001',
    sentence: 'Although the new drug showed promising results in laboratory tests, ____.',
    sentence_type: 'contrast',
    clue_words: ['Although'],
    before_meaning: 'İlaç laboratuvar testlerinde umut verici sonuçlar gösterdi.',
    expected_continuation: 'Gerçek dünyada/klinik denemelerde işe yaramadığını belirten zıt bir bilgi bekleniyor.',
    options: {
      A: 'it proved ineffective in clinical trials',
      B: 'doctors widely prescribed it to patients',
      C: 'researchers continued their experiments with enthusiasm',
      D: 'it was immediately approved by health authorities',
      E: 'the pharmaceutical company increased its production',
    },
    correct_answer: 'A',
    option_analysis: {
      A: { fits: true,  reason: '"Although" ile açılan zıtlık cümlesini tamamlıyor: umut verici lab sonuçlarına karşın klinik denemelerde etkisiz çıktı.' },
      B: { fits: false, reason: 'Doktorların yaygın reçete etmesi lab sonuçlarıyla çelişmiyor; tersine devam niteliğinde.' },
      C: { fits: false, reason: 'Araştırmacıların devam etmesi zıtlık değil, devam/süreklilik ifade eder.' },
      D: { fits: false, reason: 'Hemen onaylanması da zıtlık değil; lab başarısının mantıksal sonucu olurdu.' },
      E: { fits: false, reason: 'Üretimi artırmak yine devam/sonuç niteliğinde; "although" ile çelişkili bağlam oluşturmuyor.' },
    },
    explanation: '"Although" (her ne kadar / -e rağmen) zıtlık bağlacıdır. İki yan arasında beklenmedik bir tezat olmalıdır. Lab başarısına karşın klinik başarısızlık mükemmel bir zıtlık oluşturur.',
    logic_rule: 'although / even though / despite → ZIT BİLGİ beklenir',
    pattern: 'Although + [olumlu durum], + [olumsuz/zıt sonuç]',
  },
  {
    id: 'sq_002',
    sentence: 'Since the government cut funding for public transport, ____.',
    sentence_type: 'result',
    clue_words: ['Since'],
    before_meaning: 'Hükümet toplu taşıma finansmanını kesti.',
    expected_continuation: '"Since" burada sebep bildiriyor; boşlukta bu kesintinin doğrudan SONUCU bekleniyor.',
    options: {
      A: 'many commuters have switched to private vehicles',
      B: 'new bus routes were introduced across the city',
      C: 'the transport minister praised the decision',
      D: 'public satisfaction with services rose sharply',
      E: 'more investment flowed into railway infrastructure',
    },
    correct_answer: 'A',
    option_analysis: {
      A: { fits: true,  reason: 'Finansman kesintisi → daha az otobüs/tren → insanlar özel araç kullanır. Mantıksal sonuç.' },
      B: { fits: false, reason: 'Yeni güzergahlar açmak, fon kesimiyle çelişir; bu bir sonuç değil, tam tersine bir durum.' },
      C: { fits: false, reason: 'Bakanın övmesi neden-sonuç değil; duygu/tepki aktarımı ve mantıksal olarak anlamsız.' },
      D: { fits: false, reason: 'Kesintinin ardından memnuniyetin artması beklenmedik ve mantıksız bir sonuçtur.' },
      E: { fits: false, reason: '"Since" ile açılan nedenin sonucu demiryoluna daha fazla yatırım değildir; bu ayrı bir neden gerektirir.' },
    },
    explanation: '"Since" hem zaman hem sebep anlamı taşır. Burada bağlam gereği SEBEP anlamındadır ve boşluk bu sebebin SONUCUNU içermelidir.',
    logic_rule: 'since / because / as → SEBEP; boşluk onun SONUCUNU verir',
    pattern: 'Since + [sebep], + [sonuç]',
  },
  {
    id: 'sq_003',
    sentence: '____, many coastal cities are investing heavily in flood barriers.',
    sentence_type: 'cause',
    clue_words: [],
    before_meaning: 'Kıyı şehirleri sel bariyerlerine yoğun yatırım yapıyor.',
    expected_continuation: 'Bu yatırımın SEBEBİ boşlukta olmalı; iklim değişikliği, artan sel riski vb.',
    options: {
      A: 'As sea levels continue to rise due to climate change',
      B: 'Although floods have become less frequent recently',
      C: 'Because the construction industry is booming',
      D: 'Since local governments have reduced their budgets',
      E: 'When tourists avoid these regions in summer',
    },
    correct_answer: 'A',
    option_analysis: {
      A: { fits: true,  reason: 'İklim değişikliği nedeniyle yükselen deniz seviyeleri, sel bariyeri yatırımının doğrudan ve mantıksal sebebidir.' },
      B: { fits: false, reason: '"Although floods have become less frequent" ile yatırım yapmak mantıksal olarak tutarsız; zıtlık bağlacı ve çelişkili içerik.' },
      C: { fits: false, reason: 'İnşaat sektörünün büyümesi genel bir ortam yaratabilir ama sel bariyerlerine özel yatırımın sebebi değildir.' },
      D: { fits: false, reason: 'Bütçelerin azaltıldığı bir durumda büyük yatırım yapmak çelişkilidir.' },
      E: { fits: false, reason: 'Turistlerin bölgeyi terk etmesi sel bariyeri yatırımının sebebi değildir; farklı bir etki alanıdır.' },
    },
    explanation: 'Yatırım kararlarının arkaplanında bir sebep vardır. "As" burada sebep bağlacı olarak kullanılmış; cümlenin geri kalanıyla (yatırım yapma) mantıksal neden-sonuç ilişkisi kuruyor.',
    logic_rule: 'as / since / because → SEBEP bilgisi; geri kalan cümle SONUÇTUR',
    pattern: 'As + [sebep], + [sonuç olarak yapılan eylem]',
  },
  {
    id: 'sq_004',
    sentence: 'The new policy has several advantages; ____, it also presents some drawbacks.',
    sentence_type: 'contrast',
    clue_words: ['also', 'drawbacks'],
    before_meaning: 'Politikanın birçok avantajı var.',
    expected_continuation: 'Noktalı virgül + "however/nevertheless" yapısı bir zıtlık bildiriyor; dezavantajlar geliyor.',
    options: {
      A: 'however',
      B: 'therefore',
      C: 'furthermore',
      D: 'consequently',
      E: 'similarly',
    },
    correct_answer: 'A',
    option_analysis: {
      A: { fits: true,  reason: '"However" tam anlamıyla zıtlık/kısıtlama bağlacıdır. "Avantajlar var AMA dezavantajlar da var" ilişkisini kurar.' },
      B: { fits: false, reason: '"Therefore" sonuç bildirir. Avantajların sonucu dezavantajlar olamaz; mantıksal bağ yanlış.' },
      C: { fits: false, reason: '"Furthermore" aynı yönde ek bilgi ekler. "Dezavantajlar" avantajlara ek değil, zıt yöndedir.' },
      D: { fits: false, reason: '"Consequently" (sonuç olarak) nedensellik ilişkisi kurar; burada gerekli olan zıtlıktır.' },
      E: { fits: false, reason: '"Similarly" benzerlik / devam bildirir. Dezavantajlar avantajlara benzer değildir.' },
    },
    explanation: '"Drawbacks" (dezavantajlar) kelimesi ve noktalı virgülden sonraki yapı zıtlık gerektiriyor. Sadece "however" bu işlevi doğru şekilde yerine getirir.',
    logic_rule: 'advantages → however / nevertheless / yet → drawbacks/disadvantages',
    pattern: '[Olumlu durum]; however, [olumsuz / zıt durum].',
  },
  {
    id: 'sq_005',
    sentence: 'If we do not reduce carbon emissions significantly, ____.',
    sentence_type: 'condition',
    clue_words: ['If'],
    before_meaning: 'Karbon emisyonlarını önemli ölçüde azaltmıyoruz (varsayımsal koşul).',
    expected_continuation: '"If + olumsuz eylem" → Bu koşul gerçekleşirse ne OLUR? Olumsuz bir sonuç bekleniyor.',
    options: {
      A: 'global temperatures will rise to dangerous levels',
      B: 'renewable energy sources will become cheaper',
      C: 'governments will invest more in green technology',
      D: 'public awareness of climate change will increase',
      E: 'international cooperation on environment will improve',
    },
    correct_answer: 'A',
    option_analysis: {
      A: { fits: true,  reason: 'Emisyon azaltılmazsa sıcaklıkların tehlikeli seviyelere çıkması doğrudan ve mantıksal sonuçtur.' },
      B: { fits: false, reason: 'Yenilenebilir enerjinin ucuzlaması emisyon azaltmamayla doğrudan bağlantılı değil; tersine azaltılmasına yardımcı olur.' },
      C: { fits: false, reason: 'Yeşil teknolojiye yatırım yapılması, koşulun olumsuz gerçekleşmesinin değil, önlem alınmasının göstergesidir.' },
      D: { fits: false, reason: 'Farkındalığın artması emisyon azaltılmamayla doğrudan ilişkili bir sonuç değildir.' },
      E: { fits: false, reason: 'Uluslararası işbirliğinin iyileşmesi de koşulun mantıksal sonucu olamaz.' },
    },
    explanation: '"If + olumsuz koşul" yapısı koşullu önermedir. Gerçekleşmeyen önlemin doğrudan olumsuz sonucu gerekir. İklim açısından en tutarlı ve doğrudan sonuç A\'dır.',
    logic_rule: 'If + [gerçekleşmeyen önlem] → [olumsuz/ciddi sonuç]',
    pattern: 'If we do not [önlem], + [olası olumsuz gelecek]',
  },
  {
    id: 'sq_006',
    sentence: 'Exercise not only improves physical health ____ it also enhances mental well-being.',
    sentence_type: 'continuation',
    clue_words: ['not only', 'also'],
    before_meaning: 'Egzersiz fiziksel sağlığı iyileştiriyor.',
    expected_continuation: '"Not only … but also" kalıbı iki eşdeğer, aynı yönde ek fayda bağlar; zihinselle ilgili.',
    options: {
      A: 'but',
      B: 'although',
      C: 'because',
      D: 'so',
      E: 'unless',
    },
    correct_answer: 'A',
    option_analysis: {
      A: { fits: true,  reason: '"not only … but also" kalıbını tamamlayan tek seçenektir; her iki faydayı birbirine ekler.' },
      B: { fits: false, reason: '"although" zıtlık bildirir; burada iki fayda arasında zıtlık yoktur.' },
      C: { fits: false, reason: '"because" sebep bildirir; zihinsel iyilik, fiziksel iyiliğin sebebi değildir.' },
      D: { fits: false, reason: '"so" sonuç bildirir; kalıbın içine "so" girmez ve anlam bozulur.' },
      E: { fits: false, reason: '"unless" koşul bildirir; "egzersiz … if not … de zihinsel iyilik" yapısı anlamsızdır.' },
    },
    explanation: '"not only … but (also)" İngilizce\'de iki benzer / aynı yönde unsuru birleştiren bağlaç çiftidir. Süreklilik (continuation) mantığı taşır.',
    logic_rule: 'not only … but also → İKİ EŞ YÖNLÜ FAYDA / ÖZELLİK ekler',
    pattern: '[Subject] not only [V1] but also [V2].',
  },
  {
    id: 'sq_007',
    sentence: 'The ancient ruins were so well preserved ____ archaeologists could reconstruct daily life in detail.',
    sentence_type: 'result',
    clue_words: ['so', 'that'],
    before_meaning: 'Kalıntılar çok iyi korunmuş.',
    expected_continuation: '"so … that" yapısı yoğunluğun bir SONUCUNU bildirir.',
    options: {
      A: 'that',
      B: 'but',
      C: 'although',
      D: 'because',
      E: 'if',
    },
    correct_answer: 'A',
    option_analysis: {
      A: { fits: true,  reason: '"so + adj + that + result clause" kalıbını tamamlar. Kalıntıların iyi korunması arkeologların rekonstrüksiyon yapabilmesinin koşulu/sebebidir.' },
      B: { fits: false, reason: '"but" zıtlık kurar; "so well preserved but could reconstruct" anlamsızdır.' },
      C: { fits: false, reason: '"although" zıtlık kurar; aynı sorun.' },
      D: { fits: false, reason: '"because" sebep bildirir; kalıbın içine girmez ve sözdizimi bozulur.' },
      E: { fits: false, reason: '"if" koşul bildirir; "so well preserved if" gramer olarak da yanlıştır.' },
    },
    explanation: '"so + sıfat/zarf + that" İngilizce\'de DERECE-SONUÇ bildiren yaygın bir kalıptır. Burada "çok iyi korunmuştu, ÖYLE Kİ arkeologlar rekonstrüksiyon yapabildi" anlamı var.',
    logic_rule: 'so + [adj/adv] + that → DERECE-SONUÇ ilişkisi',
    pattern: '[Subject] + be + so + [adj] + that + [result].',
  },
]
