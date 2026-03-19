import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.MNA_USER = 'demo-user'
process.env.MNA_PWD = 'demo-password'

const axios = (await import('axios')).default
const {
  fetchMnaContest,
  fetchMnaProblem,
  parseMnaContestId,
  parseMnaProblemIds
} = await import('../server/routes/mna.js')

test('mna url parsers extract contest and problem ids', () => {
  assert.equal(parseMnaContestId('https://mna.wang/contest/3081'), '3081')
  assert.deepEqual(parseMnaProblemIds('https://mna.wang/contest/3081/problem/1'), {
    contestId: '3081',
    problemNumber: '1'
  })
})

test('mna fetchers parse contest, statement, attachment and ac code from mocked pages', async () => {
  const originalPost = axios.post
  const originalGet = axios.get
  const attachmentBuffer = Buffer.from('fake-zip-data')
  const calls = []

  axios.post = async (url) => {
    calls.push(['POST', url])
    return {
      data: { error_code: 1 },
      headers: {
        'set-cookie': ['login=ok; Path=/', 'connect.sid=session; Path=/']
      }
    }
  }

  axios.get = async (url, options = {}) => {
    calls.push(['GET', url, options.responseType || 'text'])

    if (url === 'https://mna.wang/contest/3081') {
      return {
        status: 200,
        data: `
          <html>
            <head><title>NOIP 模拟赛 - 比赛 - 梦熊联盟</title></head>
            <body>
              <a href="/contest/3081/problem/1">A. 第一题</a>
              <a href="/contest/3081/problem/2">B. 第二题</a>
            </body>
          </html>
        `,
        headers: {}
      }
    }

    if (url === 'https://mna.wang/contest/3081/problem/1') {
      return {
        status: 200,
        data: `
          <html>
            <head><title>A. 第一题 - 梦熊联盟</title></head>
            <body>
              <div class="ui main container">
                <h1>A. 第一题 1000ms 256 MiB</h1>
                <div class="ui segment">
                  <h2>题目描述</h2>
                  <p>给定一个整数，输出其平方。</p>
                  <p><a href="/docs/help">帮助文档</a></p>
                  <p><a href="/contest/3081/1/download/additional_file">sample.zip</a></p>
                  <p><img src="/images/demo.png" alt="示意图"></p>
                </div>
              </div>
            </body>
          </html>
        `,
        headers: {}
      }
    }

    if (url === 'https://mna.wang/contest/3081/1/download/additional_file') {
      return {
        status: 200,
        data: attachmentBuffer,
        headers: {
          'content-disposition': 'attachment; filename="sample.zip"'
        }
      }
    }

    if (url === 'https://mna.wang/contest/3081/ranklist') {
      return {
        status: 200,
        data: `
          <html>
            <body>
              <table>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>user</td>
                    <td><a href="/submission/884263">100 / 100</a></td>
                  </tr>
                </tbody>
              </table>
            </body>
          </html>
        `,
        headers: {}
      }
    }

    if (url === 'https://mna.wang/submission/884263') {
      return {
        status: 200,
        data: '<script>formattedCode = "int main()\\n{\\n  return 0;\\n}"</script>',
        headers: {}
      }
    }

    throw new Error(`Unexpected GET ${url}`)
  }

  try {
    const contest = await fetchMnaContest('https://mna.wang/contest/3081')
    const problem = await fetchMnaProblem('https://mna.wang/contest/3081/problem/1')

    assert.equal(contest.contestId, '3081')
    assert.equal(contest.contestTitle, 'NOIP 模拟赛')
    assert.deepEqual(contest.problems.map(item => item.label), ['A', 'B'])
    assert.deepEqual(contest.problems.map(item => item.taskId), ['1', '2'])

    assert.equal(problem.title, 'A. 第一题 1000ms 256 MiB')
    assert.equal(problem.timeLimit, 1000)
    assert.equal(problem.memoryLimit, 256)
    assert.equal(problem.additionalFile.filename, 'sample.zip')
    assert.equal(problem.additionalFile.size, attachmentBuffer.length)
    assert.equal(problem.additionalFile.base64, attachmentBuffer.toString('base64'))
    assert.match(problem.content, /# A\. 第一题 1000ms 256 MiB/)
    assert.match(problem.content, /给定一个整数，输出其平方。/)
    assert.match(problem.content, /\[帮助文档\]\(https:\/\/mna\.wang\/docs\/help\)/)
    assert.match(problem.content, /!\[示意图\]\(https:\/\/mna\.wang\/images\/demo\.png\)/)
    assert.equal(problem.acCode, 'int main()\n{\n  return 0;\n}')

    assert.equal(calls.filter(([method]) => method === 'POST').length, 1)
  } finally {
    axios.post = originalPost
    axios.get = originalGet
  }
})