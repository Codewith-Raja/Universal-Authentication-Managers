const API_URL = "http://localhost:5000";

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginCard = document.getElementById('loginCard');
const signupCard = document.getElementById('signupCard');
const loginLink = document.getElementById('loginLink');
const signupLink = document.getElementById('signupLink');
const loginSpinner = document.getElementById('loginSpinner');
const signupSpinner = document.getElementById('signupSpinner');
const otpGroup = document.querySelector('.otp-group');
const signupOtpGroup = document.querySelector('.signup-otp-group');
const otpTimer = document.getElementById('otpTimer');
const signupOtpTimer = document.getElementById('signupOtpTimer');
const notificationBanner = document.getElementById('notification-banner');
const notificationMessage = document.getElementById('notification-message');
const closeBannerBtn = document.getElementById('closeBannerBtn');
const passwordToggle = document.getElementById('passwordToggle');
const requestSignupOtpBtn = document.getElementById('requestSignupOtpBtn');

const themeToggle = document.getElementById("themeToggle");
const themeIcon = themeToggle.querySelector("i");
const savedTheme = localStorage.getItem("theme");

document.body.classList.toggle("dark", savedTheme === "dark" || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches));
themeIcon.className = document.body.classList.contains('dark') ? 'fas fa-sun' : 'fas fa-moon';
themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeIcon.className = isDark ? "fas fa-sun" : "fas fa-moon";
});

// Password Toggle
passwordToggle?.addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    passwordToggle.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
});

// Close notification banner
closeBannerBtn?.addEventListener('click', () => {
    notificationBanner.classList.add('hidden');
});

// Form Switching
function showLogin() {
    loginCard.classList.remove('hidden');
    signupCard.classList.add('hidden');
    loginForm.reset();
    otpGroup.classList.add('hidden');
}

function showSignup() {
    loginCard.classList.add('hidden');
    signupCard.classList.remove('hidden');
    signupForm.reset();
    signupOtpGroup.classList.add('hidden');
}

loginLink?.addEventListener('click', showLogin);
signupLink?.addEventListener('click', showSignup);

// Notification Banner
function showBanner(message, isSuccess = false) {
    if (!notificationBanner || !notificationMessage) return;
    
    notificationMessage.textContent = message;
    notificationBanner.classList.remove('hidden', 'success');
    if (isSuccess) {
        notificationBanner.classList.add('success');
    }
    setTimeout(() => {
        notificationBanner.classList.add('hidden');
    }, 5000);
}

// OTP Timer
let otpTimerInterval;
let signupOtpTimerInterval;

function startOtpTimer(timerElement) {
    // Clear any existing timer
    if (timerElement === otpTimer && otpTimerInterval) {
        clearInterval(otpTimerInterval);
    } else if (timerElement === signupOtpTimer && signupOtpTimerInterval) {
        clearInterval(signupOtpTimerInterval);
    }
    
    let timeLeft = 300; // 5 minutes in seconds
    timerElement.textContent = `OTP expires in: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
    
    const interval = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `OTP expires in: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(interval);
            timerElement.textContent = 'OTP expired';
            if (timerElement === otpTimer) {
                otpGroup.classList.add('hidden');
            } else {
                signupOtpGroup.classList.add('hidden');
            }
            showBanner('OTP has expired. Please try again.');
        }
    }, 1000);

    if (timerElement === otpTimer) {
        otpTimerInterval = interval;
    } else {
        signupOtpTimerInterval = interval;
    }
}

// Request OTP for Signup
requestSignupOtpBtn?.addEventListener('click', async () => {
    const email = signupForm.email.value;
    if (!email) {
        showBanner('Please enter your email first');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            if (response.ok) {
                signupOtpGroup.classList.remove('hidden');
                signupOtpGroup.classList.add('active');
                startOtpTimer(signupOtpTimer);
                showBanner('OTP sent to your email', true);
                document.querySelector("#signupOtp")?.focus();
            }
            
        } else {
            showBanner(data.error || 'Failed to send OTP');
        }
    } catch (error) {
        showBanner('Server error. Please try again.');
    }
});

// Verify OTP
async function verifyOTP(email, otp) {
    try {
        const response = await fetch(`${API_URL}/verify-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            showBanner('Login successful! Redirecting...', true);
            setTimeout(() => window.location.href = 'index.html', 1500);
        } else {
            showBanner(data.error || 'Invalid OTP');
        }
    } catch (error) {
        showBanner('Server error. Please try again.');
    }
}

// Login Form Submit
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    const otp = loginForm.otp?.value;

    try {
        loginSpinner.classList.remove('hidden');
        
        // If OTP is present, verify it
        if (otp) {
            await verifyOTP(email, otp);
            return;
        }

        // Otherwise, attempt login
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            if (data.twoFactor || data.status === "2FA_REQUIRED") {
                otpGroup.classList.add("active"); // for CSS display
                document.getElementById("otp")?.focus(); // auto-focus field

                // User has 2FA enabled
                otpGroup.classList.remove('hidden');
                startOtpTimer(otpTimer);
                showBanner('Please enter the OTP sent to your email');
                return;
            }

            // Regular login successful
            localStorage.setItem('authToken', data.token);
            showBanner('Login successful! Redirecting...', true);
            setTimeout(() => window.location.href = 'index.html', 1500);
        } else {
            showBanner(data.error || 'Login failed');
        }
    } catch (error) {
        showBanner('Server error. Please try again.');
    } finally {
        loginSpinner.classList.add('hidden');
    }
});

// Signup Form Submit
signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupForm.email.value;
    const password = signupForm.password.value;
    const confirmPassword = signupForm.confirmPassword.value;
    const otp = signupForm.otp?.value;

    if (password !== confirmPassword) {
        showBanner('Passwords do not match');
        return;
    }

    if (!otp) {
        showBanner('Please request and enter the OTP');
        return;
    }

    try {
        signupSpinner.classList.remove('hidden');
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, otp })
        });

        const data = await response.json();

        if (response.ok) {
            showBanner('Registration successful! Please log in.', true);
            showLogin();
        } else {
            showBanner(data.error || 'Registration failed');
        }
    } catch (error) {
        showBanner('Server error. Please try again.');
    } finally {
        signupSpinner.classList.add('hidden');
    }
});

// Login Form OTP Inputs
const otpInputs = document.querySelectorAll("#otpInputs .otp-box");
const hiddenOtp = document.getElementById("otp");
let otpDigits = ["", "", "", "", "", ""];

otpInputs.forEach((input, idx) => {
  input.dataset.index = idx;

  input.addEventListener("input", () => {
    const val = input.value.replace(/\D/g, '').charAt(0) || "";
    if (!val) return;

    otpDigits[idx] = val;
    input.value = val;

    setTimeout(() => {
      input.value = "●";
    }, 500);

    if (idx < otpInputs.length - 1) {
      otpInputs[idx + 1].focus();
    }

    const otpCode = otpDigits.join("");
    hiddenOtp.value = otpCode;

    if (otpCode.length === 6 && !otpCode.includes("")) {
      loginForm.dispatchEvent(new Event("submit"));
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace") {
      otpDigits[idx] = "";
      input.value = "";
      if (idx > 0) otpInputs[idx - 1].focus();
    }
  });

  input.addEventListener("focus", () => {
    const val = otpDigits[idx];
    input.value = val;
    setTimeout(() => {
      if (document.activeElement !== input) input.value = "●";
    }, 500);
  });

  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, '').slice(0, 6);
    otpDigits = paste.split("");
    hiddenOtp.value = paste;

    otpInputs.forEach((input, i) => {
      input.value = otpDigits[i] || "";
      if (otpDigits[i]) {
        setTimeout(() => input.value = "●", 500);
      }
    });

    if (paste.length === 6) {
      loginForm.dispatchEvent(new Event("submit"));
    }
  });
});

// SIGNUP OTP BOXES
const signupOtpInputs = document.querySelectorAll("#signupOtpInputs .otp-box");
const signupOtpHidden = document.getElementById("signupOtp");
let signupOtpDigits = ["", "", "", "", "", ""];

signupOtpInputs.forEach((input, idx) => {
  input.dataset.index = idx;

  input.addEventListener("input", () => {
    const val = input.value.replace(/\D/g, '').charAt(0) || "";
    if (!val) return;

    signupOtpDigits[idx] = val;
    input.value = val;

    setTimeout(() => {
      input.value = "●";
    }, 500);

    if (idx < signupOtpInputs.length - 1) {
      signupOtpInputs[idx + 1].focus();
    }

    const code = signupOtpDigits.join("");
    signupOtpHidden.value = code;
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace") {
      signupOtpDigits[idx] = "";
      input.value = "";
      if (idx > 0) signupOtpInputs[idx - 1].focus();
    }
  });

  input.addEventListener("focus", () => {
    const val = signupOtpDigits[idx];
    input.value = val;
    setTimeout(() => {
      if (document.activeElement !== input) input.value = "●";
    }, 500);
  });

  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, '').slice(0, 6);
    signupOtpDigits = paste.split("");
    signupOtpHidden.value = paste;

    signupOtpInputs.forEach((input, i) => {
      input.value = signupOtpDigits[i] || "";
      if (signupOtpDigits[i]) {
        setTimeout(() => input.value = "●", 500);
      }
    });
  });
});