import 'barcode-detector/polyfill'

export async function startScanner(img: HTMLImageElement) {
  const detector = new BarcodeDetector({
    formats: ['qr_code']
  })
  const codes = await detector.detect(img)
  codes.forEach(barcode => console.log(barcode))
}

const WIDTH = 640
const HEIGHT = 480
export class Scanner {
  private readonly cameraConstraints: MediaStreamConstraints = {
    video: {
      facingMode: 'environment',
      width: WIDTH,
      height: HEIGHT,
      aspectRatio: WIDTH / HEIGHT,
      frameRate: 30,
    }
  }

  private detector: BarcodeDetector = new BarcodeDetector({
    formats: ['any']
    // formats: ['qr_code']
  })

  private debug(text: string) {
    const out = document.querySelector('.debug')
    if(out) out.innerHTML += text + '\n'
  }

  compatibilityCheck() {
    if(!('BarcodeDetector' in globalThis)) {
      alert('No Barcode Detector')
    }
  }
  
  printSupportedFormats() {
    this.debug('Supported Barcode Formats:')
    BarcodeDetector.getSupportedFormats().then((supportedFormats) => {
      supportedFormats.forEach((format) => {
        console.log(format)
        this.debug('\t' + format)
      })
    })
  }

  async obtainCameraPermissions(): Promise<PermissionStatus> {
    // Check Permissions
    const result = await navigator.permissions.query({ name: 'camera' }).catch(err => {
      console.error('Camera permission not available', err)
      throw new Error('Camera permission not available')
    })
    if(result.state === 'granted') {
      return result
    } else if(result.state === 'prompt') {
      // Request Permissions
      await navigator.mediaDevices.getUserMedia(this.cameraConstraints)
      return this.obtainCameraPermissions()
    } else {
      throw new Error('Camera permission required')
    }
  }

  setupMonitor(video: HTMLVideoElement) {
    // Canvas for behind-the-scenes tracking of camera
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if(!context) throw new Error('Canvas 2D context not available')

    const play = async () => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const found = await this.scan(context.getImageData(0, 0, WIDTH, HEIGHT))
      if(found) {
        clearInterval(handle)
        video.pause()
        console.log('Found a QR Code', found[0])
        const pre = document.querySelector('code')
        if(pre) {
          pre.innerText = `[${found[0].format}] ${found[0].rawValue}`
        }
        const params = found[0].boundingBox
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = params.width
        tempCanvas.height = params.height
        const tempCtx = tempCanvas.getContext('2d')
        if(!tempCtx) throw new Error()
        tempCtx.drawImage(canvas, params.left, params.top, params.width, params.height, 0, 0, params.width, params.height)
        const imgSnapshot = document.querySelector('#results .snapshot') as HTMLImageElement
        imgSnapshot.src = canvas.toDataURL('image/webp')
        const imgBarcode = document.querySelector('#results .barcode') as HTMLImageElement
        imgBarcode.src = tempCanvas.toDataURL('image/webp')
        location.replace('#results')
      }
    }
    const handle = setInterval(play, 1000/30)
  }

  private async scan(img: ImageData) {
    const codes = await this.detector.detect(img)
    codes.forEach(barcode => {
      console.log(barcode)
      this.debug(`${barcode.format}: ${barcode.rawValue}`)
    })
    return codes.length > 0 ? codes : false
  }

  // Select a specific Camera device
  async selectDevice(selectedDeviceId: string): Promise<MediaStream> {
    console.log('Selecting Device', selectedDeviceId)
    this.debug(`Selecting Device: ${selectedDeviceId}`)
    const stream = await navigator.mediaDevices.getUserMedia({
      ...this.cameraConstraints,
      video: { deviceId: { exact: selectedDeviceId } }
    })
    // stream.onremovetrack = () => { console.log('Stream Ended') }
    const tracks = stream.getVideoTracks()
    console.log('Using video device', tracks.length, tracks[0].id, tracks[0].label)
    this.debug(`Using video device with ${tracks.length} tracks`)
    tracks.forEach(track => {
      this.debug('\t' + track.kind + ': ' + track.label)
    })
    const track = tracks[0]
    console.log('Capabilities', track.getCapabilities())
    this.debug('Track Capabilities:')
    this.debug(JSON.stringify(track.getCapabilities()))
    return stream
  }
}
