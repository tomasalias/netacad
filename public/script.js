let stream = null;
let intervalId = null;
const btn = document.getElementById("toggleShare");
const video = document.getElementById("screenVideo");

btn.onclick = async () => {
    if (!stream) {
        startSharing();
    } else {
        stopSharing();
    }
};

async function startSharing() {
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: true
        });

        video.srcObject = stream;
        btn.textContent = "Stop Screen Sharing";

        intervalId = setInterval(takeScreenshotAndSend, 10000);

    } catch (err) {
        console.error("Screen share error:", err);
        alert("Failed to start screen sharing.");
    }
}

function stopSharing() {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    btn.textContent = "Start Screen Sharing";
    video.srcObject = null;

    clearInterval(intervalId);
}

let lastScreenshotBase64 = null;
let currentAnswerPosition = 1;

async function takeScreenshotAndSend() {
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const bitmap = await imageCapture.grabFrame();

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);

    const base64 = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
    lastScreenshotBase64 = base64;
    currentAnswerPosition = 1;

    const response = await fetch("/process-image", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ image: base64 })
    });

    const data = await response.json();

    if (data.result) {
        await handleAnswerResponse(data.result);
    }
}

async function handleAnswerResponse(result) {
    console.log("Gemini response:", result);

    const match = result.match(/\{(\d+)\}/);
    const answerText = match ? result.replace(/\s*\{\d+\}\s*$/, "") : result;

    if (answerText.length > 32) {
        await displayAnswerInChunks(answerText);
    } else {
        document.title = answerText;
    }

    if (match) {
        const remainingCount = parseInt(match[1]);
        console.log(`${remainingCount} more answers available`);

        await new Promise(resolve => setTimeout(resolve, 5000));

        currentAnswerPosition++;
        await getNextAnswer();
    }
}

async function displayAnswerInChunks(text) {
    const chunkSize = 32;
    const chunks = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
    }

    for (let i = 0; i < chunks.length; i++) {
        document.title = chunks[i];
        if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function getNextAnswer() {
    if (!lastScreenshotBase64) return;

    const response = await fetch("/get-answer-by-position", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            image: lastScreenshotBase64,
            position: currentAnswerPosition
        })
    });

    const data = await response.json();

    if (data.result) {
        await handleAnswerResponse(data.result);
    }
}
