import './style.css'
import { compatibilityCheck, printSupportedFormats, scan } from './capture'
import scanImg from './assets/scan.svg'
import uploadImg from './assets/upload.svg'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<section id="demo">
  <div id="launcher">
    <a class="button-8" href="#scan"><img src="${scanImg}" alt="Scan"></a>
    <a class="button-8" href="#upload"><img src="${uploadImg}" alt="Upload"></a>
  </div>
  <div id="scan">
    <video width="640" height="480" autoplay playsinline></video>
    <div class="selectDevices">Camera Selection: <select id="videoDevices"></select></div>
    <pre class="debug"></pre>
  </div>
  <div id="upload">
  </div>
  <div id="results">
    <div class="images">
      <img class="snapshot">
      <img class="barcode">
    </div>
    <code></code>
    <a class="button-8" href="/">Reset</a>
  </div>
</section>
`

compatibilityCheck()
printSupportedFormats()

// Request Permissions
navigator.permissions.query({ name: 'camera',  })
await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'environment',
    width: 640,
    height: 480,
    aspectRatio: 1.33,
    frameRate: 30,
  }
})

const video = document.querySelector('video')

console.log('Prep Video')

if(video) {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if(context) {
    const play = async () => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const found = await scan(context.getImageData(0, 0, 640, 480))
      if(found) {
        clearInterval(handle)
        video.pause()
        console.log('Found a QR Code')
        const pre = document.querySelector('code')
        if(pre) {
          pre.innerText = found[0].rawValue
          console.log(found)
        }
        const params = found[0].boundingBox
        // const imgData = context.getImageData(params.left, params.top, params.width, params.height)
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
}


const devices = await navigator.mediaDevices.enumerateDevices()
const videoDevices = devices.filter(device => device.kind === 'videoinput')
let selectedDeviceId = videoDevices[0].deviceId

if(videoDevices.length > 1) {
  console.log('Loading Devices')
  const selectCamera = document.getElementById('videoDevices') as HTMLSelectElement
  if(!selectCamera) {
    throw new Error('Must have a <select> element with an ID of "videoDevices".')
  }
  selectCamera.onchange = () => {
    selectedDeviceId = selectCamera.options[selectCamera.selectedIndex].value
    selectDevice(selectedDeviceId)
  }
  videoDevices.forEach(device => {
    const option = document.createElement('option')
    option.value = device.deviceId
    option.text = device.label
    if(device.deviceId === selectedDeviceId) option.selected = true
    console.log('Adding Option', option.value, option.text)
    selectCamera?.appendChild(option)
  })
}
selectDevice(selectedDeviceId)

async function selectDevice(selectedDeviceId: string) {
  console.log('Selecting Device', selectedDeviceId)
  // const video = document.getElementById('scanner')
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: { exact: selectedDeviceId },
      facingMode: 'environment',
      width: 640,
      height: 480,
      frameRate: 30,
    }
  })
  if(video && stream) {
    video.srcObject = stream
  }
  const tracks = stream.getVideoTracks()
  console.log('Using video device', tracks.length, tracks[0].id, tracks[0].label)
  stream.onremovetrack = () => { console.log('Stream Ended') }
  const track = tracks[0]
  console.log('Capabilities', track.getCapabilities())
}
