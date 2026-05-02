const fs = require("fs");
const path = require("path");

const dataFolder = "./data";

const files = fs.readdirSync(dataFolder).filter(file => file.endsWith(".json"));

let allQuestions = [];

files.forEach(file => {
  const filePath = path.join(dataFolder, file);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const examId = file.replace(".json", "");

  // Eğer JSON içinde questions varsa
  const questions = data.questions ? data.questions : data;

  questions.forEach(q => {
    allQuestions.push({
      ...q,
      id: `${examId}_q${q.question_number}`,
      exam_id: examId,
      source: "yds_exam"
    });
  });
});

fs.writeFileSync(
  "./data/all_questions.json",
  JSON.stringify({ questions: allQuestions }, null, 2)
);

console.log("✅ Merged successfully!");