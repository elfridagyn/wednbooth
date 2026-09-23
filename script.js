/* =========================================================
   VARIABLES & ELEMENTS
   ========================================================= */

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

/* =========================================================
   PLATFORM DETECTION

   Dipakai untuk dua hal yang perilakunya beda-beda di iOS,
   Android, dan Windows: (1) fallback saat backdrop-filter/
   getUserMedia constraint lanjutan gagal, dan (2) cara
   men-download hasil foto/GIF (lihat downloadDataUrl()).
   ========================================================= */

function isIOS() {

    // iPhone/iPod/iPad "klasik", plus iPadOS 13+ yang menyamar
    // sebagai "MacIntel" tapi punya touch points (beda dari Mac
    // asli yang maxTouchPoints-nya 0).
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


/*
   SATU-SATUNYA SUMBER KEBENARAN untuk semua filter.

   Dipakai untuk:
   - preview swatch di dropdown Filter (lihat initFilterPreviews())
   - preview realtime di kamera (video.style.filter)
   - hasil capture di canvas (ctx.filter)

   Sebelumnya nilai di sini beda dengan filter yang di-hardcode lewat
   class CSS .preview-box.contrast / .vintage / .soft di style.css
   (mis. contrast 120% vs 150%, vintage sepia 50% vs 60%, soft
   brightness 130% vs 140%), jadi swatch di menu Filter menampilkan
   preview yang TIDAK SAMA dengan hasil asli di kamera & foto.
   Sekarang cuma ada satu tempat (object ini) yang menentukan nilai
   filter, dipakai ulang di tiga tempat itu, supaya selalu konsisten.
*/
const filterCSSMap = {
    none: "none",
    bw: "grayscale(100%)",
    sepia: "sepia(100%)",
    bright: "brightness(150%)",
    contrast: "contrast(120%)",
    vintage: "sepia(50%) brightness(105%) contrast(110%)",
    soft: "blur(2px) brightness(130%)"
};


/*
   Terapkan filterCSSMap ke setiap swatch preview di dropdown Filter
   (elemen .preview-box dengan atribut data-filter="..."), supaya
   swatch-nya otomatis selalu sama persis dengan filter yang benar-
   benar dipakai di video & hasil foto. Kalau suatu saat nilai filter
   di filterCSSMap diubah, swatch ikut berubah tanpa perlu sentuh CSS.
*/
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


/* =========================================================
   HOMEPAGE → PHOTOBOOTH
   ========================================================= */

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

        // Preferensi: kamera depan, resolusi ideal 16:9. Kalau device/
        // browser (terutama Android lama & beberapa webcam Windows)
        // menolak constraint selengkap ini, fallback ke video: true.
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

        // Safari (iOS & desktop) kadang butuh play() eksplisit setelah
        // srcObject di-set, walau ada atribut autoplay di HTML.
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

        // Buka "kunci" autoplay audio di iOS Safari & beberapa browser
        // Android dengan memutar (lalu langsung menjeda) suara shutter
        // di dalam gesture klik pengguna yang pertama.
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


/* =========================================================
   DROPDOWN CONTROL
   ========================================================= */

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


/* =========================================================
   LAYOUT
   ========================================================= */

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


/* =========================================================
   FILTER
   ========================================================= */

function setFilter(val, name) {

    currentFilter = val;

    /*
       Preview realtime di kamera, diambil dari filterCSSMap yang
       sama persis dipakai swatch (initFilterPreviews) dan capture().
       Diset lewat dua properti (filter & webkitFilter) supaya tetap
       jalan di WebView Android/Windows lama yang masih butuh prefix.
    */
    const cssValue = filterCSSMap[val] || "none";

    video.style.filter = cssValue;
    video.style.webkitFilter = cssValue;

    filterBtn.innerText = "✦ Filter: " + name;

    closeAllDropdowns();

}


/* =========================================================
   TIMER
   ========================================================= */

function setTimer(val, name) {

    timer = val;

    timerBtn.innerText = "⏱ Timer: " + name;

    closeAllDropdowns();

}


/* =========================================================
   FRAME SYSTEM
   ========================================================= */


/*
   Apply frame ke preview HTML.
   Ini hanya untuk tampilan di website.
*/

function applyFramePreview() {

    if (!strip) return;


    if (currentFramePattern) {

        strip.style.backgroundColor = "#ffffff";

        strip.style.backgroundImage =
            `url("${currentFramePattern}")`;

        // Sebelumnya "repeat" + "auto" -> motif di-tile berulang dan
        // kelihatan "dobel"/terpotong kalau gambar polanya kecil
        // dibanding ukuran strip. Sekarang di-zoom (cover) supaya
        // satu motif utuh menutupi seluruh strip, sama seperti hasil
        // download (lihat drawFrameBackground()).
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


/*
   Custom color

   Sebelumnya custom color pakai <input type="color"> bawaan browser,
   yang cuma bisa dibuka lewat klik (harus klik lagi tiap mau ganti
   warna, tidak bisa "digeser-geser" cari warna yang pas). Sekarang
   diganti dua slider (Hue + Lightness) yang bisa digeser langsung
   di dalam dropdown Frame, live update warnanya sambil di-drag.
*/

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


/*
   Sinkronkan warna terpilih (dari mana pun sumbernya) ke swatch
   "Custom" di grid warna, supaya selalu ada preview lingkaran
   yang menunjukkan warna aktif saat ini.
*/

function syncCustomSwatch(color) {

    if (customColorSwatch) {
        customColorSwatch.style.background = color;
    }

}


/*
   Update gradasi slider Lightness supaya mengikuti Hue yang lagi
   dipilih (dari hitam -> warna hue -> putih), jadi lebih gampang
   nyari warna yang pas.
*/

function updateLightSliderGradient() {

    if (!hueSlider || !lightSlider) return;

    const h = hueSlider.value;

    lightSlider.style.background =
        `linear-gradient(to right, #000000, hsl(${h}, 85%, 50%), #ffffff)`;

}


/*
   Dipanggil tiap slider digeser (live, tanpa menutup dropdown
   supaya proses geser tidak terputus).
*/

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


/*
   Buka/tutup panel slider. Ditaruh langsung di sebelah pilihan
   warna (bukan section terpisah lagi).
*/

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

    // touchstart dicegat juga: di iOS/Android, tap pertama di slider
    // kadang ikut kebaca sebagai klik di window (lihat listener
    // window "click" di atas) dan menutup dropdown Frame sebelum
    // sempat menggeser slider.
    hueSlider.addEventListener("touchstart", e => e.stopPropagation());

}

if (lightSlider) {

    lightSlider.addEventListener("input", applyCustomColorFromSliders);

    lightSlider.addEventListener("click", e => e.stopPropagation());

    lightSlider.addEventListener("touchstart", e => e.stopPropagation());

}

updateLightSliderGradient();


/*
   Frame motif
*/

function setFramePattern(pattern, name) {

    currentFramePattern = pattern;

    applyFramePreview();

    if (frameBtn) {
        frameBtn.innerText = "🖼 Frame: " + name;
    }

    closeAllDropdowns();

}


/* =========================================================
   CAPTURE PROCESS
   ========================================================= */

captureBtn.onclick = async () => {

    if (!video.srcObject) {

        alert("Kamera belum aktif.");

        return;

    }


    photosContainer.innerHTML = "";

    strip.classList.remove("show", "grid-6", "printed");

    photos = [];


    captureBtn.disabled = true;


    /*
       Terapkan frame & layout grid SEBELUM foto pertama diambil,
       supaya begitu foto pertama muncul, tampilan strip (warna/
       motif frame, grid 2 kolom untuk layout 6) sudah rapi dari awal.
    */

    applyFramePreview();

    if (layout === 6) {

        strip.classList.add("grid-6");

    }


    try {

        for (let i = 0; i < layout; i++) {

            if (timer > 0) {

                await countdown(timer);

            }


            /* Shutter sound. Sudah "di-unlock" sejak tombol START
               ditekan, jadi play() di sini seharusnya jalan normal
               di iOS/Android; kalau tetap gagal (mis. mode senyap
               di iOS Safari lama), diamkan saja tanpa mengganggu
               proses capture. */

            shutter.currentTime = 0;

            shutter.play().catch(() => {});


            await wait(150);


            capture();


            /*
               Tampilkan strip begitu foto PERTAMA selesai diambil
               (fade-in biasa lewat class "show"). Foto ke-2, ke-3,
               dst langsung menyusul muncul satu-satu di strip yang
               sudah kelihatan, masing-masing dengan animasi pop kecil
               (lihat #photosContainer img di style.css).
            */

            if (!strip.classList.contains("show")) {

                strip.classList.add("show");

            }


            statusText.innerText =
                `${i + 1}/${layout} photo(s) captured`;


            await wait(800);

        }


        /*
           Animasi "keluar dari kamera / keprint" baru dimainkan
           SEKARANG, setelah SEMUA foto pada layout ini selesai
           di-preview -- bukan di foto pertama.
        */

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


/* =========================================================
   CAPTURE PHOTO
   ========================================================= */

function capture() {

    const canvas = document.createElement("canvas");

    const ctx = canvas.getContext("2d");


    /*
       FORCE LANDSCAPE OUTPUT.

       Di HP Android, kamera depan yang dipegang portrait sering
       ngasih stream video yang portrait juga (mis. 720x1280),
       walaupun constraint yang diminta di startCamera() sudah
       width:1280/height:720. Preview di layar kelihatan landscape
       cuma karena CSS "object-fit: cover" motong tampilannya --
       tapi video.videoWidth/videoHeight aslinya tetap portrait,
       jadi kalau digambar mentah-mentah ke canvas, hasil foto
       ikut portrait.

       Solusinya: crop area TENGAH dari video asli ke rasio target
       (16:9 landscape) SEBELUM digambar ke canvas, apa pun
       orientasi videoWidth/videoHeight aslinya. Ini menjamin hasil
       jepretan selalu landscape, konsisten di iOS/Android/Windows.
    */

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const targetRatio = 16 / 9;

    let sx, sy, sw, sh;

    if (vw / vh > targetRatio) {

        // Frame lebih lebar dari target -> crop kiri-kanan.
        sh = vh;
        sw = vh * targetRatio;
        sx = (vw - sw) / 2;
        sy = 0;

    } else {

        // Frame lebih tinggi dari target (kasus umum di Android saat
        // dipegang portrait) -> crop atas-bawah supaya jadi landscape.
        sw = vw;
        sh = vw / targetRatio;
        sx = 0;
        sy = (vh - sh) / 2;

    }

    canvas.width = sw;
    canvas.height = sh;


    /*
       MIRROR CAMERA + TERAPKAN FILTER.

       ctx.filter memakai string yang SAMA PERSIS dengan filterCSSMap
       (satu-satunya sumber kebenaran, dipakai juga oleh video preview
       dan swatch di dropdown Filter), jadi hasil foto selalu sesuai
       dengan yang dilihat di kamera dan di preview filter.
    */

    ctx.save();

    ctx.translate(canvas.width, 0);

    ctx.scale(-1, 1);

    ctx.filter = filterCSSMap[currentFilter] || "none";

    ctx.drawImage(
        video,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.restore();


    /*
       Convert image
    */

    const finalImage =
        canvas.toDataURL("image/png");


    photos.push(finalImage);


    /*
       Preview
    */

    const img =
        document.createElement("img");

    img.src = finalImage;

    photosContainer.appendChild(img);

}


/* =========================================================
   COUNTDOWN
   ========================================================= */

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


/* =========================================================
   WAIT
   ========================================================= */

function wait(ms) {

    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );

}


/* =========================================================
   LOAD IMAGE
   ========================================================= */

function loadImage(src) {

    /*
       PENTING: jangan set img.crossOrigin = "anonymous" di sini.

       Semua gambar yang dimuat lewat fungsi ini (foto hasil capture
       berupa data URL, DAN gambar pattern frame di folder frames/)
       adalah aset lokal / satu origin, bukan gambar dari domain lain.

       Kalau crossOrigin dipaksa "anonymous", browser memperlakukan
       pemuatan gambar itu sebagai request CORS. Untuk gambar lokal
       (apalagi kalau file HTML dibuka langsung lewat file:// tanpa
       server), request CORS ini akan GAGAL total (img.onerror
       terpicu), padahal gambar yang sama tampil normal kalau dipakai
       biasa lewat tag <img> di halaman (seperti thumbnail pattern di
       menu Frame). Inilah sebab "Download Failed" muncul khusus saat
       frame pattern dipilih, sementara frame warna solid (yang tidak
       perlu memuat gambar apa pun) tetap berhasil.
    */

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


/* =========================================================
   ROUNDED IMAGE
   ========================================================= */

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


/* =========================================================
   DRAW FRAME BACKGROUND
   ========================================================= */

async function drawFrameBackground(ctx, width, height) {

    /*
       SOLID COLOR
    */

    if (!currentFramePattern) {

        ctx.fillStyle = currentFrameColor;

        ctx.fillRect(0, 0, width, height);

        return;

    }


    /*
       PATTERN

       Gambar di-zoom & crop dari tengah supaya satu motif utuh
       menutupi seluruh kanvas tanpa diulang (repeat) -- persis
       seperti CSS "background-size: cover" yang dipakai di preview.
    */

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


/* =========================================================
   CREATE PHOTO STRIP (sama persis dengan preview)

   Percobaan sebelumnya pakai html2canvas untuk "memotret" elemen
   #strip langsung -- tapi untuk foto beresolusi tinggi dari kamera,
   html2canvas kadang diam-diam GAGAL menggambar ulang <img>-nya
   (kena timeout decode), sehingga hasil akhirnya cuma bingkai +
   logo tanpa foto sama sekali.

   Sekarang posisi & ukuran tiap foto (dan logo) DIUKUR LANGSUNG dari
   elemen yang sedang tampil di preview (getBoundingClientRect),
   lalu diskalakan ke resolusi asli kamera dan digambar manual ke
   kanvas. Ini menjamin proporsi hasil download identik dengan
   preview (karena diukur dari DOM yang sama), tanpa bergantung pada
   proses decode-ulang gambar oleh library luar yang bisa gagal.
   ========================================================= */

async function createStrip() {

    const displayedPhotoImgs =
        Array.from(photosContainer.querySelectorAll("img"));

    if (!displayedPhotoImgs.length) {

        throw new Error("Belum ada foto di strip.");

    }


    // Skala pembesar: dari ukuran tampilan di layar (kecil, mis.
    // 150px) ke resolusi asli kamera (mis. 1280px), supaya foto
    // tetap tajam saat di-download.
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


    // Bingkai (warna solid / motif cover) mengisi seluruh kanvas,
    // sama seperti background elemen #strip di preview.
    await drawFrameBackground(ctx, canvas.width, canvas.height);


    // Tiap foto digambar TEPAT di posisi & ukuran yang terlihat di
    // layar (relatif terhadap strip), hanya diskalakan lebih besar.
    // Digambar langsung dari elemen <img> yang sudah termuat di
    // halaman -- bukan dimuat ulang -- jadi tidak ada risiko gagal
    // decode seperti pada html2canvas.
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


    // Logo di bagian bawah strip -- diukur & digambar dengan cara
    // yang sama, termasuk opacity-nya, supaya identik dengan preview.
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

/* =========================================================
   DOWNLOAD HELPER (cross-platform)

   Masalahnya: atribut <a download> TIDAK bisa diandalkan di
   Safari iOS untuk data URL (dan di banyak versi lama malah
   membuka gambar di tab baru alih-alih menyimpan). Di Android
   Chrome dan Windows (Chrome/Edge/Firefox) atribut download
   berfungsi normal.

   Solusinya:
   - iOS  -> buka hasil di tab baru; pengguna tekan & tahan
             gambar lalu "Simpan ke Foto" (perilaku native iOS,
             paling konsisten di semua versi Safari).
   - lainnya (Android, Windows, desktop) -> pakai Blob + elemen
             <a download>, yang lebih hemat memori daripada data
             URL raksasa untuk GIF dan lebih konsisten daripada
             data URL langsung di beberapa WebView Android.
   ========================================================= */

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

function downloadDataUrl(dataUrl, filename) {

    if (isIOS()) {

        const win = window.open(dataUrl, "_blank");

        if (!win) {

            alert(
                "Pop-up diblokir. Izinkan pop-up untuk situs ini lalu " +
                "coba download lagi, atau screenshot hasilnya."
            );

        } else {

            statusText.innerText =
                "Tekan & tahan gambar, lalu pilih \"Simpan ke Foto\"";

        }

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

        // Beri sedikit jeda sebelum revoke supaya browser (terutama
        // beberapa versi Android WebView) sempat memulai unduhan.
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


/* =========================================================
   DOWNLOAD JPG
   ========================================================= */

downloadJPG.onclick = async () => {

    if (!photos.length) {

        alert("Ambil foto dulu!");

        return;

    }


    statusText.innerText =
        "Generating image...";


    try {

        /*
           Ambil layout persis dari elemen #strip yang sedang tampil
           di preview -- lihat komentar di createStrip() untuk alasan
           kenapa ini menggantikan pendekatan html2canvas yang
           sebelumnya gagal menggambar foto beresolusi besar.
        */

        const canvas =
            await createStrip();


        /*
           Download

           Sebelumnya tombol ini bertuliskan "Download JPG" tapi
           file yang diunduh sebenarnya PNG (image/png, ekstensi
           .png). Sekarang benar-benar diekspor sebagai JPEG, dan
           proses unduhnya lewat downloadDataUrl() supaya berjalan
           benar juga di iOS Safari (lihat komentar di helper itu).
        */

        downloadDataUrl(
            canvas.toDataURL("image/jpeg", 0.92),
            `wednbooth_${Date.now()}.jpg`
        );


    }

    catch (err) {

        console.error(err);

        alert(
            "Download Failed: " +
            err.message
        );

        statusText.innerText =
            "Download failed";

    }

};


/* =========================================================
   DOWNLOAD GIF
   ========================================================= */

downloadGIF.onclick = async () => {

    if (!photos.length) {

        alert("Belum ada foto!");

        return;

    }


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

                downloadDataUrl(obj.image, "wednbooth.gif");

                statusText.innerText = isIOS()
                    ? statusText.innerText
                    : "GIF created!";

            }

            else {

                console.error(
                    obj.error
                );

                statusText.innerText =
                    "Failed to create GIF";

            }

        });

    }

    catch (error) {

        console.error(error);

        statusText.innerText =
            "GIF failed";

        alert(
            "GIF gagal dibuat: " +
            error.message
        );

    }

};


/* =========================================================
   RESET

   Sebelumnya bagian ini menduplikasi logic yang sudah ada di
   setFrameColor(), setFilter(), setLayout(), dan setTimer(),
   jadi kalau salah satu fungsi itu diubah, reset bisa jadi
   tidak sinkron. Sekarang reset cukup memanggil ulang
   fungsi-fungsi tersebut supaya satu sumber kebenaran.
   ========================================================= */

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


/* =========================================================
   CLEANUP SAAT TAB DITUTUP / DI-REFRESH

   Melepas track kamera secara eksplisit. Di beberapa browser
   Android & Windows, kamera bisa "nyangkut aktif" (lampu
   indikator tetap menyala) kalau stream tidak di-stop manual
   sebelum halaman ditinggalkan.
   ========================================================= */

window.addEventListener("pagehide", () => {

    if (cameraStream) {

        cameraStream.getTracks().forEach(track => track.stop());

    }

});


/* =========================================================
   INITIAL FRAME
   ========================================================= */

applyFramePreview();