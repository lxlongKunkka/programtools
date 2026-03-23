const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { KNOWLEDGE_TAGS } = require('../utils/quizKnowledgeTags');

async function main() {
  const conn = await mongoose.createConnection(process.env.APP_MONGODB_URI).asPromise();
  const questions = await conn.collection('quiz_questions').find(
    { source: 'downloads', enabled: true },
    { projection: { questionUid: 1, tags: 1 } }
  ).toArray();

  const whitelist = new Set(KNOWLEDGE_TAGS);
  const counts = new Map();
  const missing = [];
  let withKnowledge = 0;

  for (const question of questions) {
    const matched = Array.isArray(question.tags)
      ? question.tags.filter((tag) => whitelist.has(tag))
      : [];

    if (matched.length > 0) {
      withKnowledge += 1;
    } else if (missing.length < 20) {
      missing.push(question.questionUid);
    }

    for (const tag of matched) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  const distribution = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([tag, count]) => ({ tag, count }));

  console.log(
    JSON.stringify(
      {
        totalEnabledDownloads: questions.length,
        withKnowledge,
        withoutKnowledge: questions.length - withKnowledge,
        sampleMissingQuestionIds: missing,
        topKnowledgeDistribution: distribution,
      },
      null,
      2
    )
  );

  await conn.close();
}

main().catch(async (error) => {
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error(disconnectError);
  }

  process.exit(1);
});