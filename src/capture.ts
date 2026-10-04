import 'barcode-detector/polyfill'

export function compatibilityCheck() {
  if(!('BarcodeDetector' in globalThis)) {
    alert('No Barcode Detector')
  }
}

export function printSupportedFormats() {
  BarcodeDetector.getSupportedFormats().then((supportedFormats) => {
    supportedFormats.forEach((format) => console.log(format))
  })
}

export async function startScanner(img: HTMLImageElement) {
  const detector = new BarcodeDetector({
    formats: ['qr_code']
  })
  const codes = await detector.detect(img)
  codes.forEach(barcode => console.log(barcode))
}

export async function scan(img: ImageData) {
  const detector = new BarcodeDetector({
    formats: ['qr_code']
  })
  const codes = await detector.detect(img)
  codes.forEach(barcode => console.log(barcode))
  return codes.length > 0 ? codes : false
}
