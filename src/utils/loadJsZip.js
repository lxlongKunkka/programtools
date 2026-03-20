let jsZipPromise = null

export async function loadJsZip() {
  if (!jsZipPromise) {
    jsZipPromise = import('jszip').then((module) => module.default || module)
  }

  return jsZipPromise
}