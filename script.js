/* --- VARIABLES & ELEMENTS --- */
const video = document.getElementById("video");
const strip = document.getElementById("strip");
const countdownEl = document.getElementById("countdown");

const captureBtn = document.getElementById("captureBtn");
const statusText = document.getElementById("status");

const layoutBtn = document.getElementById("layoutBtn");
const filterBtn = document.getElementById("filterBtn");
const timerBtn = document.getElementById("timerBtn");

const downloadJPG = document.getElementById("downloadJPG");
const downloadGIF = document.getElementById("downloadGIF");
const resetBtn = document.getElementById("reset");

const bgColor = document.getElementById("bgColor");

let layout = 1;
let timer = 0;
let currentFilter = "none";
let photos = [];

const shutter = new Audio("https://www.soundjay.com/mechanical/camera-shutter-click-01.mp3");

/* --- DROPDOWN CONTROL --- */
function closeAllDropdowns() {
    document.querySelectorAll(".dropdown").forEach(d => d.style.display = "none");
}

function toggleMenu(id) {
    const menu = document.getElementById(id);
    const isOpen = menu.style.display === "block";

    closeAllDropdowns();
    if (!isOpen) menu.style.display = "block";
}

window.addEventListener("click", function(e) {
    if (!e.target.closest(".btn-group")) {
        closeAllDropdowns();
    }
});

/* --- SET OPTIONS --- */
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

/* --- SET FILTER --- */
function setFilter(val, name) {

    currentFilter = val;

    // preview realtime
    if (val === "bw") {
        video.style.filter = "grayscale(100%)";
    }

    else if (val === "sepia") {
        video.style.filter = "sepia(100%)";
    }

    else if (val === "bright") {
        video.style.filter = "brightness(150%)";
    }

    else if (val === "contrast") {
        video.style.filter = "contrast(120%)";
    }

    else if (val === "vintage") {
        video.style.filter = "sepia(50%) brightness(105%) contrast(110%)";
    }

    else if (val === "soft") {
        video.style.filter = "blur(2px) brightness(130%)";
    }

    else {
        video.style.filter = "none";
    }

    filterBtn.innerText = "✦ Filter: " + name;

    closeAllDropdowns();
}

function setTimer(val, name) {
    timer = val;
    timerBtn.innerText = "⏱ Timer: " + name;
    closeAllDropdowns();
}

/* --- BACKGROUND PREVIEW --- */
bgColor.oninput = () => {
    strip.style.background = bgColor.value;
};

/* --- CAPTURE PROCESS --- */
captureBtn.onclick = async () => {
    document.getElementById("photosContainer").innerHTML = "";
    // Reset layout
    strip.classList.remove("show", "grid-6");
    photos = [];

    for (let i = 0; i < layout; i++) {
        if (timer > 0) {
            await countdown(timer);
        }

        // Play shutter sound
        shutter.currentTime = 0;
        shutter.play().catch(() => {});

        // Delay sedikit agar suara sinkron dengan capture
        await wait(150);

        capture();

        statusText.innerText = `${i + 1}/${layout} photo(s) captured`;
        await wait(800);
    }

    strip.style.background = bgColor.value;

    // Apply grid 6 foto
    if (layout === 6) {
        strip.classList.add("grid-6");
    }

    strip.classList.add("show");
};

/* --- CAPTURE PHOTO --- */
function capture() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // MIRROR CAMERA
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // gambar asli dulu
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    ctx.restore();

    // ambil pixel image
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    // ===== FILTER MANUAL IOS SAFE =====

    // B&W
    if (currentFilter === "bw") {
        for (let i = 0; i < data.length; i += 4) {
            let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

            data[i] = avg;
            data[i + 1] = avg;
            data[i + 2] = avg;
        }
    }

    // SEPIA
    else if (currentFilter === "sepia") {
        for (let i = 0; i < data.length; i += 4) {

            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            data[i] = (r * .393) + (g *.769) + (b * .189);
            data[i + 1] = (r * .349) + (g *.686) + (b * .168);
            data[i + 2] = (r * .272) + (g *.534) + (b * .131);
        }
    }

    // BRIGHT
    else if (currentFilter === "bright") {
        for (let i = 0; i < data.length; i += 4) {

            data[i] += 20;
            data[i + 1] += 20;
            data[i + 2] += 20;
        }
    }

    // CONTRAST
    else if (currentFilter === "contrast") {

        const contrast = 40;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {

            data[i] = factor * (data[i] - 128) + 128;
            data[i + 1] = factor * (data[i + 1] - 128) + 128;
            data[i + 2] = factor * (data[i + 2] - 128) + 128;
        }
    }

    // VINTAGE
    else if (currentFilter === "vintage") {

        for (let i = 0; i < data.length; i += 4) {

            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            data[i] = r * 1.1;
            data[i + 1] = g * 1.0;
            data[i + 2] = b * 0.8;
        }
    }

    // SOFT
    else if (currentFilter === "soft") {

        for (let i = 0; i < data.length; i += 4) {

            data[i] += 10;
            data[i + 1] += 10;
            data[i + 2] += 10;
        }
    }

    // masukkan kembali pixel
    ctx.putImageData(imageData, 0, 0);

    // convert image
    const finalImage = canvas.toDataURL("image/png");

    photos.push(finalImage);

    // preview
    const img = document.createElement("img");
    img.src = finalImage;

    document.getElementById("photosContainer").appendChild(img);
}

/* --- UTILS --- */
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
    return new Promise(r => setTimeout(r, ms));
}

function loadImage(src) {
    return new Promise(res => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => res(img);
    });
}

/**
 * Menggambar gambar dengan sudut melengkung (rounded corners) pada canvas
 */
function drawRoundedImage(ctx, img, x, y, width, height, radius) {
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

/* --- STRIP GENERATION --- */
async function createStrip(images) {
    const imgs = await Promise.all(images.map(loadImage));
    const padding = 40;
    const gap = 40;
    const logoSpace = 120;
    const cornerRadius = 30;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const w = imgs[0].width;
    const h = imgs[0].height;

    if (layout === 6) {
        // GRID 2x3
        canvas.width = (w * 2) + gap + (padding * 2);
        canvas.height = (h * 3) + (gap * 2) + (padding * 2) + logoSpace;

        ctx.fillStyle = bgColor.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        imgs.forEach((img, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = padding + col * (w + gap);
            const y = padding + row * (h + gap);
            drawRoundedImage(ctx, img, x, y, w, h, cornerRadius);
        });
    } else {
        // SINGLE STRIP (1, 2, 3, 4 foto)
        canvas.width = w + (padding * 2);
        canvas.height = (h * imgs.length) + (gap * (imgs.length - 1)) + (padding * 2) + logoSpace;

        ctx.fillStyle = bgColor.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        imgs.forEach((img, i) => {
            const x = padding;
            const y = padding + i * (h + gap);
            drawRoundedImage(ctx, img, x, y, w, h, cornerRadius);
        });
    }

    return canvas;
}

/* --- EXPORT / DOWNLOAD --- */
downloadJPG.onclick = async () => {
    if (!photos.length) {
        alert("Ambil foto dulu!");
        return;
    }

    statusText.innerText = "Generating image...";

    try {
        const canvas = await createStrip(photos);
        const ctx = canvas.getContext("2d");

        const loadLogo = () => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = "LOGO.png";
                img.onload = () => resolve(img);
                img.onerror = () => {
                    console.warn("Logo gagal dimuat.");
                    resolve(null);
                };
            });
        };

        const logo = await loadLogo();

        if (logo) {
            const logoWidth = 150;
            const logoHeight = (logo.height / logo.width) * logoWidth;
            const xPos = (canvas.width - logoWidth) / 2;
            const yPos = canvas.height - logoHeight - 15;
            ctx.drawImage(logo, xPos, yPos, logoWidth, logoHeight);
        }

        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `wednbooth_${Date.now()}.png`;
        link.click();

        statusText.innerText = "Download success!";
    } catch (err) {
        console.error(err);
        alert("Download Failed: " + err.message);
    }
};

downloadGIF.onclick = async () => {
    if (!photos.length) {
        alert("Belum ada foto!");
        return;
    }

    statusText.innerText = "Processing GIF...";

    const frames = [];
    let firstWidth = 0;
    let firstHeight = 0;

    for (let i = 0; i < photos.length; i++) {
        const img = await loadImage(photos[i]);

        if (i === 0) {
            firstWidth = img.width;
            firstHeight = img.height;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = firstWidth;
        canvas.height = firstHeight;

        ctx.drawImage(img, 0, 0, firstWidth, firstHeight);
        frames.push(canvas.toDataURL("image/png"));
    }

    gifshot.createGIF({
        images: frames,
        interval: 0.7,
        gifWidth: firstWidth,
        gifHeight: firstHeight
    }, function(obj) {
        if (!obj.error) {
            const a = document.createElement("a");
            a.href = obj.image;
            a.download = "wednbooth.gif";
            a.click();
            statusText.innerText = "GIF created!";
        } else {
            console.error(obj.error);
            statusText.innerText = "Failed to create GIF";
        }
    });
};

/* --- RESET --- */
resetBtn.onclick = () => {
    photos = [];
    document.getElementById("photosContainer").innerHTML = "";
    statusText.innerText = "Reset selesai";
};

/* =========================================
   HOMEPAGE → PHOTOBOOTH
   ========================================= */

const homePage = document.getElementById("homePage");
const photoboothApp = document.getElementById("photoboothApp");
const startBtn = document.getElementById("startBtn");

let cameraStream = null;

async function startCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true
        });

        video.srcObject = cameraStream;
        statusText.innerText = "Camera ready";

    } catch (error) {
        console.error("Camera error:", error);

        statusText.innerText = "Camera tidak dapat diakses";

        alert(
            "Kamera tidak dapat diakses. " +
            "Pastikan kamu sudah memberikan izin kamera pada browser."
        );
    }
}

startBtn.addEventListener("click", async function () {

    // Sembunyikan homepage
    homePage.classList.add("hide");

    // Tampilkan photobooth
    setTimeout(async () => {

        photoboothApp.classList.add("active");

        // Baru aktifkan kamera setelah START
        await startCamera();

    }, 300);

});
