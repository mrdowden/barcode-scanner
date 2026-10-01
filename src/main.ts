import './style.css'
import { compatibilityCheck, printSupportedFormats, scan } from './capture'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<section id="demo">
  <video width="640" height="480" autoplay playsinline></video>
  <canvas></canvas>
</section>
`

compatibilityCheck()
printSupportedFormats()


const video = document.querySelector("video")

const inputs = await navigator.mediaDevices.enumerateDevices()
inputs.filter(device => device.kind === 'videoinput').forEach(device => {
  console.log('Video Device', device  )
})

// const video = document.getElementById('scanner')
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: 640,
    height: 480,
    frameRate: 30,
  }
})
const tracks = stream.getVideoTracks()
console.log('Using video device', tracks.length, tracks[0].label)
stream.onremovetrack = () => { console.log('Stream Ended') }
const track = tracks[0]
console.log('Capabilities', track.getCapabilities())

if(video) {
  video.srcObject = stream

  const canvas = document.querySelector('canvas')
  if(canvas) {
    canvas.width = 640
    canvas.height = 480
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if(context) {
      const play = async () => {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const found = await scan(context.getImageData(0, 0, 640, 480))
        if(found) {
          clearInterval(handle)
          console.log('Found a QR Code')
        }
      }
      const handle = setInterval(play, 1000/30)
    }
  }
}
