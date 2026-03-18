import crypto from 'crypto'
import axios from 'axios'
import { COS_CONFIG } from '../config.js'

const SIGNABLE_HEADERS = new Set([
  'content-disposition',
  'content-encoding',
  'content-length',
  'content-md5',
  'expect',
  'expires',
  'host',
  'if-match',
  'if-modified-since',
  'if-none-match',
  'if-unmodified-since',
  'origin',
  'range',
  'transfer-encoding',
  'pic-operations'
])

function camSafeUrlEncode(value) {
  return encodeURIComponent(value)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

function getObjectKeys(object, forKey = false) {
  return Object.keys(object)
    .map(key => (forKey ? camSafeUrlEncode(key).toLowerCase() : key))
    .sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()))
}

function objectToString(object, lowerCaseKey = false) {
  return getObjectKeys(object)
    .map(key => {
      const rawValue = object[key] === undefined || object[key] === null ? '' : String(object[key])
      const encodedKey = lowerCaseKey ? camSafeUrlEncode(key).toLowerCase() : camSafeUrlEncode(key)
      return `${encodedKey}=${camSafeUrlEncode(rawValue)}`
    })
    .join('&')
}

function getSignHeaders(headers) {
  return Object.entries(headers).reduce((result, [key, value]) => {
    const normalized = key.toLowerCase()
    if (normalized.startsWith('x-cos-') || normalized.startsWith('x-ci-') || SIGNABLE_HEADERS.has(normalized)) {
      result[key] = value
    }
    return result
  }, {})
}

function getBucketHost() {
  return `${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com`
}

function getObjectPath(key) {
  return `/${String(key || '').replace(/^\/+/, '')}`
}

function getRequestUrl(key) {
  const encodedKey = String(key || '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')

  return `https://${getBucketHost()}/${encodedKey}`
}

function buildAuthorization({ method, key, headers, query = {}, expires = 900 }) {
  const now = Math.round(Date.now() / 1000) - 1
  const signTime = `${now};${now + expires}`
  const signHeaders = getSignHeaders(headers)
  if (!signHeaders.Host && !signHeaders.host) {
    signHeaders.Host = getBucketHost()
  }

  const headerList = getObjectKeys(signHeaders, true).join(';').toLowerCase()
  const queryList = getObjectKeys(query, true).join(';').toLowerCase()
  const httpString = [
    method.toLowerCase(),
    getObjectPath(key),
    objectToString(query, true),
    objectToString(signHeaders, true),
    ''
  ].join('\n')

  const httpStringHash = crypto.createHash('sha1').update(Buffer.from(httpString, 'utf8')).digest('hex')
  const stringToSign = ['sha1', signTime, httpStringHash, ''].join('\n')
  const signKey = crypto.createHmac('sha1', COS_CONFIG.SecretKey).update(signTime).digest('hex')
  const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex')

  return [
    'q-sign-algorithm=sha1',
    `q-ak=${COS_CONFIG.SecretId}`,
    `q-sign-time=${signTime}`,
    `q-key-time=${signTime}`,
    `q-header-list=${headerList}`,
    `q-url-param-list=${queryList}`,
    `q-signature=${signature}`
  ].join('&')
}

export function isCosConfigured() {
  return Boolean(COS_CONFIG.SecretId && COS_CONFIG.SecretKey && COS_CONFIG.Bucket && COS_CONFIG.Region)
}

export function buildCosObjectUrl(key) {
  const normalizedKey = String(key || '').replace(/^\/+/, '')
  if (COS_CONFIG.Domain) {
    const domain = COS_CONFIG.Domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return `https://${domain}/${normalizedKey}`
  }
  return `https://${getBucketHost()}/${normalizedKey}`
}

export async function uploadObjectToCos({ key, body, contentType, headers = {}, timeout = 30000 }) {
  if (!isCosConfigured()) {
    throw new Error('COS not configured')
  }

  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body)
  const requestHeaders = {
    Host: getBucketHost(),
    'Content-Length': String(payload.length),
    'Content-MD5': crypto.createHash('md5').update(payload).digest('base64'),
    ...headers
  }

  if (contentType) {
    requestHeaders['Content-Type'] = contentType
  }

  requestHeaders.Authorization = buildAuthorization({
    method: 'PUT',
    key,
    headers: requestHeaders
  })

  const response = await axios.put(getRequestUrl(key), payload, {
    headers: requestHeaders,
    timeout,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    responseType: 'text',
    validateStatus: () => true
  })

  if (response.status < 200 || response.status >= 300) {
    const error = new Error(`COS upload failed with status ${response.status}`)
    error.status = response.status
    error.responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    throw error
  }

  return {
    status: response.status,
    etag: response.headers.etag,
    url: buildCosObjectUrl(key)
  }
}

export async function uploadTextToCos(key, content, contentType = 'text/html; charset=utf-8') {
  return uploadObjectToCos({ key, body: content, contentType })
}