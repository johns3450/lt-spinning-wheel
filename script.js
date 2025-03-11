// --- Existing Variable and Element Setup ---
const wheel = document.getElementById('wheel');
const spinButton = document.getElementById('spinButton');
const resultText = document.getElementById('resultText');
const claimPrize = document.getElementById('claimPrize');
const resultSound = new Audio('result-sound.wav');
const spinCounter = document.getElementById('spinCounter');
const DUMMY_MODE = false; // Set to true for dummy testing, false when backend is ready.

let outcomeLogged = false;


// Set preload and volume settings.
resultSound.preload = "auto";
resultSound.volume = 0.7;

// --- Set API URL Based on Environment ---
// When testing locally, point directly to your backend; in production, use relative paths so Vercel rewrites can occur.
let API_URL = "";
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  API_URL = "http://35.187.7.1:4000/api";
} else {
  API_URL = "/api";
}

// --- Email Form Variables ---
const emailForm = document.getElementById("email-form");
const emailInput = document.getElementById("userEmail");
const captchaInput = document.getElementById("captchaInput");
const emailSubmit = document.getElementById("emailSubmit");
const emailError = document.getElementById("emailError");
let userEmail = null;  // To store the submitted email

// Preload sounds on first user interaction.
// Initialize background music
const backgroundMusic = new Audio('irish-game-sound.m4a'); // Adjust file extension if needed.
backgroundMusic.loop = true;
backgroundMusic.volume = 0.3; // Adjust volume as desired.

function fadeIn(audio, duration = 2000, targetVolume = 0.3) {
    audio.volume = 0;
    audio.play().catch(error => console.warn("Playback error:", error));
    const steps = 20;
    const stepDuration = duration / steps;
    const increment = targetVolume / steps;
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      audio.volume = Math.min(audio.volume + increment, targetVolume);
      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);
  }  

// Preload result sound and background music on first user interaction.
document.addEventListener('click', () => {
    resultSound.play().then(() => resultSound.pause());
    backgroundMusic.play().then(() => backgroundMusic.pause());
}, { once: true });

let isSpinning = false;
let canSpin = false;

// --- Existing Utility Function ---
function disableClick(event) {
  event.preventDefault();
  event.stopPropagation();
  return false;
}

// --- Functions for Server Spin Count Integration ---
// Fetch the global spin count from the backend and update UI.
async function fetchSpinCount() {
    try {
        const response = await fetch(`${API_URL}/spins`);
        const data = await response.json();
        spinsTaken = data.totalSpins;
        maxSpins = data.maxSpins;
        updateSpinCounter();
    } catch (error) {
        console.error("❌ Failed to fetch spin count:", error);
    }
}

// Update the spin counter UI.
function updateSpinCounter() {
    const remaining = maxSpins - spinsTaken;
    spinCounter.innerHTML = `Quick! Only ${remaining} spins remaining`;
    if (remaining <= 0) {
        spinButton.disabled = true;
        spinButton.innerText = "No Spins Left";
    }
}

// Polling to update spin count live.
function startPollingSpinCount(interval = 5000) {
    setInterval(fetchSpinCount, interval);
}

// --- Email Submission & Captcha Handling ---
// When the user submits their email and captcha, call the backend to record the email.
emailSubmit.addEventListener("click", async function() {
    const emailVal = emailInput.value.trim();
    const captchaVal = captchaInput.value.trim();
    if (!emailVal || !captchaVal) {
        emailError.textContent = "Please enter your email and captcha.";
        return;
    }
    if (captchaVal !== "1234") {  // Dummy captcha check; replace with a real captcha solution later.
        emailError.textContent = "Captcha incorrect. Please try again.";
        return;
    }
    
    if (DUMMY_MODE) {
        // Dummy mode: Only allow "cheeky@example.com" for testing.
        if (emailVal.toLowerCase() === "cheeky@example.com") {
            userEmail = emailVal;
            emailForm.style.display = "none";
            document.querySelector('.page-layout').style.display = "block";
            startPollingSpinCount(5000);
            emailError.textContent = "";
            fadeIn(backgroundMusic);  // Fade in background music over 2 seconds.
        } else {
            emailError.textContent = "This email has already been used (dummy mode).";
        }
    } else {
        // Real backend call for email submission.
        try {
            const response = await fetch(`${API_URL}/submitEmail`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailVal })
            });
            const result = await response.json();
            if (response.status === 400) {
                emailError.textContent = "This email has already been used.";
                return;
            }
            userEmail = emailVal;
            emailForm.style.display = "none";
            document.querySelector('.page-layout').style.display = "block";
            startPollingSpinCount(5000);
            // Fade in background music on email submission.
            fadeIn(backgroundMusic);
        } catch (error) {
            emailError.textContent = "Error submitting email. Please try again.";
            console.error("Email submission error:", error);
        }
    }
});

// --- DOMContentLoaded and Loader Code ---
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
      
      // Fetch initial spin count from server.
      fetchSpinCount();
  }

  window.onload = hideLoader;
});

// --- Existing Segments and Animation Variables ---
const segments = [
  { label: 'No Win', chance: 20, winning: false },
  { label: '20', chance: 1 },
  { label: '10', chance: 1 },
  { label: '200', chance: 300 },
  { label: '50', chance: 5 },
  { label: '100', chance: 5 },
  { label: '10', chance: 5 },
  { label: 'Spin Again', chance: 20, spinAgain: true }
];

let currentAngle = 0;
let startAngle = 0;
let targetAngle = 0;
let startTimeSpin = 0;
let duration = 6000;
let lastTickIndex = 0;

resultText.innerHTML = "Everyones and winner! <br> Take a SPIN to WIN!";
resultText.style.display = "block";

// --- Updated spinWheel() Function (with Backend Integration) ---
async function spinWheel() {
    console.log("Spin wheel triggered");
    if (spinsTaken >= maxSpins) {
      console.log("No spins remaining for this email");
      return;
    }
    if (isSpinning || !canSpin) return;
    
    outcomeLogged = false;  // Reset the outcome logging flag for the new spin
    
    // Update spin count on the server (fire and forget)
    fetch(`${API_URL}/spin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
    })
    .then(response => response.json())
    .then(data => {
         spinsTaken = data.totalSpins;
         maxSpins = data.maxSpins;
         updateSpinCounter();
    })
    .catch(error => {
         console.error("❌ Failed to update spin count:", error);
    });

    if (spinsTaken >= maxSpins) {
      spinButton.style.display = "none";
    }

    isSpinning = true;
    canSpin = false;


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


        const finalSegment = segments[window.chosenIndexGlobal];

        if (!outcomeLogged) {
            if (finalSegment.spinAgain) {
                resultText.innerText = "Spin Again!";
                spinButton.innerText = "SPIN AGAIN";
                spinButton.style.display = "inline-block";
                canSpin = true;
            } else if (finalSegment.winning === false) {
                // Non-winning segment: show message and do not log outcome
                resultText.innerText = "No win this time!";
                spinButton.style.display = "none";
                claimPrize.style.display = "none";
            } else {
                resultText.innerText = `You've unlocked ${finalSegment.label} Free Spins & more!`;
                spinButton.style.display = "none";
                claimPrize.style.display = "inline-block";
          
                // Log the outcome to the backend.
                fetch(`${API_URL}/logOutcome`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: userEmail, outcome: finalSegment.label })
                })
                .then(response => response.json())
                .then(data => {
                  console.log("Outcome logged:", data);
                })
                .catch(error => {
                  console.error("Error logging outcome:", error);
                });
                if (finalSegment.winning !== false && !finalSegment.spinAgain) {
                    const gameContainer = document.querySelector('.game-container');
                    if (gameContainer) {
                      // Apply 50% opacity to the game container (which holds the wheel)
                      gameContainer.style.setProperty('opacity', '0.5', 'important');
                  
                      // Create an image element for the winning animation.
                      const animationOverlay = document.createElement('img');
                      animationOverlay.src = 'leprachaun-animation.gif';
                      // Make the GIF smaller (adjust width as desired)
                      animationOverlay.style.width = '250px';
                      animationOverlay.style.height = 'auto';
                      
                      // Position the overlay exactly over the wheel.
                      animationOverlay.style.position = 'absolute';
                      animationOverlay.style.top = '50%';
                      animationOverlay.style.left = '50%';
                      animationOverlay.style.transform = 'translate(-50%, -50%)';
                      animationOverlay.style.zIndex = '20000'; // Ensure it's on top
                      animationOverlay.style.pointerEvents = 'none'; // Make it non-clickable
                      
                      // Set up a CSS transition for fading the overlay in/out.
                      animationOverlay.style.transition = 'opacity 1s ease-in-out';
                      animationOverlay.style.opacity = '0'; // start invisible
                  
                          // Append the overlay to the body so it's not affected by gameContainer's opacity.
    document.body.appendChild(animationOverlay);
                  
                      // Fade in over 1 second.
                      setTimeout(() => {
                        animationOverlay.style.opacity = '1';
                      }, 50); // slight delay to allow transition to trigger
                  
                      // After 14 seconds, fade out over 1 second.
                      setTimeout(() => {
                        animationOverlay.style.opacity = '0';
                      }, 13000);
                  
                      // After 15 seconds, remove the overlay and restore container opacity.
                      setTimeout(() => {
                        gameContainer.style.opacity = '1';
                        animationOverlay.remove();
                      }, 14000);
                    }
                  }
                  
                  
            }
            outcomeLogged = true; // Mark as logged so it doesn't happen twice.
          }
          

        resultText.style.display = "block";

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
