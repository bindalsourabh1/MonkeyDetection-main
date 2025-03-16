const URL = "https://teachablemachine.withgoogle.com/models/9gK52-xqR/";
let model, webcam, resultContainer, maxPredictions;
let audioContext, oscillator, gainNode;
let soundEnabled = true;
let lastResult = "";
let frequency = 1000; // Default frequency in Hz
let volume = 0.5; // Default volume (0-1)
let detectionThreshold = 0.5; // Default detection threshold (0-1)
let isRunning = false;
let animationFrameId = null;
let isAlertPlaying = false; // Track if alert is currently playing

// Initialize UI elements
const monkeyBar = document.getElementById('monkey-bar');
const notMonkeyBar = document.getElementById('notmonkey-bar');
const monkeyProb = document.getElementById('monkey-probability');
const notMonkeyProb = document.getElementById('notmonkey-probability');
const resultText = document.getElementById('result-text');
const statusIndicator = document.getElementById('status-indicator');
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");

// Initialize audio context
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Initialize display values
    updateFrequencyDisplay();
    updateVolumeDisplay();
    updateThresholdDisplay();
}

// Stop detection function
function stopDetection() {
    if (!isRunning) return;
    
    isRunning = false;
    if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    if (webcam) {
        webcam.stop();
    }
    
    // Stop any playing alert
    stopMonkeyAlert();
    
    // Reset UI
    startBtn.disabled = false;
    startBtn.classList.remove("opacity-50", "cursor-not-allowed");
    startBtn.textContent = "Start Camera";
    
    stopBtn.disabled = true;
    stopBtn.classList.add("opacity-50", "cursor-not-allowed");
    
    // Remove webcam canvas
    const webcamContainer = document.getElementById("webcam-container");
    while (webcamContainer.firstChild) {
        if (webcamContainer.firstChild.id === "camera-placeholder") break;
        webcamContainer.removeChild(webcamContainer.firstChild);
    }
    
    // Show placeholder
    document.getElementById("camera-placeholder").style.display = "flex";
    
    // Hide status indicator
    statusIndicator.classList.add("hidden");
    
    // Reset result
    resultText.textContent = "Detection stopped";
    resultText.className = "text-lg font-medium text-natural-700";
    monkeyBar.style.width = "0%";
    notMonkeyBar.style.width = "0%";
    monkeyProb.textContent = "0%";
    notMonkeyProb.textContent = "0%";
}

// Toggle sound on/off
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('sound-toggle').addEventListener('change', function() {
        soundEnabled = this.checked;
        const soundStatus = document.getElementById('sound-status');
        
        if (soundEnabled) {
            soundStatus.textContent = "Enabled";
            soundStatus.className = "ml-2 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-600 rounded-full";
            this.nextElementSibling.classList.remove('bg-natural-300');
            this.nextElementSibling.classList.add('bg-primary-500');
            this.nextElementSibling.nextElementSibling.classList.add('translate-x-7');
            
            // If a monkey is currently detected, restart alert
            if (lastResult === "Monkey") {
                startMonkeyAlert();
            }
        } else {
            soundStatus.textContent = "Disabled";
            soundStatus.className = "ml-2 px-2 py-0.5 text-xs font-medium bg-natural-200 text-natural-600 rounded-full";
            this.nextElementSibling.classList.add('bg-natural-300');
            this.nextElementSibling.classList.remove('bg-primary-500');
            this.nextElementSibling.nextElementSibling.classList.remove('translate-x-7');
            
            // Stop any playing alert
            stopMonkeyAlert();
        }
    });
    
    // Update frequency based on slider
    document.getElementById('frequency-slider').addEventListener('input', function() {
        frequency = this.value;
        updateFrequencyDisplay();
        
        // Update frequency of active alert if playing
        if (isAlertPlaying && oscillator) {
            oscillator.frequency.value = frequency;
        }
    });
    
    // Update volume based on slider
    document.getElementById('volume-slider').addEventListener('input', function() {
        volume = this.value / 100;
        updateVolumeDisplay();
        
        // Update volume of active alert if playing
        if (isAlertPlaying && gainNode) {
            gainNode.gain.value = volume;
        }
    });
    
    // Update detection threshold based on slider
    document.getElementById('threshold-slider').addEventListener('input', function() {
        detectionThreshold = this.value / 100;
        updateThresholdDisplay();
    });
    
    // Initialize toggle switch styling
    const toggle = document.getElementById('sound-toggle');
    if (toggle.checked) {
        toggle.nextElementSibling.classList.add('bg-primary-500');
        toggle.nextElementSibling.classList.remove('bg-natural-300');
        toggle.nextElementSibling.nextElementSibling.classList.add('translate-x-7');
    }
});

function updateFrequencyDisplay() {
    document.getElementById('frequency-value').textContent = 
        (frequency / 1000).toFixed(1) + " kHz";
}

function updateVolumeDisplay() {
    document.getElementById('volume-value').textContent = 
        Math.round(volume * 100) + "%";
}

function updateThresholdDisplay() {
    document.getElementById('threshold-value').textContent = 
        Math.round(detectionThreshold * 100) + "%";
}

// Start continuous alert sound when monkey is detected
function startMonkeyAlert() {
    if (!soundEnabled || isAlertPlaying) return;
    
    // If audio context is suspended, resume it
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    gainNode = audioContext.createGain();
    oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    
    // Connect the oscillator to a gain node for volume control
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set volume
    gainNode.gain.value = volume;
    
    // Start oscillator (continuous tone)
    oscillator.start();
    isAlertPlaying = true;
}

// Stop alert sound
function stopMonkeyAlert() {
    if (!isAlertPlaying) return;
    
    if (oscillator) {
        // Fade out
        if (gainNode) {
            gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        }
        
        // Stop after fade
        setTimeout(() => {
            oscillator.stop();
            isAlertPlaying = false;
        }, 100);
    }
}

async function init() {
    // Initialize audio
    if (!audioContext) {
        initAudio();
    }
    
    startBtn.disabled = true;
    startBtn.classList.add("opacity-50", "cursor-not-allowed");
    startBtn.textContent = "Camera Active";
    
    stopBtn.disabled = false;
    stopBtn.classList.remove("opacity-50", "cursor-not-allowed");
    
    document.getElementById("camera-placeholder").style.display = "none";
    statusIndicator.classList.remove("hidden");

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Let webcam fill container while maintaining aspect ratio
    const webcamContainer = document.getElementById("webcam-container");
    const containerWidth = webcamContainer.clientWidth;
    const containerHeight = webcamContainer.clientHeight;
    
    // Adjust webcam dimensions based on container
    let webcamWidth, webcamHeight;
    
    // Set dimensions to fit container while maintaining aspect ratio
    if (containerWidth / containerHeight > 4/3) { // Container is wider than 4:3
        webcamHeight = containerHeight;
        webcamWidth = webcamHeight * (4/3);
    } else { // Container is taller than 4:3
        webcamWidth = containerWidth;
        webcamHeight = webcamWidth * (3/4);
    }
    
    const flip = true;
    webcam = new tmImage.Webcam(Math.floor(webcamWidth), Math.floor(webcamHeight), flip);
    await webcam.setup();
    await webcam.play();
    
    isRunning = true;
    animationFrameId = window.requestAnimationFrame(loop);

    // Add webcam to container
    webcamContainer.appendChild(webcam.canvas);
    
    // Center webcam in container
    webcam.canvas.style.maxWidth = "100%";
    webcam.canvas.style.maxHeight = "100%";
    webcam.canvas.style.margin = "auto";
    webcam.canvas.style.display = "block";
    
    resultContainer = document.getElementById("result-container");
}

async function loop() {
    if (!isRunning) return;
    
    webcam.update();
    await predict();
    animationFrameId = window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);

    const monkeyProb = prediction[0].probability;
    const notMonkeyProb = prediction[1].probability;
    
    // Update probability bars
    monkeyBar.style.width = `${monkeyProb * 100}%`;
    notMonkeyBar.style.width = `${notMonkeyProb * 100}%`;
    
    // Update probability text
    document.getElementById('monkey-probability').textContent = `${(monkeyProb * 100).toFixed(1)}%`;
    document.getElementById('notmonkey-probability').textContent = `${(notMonkeyProb * 100).toFixed(1)}%`;

    // Check if probability exceeds threshold for detection
    const isMonkeyDetected = monkeyProb > detectionThreshold;
    
    if (isMonkeyDetected) {
        // Monkey detected
        if (lastResult !== "Monkey") {
            // First detection - update UI
            resultText.textContent = "Monkey Detected!";
            resultText.className = "text-lg font-bold text-amber-600";
            resultContainer.classList.remove("bg-natural-50", "border-natural-200");
            resultContainer.classList.add("bg-amber-50", "border-amber-200");
            
            // Add pulse effect
            resultContainer.classList.add("pulse-effect");
            setTimeout(() => {
                resultContainer.classList.remove("pulse-effect");
            }, 1000);
            
            // Start the continuous alert
            startMonkeyAlert();
        }
    } else {
        // No monkey detected
        if (lastResult === "Monkey") {
            // Was detected before, now gone - stop alert
            stopMonkeyAlert();
        }
        
        resultText.textContent = "No Monkey Detected";
        resultText.className = "text-lg font-medium text-natural-700";
        resultContainer.classList.add("bg-natural-50", "border-natural-200");
        resultContainer.classList.remove("bg-amber-50", "border-amber-200");
    }
    
    // Update last result
    lastResult = isMonkeyDetected ? "Monkey" : "NotMonkey";
}

// Handle resizing
window.addEventListener('resize', function() {
    if (webcam && isRunning) {
        // Adjust webcam display to fit new container size
        const webcamContainer = document.getElementById("webcam-container");
        webcam.canvas.style.maxWidth = "100%";
        webcam.canvas.style.maxHeight = "100%";
    }
});