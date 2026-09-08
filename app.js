const video = document.getElementById("camera");

const startBtn =
    document.getElementById("startCamera");

const stopBtn =
    document.getElementById("stopCamera");

const voiceBtn =
    document.getElementById("voiceBtn");

const voiceToggle =
    document.getElementById("voiceToggle");

const statusText =
    document.getElementById("status");

const canvas =
    document.getElementById("canvas");

const ctx =
    canvas.getContext("2d");


// ===============================
// DIRECTION ELEMENTS
// ===============================

const leftBox =
    document.getElementById("leftBox");

const aheadBox =
    document.getElementById("aheadBox");

const rightBox =
    document.getElementById("rightBox");


// ===============================
// VARIABLES
// ===============================

let model = null;

let stream = null;

let cameraStarted = false;

let voiceEnabled = true;

let lastMessage = "";

let lastSpokenTime = 0;

let detecting = false;


// ===============================
// RESET DIRECTION
// ===============================

function resetDirections() {

    leftBox.classList.remove("active");

    aheadBox.classList.remove("active");

    rightBox.classList.remove("active");
}


// ===============================
// SHOW DIRECTION
// ===============================

function showDirection(direction) {

    resetDirections();

    if (direction === "left") {

        leftBox.classList.add("active");

    }

    else if (direction === "right") {

        rightBox.classList.add("active");

    }

    else {

        aheadBox.classList.add("active");

    }
}


// ===============================
// VOICE FUNCTION
// ===============================

function speak(message) {

    if (!voiceEnabled) {
        return;
    }

    if (!("speechSynthesis" in window)) {
        return;
    }

    const now = Date.now();


    // Prevent repeated voice
    // messages

    if (
        message === lastMessage &&
        now - lastSpokenTime < 5000
    ) {
        return;
    }


    speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(
            message
        );


    speech.lang = "en-US";

    speech.rate = 0.9;

    speech.pitch = 1;


    speechSynthesis.speak(
        speech
    );


    lastMessage = message;

    lastSpokenTime = now;
}


// ===============================
// LOAD AI MODEL
// ===============================

async function loadAI() {

    try {

        statusText.textContent =
            "Loading AI model...";

        model =
            await cocoSsd.load();

        statusText.textContent =
            "AI model ready";

        resetDirections();

    }

    catch (error) {

        console.error(error);

        statusText.textContent =
            "AI model could not be loaded";

    }
}


// ===============================
// START CAMERA
// ===============================

startBtn.addEventListener(
    "click",
    async () => {

        try {

            if (cameraStarted) {

                statusText.textContent =
                    "Camera is already running";

                return;
            }


            stream =
                await navigator.mediaDevices
                .getUserMedia({

                    video: {
                        facingMode:
                            "environment"
                    },

                    audio: false

                });


            video.srcObject =
                stream;


            cameraStarted = true;


            statusText.textContent =
                "Camera active - Scanning";


            speak(
                "Camera started. Scanning surroundings."
            );

        }

        catch (error) {

            console.error(error);

            statusText.textContent =
                "Camera permission is required";

            speak(
                "Please allow camera permission."
            );

        }

    }
);


// ===============================
// STOP CAMERA
// ===============================

stopBtn.addEventListener(
    "click",
    () => {

        if (stream) {

            stream
                .getTracks()
                .forEach(track => {
                    track.stop();
                });

            stream = null;
        }


        video.srcObject = null;

        cameraStarted = false;

        detecting = false;


        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        resetDirections();


        statusText.textContent =
            "Camera stopped";


        speechSynthesis.cancel();


        lastMessage = "";

    }
);


// ===============================
// TEST VOICE
// ===============================

voiceBtn.addEventListener(
    "click",
    () => {

        if (!voiceEnabled) {

            voiceEnabled = true;

            voiceToggle.textContent =
                "🔊 Voice ON";
        }


        speechSynthesis.cancel();


        const speech =
            new SpeechSynthesisUtterance(
                "AI powered blind navigation assistant is ready."
            );


        speech.lang = "en-US";

        speech.rate = 0.9;


        speechSynthesis.speak(
            speech
        );

    }
);


// ===============================
// VOICE ON / OFF
// ===============================

voiceToggle.addEventListener(
    "click",
    () => {

        voiceEnabled =
            !voiceEnabled;


        if (voiceEnabled) {

            voiceToggle.textContent =
                "🔊 Voice ON";

            speak(
                "Voice guidance on"
            );

        }

        else {

            voiceToggle.textContent =
                "🔇 Voice OFF";

            speechSynthesis.cancel();

        }

    }
);


// ===============================
// AI OBJECT DETECTION
// ===============================

async function detectObjects() {

    if (
        !model ||
        !cameraStarted ||
        video.readyState < 2 ||
        detecting
    ) {
        return;
    }


    detecting = true;


    try {

        canvas.width =
            video.videoWidth;

        canvas.height =
            video.videoHeight;


        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        const predictions =
            await model.detect(video);


        // =========================
        // NO OBJECT
        // =========================

        if (
            predictions.length === 0
        ) {

            statusText.textContent =
                "Path looks clear";

            showDirection("ahead");

            detecting = false;

            return;
        }


        // =========================
        // DRAW OBJECT BOXES
        // =========================

        predictions.forEach(
            prediction => {

                const [
                    x,
                    y,
                    width,
                    height
                ] =
                    prediction.bbox;


                ctx.strokeStyle =
                    "red";

                ctx.lineWidth = 3;


                ctx.strokeRect(
                    x,
                    y,
                    width,
                    height
                );


                ctx.font =
                    "18px Arial";

                ctx.fillStyle =
                    "red";


                ctx.fillText(

                    `${prediction.class} ${(prediction.score * 100).toFixed(0)}%`,

                    x,

                    y > 25
                        ? y - 5
                        : y + 20
                );

            }
        );


        // =========================
        // MOST CONFIDENT OBJECT
        // =========================

        const object =
            predictions[0];


        const [
            x,
            y,
            width,
            height
        ] =
            object.bbox;


        const center =
            x + width / 2;


        const screenCenter =
            video.videoWidth / 2;


        // =========================
        // CLOSE OBJECT
        // =========================

        const closeObject =
            width >
                video.videoWidth * 0.35 ||

            height >
                video.videoHeight * 0.45;


        // =========================
        // DIRECTION DECISION
        // =========================

        if (closeObject) {

            statusText.textContent =
                `${object.class} detected - Be careful`;

            showDirection("ahead");

            speak(
                `${object.class} ahead. Be careful.`
            );

        }


        // OBJECT LEFT

        else if (
            center <
            screenCenter - 100
        ) {

            statusText.textContent =
                `${object.class} detected - Move right`;

            showDirection("left");

            speak(
                `${object.class} ahead. Move right.`
            );

        }


        // OBJECT RIGHT

        else if (
            center >
            screenCenter + 100
        ) {

            statusText.textContent =
                `${object.class} detected - Move left`;

            showDirection("right");

            speak(
                `${object.class} ahead. Move left.`
            );

        }


        // OBJECT AHEAD

        else {

            statusText.textContent =
                `${object.class} ahead - Be careful`;

            showDirection("ahead");

            speak(
                `${object.class} ahead. Be careful.`
            );

        }

    }

    catch (error) {

        console.error(
            "Detection error:",
            error
        );

    }


    detecting = false;
}


// ===============================
// RUN DETECTION
// ===============================

setInterval(
    detectObjects,
    1500
);


// ===============================
// START AI
// ===============================

loadAI();