const video = document.getElementById("video");
const cameraBox = document.querySelector(".camera-box");
const strip = document.getElementById("strip");
const countdownEl = document.getElementById("countdown");
const countdownRingEl = countdownEl.querySelector(".countdown-ring");
const countdownNumberEl = countdownEl.querySelector(".countdown-number");
const captureBtn = document.getElementById("captureBtn");
const statusText = document.getElementById("status");

const layoutBtn = document.getElementById("layoutBtn");
const filterBtn = document.getElementById("filterBtn");
const timerBtn = document.getElementById("timerBtn");
const frameBtn = document.getElementById("frameBtn");
const headEffectCanvas = document.getElementById("headEffectCanvas");
const headEffectBtn = document.getElementById("headEffectBtn");
const printAnimationViewport = document.getElementById("printAnimationViewport");

const downloadJPG = document.getElementById("downloadJPG");
const downloadGIF = document.getElementById("downloadGIF");
const resetBtn = document.getElementById("reset");

const customColorSwatch = document.getElementById("customColorSwatch");
const customColorPanel = document.getElementById("customColorPanel");
const hueSlider = document.getElementById("hueSlider");
const lightSlider = document.getElementById("lightSlider");

const photosContainer = document.getElementById("photosContainer");
const faqPanel = document.getElementById("faqPanel");
const helpMenu = document.getElementById("helpMenu");
const faqView = document.getElementById("faqView");
const requestFrameView = document.getElementById("requestFrameView");
const requestFrameForm = document.getElementById("requestFrameForm");
const formSubmitStatus = document.getElementById("formSubmitStatus");
const requestTopic = document.getElementById("requestTopic");
const topicSelectButton = document.getElementById("topicSelectButton");
const topicSelectLabel = document.getElementById("topicSelectLabel");
const topicOptions = document.getElementById("topicOptions");

function closeTopicOptions() {
    topicOptions.hidden = true;
    topicSelectButton.setAttribute("aria-expanded", "false");
}

topicSelectButton.addEventListener("click", () => {
    const isOpening = topicOptions.hidden;
    topicOptions.hidden = !isOpening;
    topicSelectButton.setAttribute("aria-expanded", String(isOpening));

    if (isOpening) {
        topicOptions.querySelector("[role='option']").focus();
    }
});

topicOptions.querySelectorAll("[role='option']").forEach(option => {
    option.addEventListener("click", () => {
        requestTopic.value = option.dataset.topic;
        topicSelectLabel.textContent = option.dataset.topic;
        topicOptions.querySelectorAll("[role='option']").forEach(item => {
            item.setAttribute("aria-selected", String(item === option));
        });
        closeTopicOptions();
        topicSelectButton.focus();
    });
});

topicSelectButton.addEventListener("keydown", event => {
    if (event.key === "ArrowDown") {
        event.preventDefault();
        topicOptions.hidden = false;
        topicSelectButton.setAttribute("aria-expanded", "true");
        topicOptions.querySelector("[role='option']").focus();
    }
});

topicOptions.addEventListener("keydown", event => {
    const options = Array.from(topicOptions.querySelectorAll("[role='option']"));
    const index = options.indexOf(document.activeElement);

    if (event.key === "Escape") {
        closeTopicOptions();
        topicSelectButton.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        options[(index + direction + options.length) % options.length].focus();
    }
});

document.addEventListener("click", event => {
    if (!event.target.closest(".topic-select")) closeTopicOptions();
});

document.querySelectorAll("[data-help-view]").forEach(button => {
    button.addEventListener("click", () => {
        const showFaq = button.dataset.helpView === "faq";
        helpMenu.hidden = true;
        faqView.hidden = !showFaq;
        requestFrameView.hidden = showFaq;
        faqPanel.classList.remove("is-menu");
    });
});

document.querySelectorAll(".help-back").forEach(button => {
    button.addEventListener("click", () => {
        faqView.hidden = true;
        requestFrameView.hidden = true;
        helpMenu.hidden = false;
        faqPanel.classList.add("is-menu");
    });
});

requestFrameForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!requestFrameForm.reportValidity()) return;

    const submitButton = requestFrameForm.querySelector("[type='submit']");
    const formData = new FormData(requestFrameForm);
    const encodedData = new URLSearchParams(formData);
    submitButton.disabled = true;
    formSubmitStatus.textContent = "Mengirim permintaan...";
    formSubmitStatus.classList.remove("is-error");

    try {
        if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
            throw new Error("Netlify Forms hanya menerima formulir dari situs yang sudah di-deploy.");
        }

        const response = await fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: encodedData.toString()
        });

        if (!response.ok) {
            throw new Error(`Server menolak pengiriman (HTTP ${response.status}).`);
        }

        requestFrameForm.reset();
        requestTopic.value = "Frame Request";
        topicSelectLabel.textContent = "Frame Request";
        topicOptions.querySelectorAll("[role='option']").forEach(option => {
            option.setAttribute("aria-selected", String(option.dataset.topic === "Frame Request"));
        });
        formSubmitStatus.textContent = "Permintaan berhasil dikirim. Terima kasih!";
    } catch (error) {
        console.error("Gagal mengirim permintaan:", error);
        formSubmitStatus.textContent = "Permintaan belum terkirim. Coba lagi beberapa saat.";
        formSubmitStatus.classList.add("is-error");
    } finally {
        submitButton.disabled = false;
    }
});

let currentFrameColor = "#ffffff";
let currentFramePattern = null;

let layout = 1;
let timer = 0;
let currentFilter = "none";
let currentHeadEffect = "none";
let photos = [];
let photoCount = 0;
let captureSessionId = 0;
let activePrintAnimation = null;
let activePrintCanvas = null;
let printAnimationToken = 0;

let cameraStream = null;
let faceLandmarker = null;
let faceLandmarkerPromise = null;
let faceEffectAssetsPromise = null;
let faceEffectAssets = null;
let faceEffectFrame = null;
let faceEffectLoading = false;
let smoothedFace = null;
let heartParticles = [];
let nextHeartSpawnAt = 0;
let lastHeartUpdateAt = 0;
let lastDetectionTime = -1;
let lastVideoTime = -1;
let faceEffectLastFrame = 0;
let faceEffectSize = { width: 0, height: 0, pixelRatio: 1 };
const faceEffectContext = headEffectCanvas.getContext("2d");

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
    soft: "blur(2px) brightness(130%)",
    noise: "none"
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

function applyNoiseTexture(ctx, width, height) {
    const textureSize = 128;
    const noiseCanvas = document.createElement("canvas");
    noiseCanvas.width = textureSize;
    noiseCanvas.height = textureSize;

    const noiseContext = noiseCanvas.getContext("2d");
    if (!noiseContext) throw new Error("Tidak dapat membuat tekstur noise.");

    const noise = noiseContext.createImageData(textureSize, textureSize);
    for (let index = 0; index < noise.data.length; index += 4) {
        const value = Math.floor(Math.random() * 256);
        noise.data[index] = value;
        noise.data[index + 1] = value;
        noise.data[index + 2] = value;
        noise.data[index + 3] = 255;
    }
    noiseContext.putImageData(noise, 0, 0);

    const pattern = ctx.createPattern(noiseCanvas, "repeat");
    if (!pattern) throw new Error("Tidak dapat menerapkan tekstur noise.");

    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.46;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}


function applyManualFilter(ctx, width, height, key) {

    if (key === "none" || key === "noise") return;

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
            video.play().then(() => {
                if (currentHeadEffect !== "none") startFaceEffectLoop();
            }).catch(error => {
                console.error("Camera playback error:", error);
                statusText.innerText = "Kamera tidak dapat diputar";
            });
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



function updateFrameDropdownClearance() {

    const frameMenu = document.getElementById("frameMenu");
    const container = document.querySelector(".container");

    if (!frameMenu || !container) return;

    container.style.removeProperty("margin-bottom");

    if (frameMenu.style.display !== "block") return;

    const menuBottom = frameMenu.getBoundingClientRect().bottom;
    const containerBottom = container.getBoundingClientRect().bottom;
    const clearance = Math.max(0, menuBottom - containerBottom + 20);

    if (clearance > 0) {
        container.style.marginBottom = `${clearance}px`;
    }

}


function closeAllDropdowns() {

    document.querySelectorAll(".dropdown").forEach(menu => {
        menu.style.display = "none";
    });

    updateFrameDropdownClearance();

}


function toggleMenu(id) {

    const menu = document.getElementById(id);

    if (!menu) return;

    const isOpen = menu.style.display === "block";

    closeAllDropdowns();

    if (!isOpen) {
        menu.style.display = "block";
    }

    updateFrameDropdownClearance();

}


window.addEventListener("resize", updateFrameDropdownClearance);


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

    document.getElementById("layoutLabel").innerText = "Layout: " + text;

    closeAllDropdowns();

}


//filter
function setFilter(val, name) {

    currentFilter = val;

    const cssValue = filterCSSMap[val] || "none";

    video.style.filter = cssValue;
    video.style.webkitFilter = cssValue;
    cameraBox.classList.toggle("noise-active", val === "noise");

    filterBtn.innerText = "✦ Filter: " + name;

    closeAllDropdowns();

}

function setHeadEffect(effect, name) {

    if (currentHeadEffect !== effect) resetHeartParticles();
    currentHeadEffect = effect;
    document.getElementById("headEffectLabel").innerText = "Efek: " + name;

    if (effect === "none") {
        stopFaceEffectLoop();
    } else if (video.srcObject && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        startFaceEffectLoop();
    }

    closeAllDropdowns();

}


function setTimer(val, name) {

    timer = val;

    document.getElementById("timerLabel").innerText = "Timer: " + name;

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
        document.getElementById("frameLabel").innerText = "Frame: " + name;
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
        document.getElementById("frameLabel").innerText = "Frame: Custom";
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
        document.getElementById("frameLabel").innerText = "Frame: " + name;
    }

    closeAllDropdowns();

}

captureBtn.onclick = async () => {

    if (!video.srcObject) {

        alert("Kamera belum aktif.");

        return;

    }

    const sessionId = ++captureSessionId;
    photosContainer.innerHTML = "";

    strip.classList.remove("show", "grid-6");
    clearPrintAnimation();

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

            if (sessionId !== captureSessionId) return;



            shutter.currentTime = 0;

            shutter.play().catch(() => {});


            await wait(150);

            if (sessionId !== captureSessionId) return;

            capture();

            if (!strip.classList.contains("show")) {
                strip.classList.add("show");
            }

            statusText.innerText =
                `${i + 1}/${layout} photo(s) captured`;

            if (i < layout - 1) {
                await wait(800);
            }

        }

        await wait(400);
        if (sessionId !== captureSessionId) return;
        try {
            const displayedPhotos = Array.from(photosContainer.querySelectorAll("img"));
            await Promise.all(displayedPhotos.map(image => image.decode()));
            if (sessionId !== captureSessionId) return;
            const finalStripCanvas = await createStrip();
            if (sessionId !== captureSessionId) return;
            const animationCompleted = await animatePrintedStrip(finalStripCanvas);
            if (!animationCompleted) return;
        } catch (error) {
            console.error("Final photo strip printing failed:", error);
            statusText.innerText = "Foto berhasil diambil, tetapi animasi cetak gagal.";
            return;
        }

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

function clearPrintAnimation() {
    printAnimationToken++;
    activePrintAnimation?.cancel();
    activePrintAnimation = null;
    activePrintCanvas?.remove();
    activePrintCanvas = null;
    printAnimationViewport.replaceChildren();
    strip.classList.remove("is-printing");
}

async function animatePrintedStrip(sourceCanvas) {
    clearPrintAnimation();
    const animationToken = printAnimationToken;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;

    const outputSlot = document.querySelector(".output-slot");
    if (!outputSlot || !printAnimationViewport) return true;

    const slotRect = outputSlot.getBoundingClientRect();
    const targetRect = strip.getBoundingClientRect();
    if (!slotRect.width || !targetRect.width || !targetRect.height) return true;

    const canvas = document.createElement("canvas");
    canvas.className = "printed-strip-canvas";
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    canvas.style.left = `${targetRect.left}px`;
    canvas.style.top = `${targetRect.top}px`;
    canvas.style.width = `${targetRect.width}px`;
    canvas.style.height = `${targetRect.height}px`;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tidak dapat menyiapkan preview cetak.");
    context.drawImage(sourceCanvas, 0, 0);
    printAnimationViewport.appendChild(canvas);
    activePrintCanvas = canvas;

    const revealHeight = Math.min(14, targetRect.height * 0.06);
    const startTop = slotRect.bottom - revealHeight;
    const translateX = slotRect.left + (slotRect.width - targetRect.width) / 2 - targetRect.left;
    const translateY = startTop - targetRect.top;
    let animation;
    try {
        animation = canvas.animate(
            [
                {
                    transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
                    clipPath: "inset(0 0 94% 0 round 8px)",
                    opacity: 0.82
                },
                {
                    transform: "translate3d(0, 0, 0)",
                    clipPath: "inset(0 0 0 0 round 8px)",
                    opacity: 1
                }
            ],
            {
                duration: 1200,
                easing: "cubic-bezier(0.18, 0.72, 0.22, 1)",
                fill: "forwards"
            }
        );
    } catch (error) {
        canvas.remove();
        activePrintCanvas = null;
        throw error;
    }
    activePrintAnimation = animation;
    strip.classList.add("is-printing");

    try {
        await animation.finished.catch(() => {});
    } finally {
        if (animationToken === printAnimationToken) {
            canvas.remove();
            activePrintCanvas = null;
            activePrintAnimation = null;
            strip.classList.remove("is-printing");
        }
    }
    return animationToken === printAnimationToken;
}


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

    if (currentFilter === "noise") {
        applyNoiseTexture(ctx, canvas.width, canvas.height);
    }

    drawHeadEffect(ctx, canvas.width, canvas.height, { sx, sy, sw, sh });

    const finalImage =
        canvas.toDataURL("image/png");


    photos.push(finalImage);


    const img =
        document.createElement("img");

    img.src = finalImage;

    photosContainer.appendChild(img);

}

const FACE_LANDMARKER_MODULE_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs";
const FACE_LANDMARKER_WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const FACE_LANDMARKER_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const HEART_SPRITE_URL = "assets/ar-love-hearts.svg";
const PUPPY_SPRITE_URL = "assets/ar-puppy.png";
const DOGGY_SPRITE_URL = "assets/ar-doggy.png";
const RABBIT_SPRITE_URL = "assets/ar-rabbit.png";
const HEART_SPRITE_FRAMES = 5;
const PUPPY_SPRITE_PARTS = {
    ears: { x: 43, y: 51, width: 403, height: 137 },
    nose: { x: 177, y: 310, width: 142, height: 82 }
};
const DOGGY_SPRITE_PARTS = {
    ears: { x: 54, y: 109, width: 359, height: 161 },
    nose: { x: 174, y: 271, width: 124, height: 87 }
};
const RABBIT_SPRITE_PARTS = {
    ears: { x: 0, y: 53, width: 417, height: 160 },
    nose: { x: 146, y: 291, width: 128, height: 76 }
};

function loadSprite(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Unable to load AR effect asset: ${url}`));
        image.src = url;
    });
}

function loadFaceEffectAssets() {
    if (!faceEffectAssetsPromise) {
        faceEffectAssetsPromise = Promise.all([
            loadSprite(HEART_SPRITE_URL),
            loadSprite(PUPPY_SPRITE_URL),
            loadSprite(DOGGY_SPRITE_URL),
            loadSprite(RABBIT_SPRITE_URL)
        ]).then(([hearts, puppy, doggy, rabbit]) => {
            faceEffectAssets = { hearts, puppy, doggy, rabbit };
            return faceEffectAssets;
        }).catch(error => {
            faceEffectAssetsPromise = null;
            throw error;
        });
    }
    return faceEffectAssetsPromise;
}

function loadFaceLandmarker() {
    if (!faceLandmarkerPromise) {
        faceLandmarkerPromise = (async () => {
            const vision = await import(FACE_LANDMARKER_MODULE_URL);
            const files = await vision.FilesetResolver.forVisionTasks(FACE_LANDMARKER_WASM_URL);
            faceLandmarker = await vision.FaceLandmarker.createFromOptions(files, {
                baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL },
                runningMode: "VIDEO",
                numFaces: 1
            });
            return faceLandmarker;
        })().catch(error => {
            faceLandmarkerPromise = null;
            throw error;
        });
    }
    return faceLandmarkerPromise;
}

function startFaceEffectLoop() {
    if (faceEffectFrame !== null || faceEffectLoading || currentHeadEffect === "none") return;
    faceEffectLoading = true;
    Promise.all([loadFaceLandmarker(), loadFaceEffectAssets()]).then(() => {
        faceEffectLoading = false;
        if (currentHeadEffect === "none") return;
        faceEffectLastFrame = 0;
        faceEffectFrame = requestAnimationFrame(renderFaceEffect);
    }).catch(error => {
        faceEffectLoading = false;
        console.error("AR effect initialization failed:", error);
        statusText.innerText = "Aset efek AR gagal dimuat. Periksa koneksi internet lalu pilih efek lagi.";
        stopFaceEffectLoop();
    });
}

function stopFaceEffectLoop() {
    if (faceEffectFrame !== null) cancelAnimationFrame(faceEffectFrame);
    faceEffectFrame = null;
    smoothedFace = null;
    resetHeartParticles();
    faceEffectContext.clearRect(0, 0, headEffectCanvas.width, headEffectCanvas.height);
}

function resetHeartParticles() {
    heartParticles = [];
    nextHeartSpawnAt = 0;
    lastHeartUpdateAt = 0;
}

function resizeFaceEffectCanvas() {
    const rect = video.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (!rect.width || !rect.height) return;

    if (faceEffectSize.width !== rect.width ||
        faceEffectSize.height !== rect.height ||
        faceEffectSize.pixelRatio !== pixelRatio) {
        faceEffectSize = { width: rect.width, height: rect.height, pixelRatio };
        headEffectCanvas.width = Math.round(rect.width * pixelRatio);
        headEffectCanvas.height = Math.round(rect.height * pixelRatio);
        headEffectCanvas.style.width = `${rect.width}px`;
        headEffectCanvas.style.height = `${rect.height}px`;
        faceEffectContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }
}

function getFaceMeasurements(landmarks) {
    const left = landmarks[234];
    const right = landmarks[454];
    const forehead = landmarks[10];
    const chin = landmarks[152];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const nose = landmarks[1];
    if (!left || !right || !forehead || !chin || !leftEye || !rightEye || !nose) return null;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const eyeDistance = Math.hypot(
        (rightEye.x - leftEye.x) * videoWidth,
        (rightEye.y - leftEye.y) * videoHeight
    );
    const eyeMidpointX = (leftEye.x + rightEye.x) / 2;
    return {
        x: (left.x + right.x) * videoWidth / 2,
        y: (forehead.y + chin.y) * videoHeight / 2,
        noseX: nose.x * videoWidth,
        noseY: nose.y * videoHeight,
        width: Math.abs(right.x - left.x) * videoWidth,
        height: Math.abs(chin.y - forehead.y) * videoHeight,
        roll: Math.atan2(
            (rightEye.y - leftEye.y) * videoHeight,
            (rightEye.x - leftEye.x) * videoWidth
        ),
        yaw: eyeDistance ? Math.max(-0.45, Math.min(0.45, (nose.x - eyeMidpointX) * videoWidth / eyeDistance)) : 0
    };
}

function renderFaceEffect(timestamp) {
    faceEffectFrame = requestAnimationFrame(renderFaceEffect);
    if (currentHeadEffect === "none" || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        faceEffectContext.clearRect(0, 0, faceEffectSize.width, faceEffectSize.height);
        return;
    }

    resizeFaceEffectCanvas();
    if (!faceLandmarker || timestamp - faceEffectLastFrame < 30) return;
    faceEffectLastFrame = timestamp;

    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try {
            const result = faceLandmarker.detectForVideo(video, timestamp);
            const detectedFace = result.faceLandmarks.length
                ? getFaceMeasurements(result.faceLandmarks[0])
                : null;

            if (detectedFace) {
                const elapsed = lastDetectionTime < 0 ? 0 : Math.min(timestamp - lastDetectionTime, 100);
                const smoothing = lastDetectionTime < 0 ? 1 : 1 - Math.exp(-elapsed / 75);
                smoothedFace = smoothedFace
                    ? {
                        x: smoothedFace.x + (detectedFace.x - smoothedFace.x) * smoothing,
                        y: smoothedFace.y + (detectedFace.y - smoothedFace.y) * smoothing,
                        noseX: smoothedFace.noseX + (detectedFace.noseX - smoothedFace.noseX) * smoothing,
                        noseY: smoothedFace.noseY + (detectedFace.noseY - smoothedFace.noseY) * smoothing,
                        width: smoothedFace.width + (detectedFace.width - smoothedFace.width) * smoothing,
                        height: smoothedFace.height + (detectedFace.height - smoothedFace.height) * smoothing,
                        roll: smoothedFace.roll + (detectedFace.roll - smoothedFace.roll) * smoothing,
                        yaw: smoothedFace.yaw + (detectedFace.yaw - smoothedFace.yaw) * smoothing
                    }
                    : detectedFace;
                lastDetectionTime = timestamp;
            } else {
                smoothedFace = null;
                lastDetectionTime = -1;
                resetHeartParticles();
            }
        } catch (error) {
            console.error("Face tracking failed:", error);
            statusText.innerText = "Pelacakan wajah gagal. Coba pilih efek AR lagi.";
            smoothedFace = null;
            stopFaceEffectLoop();
            return;
        }
    }

    faceEffectContext.clearRect(0, 0, faceEffectSize.width, faceEffectSize.height);
    if (!smoothedFace) return;

    const scale = Math.max(
        faceEffectSize.width / video.videoWidth,
        faceEffectSize.height / video.videoHeight
    );
    const cropX = (video.videoWidth * scale - faceEffectSize.width) / 2;
    const cropY = (video.videoHeight * scale - faceEffectSize.height) / 2;
    const face = {
        x: faceEffectSize.width - (smoothedFace.x * scale - cropX),
        y: smoothedFace.y * scale - cropY,
        noseX: faceEffectSize.width - (smoothedFace.noseX * scale - cropX),
        noseY: smoothedFace.noseY * scale - cropY,
        width: smoothedFace.width * scale,
        height: smoothedFace.height * scale,
        roll: -smoothedFace.roll,
        yaw: -smoothedFace.yaw
    };
    drawFaceEffect(faceEffectContext, currentHeadEffect, face, timestamp);
}

function drawHeadEffect(ctx, width, height, crop) {
    if (currentHeadEffect === "none" || !smoothedFace) return;

    const previewScale = Math.max(
        faceEffectSize.width / video.videoWidth,
        faceEffectSize.height / video.videoHeight
    );
    const previewCropX = (video.videoWidth * previewScale - faceEffectSize.width) / 2;
    const previewCropY = (video.videoHeight * previewScale - faceEffectSize.height) / 2;
    const scaleX = width / crop.sw;
    const scaleY = height / crop.sh;
    const face = {
        x: (crop.sx + crop.sw - smoothedFace.x) * scaleX,
        y: (smoothedFace.y - crop.sy) * scaleY,
        noseX: (crop.sx + crop.sw - smoothedFace.noseX) * scaleX,
        noseY: (smoothedFace.noseY - crop.sy) * scaleY,
        width: smoothedFace.width * scaleX,
        height: smoothedFace.height * scaleY,
        roll: -smoothedFace.roll,
        yaw: -smoothedFace.yaw
    };
    drawFaceEffect(ctx, currentHeadEffect, face, performance.now(), {
        advanceHearts: false,
        heartTransform: {
            scale: 1 / previewScale,
            offsetX: crop.sw - ((faceEffectSize.width + previewCropX) / previewScale - crop.sx),
            offsetY: (previewCropY / previewScale) - crop.sy
        }
    });
}

function drawFaceEffect(ctx, effect, face, timestamp, options = {}) {
    const { x, y, width, height } = face;
    if (!width || !height || !faceEffectAssets) return;

    if (effect === "hearts") {
        drawLoveHeartParticles(ctx, face, timestamp, options);
        return;
    }

    if (effect === "puppy") {
        drawPuppyEffect(ctx, face, faceEffectAssets.puppy, PUPPY_SPRITE_PARTS);
        return;
    }

    if (effect === "doggy") {
        drawPuppyEffect(ctx, face, faceEffectAssets.doggy, DOGGY_SPRITE_PARTS);
        return;
    }

    if (effect === "rabbit") {
        drawPuppyEffect(ctx, face, faceEffectAssets.rabbit, RABBIT_SPRITE_PARTS);
        return;
    }
}

function drawPuppyEffect(ctx, face, sprite, parts) {
    const { x, y, width, height } = face;
    const roll = face.roll || 0;
    const perspective = 1 - Math.min(0.18, Math.abs(face.yaw || 0) * 0.28);
    const earWidth = width * 1.3;
    const earHeight = earWidth * parts.ears.height / parts.ears.width;
    const noseWidth = width * 0.4;
    const noseHeight = noseWidth * parts.nose.height / parts.nose.width;
    const noseOffsetX = (face.noseX ?? x) - x;
    const noseOffsetY = (face.noseY ?? y) - y;
    const noseLocalX = noseOffsetX * Math.cos(roll) + noseOffsetY * Math.sin(roll);
    const noseLocalY = -noseOffsetX * Math.sin(roll) + noseOffsetY * Math.cos(roll);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(roll);
    ctx.scale(perspective, 1);
    ctx.drawImage(
        sprite,
        parts.ears.x,
        parts.ears.y,
        parts.ears.width,
        parts.ears.height,
        -earWidth / 2,
        -height * 0.98,
        earWidth,
        earHeight
    );
    ctx.drawImage(
        sprite,
        parts.nose.x,
        parts.nose.y,
        parts.nose.width,
        parts.nose.height,
        noseLocalX - noseWidth / 2,
        noseLocalY - noseHeight * 0.42,
        noseWidth,
        noseHeight
    );
    ctx.restore();
}

function drawLoveHeartParticles(ctx, face, timestamp, options) {
    const transform = options.heartTransform || { scale: 1, offsetX: 0, offsetY: 0 };

    if (options.advanceHearts !== false) {
        const elapsed = lastHeartUpdateAt
            ? Math.min((timestamp - lastHeartUpdateAt) / 1000, 0.05)
            : 0;
        lastHeartUpdateAt = timestamp;

        for (let index = heartParticles.length - 1; index >= 0; index--) {
            const particle = heartParticles[index];
            particle.x += particle.velocityX * elapsed;
            particle.y -= particle.riseSpeed * elapsed;
            particle.life += elapsed;
            const progress = particle.life / particle.maxLife;
            const growth = easeInOut(progress);
            particle.size = particle.startSize + (particle.targetSize - particle.startSize) * growth;
            particle.opacity = getHeartOpacity(progress, particle.maxOpacity);
            if (particle.life >= particle.maxLife || particle.y + particle.size < 0) {
                heartParticles.splice(index, 1);
            }
        }

        if (!nextHeartSpawnAt) {
            heartParticles.push(createHeartParticle(face));
            heartParticles.push(createHeartParticle(face));
            nextHeartSpawnAt = timestamp + randomBetween(70, 100);
        } else if (timestamp >= nextHeartSpawnAt && heartParticles.length < 40) {
            const batchSize = Math.random() < 0.18 ? 2 : 1;
            for (let index = 0; index < batchSize && heartParticles.length < 40; index++) {
                heartParticles.push(createHeartParticle(face));
            }
            nextHeartSpawnAt = timestamp + randomBetween(70, 100);
        }
    }

    ctx.save();
    heartParticles.forEach(particle => {
        if (particle.opacity <= 0.005) return;

        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.translate(
            particle.x * transform.scale + transform.offsetX,
            particle.y * transform.scale + transform.offsetY
        );
        ctx.rotate(particle.rotation + particle.rotationSpeed * particle.life);
        ctx.drawImage(
            faceEffectAssets.hearts,
            particle.color * 100, 0, 100, 100,
            -particle.size * transform.scale / 2,
            -particle.size * transform.scale / 2,
            particle.size * transform.scale,
            particle.size * transform.scale
        );
        ctx.restore();
    });
    ctx.restore();
}

function createHeartParticle(face) {
    const { width, height } = face;
    const sideSpawn = Math.random() < 0.3;
    const offsetX = sideSpawn
        ? (Math.random() < 0.5 ? -1 : 1) * randomBetween(0.32, 0.46) * width
        : randomBetween(-0.32, 0.32) * width;
    const offsetY = sideSpawn
        ? -randomBetween(0.68, 0.84) * height
        : -randomBetween(0.72, 0.9) * height;
    const roll = face.roll || 0;
    const perspective = 1 - Math.min(0.18, Math.abs(face.yaw || 0) * 0.28);
    const rotatedX = offsetX * perspective * Math.cos(roll) - offsetY * Math.sin(roll);
    const rotatedY = offsetX * perspective * Math.sin(roll) + offsetY * Math.cos(roll);
    const color = Math.floor(Math.random() * HEART_SPRITE_FRAMES);
    const targetSize = Math.max(18, randomBetween(0.1, 0.17) * width);
    const startSize = targetSize * randomBetween(0.55, 0.76);
    const maxLife = randomBetween(1.8, 2.7);
    const particleX = face.x + rotatedX;
    const headTop = face.y - height * 0.58;
    const particleY = Math.min(face.y + rotatedY, headTop - height * 0.1);
    const maxRise = height * 0.3;
    const riseDistance = Math.min(maxRise, Math.max(6, particleY - headTop));

    return {
        x: particleX,
        y: particleY,
        velocityX: randomBetween(-0.045, 0.045) * width,
        riseSpeed: riseDistance / maxLife * randomBetween(0.92, 1),
        size: startSize,
        startSize,
        targetSize,
        opacity: 0,
        maxOpacity: randomBetween(0.48, 0.64),
        rotation: randomBetween(-0.12, 0.12),
        rotationSpeed: randomBetween(-0.035, 0.035),
        color,
        life: 0,
        maxLife
    };
}

function getHeartOpacity(progress, maxOpacity) {
    const fadeIn = smoothStep(progress / 0.18);
    const fadeOut = smoothStep((1 - progress) / 0.28);
    const midFlightOpacity = 0.82 + 0.18 * smoothStep((progress - 0.18) / 0.48);
    return maxOpacity * Math.min(fadeIn, fadeOut) * midFlightOpacity;
}

function easeInOut(value) {
    const progress = Math.max(0, Math.min(1, value));
    return progress * progress * (3 - 2 * progress);
}

function smoothStep(value) {
    const progress = Math.max(0, Math.min(1, value));
    return progress * progress * (3 - 2 * progress);
}

function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
}


//   COUNTDOWN


function countdown(sec) {

    return new Promise(resolve => {

        if (!countdownRingEl.childElementCount) {
            for (let index = 0; index < 48; index++) {
                const tick = document.createElement("span");
                tick.className = "countdown-tick";
                tick.style.setProperty("--tick-angle", `${index * 7.5}deg`);
                if (index % 4 === 0) tick.classList.add("is-major");
                countdownRingEl.appendChild(tick);
            }
        }

        const ticks = Array.from(countdownRingEl.children);
        const startTime = performance.now();
        const renderCountdown = () => {
            const elapsed = performance.now() - startTime;
            const remaining = sec - Math.floor(elapsed / 1000);
            countdownNumberEl.textContent = remaining;
            const clearedTickCount = Math.floor((elapsed % 1000) / 1000 * ticks.length);
            ticks.forEach((tick, index) => {
                tick.classList.toggle("is-active", index >= clearedTickCount);
            });

            return remaining;
        };

        countdownEl.classList.add("is-active");
        renderCountdown();
        const int = setInterval(() => {
            if (renderCountdown() <= 0) {
                clearInterval(int);
                countdownEl.classList.remove("is-active");
                countdownNumberEl.textContent = "";
                ticks.forEach(tick => tick.classList.remove("is-active"));
                resolve();
            }
        }, 16);

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
            `wednbooth_${++photoCount}.jpg`,
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

    captureSessionId++;
    photos = [];

    photosContainer.innerHTML = "";

    strip.classList.remove(
        "show",
        "grid-6"
    );
    clearPrintAnimation();

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

    const eyes = Array.from(document.querySelectorAll(".eye"));

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