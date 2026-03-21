export function buildDailyProgressUpdate({
  existingProgress,
  assignedQuestion,
  now,
  questionUid,
  isCorrect,
  streakBase
}) {
  const alreadyTrackedToday = !!existingProgress?.questionUids?.includes(questionUid)
  const progressUpdate = {
    $set: {
      subject: assignedQuestion.subject || 'C++',
      source: assignedQuestion.source || 'gesp',
      completed: true,
      lastAnsweredAt: now,
      streak: Math.max(existingProgress?.streak || 0, streakBase + 1)
    }
  }

  if (existingProgress) {
    progressUpdate.$addToSet = { questionUids: questionUid }
    progressUpdate.$inc = {
      answeredCount: alreadyTrackedToday ? 0 : 1,
      correctCount: (!alreadyTrackedToday && isCorrect) ? 1 : 0
    }
  } else {
    progressUpdate.$setOnInsert = {
      firstAnsweredAt: now,
      answeredCount: 1,
      correctCount: isCorrect ? 1 : 0,
      questionUids: [questionUid]
    }
  }

  return progressUpdate
}