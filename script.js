const video = document.getElementById("video");
const strip = document.getElementById("strip");
const countdownEl = document.getElementById("countdown");
const captureBtn = document.getElementById("captureBtn");
const statusText = document.getElementById("status");

const layoutBtn = document.getElementById("layoutBtn");
const filterBtn = document.getElementById("filterBtn");
const timerBtn = document.getElementById("timerBtn");
const frameBtn = document.getElementById("frameBtn");

const downloadJPG = document.getElementById("downloadJPG");
const downloadGIF = document.getElementById("downloadGIF");
const resetBtn = document.getElementById("reset");

const customColorSwatch = document.getElementById("customColorSwatch");
const customColorPanel = document.getElementById("customColorPanel");
const hueSlider = document.getElementById("hueSlider");
const lightSlider = document.getElementById("lightSlider");

const photosContainer = document.getElementById("photosContainer");

let currentFrameColor = "#ffffff";
let currentFramePattern = null;

let layout = 1;
let timer = 0;
let currentFilter = "none";
let photos = [];

let cameraStream = null;

const shutter = new Audio(
    "https://www.soundjay.com/mechanical/camera-shutter-click-01.mp3"
);
shutter.preload = "auto";



function isIOS() {

   
    return (
        /iP(hone|od|ad)/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );

}

function isAndroid() {

    return /Android/.test(navigator.userAgent);

}

const isSecureOrigin =
    window.isSecureContext ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";



const filterCSSMap = {
    none: "none",
    bw: "grayscale(100%)",
    sepia: "sepia(100%)",
    bright: "brightness(150%)",
    contrast: "contrast(120%)",
    vintage: "sepia(50%) brightness(105%) contrast(110%)",
    soft: "blur(2px) brightness(130%)"
};



function initFilterPreviews() {

    document
        .querySelectorAll(".preview-box[data-filter]")
        .forEach(box => {

            const key = box.dataset.filter;

            const value = filterCSSMap[key] || "none";

            box.style.filter = value;
            box.style.webkitFilter = value;

        });

}

initFilterPreviews();



function supportsCanvasFilter() {

    try {

        const c = document.createElement("canvas");

        c.width = 2;
        c.height = 2;

        const cx = c.getContext("2d");

        cx.filter = "grayscale(1)";

        cx.fillStyle = "rgb(255,0,0)";

        cx.fillRect(0, 0, 2, 2);

        const d = cx.getImageData(0, 0, 1, 1).data;

        return d[0] < 200;

    } catch (e) {

        return false;

    }

}

const CANVAS_FILTER_SUPPORTED = supportsCanvasFilter();



function clampChannel(v) {

    return v < 0 ? 0 : (v > 255 ? 255 : v);

}


function applyManualFilter(ctx, width, height, key) {

    if (key === "none") return;

    const imgData = ctx.getImageData(0, 0, width, height);

    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {

        let r = d[i];
        let g = d[i + 1];
        let b = d[i + 2];

        if (key === "bw" || key === "vintage") {

            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

            const amt = (key === "vintage") ? 0.5 : 1;

            r += (gray - r) * amt;
            g += (gray - g) * amt;
            b += (gray - b) * amt;

        }

        if (key === "sepia" || key === "vintage") {

            const tr = 0.393 * r + 0.769 * g + 0.189 * b;
            const tg = 0.349 * r + 0.686 * g + 0.168 * b;
            const tb = 0.272 * r + 0.534 * g + 0.131 * b;

            const amt = (key === "vintage") ? 0.5 : 1;

            r += (tr - r) * amt;
            g += (tg - g) * amt;
            b += (tb - b) * amt;

        }

        if (key === "bright") {

            r *= 1.5;
            g *= 1.5;
            b *= 1.5;

        }

        if (key === "vintage") {

            r *= 1.05;
            g *= 1.05;
            b *= 1.05;

        }

        if (key === "soft") {

            r *= 1.3;
            g *= 1.3;
            b *= 1.3;

        }

        if (key === "contrast" || key === "vintage") {

            const factor = (key === "vintage") ? 1.10 : 1.20;

            r = (r - 128) * factor + 128;
            g = (g - 128) * factor + 128;
            b = (b - 128) * factor + 128;

        }

        d[i] = clampChannel(r);
        d[i + 1] = clampChannel(g);
        d[i + 2] = clampChannel(b);

    }

    ctx.putImageData(imgData, 0, 0);

    if (key === "soft") {

        boxBlur(ctx, width, height, 2);

    }

}



function boxBlur(ctx, width, height, radius) {

    const src = ctx.getImageData(0, 0, width, height);

    const out = ctx.createImageData(width, height);

    const sd = src.data;
    const od = out.data;

    for (let y = 0; y < height; y++) {

        for (let x = 0; x < width; x++) {

            let r = 0, g = 0, b = 0, a = 0, count = 0;

            for (let dy = -radius; dy <= radius; dy++) {

                for (let dx = -radius; dx <= radius; dx++) {

                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {

                        const idx = (ny * width + nx) * 4;

                        r += sd[idx];
                        g += sd[idx + 1];
                        b += sd[idx + 2];
                        a += sd[idx + 3];

                        count++;

                    }

                }

            }

            const oi = (y * width + x) * 4;

            od[oi] = r / count;
            od[oi + 1] = g / count;
            od[oi + 2] = b / count;
            od[oi + 3] = a / count;

        }

    }

    ctx.putImageData(out, 0, 0);

}

//homepage

const homePage = document.getElementById("homePage");
const photoboothApp = document.getElementById("photoboothApp");
const startBtn = document.getElementById("startBtn");


async function startCamera() {

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

        statusText.innerText = "Browser tidak mendukung kamera";

        alert(
            "Browser ini tidak mendukung akses kamera (getUserMedia). " +
            "Coba pakai Chrome/Edge/Safari versi terbaru."
        );

        return;

    }

    if (!isSecureOrigin) {

        statusText.innerText = "Perlu HTTPS untuk kamera";

        alert(
            "Kamera hanya bisa diakses lewat HTTPS (atau localhost). " +
            "Buka wednbOOth lewat alamat https:// supaya kamera bisa aktif " +
            "di iOS, Android, maupun Windows."
        );

        return;

    }

    try {

        const preferredConstraints = {
            video: {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        try {

            cameraStream =
                await navigator.mediaDevices.getUserMedia(preferredConstraints);

        } catch (constraintError) {

            console.warn(
                "Constraint kamera lanjutan ditolak, pakai fallback:",
                constraintError
            );

            cameraStream =
                await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });

        }

        video.srcObject = cameraStream;

        video.onloadedmetadata = () => {
            video.play().catch(() => {});
        };

        statusText.innerText = "Camera ready";

    } catch (error) {

        console.error("Camera error:", error);

        let msg =
            "Kamera tidak dapat diakses. Pastikan kamu sudah memberikan " +
            "izin kamera pada browser.";

        if (error && error.name === "NotAllowedError") {

            msg =
                "Izin kamera ditolak. Aktifkan izin kamera untuk browser " +
                "ini lewat pengaturan situs, lalu muat ulang halaman.";

        } else if (error && error.name === "NotFoundError") {

            msg = "Tidak ada kamera yang terdeteksi di perangkat ini.";

        } else if (error && error.name === "NotReadableError") {

            msg =
                "Kamera sedang dipakai aplikasi lain. Tutup aplikasi " +
                "kamera lain lalu coba lagi.";

        }

        statusText.innerText = "Camera tidak dapat diakses";

        alert(msg);

    }

}


if (startBtn) {

    startBtn.addEventListener("click", async function () {

        
        shutter
            .play()
            .then(() => {
                shutter.pause();
                shutter.currentTime = 0;
            })
            .catch(() => {});

        homePage.classList.add("hide");

        setTimeout(async () => {

            photoboothApp.classList.add("active");

            await startCamera();

        }, 300);

    });

}



function closeAllDropdowns() {

    document.querySelectorAll(".dropdown").forEach(menu => {
        menu.style.display = "none";
    });

}


function toggleMenu(id) {

    const menu = document.getElementById(id);

    if (!menu) return;

    const isOpen = menu.style.display === "block";

    closeAllDropdowns();

    if (!isOpen) {
        menu.style.display = "block";
    }

}


window.addEventListener("click", function (e) {

    if (!e.target.closest(".btn-group")) {
        closeAllDropdowns();
    }

});


//layout
function setLayout(val) {

    layout = val;

    let text = "";

    if (val === 1) text = "1 Foto";
    else if (val === 2) text = "2 Foto";
    else if (val === 3) text = "3 Foto";
    else if (val === 4) text = "4 Foto";
    else if (val === 6) text = "6 Foto";

    layoutBtn.innerText = "⌗ Layout: " + text;

    closeAllDropdowns();

}


//filter
function setFilter(val, name) {

    currentFilter = val;

    const cssValue = filterCSSMap[val] || "none";

    video.style.filter = cssValue;
    video.style.webkitFilter = cssValue;

    filterBtn.innerText = "✦ Filter: " + name;

    closeAllDropdowns();

}


function setTimer(val, name) {

    timer = val;

    timerBtn.innerText = "⏱ Timer: " + name;

    closeAllDropdowns();

}




function applyFramePreview() {

    if (!strip) return;


    if (currentFramePattern) {

        strip.style.backgroundColor = "#ffffff";

        strip.style.backgroundImage =
            `url("${currentFramePattern}")`;

        
        strip.style.backgroundRepeat = "no-repeat";

        strip.style.backgroundSize = "cover";

        strip.style.backgroundPosition = "center";

    }

    else {

        strip.style.backgroundColor = currentFrameColor;

        strip.style.backgroundImage = "none";

    }

}


/*
   Frame warna
*/

function setFrameColor(color, name) {

    currentFrameColor = color;

    currentFramePattern = null;

    applyFramePreview();

    if (frameBtn) {
        frameBtn.innerText = "🖼 Frame: " + name;
    }

    closeAllDropdowns();

}



function hslToHex(h, s, l) {

    s /= 100;
    l /= 100;

    const k = n => (n + h / 30) % 12;

    const a = s * Math.min(l, 1 - l);

    const f = n =>
        l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

    const toHex = x =>
        Math.round(255 * x).toString(16).padStart(2, "0");

    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;

}




function syncCustomSwatch(color) {

    if (customColorSwatch) {
        customColorSwatch.style.background = color;
    }

}




function updateLightSliderGradient() {

    if (!hueSlider || !lightSlider) return;

    const h = hueSlider.value;

    lightSlider.style.background =
        `linear-gradient(to right, #000000, hsl(${h}, 85%, 50%), #ffffff)`;

}



function applyCustomColorFromSliders() {

    if (!hueSlider || !lightSlider) return;

    const h = Number(hueSlider.value);
    const l = Number(lightSlider.value);

    const hex = hslToHex(h, 85, l);

    currentFrameColor = hex;
    currentFramePattern = null;

    syncCustomSwatch(hex);

    updateLightSliderGradient();

    applyFramePreview();

    if (frameBtn) {
        frameBtn.innerText = "🖼 Frame: Custom";
    }

}



function toggleCustomColorPanel(event) {

    if (event) {
        event.stopPropagation();
    }

    if (!customColorPanel) return;

    const isOpen =
        customColorPanel.style.display === "flex";

    customColorPanel.style.display =
        isOpen ? "none" : "flex";

}


if (hueSlider) {

    hueSlider.addEventListener("input", applyCustomColorFromSliders);

    hueSlider.addEventListener("click", e => e.stopPropagation());

    hueSlider.addEventListener("touchstart", e => e.stopPropagation());

}

if (lightSlider) {

    lightSlider.addEventListener("input", applyCustomColorFromSliders);

    lightSlider.addEventListener("click", e => e.stopPropagation());

    lightSlider.addEventListener("touchstart", e => e.stopPropagation());

}

updateLightSliderGradient();



function setFramePattern(pattern, name) {

    currentFramePattern = pattern;

    applyFramePreview();

    if (frameBtn) {
        frameBtn.innerText = "🖼 Frame: " + name;
    }

    closeAllDropdowns();

}

captureBtn.onclick = async () => {

    if (!video.srcObject) {

        alert("Kamera belum aktif.");

        return;

    }


    photosContainer.innerHTML = "";

    strip.classList.remove("show", "grid-6", "printed");

    photos = [];


    captureBtn.disabled = true;



    applyFramePreview();

    if (layout === 6) {

        strip.classList.add("grid-6");

    }


    try {

        for (let i = 0; i < layout; i++) {

            if (timer > 0) {

                await countdown(timer);

            }



            shutter.currentTime = 0;

            shutter.play().catch(() => {});


            await wait(150);


            capture();


            if (!strip.classList.contains("show")) {

                strip.classList.add("show");

            }


            statusText.innerText =
                `${i + 1}/${layout} photo(s) captured`;


            await wait(800);

        }


        strip.classList.add("printed");


        statusText.innerText =
            `${layout} photo(s) ready!`;

    }

    catch (error) {

        console.error(error);

        statusText.innerText =
            "Capture failed";

    }

    finally {

        captureBtn.disabled = false;

    }

};


function capture() {

    const canvas = document.createElement("canvas");

    const ctx = canvas.getContext("2d");


    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const targetRatio = 16 / 9;

    let sx, sy, sw, sh;

    if (vw / vh > targetRatio) {

        sh = vh;
        sw = vh * targetRatio;
        sx = (vw - sw) / 2;
        sy = 0;

    } else {

       
        sw = vw;
        sh = vw / targetRatio;
        sx = 0;
        sy = (vh - sh) / 2;

    }

    canvas.width = sw;
    canvas.height = sh;


    const mirrored = document.createElement("canvas");

    mirrored.width = sw;
    mirrored.height = sh;

    const mctx = mirrored.getContext("2d");

    mctx.save();

    mctx.translate(mirrored.width, 0);

    mctx.scale(-1, 1);

    mctx.drawImage(
        video,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        mirrored.width,
        mirrored.height
    );

    mctx.restore();

    if (CANVAS_FILTER_SUPPORTED) {

        ctx.filter = filterCSSMap[currentFilter] || "none";

        ctx.drawImage(mirrored, 0, 0);

        ctx.filter = "none";

    } else {

        ctx.drawImage(mirrored, 0, 0);

        applyManualFilter(ctx, canvas.width, canvas.height, currentFilter);

    }


    const finalImage =
        canvas.toDataURL("image/png");


    photos.push(finalImage);


    const img =
        document.createElement("img");

    img.src = finalImage;

    photosContainer.appendChild(img);

}


//   COUNTDOWN


function countdown(sec) {

    return new Promise(resolve => {

        let s = sec;

        countdownEl.innerText = s;


        const int = setInterval(() => {

            s--;

            countdownEl.innerText = s;


            if (s <= 0) {

                clearInterval(int);

                countdownEl.innerText = "";

                resolve();

            }

        }, 1000);

    });

}



function wait(ms) {

    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );

}


function loadImage(src) {


    return new Promise((resolve, reject) => {

        const img = new Image();

        img.onload = () => resolve(img);

        img.onerror = () =>
            reject(
                new Error(
                    "Gagal memuat gambar: " + src +
                    " (pastikan file ada di lokasi tersebut, dan " +
                    "buka wednbOOth lewat local server, bukan " +
                    "langsung dobel-klik index.html)"
                )
            );

        img.src = src;

    });

}



function drawRoundedImage(
    ctx,
    img,
    x,
    y,
    width,
    height,
    radius
) {

    ctx.save();

    ctx.beginPath();

    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);

    ctx.closePath();

    ctx.clip();

    ctx.drawImage(img, x, y, width, height);

    ctx.restore();

}



async function drawFrameBackground(ctx, width, height) {


    if (!currentFramePattern) {

        ctx.fillStyle = currentFrameColor;

        ctx.fillRect(0, 0, width, height);

        return;

    }


    //PATTERN

    const patternImage = await loadImage(currentFramePattern);

    const scale = Math.max(
        width / patternImage.width,
        height / patternImage.height
    );

    const drawWidth = patternImage.width * scale;
    const drawHeight = patternImage.height * scale;

    const dx = (width - drawWidth) / 2;
    const dy = (height - drawHeight) / 2;

    ctx.drawImage(patternImage, dx, dy, drawWidth, drawHeight);

}


//   CREATE PHOTO STRIP 

async function createStrip() {

    const displayedPhotoImgs =
        Array.from(photosContainer.querySelectorAll("img"));

    if (!displayedPhotoImgs.length) {

        throw new Error("Belum ada foto di strip.");

    }


    const nativeWidth =
        displayedPhotoImgs[0].naturalWidth ||
        displayedPhotoImgs[0].width;

    const stripRect = strip.getBoundingClientRect();

    const firstPhotoRect =
        displayedPhotoImgs[0].getBoundingClientRect();

    const scale = nativeWidth / firstPhotoRect.width;


    const canvas = document.createElement("canvas");

    canvas.width = Math.round(stripRect.width * scale);

    canvas.height = Math.round(stripRect.height * scale);

    const ctx = canvas.getContext("2d");


    await drawFrameBackground(ctx, canvas.width, canvas.height);


    displayedPhotoImgs.forEach(imgEl => {

        const r = imgEl.getBoundingClientRect();

        const x = (r.left - stripRect.left) * scale;
        const y = (r.top - stripRect.top) * scale;
        const width = r.width * scale;
        const height = r.height * scale;

        const radius =
            (parseFloat(getComputedStyle(imgEl).borderRadius) || 0) * scale;

        drawRoundedImage(ctx, imgEl, x, y, width, height, radius);

    });

    const logoEl = document.getElementById("logoStrip");

    if (logoEl && logoEl.complete && logoEl.naturalWidth > 0) {

        const r = logoEl.getBoundingClientRect();

        const logoOpacity =
            parseFloat(getComputedStyle(logoEl).opacity);

        ctx.save();

        ctx.globalAlpha = isNaN(logoOpacity) ? 1 : logoOpacity;

        ctx.drawImage(
            logoEl,
            (r.left - stripRect.left) * scale,
            (r.top - stripRect.top) * scale,
            r.width * scale,
            r.height * scale
        );

        ctx.restore();

    }


    return canvas;

}



function dataUrlToBlob(dataUrl) {

    const [header, base64] = dataUrl.split(",");

    const mimeMatch = header.match(/data:(.*);base64/);

    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";

    const binary = atob(base64);

    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mime });

}

function downloadDataUrl(dataUrl, filename, preOpenedWindow) {

    if (isIOS()) {

     
        let blobUrl;

        try {

            const blob = dataUrlToBlob(dataUrl);

            blobUrl = URL.createObjectURL(blob);

        } catch (blobError) {

            console.error("Gagal membuat blob untuk iOS:", blobError);

            if (preOpenedWindow) {
                preOpenedWindow.close();
            }

            alert(
                "Gagal menyiapkan gambar untuk didownload. Coba lagi."
            );

            return;

        }

        const win = preOpenedWindow || window.open(blobUrl, "_blank");

        if (!win) {

            alert(
                "Pop-up diblokir. Izinkan pop-up untuk situs ini lalu " +
                "coba download lagi, atau screenshot hasilnya."
            );

            URL.revokeObjectURL(blobUrl);

            return;

        }

        if (preOpenedWindow) {

            try {

                win.location.href = blobUrl;

            } catch (navError) {

                console.warn(
                    "Gagal mengisi tab yang sudah dibuka, fallback ke window.open:",
                    navError
                );

                window.open(blobUrl, "_blank");

            }

        }

        statusText.innerText =
            "Tekan & tahan gambar, lalu pilih \"Simpan ke Foto\"";

        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

        return;

    }

    try {

        const blob = dataUrlToBlob(dataUrl);

        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = blobUrl;

        link.download = filename;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

        statusText.innerText = "Download success!";

    } catch (blobError) {

        console.warn(
            "Blob download gagal, fallback ke data URL langsung:",
            blobError
        );

        const link = document.createElement("a");

        link.href = dataUrl;

        link.download = filename;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        statusText.innerText = "Download success!";

    }

}


//   DOWNLOAD JPG


downloadJPG.onclick = async () => {

    if (!photos.length) {

        alert("Ambil foto dulu!");

        return;

    }


    const iosPreOpenedWindow = isIOS() ? window.open("", "_blank") : null;


    statusText.innerText =
        "Generating image...";


    try {


        const canvas =
            await createStrip();



        downloadDataUrl(
            canvas.toDataURL("image/jpeg", 0.92),
            `wednbooth_${Date.now()}.jpg`,
            iosPreOpenedWindow
        );


    }

    catch (err) {

        console.error(err);

        if (iosPreOpenedWindow) {
            iosPreOpenedWindow.close();
        }

        alert(
            "Download Failed: " +
            err.message
        );

        statusText.innerText =
            "Download failed";

    }

};

//   DOWNLOAD GIF

downloadGIF.onclick = async () => {

    if (!photos.length) {

        alert("Belum ada foto!");

        return;

    }

    const iosPreOpenedWindow = isIOS() ? window.open("", "_blank") : null;


    statusText.innerText =
        "Processing GIF...";


    try {

        const frames = [];

        let firstWidth = 0;
        let firstHeight = 0;


        for (
            let i = 0;
            i < photos.length;
            i++
        ) {

            const img =
                await loadImage(
                    photos[i]
                );


            if (i === 0) {

                firstWidth =
                    img.width;

                firstHeight =
                    img.height;

            }


            const canvas =
                document.createElement(
                    "canvas"
                );


            const ctx =
                canvas.getContext("2d");


            canvas.width =
                firstWidth;

            canvas.height =
                firstHeight;


            ctx.drawImage(
                img,
                0,
                0,
                firstWidth,
                firstHeight
            );


            frames.push(
                canvas.toDataURL(
                    "image/png"
                )
            );

        }


        gifshot.createGIF({

            images: frames,

            interval: 0.7,

            gifWidth: firstWidth,

            gifHeight: firstHeight

        }, function (obj) {

            if (!obj.error) {

                downloadDataUrl(obj.image, "wednbooth.gif", iosPreOpenedWindow);

                statusText.innerText = isIOS()
                    ? statusText.innerText
                    : "GIF created!";

            }

            else {

                console.error(
                    obj.error
                );

                // Gagal bikin GIF -- tab kosong yang sudah dibuka
                // ditutup lagi supaya tidak menggantung.
                if (iosPreOpenedWindow) {
                    iosPreOpenedWindow.close();
                }

                statusText.innerText =
                    "Failed to create GIF";

            }

        });

    }

    catch (error) {

        console.error(error);

        if (iosPreOpenedWindow) {
            iosPreOpenedWindow.close();
        }

        statusText.innerText =
            "GIF failed";

        alert(
            "GIF gagal dibuat: " +
            error.message
        );

    }

};


//RESET

resetBtn.onclick = () => {

    photos = [];

    photosContainer.innerHTML = "";

    strip.classList.remove(
        "show",
        "grid-6",
        "printed"
    );

    setFrameColor("#ffffff", "White");

    setFilter("none", "Normal");

    setLayout(1);

    setTimer(0, "Off");

    statusText.innerText =
        "Reset selesai";

};


window.addEventListener("pagehide", () => {

    if (cameraStream) {

        cameraStream.getTracks().forEach(track => track.stop());

    }

});


applyFramePreview();

/* =========================================================
   BOLA MATA HOMEPAGE
   Pupil mengikuti kursor/sentuhan, melirik acak saat diam,
   dan berkedip sesekali.
   ========================================================= */

(function initEyes() {

    const eyes = Array.from(document.querySelectorAll(".home-title .eye"));

    if (!eyes.length || !homePage) return;

    let lastMove = 0;

    function setGaze(eye, gx, gy) {
        eye.style.setProperty("--gx", gx.toFixed(3));
        eye.style.setProperty("--gy", gy.toFixed(3));
    }

    function lookAt(x, y) {

        eyes.forEach(eye => {

            const r = eye.getBoundingClientRect();

            const dx = x - (r.left + r.width / 2);
            const dy = y - (r.top + r.height / 2);

            const dist = Math.hypot(dx, dy) || 1;
            const power = Math.min(dist / 150, 1);

            setGaze(eye, (dx / dist) * power, (dy / dist) * power);

        });

    }

    function onPointer(e) {

        const p = e.touches ? e.touches[0] : e;

        if (!p) return;

        lastMove = Date.now();

        lookAt(p.clientX, p.clientY);

    }

    window.addEventListener("pointermove", onPointer);
    window.addEventListener("touchmove", onPointer, { passive: true });

    // Melirik acak kalau tidak ada gerakan
    setInterval(() => {

        if (homePage.classList.contains("hide")) return;

        if (Date.now() - lastMove < 2500) return;

        const gx = Math.random() * 2 - 1;
        const gy = Math.random() * 2 - 1;

        eyes.forEach(eye => setGaze(eye, gx, gy));

    }, 1400);

    // Berkedip
    function blink() {

        if (!homePage.classList.contains("hide")) {

            eyes.forEach(eye => eye.classList.add("blink"));

            setTimeout(() => {
                eyes.forEach(eye => eye.classList.remove("blink"));
            }, 140);

        }

        setTimeout(blink, 2500 + Math.random() * 2500);

    }

    setTimeout(blink, 2000);

})();