"use strict";
function compatibilityCheck() {
    if (!('BarcodeDetector' in globalThis)) {
        alert('No Barcode Detector');
    }
    else {
        const detector = new BarcodeDetector({
            formats: ['qr_code']
        });
    }
}
function printSupportedFormats() {
    BarcodeDetector.getSupportedFormats().then((supportedFormats) => {
        supportedFormats.forEach((format) => console.log(format));
    });
}
async function startScanner(img) {
    const detector = new BarcodeDetector({
        formats: ['qr_code']
    });
    const codes = await detector.detect(img);
    codes.forEach(barcode => console.log(barcode));
}
//# sourceMappingURL=capture.js.map