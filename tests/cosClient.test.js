import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.COS_SECRET_ID = 'test-secret-id'
process.env.COS_SECRET_KEY = 'test-secret-key'
process.env.COS_BUCKET = 'demo-1250000000'
process.env.COS_REGION = 'ap-shanghai'
process.env.COS_DOMAIN = 'cdn.example.com'

const axios = (await import('axios')).default
const { buildCosObjectUrl, isCosConfigured, uploadObjectToCos } = await import('../server/utils/cosClient.js')

test('cos client builds custom-domain url', () => {
  assert.equal(isCosConfigured(), true)
  assert.equal(buildCosObjectUrl('folder/demo.txt'), 'https://cdn.example.com/folder/demo.txt')
})

test('cos client sends signed put request', async () => {
  const originalPut = axios.put
  const originalNow = Date.now
  let captured = null

  Date.now = () => 1710800000000
  axios.put = async (url, payload, options) => {
    captured = { url, payload, options }
    return {
      status: 200,
      data: '',
      headers: { etag: '"demo-etag"' }
    }
  }

  try {
    const result = await uploadObjectToCos({
      key: 'folder/demo.txt',
      body: 'hello cos',
      contentType: 'text/plain; charset=utf-8'
    })

    assert.equal(result.status, 200)
    assert.equal(result.etag, '"demo-etag"')
    assert.equal(result.url, 'https://cdn.example.com/folder/demo.txt')

    assert.ok(captured)
    assert.equal(captured.url, 'https://demo-1250000000.cos.ap-shanghai.myqcloud.com/folder/demo.txt')
    assert.equal(captured.payload.toString(), 'hello cos')
    assert.equal(captured.options.headers.Host, 'demo-1250000000.cos.ap-shanghai.myqcloud.com')
    assert.equal(captured.options.headers['Content-Type'], 'text/plain; charset=utf-8')
    assert.equal(captured.options.headers['Content-Length'], String(Buffer.byteLength('hello cos')))
    assert.match(captured.options.headers['Content-MD5'], /^[A-Za-z0-9+/]+=*$/)
    assert.match(captured.options.headers.Authorization, /^q-sign-algorithm=sha1&/)
    assert.match(captured.options.headers.Authorization, /q-ak=test-secret-id/)
    assert.match(captured.options.headers.Authorization, /q-header-list=content-length;content-md5;host/)
    assert.match(captured.options.headers.Authorization, /q-signature=[a-f0-9]{40}$/)
  } finally {
    axios.put = originalPut
    Date.now = originalNow
  }
})