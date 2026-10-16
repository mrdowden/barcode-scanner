import { BarcodeDetector as BarcodeDetectorPonyfill } from "barcode-detector/ponyfill";

const WIDTH = 640
const HEIGHT = 480
export class Scanner {
  private readonly cameraConstraints: MediaStreamConstraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width: WIDTH,
      height: HEIGHT,
      aspectRatio: WIDTH / HEIGHT,
      frameRate: 30,
    }
  }

  private detector: BarcodeDetector = {} as BarcodeDetector
  private selectedDevice: VideoDevice | null = null

  async initialize() {
    if(!('BarcodeDetector' in globalThis)) {
      debug('No Barcode Detector - importing polyfill')
      const g = globalThis as any
      g.BarcodeDetector = BarcodeDetectorPonyfill
    } else {
      debug('Found BarcodeDetector:')
      debug(`Constructor - ${BarcodeDetector?.constructor}`)
      debug(`Supported Formats - ${BarcodeDetector?.getSupportedFormats}`)
      debug(JSON.stringify(BarcodeDetector))
    }
    this.detector = new BarcodeDetector({
      // formats: ['qr_code']
    })
    debug(`Instance - ${this.detector}`)
  }

  printSupportedFormats() {
    debug('Supported Barcode Formats:')
    BarcodeDetector.getSupportedFormats().then((supportedFormats) => {
      supportedFormats.forEach((format) => {
        console.log(format)
        debug('\t' + format)
      })
    })
  }

  async listCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices()
    console.log('Devices', devices)
    return devices.filter(device => device.kind === 'videoinput')
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
    const canvas = Object.assign(document.createElement('canvas'), {
      width: WIDTH,
      height: HEIGHT,
    })
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if(!context) throw new Error('Canvas 2D context not available')

    const scan = async () => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const found = await this.detect(context.getImageData(0, 0, WIDTH, HEIGHT))
      if(found?.length) {
        clearInterval(handle)
        video.pause()
        this.selectedDevice?.track.stop()
        this.saveResults(found, canvas)
      }
    }
    const handle = setInterval(scan, 1000/30)
  }

  private async detect(img: ImageData) {
    const codes = await this.detector.detect(img)
    codes.forEach(barcode => {
      console.log(barcode)
      debug(`${barcode.format}: ${barcode.rawValue}`)
    })
    return codes.length > 0 ? codes : []
  }

  async checkImage(img: HTMLImageElement) {
    const canvas = Object.assign(document.createElement('canvas'), {
      width: WIDTH,
      height: HEIGHT,
    })
    const context = canvas.getContext('2d')
    if(!context) throw new Error('Canvas 2D context not available')

    context.drawImage(img, 0, 0, canvas.width, canvas.height)
    const found = await this.detect(context.getImageData(0, 0, WIDTH, HEIGHT))
    if(found.length) {
      console.log('Found Barcode', found)
      this.saveResults(found, canvas)
    } else {
      console.warn('No Barcode Found')
      debug('No barcode found')
    }
  }

  // Select a specific Camera device
  async selectDevice(selectedDeviceId?: string): Promise<VideoDevice> {
    console.log('Selecting Device', selectedDeviceId)
    debug(`Selecting Device: ${selectedDeviceId}`)
    const _constraints = this.cameraConstraints
    const _video = _constraints.video as MediaTrackConstraints
    if(selectedDeviceId) {
      _video.deviceId = { exact: selectedDeviceId }
    }
    const stream = await navigator.mediaDevices.getUserMedia(_constraints)
    const tracks = stream.getVideoTracks()
    console.log('Using video device', tracks.length, tracks[0].id, tracks[0].label)
    debug(`Using video device with ${tracks.length} tracks`)
    tracks.forEach(track => {
      debug('\t' + track.kind + ': ' + track.label)
    })
    const [track] = stream.getVideoTracks()
    const capabilities = track.getCapabilities()
    console.log('Capabilities', capabilities)
    debug('Track Capabilities:')
    debug(JSON.stringify(capabilities))
    this.selectedDevice = {
      deviceId: capabilities.deviceId ?? '',
      stream: stream,
      track: track,
      capabilities: capabilities,
    }
    return this.selectedDevice
  }

  saveResults(results: DetectedBarcode[], canvas: HTMLCanvasElement) {
    console.log('Found Barcodes', results)
    const pre = document.querySelector('code')
    if(pre) {
      pre.innerText = results.map(code => `[${code.format}] ${code.rawValue}`).join('\n')
    }
    const imgSnapshot = 
      document.querySelector('#results .snapshot') as HTMLImageElement
    imgSnapshot.src = canvas.toDataURL('image/webp')

    const imgBarcode = document.querySelector('#results .barcode') as HTMLImageElement
    imgBarcode.src = this.extractCodeImage(results[0], canvas)
    location.replace('#results')
  }

  extractCodeImage(barcode: DetectedBarcode, canvas: HTMLCanvasElement) {
    const params = barcode.boundingBox
    const tempCanvas = Object.assign(document.createElement('canvas'), {
      width: params.width,
      height: params.height,
    })
    const tempCtx = tempCanvas.getContext('2d')
    if(!tempCtx) throw new Error()
    tempCtx.drawImage(canvas, params.left, params.top, params.width, params.height, 0, 0, params.width, params.height)
    return tempCanvas.toDataURL('image/webp')
  }
}

function debug(text: string) {
  const out = document.querySelector('.debug')
  if(out) out.innerHTML += text + '\n'
}

export type VideoDevice = {
  deviceId: string
  stream: MediaStream
  track: MediaStreamTrack
  capabilities: MediaTrackCapabilities
}
