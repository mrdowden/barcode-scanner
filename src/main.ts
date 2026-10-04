import './style.css'
import { Scanner } from './capture'
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
  <pre class="debug"></pre>
</section>
`

const scanner = new Scanner()

scanner.compatibilityCheck()
scanner.printSupportedFormats()

navigation.addEventListener('navigate', async event => {
  console.log('NAVIGATE', event)
  if(!event.canIntercept || event.downloadRequest !== null) {
    return
  }
  // event.hashChange
  const url = new URL(event.destination.url)
  console.log('URL', url)
  switch(url.hash) {
    case '#scan':
      console.log('SCAN')
      await setupScanner()
      break;
  }
})

async function setupScanner() {
  // Request Permissions
  await scanner.obtainCameraPermissions()

  const video = document.querySelector('video')
  if(!video) throw new Error('Video element required for live preview')

  scanner.setupMonitor(video)

  const devices = await navigator.mediaDevices.enumerateDevices()
  const videoDevices = devices.filter(device => device.kind === 'videoinput')
  let selectedDeviceId = videoDevices[0].deviceId

  if(videoDevices.length > 1) {
    console.log('Loading Devices')
    const selectCamera = document.getElementById('videoDevices') as HTMLSelectElement
    if(!selectCamera) {
      throw new Error('Must have a <select> element with an ID of "videoDevices".')
    }
    selectCamera.onchange = async () => {
      selectedDeviceId = selectCamera.options[selectCamera.selectedIndex].value
      video.srcObject = await scanner.selectDevice(selectedDeviceId)
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
  video.srcObject = await scanner.selectDevice(selectedDeviceId)
}
