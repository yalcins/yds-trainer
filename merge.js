const fs = require("fs");
const path = require("path");

const dataFolder = "./data";

const files = fs.readdirSync(dataFolder).filter(file => file.endsWith(".json") && file !== "all_questions.json");

const SECTION_TAG_MAP = {
  "Vocabulary":              { section: "vocabulary",          skills: ["context", "meaning"] },
  "Grammar":                 { section: "grammar",             skills: ["structure", "tense", "preposition"] },
  "Cloze Test":              { section: "cloze",               skills: ["context", "logic", "cohesion"] },
  "Sentence Completion":     { section: "sentence_completion", skills: ["logic", "contrast", "cause_result"] },
  "Dialogue Completion":     { section: "sentence_completion", skills: ["logic", "contrast", "cause_result"] },
  "Reading Comprehension":   { section: "reading",             skills: ["inference", "main_idea"] },
  "Irrelevant Sentence":     { section: "reading",             skills: ["inference", "main_idea"] },
  "Translation (EN to TR)":  { section: "translation",         skills: ["meaning", "structure"] },
  "Translation (TR to EN)":  { section: "translation",         skills: ["meaning", "structure"] },
  "Paragraph Completion":    { section: "cloze",               skills: ["context", "logic", "cohesion"] },
  "Rephrasing":              { section: "grammar",             skills: ["structure", "tense", "preposition"] },
};

function buildTags(question) {
  const sourceTags = ["yds", "yds_2024"];
  const sectionInfo = SECTION_TAG_MAP[question.section];
  if (!sectionInfo) return sourceTags;
  return [...sourceTags, sectionInfo.section, ...sectionInfo.skills];
}

let allQuestions = [];

files.forEach(file => {
  const filePath = path.join(dataFolder, file);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const examId = file.replace(".json", "");

  // Eğer JSON içinde questions varsa
  const questions = data.questions ? data.questions : data;

  questions.forEach(q => {
    const merged = {
      ...q,
      id: `${examId}_q${q.question_number}`,
      exam_id: examId,
      source: "yds_exam"
    };
    merged.tags = buildTags(merged);
    allQuestions.push(merged);
  });
});

fs.writeFileSync(
  "./data/all_questions.json",
  JSON.stringify({ questions: allQuestions }, null, 2)
);

console.log("✅ Merged successfully!");