import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parsePaperMeta,
  parseObjectiveConfig,
  parseObjectiveQuestions
} from '../server/utils/gesp/objectiveImport.js'

test('parseObjectiveConfig keeps objective answers by question number', () => {
  const config = `type: objective
answers:
  15:
    - C
  16:
    - B
`

  assert.deepEqual(parseObjectiveConfig(config), {
    15: 'C',
    16: 'B'
  })
})

test('parseObjectiveQuestions maps judge answers and stops at next heading', () => {
  const markdown = `# 一、单选题

15), 执行程序后输出是（）。 {{ select(15) }}

- A.210
- B.113
- C.98
- D.15

# 二、判断题

16), 在 Windows 系统中通过键盘完成对选定文本移动的按键组合是先 Ctrl+X，移动到目标位置后按 Ctrl+V。 {{ select(16) }}

- true
- false
`

  const questions = parseObjectiveQuestions(markdown, {
    answers: {
      15: 'C',
      16: 'B'
    },
    paperUid: 'paper-1',
    sourceDocId: 1,
    sourceTitle: 'sample',
    subject: 'C++',
    levelTag: 'gesp1',
    tags: []
  })

  assert.equal(questions.length, 2)
  assert.deepEqual(questions[0].options.map((item) => item.text), ['210', '113', '98', '15'])
  assert.equal(questions[1].type, 'judge')
  assert.equal(questions[1].answer, 'false')
  assert.deepEqual(questions[1].options.map((item) => item.key), ['true', 'false'])
})

test('parsePaperMeta supports variant GESP paper titles', () => {
  const meta = parsePaperMeta('GESP-C++-2024年12月一级真题卷GESP-C++-2024年12月一级真题卷', 247)

  assert.deepEqual(meta, {
    year: 2024,
    month: 12,
    subject: 'C++',
    level: 1,
    paperUid: 'gesp-2024-12-cpp-1',
    levelTag: 'gesp1'
  })
})
