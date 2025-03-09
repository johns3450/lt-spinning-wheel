// --- Existing Variable and Element Setup ---
const wheel = document.getElementById('wheel');
const spinButton = document.getElementById('spinButton');
const resultText = document.getElementById('resultText');
const claimPrize = document.getElementById('claimPrize');
const resultSound = new Audio('result-sound.wav');
const spinSound = new Audio('start-sound.wav');

const spinCounter = document.getElementById('spinCounter');

spinSound.preload = "auto"; 
resultSound.preload = "auto"; 

spinSound.volume = 0.4;
resultSound.volume = 0.7;

// Set your API URL (update this to your actual server endpoint)
const API_URL = "/api";

document.addEventListener('click', () => {
    spinSound.play().then(() => spinSound.pause());
    resultSound.play().then(() => resultSound.pause());
}, { once: true });

let isSpinning = false;
let canSpin = false;

// --- Existing Utility Function ---
function disableClick(event) {
  event.preventDefault();
  event.stopPropagation();
  return false;
}

// --- New Functions for Server Spin Count Integration ---

// Fetch spin count from the server on page load and update local variables/UI.
async function fetchSpinCount() {
    try {
        const response = await fetch(`${API_URL}`);
        const data = await response.json();
        spinsTaken = data.totalSpins;
        maxSpins = data.maxSpins;
        updateSpinCounter();
    } catch (error) {
        console.error("❌ Failed to fetch spin count:", error);
    }
}

// Update spin counter UI using server values.
function updateSpinCounter() {
    const remaining = maxSpins - spinsTaken;
    spinCounter.innerHTML = `Quick! Only ${remaining} spins remaining`;
    // Disable spin button if no spins left.
    if (remaining <= 0) {
        spinButton.disabled = true;
        spinButton.innerText = "No Spins Left";
    }
}

// --- Existing DOMContentLoaded and Loader Code ---
document.addEventListener("DOMContentLoaded", function () {
  const loadingScreen = document.getElementById("loading-screen");
  const loadingIcon = document.querySelector("#loading-screen .loader");

  document.body.classList.add("loading");

  wheel.addEventListener('click', disableClick, true);
  spinButton.addEventListener('click', disableClick, true);
  wheel.addEventListener('touchstart', disableClick, { passive: false });
  spinButton.addEventListener('touchstart', disableClick, { passive: false });

  const minLoadingTime = 1800;
  const minIconTime = 1800;
  const startTime = performance.now();

  function hideLoader() {
      const elapsedTime = performance.now() - startTime;
      const remainingScreenTime = minLoadingTime - elapsedTime;
      const remainingIconTime = minIconTime - elapsedTime;

      setTimeout(() => {
          if (loadingIcon) loadingIcon.style.display = "none";
      }, remainingIconTime > 0 ? remainingIconTime : 0);

      setTimeout(() => {
          loadingScreen.classList.add("hidden");
          document.body.classList.remove("loading");
          setTimeout(() => {
              loadingScreen.style.display = "none";
              canSpin = true;

              wheel.removeEventListener('click', disableClick, true);
              spinButton.removeEventListener('click', disableClick, true);
              wheel.removeEventListener('touchstart', disableClick, { passive: false });
              spinButton.removeEventListener('touchstart', disableClick, { passive: false });

              spinButton.addEventListener('click', spinWheel);
              spinButton.addEventListener('touchstart', spinWheel, { passive: true });
              
              const wheelContainer = document.querySelector('.wheel-container');
              if (wheelContainer) {
                let clickOverlay = document.createElement('div');
                clickOverlay.id = "clickOverlay";

                clickOverlay.style.position = "absolute";
                clickOverlay.style.top = "0";
                clickOverlay.style.left = "0";
                clickOverlay.style.width = "100%";
                clickOverlay.style.height = "100%";
                clickOverlay.style.background = "rgba(0,0,0,0)";
                clickOverlay.style.zIndex = "10000";
                clickOverlay.style.cursor = "pointer";
                wheelContainer.style.position = "relative";
                wheelContainer.appendChild(clickOverlay);

                clickOverlay.addEventListener('click', function(e) {
                  console.log("Overlay clicked:", e.target);
                  spinWheel();
                });
                clickOverlay.addEventListener('touchstart', function(e) {
                  console.log("Overlay touchstart:", e.target);
                  spinWheel();
                }, { passive: true });
              } else {
                console.warn("Wheel container not found!");
              }
          }, 400);
      }, remainingScreenTime > 0 ? remainingScreenTime : 0);
      
      // Fetch the initial spin count from the server.
      fetchSpinCount();
  }

  window.onload = hideLoader;
});

// --- Existing Segments and Animation Variables ---
const segments = [
  { label: '500', chance: 10 },
  { label: '20', chance: 10 },
  { label: '10', chance: 10 },
  { label: '200', chance: 10 },
  { label: '50', chance: 40 },
  { label: '100', chance: 10 },
  { label: '10', chance: 5 },
  { label: '50', chance: 5 }
];

let currentAngle = 0;
let startAngle = 0;
let targetAngle = 0;
let startTimeSpin = 0;
let duration = 6000;
let lastTickIndex = 0;

resultText.innerHTML = "Everyones and winner! <br> Take a SPIN to WIN!";
resultText.style.display = "block";

// --- Updated spinWheel() Function (with Server Integration) ---
async function spinWheel() {
    console.log("Spin wheel triggered");
    // If maximum spins have been reached, do nothing.
    if (spinsTaken >= maxSpins) {
      console.log("No spins remaining");
      return;
    }
    if (isSpinning || !canSpin) return;
    
    // Send request to the server to update spin count
    try {
        const response = await fetch(`${API_URL}/spin`, { method: "POST" });
        const data = await response.json();

        if (response.status === 400) {
            spinButton.disabled = true;
            spinButton.innerText = "No Spins Left";
            return;
        }
        
        spinsTaken = data.totalSpins;
        maxSpins = data.maxSpins;  // In case max spins has been updated on the server.
        updateSpinCounter();
    } catch (error) {
        console.error("❌ Failed to update spin count:", error);
        return;
    }

    // If spins are now exhausted, disable further clicks.
    if (spinsTaken >= maxSpins) {
      spinButton.style.display = "none";
    }

    isSpinning = true;
    canSpin = false;

    spinSound.currentTime = 0;
    spinSound.loop = false;
    spinSound.play();

    startTimeSpin = performance.now();
    requestAnimationFrame(animateSpin);

    resultText.style.visibility = "none";
    resultText.innerText = "";
    claimPrize.style.display = "none";

    lastTickIndex = Math.floor(currentAngle / (360 / segments.length));

    const totalWeight = segments.reduce((sum, seg) => sum + seg.chance, 0);
    let rand = Math.random() * totalWeight;
    let cumulative = 0;
    let chosenSegment = segments[0];
    let chosenIndex = 0;
    for (let i = 0; i < segments.length; i++) {
        cumulative += segments[i].chance;
        if (rand <= cumulative) {
            chosenSegment = segments[i];
            chosenIndex = i;
            break;
        }
    }

    const minSpins = 5;
    const degreesPerSegment = 360 / segments.length;
    const halfSegment = degreesPerSegment / 2;
    
    const segmentTargetAngle = 360 - ((chosenIndex * degreesPerSegment) + halfSegment);
    
    startAngle = currentAngle % 360;
    
    const extraRotation = minSpins * 360 - startAngle + segmentTargetAngle;
    
    targetAngle = currentAngle + extraRotation;  

    window.chosenIndexGlobal = chosenIndex;

    startTimeSpin = null;
    requestAnimationFrame(animateSpin);
}

// --- Existing Animation Function ---
function animateSpin(timestamp) {
    if (!startTimeSpin) startTimeSpin = timestamp;
    const elapsed = timestamp - startTimeSpin;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const angle = startAngle + ease * (targetAngle - startAngle);
    currentAngle = angle;
    wheel.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    const tickSpacing = 360 / segments.length;
    let currentTickIndex = Math.floor(currentAngle / tickSpacing);
    if (currentTickIndex > lastTickIndex) {
        tickTicker();
        lastTickIndex = currentTickIndex;
    }

    if (progress < 1) {
        requestAnimationFrame(animateSpin);
    } else {
        isSpinning = false;
        currentAngle = currentAngle % 360;

        spinSound.pause();
        spinSound.currentTime = 0;

        const finalSegment = segments[window.chosenIndexGlobal];

        resultText.innerText = `You've unlocked ${finalSegment.label} Free Spins & more!`;
        resultText.style.display = "block";
        spinButton.style.display = "none";
        claimPrize.style.display = "inline-block";

        setTimeout(() => {
            resultSound.currentTime = 0;
            resultSound.play().catch(error => console.warn("Result sound blocked:", error));
        }, 100);

        claimPrize.classList.add("flashing");
        resultText.classList.add("flashing");

        setTimeout(() => {
            resultText.classList.remove("flashing");
        }, 2400);

        setTimeout(() => {
            claimPrize.classList.remove("flashing");
        }, 800);
    }
}

// --- Existing Ticker Function ---
function tickTicker() {
    const ticker = document.querySelector('.ticker');
    ticker.classList.add('tick');
    setTimeout(() => {
        ticker.classList.remove('tick');
    }, 100);
}

// --- Existing Claim Prize Handler ---
claimPrize.addEventListener('click', () => {
    window.location.href = "https://leisuretime.co.uk";
});
