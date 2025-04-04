const API_URL = "http://localhost:5000"; // Change this when deploying

// Global variables
let passwords = []; // Array to store all passwords

// Encryption & Decryption Functions
const encryptPassword = (password, key) => CryptoJS.AES.encrypt(password, key).toString();
const decryptPassword = (encrypted, key) => CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);

// Master Key Modal Elements
const masterKeyModal = document.getElementById("masterKeyModal");
const masterKeyInput = document.getElementById("masterKeyInput");
const confirmMasterKey = document.getElementById("confirmMasterKey");
const cancelMasterKey = document.getElementById("cancelMasterKey");

let masterKeyCallback = null;

function requestMasterKey(callback, purpose = "access your credentials") {
    masterKeyCallback = callback;
    
    // Update purpose message
    const purposeElement = document.getElementById("masterKeyPurpose");
    if (purposeElement) {
        purposeElement.textContent = `Please enter your master key to ${purpose}`;
    }
    
    // Show modal
    masterKeyModal.classList.add("active");
    masterKeyInput.value = "";
    masterKeyInput.focus();
}

function closeMasterKeyModal() {
    masterKeyModal.classList.remove("active");
}

confirmMasterKey.addEventListener("click", () => {
    if (masterKeyCallback) {
        masterKeyCallback(masterKeyInput.value);
    }
    closeMasterKeyModal();
});

cancelMasterKey.addEventListener("click", closeMasterKeyModal);

// Website Logo API and Caching
function getWebsiteLogo(websiteName) {
    let domain = websiteName.toLowerCase().replace(/\s/g, '') + ".com";
    
    // Check if logo is cached
    if (localStorage.getItem(domain)) {
        return localStorage.getItem(domain);
    }

    let logoUrl = `https://logo.clearbit.com/${domain}`;
    
    // Preload image and cache if valid
    let img = new Image();
    img.src = logoUrl;
    img.onload = () => localStorage.setItem(domain, logoUrl);
    img.onerror = () => localStorage.setItem(domain, "assets/logos/default.png");

    return logoUrl;
}

// Toggle mobile nav menu
document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("navActions").classList.toggle("open");
});

// Show Notifications (Success/Error/Info)
const showBanner = (message, type = "error") => {
    const banner = document.getElementById("notification-banner");
    document.getElementById("notification-message").textContent = message;
    
    banner.classList.remove("hidden");
    banner.classList.remove("success");
    banner.classList.remove("info");
    
    if (type === "success") {
        banner.classList.add("success");
    } else if (type === "info") {
        banner.classList.add("info");
    }
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        banner.classList.add("hidden");
    }, 3000);
};

// Close notification banner
function closeBanner() {
    document.getElementById("notification-banner").classList.add("hidden");
}

// Theme Toggle Functionality
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

// Check for saved theme preference or use preferred color scheme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.body.classList.toggle('dark', savedTheme === 'dark');
    updateThemeIcon();
} else {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark', prefersDark);
    updateThemeIcon();
}

// Toggle theme function
function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
    
    // Add animation effect on theme change
    document.body.style.transition = 'background-color 0.5s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 500);
}

function updateThemeIcon() {
    const isDark = document.body.classList.contains('dark');
    themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

themeToggle.addEventListener('click', toggleTheme);

// Save passwords in Database
document.getElementById("addPasswordForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("authToken");
    if (!token) return alert("You must be logged in to save passwords!");

    const userId = JSON.parse(atob(token.split(".")[1])).userId;
    const website = document.getElementById("website").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    requestMasterKey((masterKey) => {
        if (!website || !username || !password || !masterKey) {
            showBanner("Please fill all fields and enter a Master Key.");
            return;
        }

        const encryptedPassword = encryptPassword(password, masterKey);
        if (!encryptedPassword) {
            showBanner("Encryption failed. Please try again.");
            return;
        }

        savePassword(userId, website, username, encryptedPassword);
    });
});

// Add Credential Button Toggle
document.getElementById("toggleAddCredentialBtn").addEventListener("click", () => {
    const formSection = document.getElementById("addCredentialSection");
    const toggleBtn = document.getElementById("toggleAddCredentialBtn");
    const form = document.getElementById("addPasswordForm");
  
    formSection.classList.toggle("hidden");
    toggleBtn.innerHTML = formSection.classList.contains("hidden")
      ? '<i class="fas fa-plus"></i> Add New Credential'
      : '<i class="fas fa-times"></i> Cancel';
  
    if (!formSection.classList.contains("hidden")) {
      formSection.style.animation = "fadeSlideIn 0.4s ease forwards";
      formSection.scrollIntoView({ behavior: "smooth" });
    } else {
      form.reset(); // Reset inputs
      formSection.style.animation = "fadeSlideOut 0.3s ease forwards";
    }
});

// Save Passwoed to Database
async function savePassword(userId, website, username, encryptedPassword) {
    try {
        const response = await fetch(`${API_URL}/save-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, website, username, password: encryptedPassword }),
        });

        const data = await response.json();
        if (response.ok) {
            showBanner("Password saved successfully!", "success");
            fetchPasswords();
        
            const form = document.getElementById("addPasswordForm");
            const formSection = document.getElementById("addCredentialSection");
            const toggleBtn = document.getElementById("toggleAddCredentialBtn");
        
            form.reset();
            formSection.classList.add("hidden");
            toggleBtn.innerHTML = '<i class="fas fa-plus"></i> Add New Credential';
        
        } else {
            showBanner(`${data.error || "Failed to save password."}`);
        }
    } catch (error) {
        console.error("Error saving password:", error);
        showBanner("Error saving password.");
    }
}

// Update Password Table to Display Saved Credentials
function updatePasswordTable(filteredPasswords = passwords) {
    const passwordContainer = document.getElementById("passwordContainer");
    const credentialsCounter = document.getElementById("credentialsCounter");
    
    // Clear existing content
    passwordContainer.innerHTML = "";
    
    // Update credentials counter
    if (credentialsCounter) {
        credentialsCounter.textContent = `${filteredPasswords.length} ${filteredPasswords.length === 1 ? 'item' : 'items'}`;
    }
    
    if (filteredPasswords.length === 0) {
        // If we're filtering and no results found
        if (passwords.length > 0) {
            passwordContainer.innerHTML = `<div class="empty-message">No matching credentials found. Try a different search term.</div>`;
        }
        return;
    }

    // Create a card for each password
    filteredPasswords.forEach((pass, index) => {
        // Create password card element
        const card = document.createElement("div");
        card.className = "password-card";
        card.setAttribute("data-index", index);
        
        // Animate cards with delay based on index
        card.style.animationDelay = `${index * 0.05}s`;

        // Website logo element
        const logoImg = document.createElement("img");
        logoImg.className = "website-logo";
        logoImg.src = getWebsiteLogo(pass.website);
        logoImg.alt = `${pass.website} Logo`;
        logoImg.onerror = () => {
            logoImg.src = "assets/logos/default.png";
        };
        
        // Password content (website and username)
        const contentDiv = document.createElement("div");
        contentDiv.className = "password-card-content";
        
        const websiteText = document.createElement("strong");
        websiteText.textContent = pass.website;
        
        const usernameText = document.createElement("div");
        usernameText.textContent = pass.username;
        
        contentDiv.appendChild(websiteText);
        contentDiv.appendChild(usernameText);
        
        // Action buttons container
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "password-card-actions";
        
        // View button
        const viewBtn = document.createElement("span");
        viewBtn.className = "action-icon";
        viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        viewBtn.title = "View Password";
        
        // Copy button
        const copyBtn = document.createElement("span");
        copyBtn.className = "action-icon";
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = "Copy Password";
        
        // Share button
        const shareBtn = document.createElement("span");
        shareBtn.className = "action-icon";
        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
        shareBtn.title = "Share Password";
        
        // Delete button
        const deleteBtn = document.createElement("span");
        deleteBtn.className = "action-icon";
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = "Delete Password";
        
        // Add all action buttons
        actionsDiv.appendChild(viewBtn);
        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(shareBtn);
        actionsDiv.appendChild(deleteBtn);
        
        // Construct the card
        card.appendChild(logoImg);
        card.appendChild(contentDiv);
        card.appendChild(actionsDiv);
        
        // Add the card to the container
        passwordContainer.appendChild(card);
        
        // Set up event listeners
        viewBtn.addEventListener("click", () => {
            requestMasterKey((masterKey) => {
                try {
                    const decrypted = decryptPassword(pass.password, masterKey);
                    showBanner(`Password for ${pass.website}: ${decrypted}`, "success");
                } catch (error) {
                    showBanner("Incorrect master key. Please try again.", "error");
                }
            });
        });
        
        copyBtn.addEventListener("click", () => {
            requestMasterKey((masterKey) => {
                try {
                    const decrypted = decryptPassword(pass.password, masterKey);
                    navigator.clipboard.writeText(decrypted);
                    showBanner("Password copied to clipboard!", "success");
                } catch (error) {
                    showBanner("Incorrect master key. Please try again.", "error");
                }
            });
        });
        
        shareBtn.addEventListener("click", () => {
            requestMasterKey((masterKey) => {
                try {
                    const decrypted = decryptPassword(pass.password, masterKey);
                    openShareModal({
                        website: pass.website,
                        username: pass.username,
                        password: decrypted
                    });
                } catch (error) {
                    showBanner("Incorrect master key. Please try again.", "error");
                }
            });
        });
        
        deleteBtn.addEventListener("click", () => {
            deletePassword(pass._id, index);
        });
    });
}

// Fetch Saved Passwords and Display in UI
async function fetchPasswords() {
    const passwordContainer = document.getElementById("passwordContainer");
    const token = localStorage.getItem("authToken");
    
    if (!token) {
        console.error("User is not logged in.")
        updatePasswordTable([]); // Ensure UI is cleared if no user is logged in
        return;
    }

    const userId = JSON.parse(atob(token.split(".")[1])).userId;

    try {
        // Show loading animation
        passwordContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading your credentials...</div>
            </div>
        `;
        
        const response = await fetch(`${API_URL}/get-passwords/${userId}`);
        const data = await response.json();

        if (response.ok) {
            passwords = data; // Update global passwords array
            
            // Add slight delay to make loading animation visible
            setTimeout(() => {
                updatePasswordTable(passwords); // Refresh UI
            }, 400);
        } else {
            showBanner(`Failed to fetch passwords: ${data.error}`);
            
            // Show error state
            passwordContainer.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 16px; display: block; color: var(--error-color);"></i>
                    <p>Failed to load your credentials. Please refresh and try again.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error fetching passwords:", error);
        showBanner("Error fetching passwords.");
        
        // Show error state
        passwordContainer.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 16px; display: block; color: var(--error-color);"></i>
                <p>Failed to load your credentials. Please refresh and try again.</p>
            </div>
        `;
    }
}

// Custom confirmation dialog functionality
const confirmationModal = document.getElementById('confirmationModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

let confirmationCallback = null;

// Function to show a custom confirmation dialog
function showConfirmation(title, message, callback) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmationCallback = callback;
    confirmationModal.classList.add('active');
}

// Handle Yes button click
confirmYes.addEventListener('click', () => {
    confirmationModal.classList.remove('active');
    if (confirmationCallback) {
        confirmationCallback(true);
        confirmationCallback = null;
    }
});

// Handle No button click
confirmNo.addEventListener('click', () => {
    confirmationModal.classList.remove('active');
    if (confirmationCallback) {
        confirmationCallback(false);
        confirmationCallback = null;
    }
});

// Close on click outside
window.addEventListener('click', (event) => {
    if (event.target == confirmationModal) {
        confirmationModal.classList.remove('active');
        if (confirmationCallback) {
            confirmationCallback(false);
            confirmationCallback = null;
        }
    }
});

// Delete Password from Database
async function deletePassword(passwordId, index) {
    if (!passwordId) {
        showBanner("Error deleting password. Password ID is missing.");
        return;
    }

    // Show custom confirmation dialog
    showConfirmation(
        "Delete Credential", 
        `Are you sure you want to delete the credentials for ${passwords[index].website}?`,
        (confirmed) => {
            if (confirmed) {
                // Request master key to verify user has proper authorization
                requestMasterKey(async (masterKey) => {
                    try {
                        // Show loading state
                        showBanner("Verifying master key...", "info");
                        
                        // Attempt to verify master key by decrypting something
                        try {
                            // Try to decrypt the password as a verification that the master key is correct
                            const decrypted = decryptPassword(passwords[index].password, masterKey);
                            if (!decrypted) throw new Error("Invalid master key");
                            
                            // If we get here, the master key was correct
                            
                            // Delete the password
                            const response = await fetch(`${API_URL}/delete-password/${passwordId}`, {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                            });

                            const data = await response.json();
                            
                            if (response.ok) {
                                showBanner("Password deleted successfully!", "success");
                                passwords.splice(index, 1); // Remove from local list
                                updatePasswordTable(passwords); // Update UI immediately
                            } else {
                                showBanner(`Error: ${data.error}`);
                            }
                        } catch (error) {
                            console.error("Master key verification failed:", error);
                            showBanner("Incorrect master key. Deletion cancelled.", "error");
                        }
                    } catch (error) {
                        console.error("Error deleting password:", error);
                        showBanner("Error deleting password. Please try again.", "error");
                    }
                }, "verify your identity and delete this credential");
            }
        }
    );
}

// Search credentials function
function searchCredentials() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const filteredPasswords = passwords.filter(password => {
        return password.website.toLowerCase().includes(searchInput) || 
               password.username.toLowerCase().includes(searchInput);
    });
    updatePasswordTable(filteredPasswords);
}

// Password Visibility Toggle
const passwordInput = document.getElementById('password');
const passwordViewEye = document.getElementById('passwordViewEye');
const passwordEyeIcon = document.getElementById('passwordEyeIcon');

passwordViewEye.addEventListener('click', () => {
    const isPasswordHidden = passwordInput.type === 'password';
    passwordInput.type = isPasswordHidden ? 'text' : 'password';
    passwordEyeIcon.className = isPasswordHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
});

// Handle for Sharing Passwords
const shareModal = document.getElementById('shareModal');
const closeModal = document.querySelector('.close');
const recipientEmailInput = document.getElementById('recipientEmail');
const modalShareButton = document.getElementById('modalShareButton');
let passwordToShare = null;

closeModal.addEventListener('click', () => {
    shareModal.classList.remove("active");
    recipientEmailInput.value = '';
    passwordToShare = null;
});

window.addEventListener('click', (event) => {
    if (event.target == shareModal) {
        shareModal.classList.remove("active");
        recipientEmailInput.value = '';
        passwordToShare = null;
    }
});

// Open Share Modal
function openShareModal(passwordDetails) {
    passwordToShare = passwordDetails;
    shareModal.classList.add("active");
}

// Handle Sending Email
modalShareButton.addEventListener('click', () => {
    const recipientEmail = recipientEmailInput.value.trim();

    if (!recipientEmail || !passwordToShare) {
        showBanner('Please enter a valid email and ensure a password is selected.');
        return;
    }

    emailjs
        .send("service_manager", "template_6agng3d", { // My emailjs service ID and template ID.
            to_email: recipientEmail,
            website: passwordToShare.website,
            username: passwordToShare.username,
            password: passwordToShare.password,
        })
        .then(() => {
            showBanner('Password shared successfully!', 'success');
            shareModal.classList.remove("active");
            recipientEmailInput.value = '';
            passwordToShare = null;
        })
        .catch((error) => {
            console.error('Error sending email:', error);
            showBanner('Failed to send the email. Please try again.');
        });
});

// Password Strength Meter Elements
const strengthText = document.getElementById('strength-text');
const strengthBar = document.getElementById('strength-bar');
const strengthFeedback = document.getElementById('strength-feedback');
const generatePasswordBtn = document.getElementById('generatePassword');

// Common Weak Passwords List
const weakPasswords = ["123456", "password", "qwerty", "admin", "letmein", "welcome", "abc123", "pass123", "111111"];

// Function to evaluate password strength
function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = [];

    // Length Check
    if (password.length >= 12) {
        strength += 2;
    } else if (password.length >= 8) {
        strength++;
    } else {
        feedback.push("Minimum 8 characters required.");
    }

    // Character Type Checks
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[\W]/.test(password);

    if (hasUpperCase) {
        strength++;
    } else {
        feedback.push("Include at least one uppercase letter.");
    }

    if (hasLowerCase) {
        strength++;
    } else {
        feedback.push("Include at least one lowercase letter.");
    }

    if (hasNumbers) {
        strength++;
    } else {
        feedback.push("Include at least one number.");
    }

    if (hasSpecialChars) {
        strength++;
    } else {
        feedback.push("Include at least one special character (!@#$%^&*).");
    }

    // Avoid Common Weak Passwords
    if (weakPasswords.includes(password.toLowerCase())) {
        feedback.push("This password is too common. Choose a more secure one.");
        strength = 1;
    }

    // Avoid Repeating Characters
    if (/(.)\1{2,}/.test(password)) {
        feedback.push("Avoid repeating characters (e.g., 'aaa').");
        strength--;
    }

    updateStrengthMeter(strength, feedback);
}

// Update strength meter UI
function updateStrengthMeter(strength, feedback) {
    const strengthLevels = ["Very Weak", "Weak", "Medium", "Strong", "Very Strong"];
    const colors = ["#ff4d4d", "#ff9933", "#ffcc00", "#66cc66", "#008000"];

    let index = Math.max(0, Math.min(strength, 4)); // Ensure index is between 0-4

    strengthText.textContent = `Strength: ${strengthLevels[index]}`;
    strengthBar.style.width = `${(index / 4) * 100}%`;
    strengthBar.style.backgroundColor = colors[index];

    // Update feedback messages
    strengthFeedback.innerHTML = "";
    feedback.forEach(msg => {
        const li = document.createElement("li");
        li.innerHTML = msg;
        strengthFeedback.appendChild(li);
    });
}

// Generate a Secure Random Password
function generateSecurePassword() {
    const length = 16; // Recommended length for strong passwords
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*?";
    let password = "";

    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    passwordInput.value = password;
    checkPasswordStrength(password);
}

// Event listener for password input
passwordInput.addEventListener('input', () => {
    checkPasswordStrength(passwordInput.value);
});

// Event listener for "Generate Password" button
generatePasswordBtn.addEventListener('click', generateSecurePassword);

// Set up search input event listener
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', searchCredentials);
}

// Check authentication and update UI accordingly
async function checkAuthAndUpdateUI() {
    const token = localStorage.getItem("authToken");
    const navLogin = document.getElementById("navLogin");
    const navLogout = document.getElementById("navLogout");
    
    if (token) {
        console.log("User is authenticated");
        // Update navigation using correct class names
        if (navLogin) navLogin.classList.add('hidden');
        if (navLogout) navLogout.classList.remove('initially-hidden');
        if (navLogout) navLogout.classList.remove('hidden');
        
        try {
            // Verify token is valid by making an API call
            const response = await fetch(`${API_URL}/user-info`, {
                method: "GET",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (!response.ok) {
                throw new Error("Invalid token");
            }
            
            // Token is valid, load credentials
            fetchPasswords();
        } catch (error) {
            console.error("Authentication error:", error);
            localStorage.removeItem("authToken");
            // Do not redirect, just update UI
            if (navLogin) navLogin.classList.remove('hidden');
            if (navLogout) navLogout.classList.add('hidden');
            if (navLogout) navLogout.classList.add('initially-hidden');
        }
    } else {
        console.log("User is not authenticated");
        // Update navigation using correct class names
        if (navLogin) navLogin.classList.remove('hidden');
        if (navLogout) navLogout.classList.add('hidden');
        if (navLogout) navLogout.classList.add('initially-hidden');
    }
}

// Document ready function
document.addEventListener("DOMContentLoaded", function() {
    // Initialize navigation elements
    const navLogin = document.getElementById("navLogin");
    const navLogout = document.getElementById("navLogout");
    
    // Theme toggle setup
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Theme logic already exists elsewhere in the file
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Check authentication and update UI
    checkAuthAndUpdateUI();
    
    // Add event listener for closing notification banner
    const closeBannerBtn = document.getElementById("closeBannerBtn");
    if (closeBannerBtn) {
        closeBannerBtn.addEventListener("click", closeBanner);
    }
    
    // Update active navigation
    updateActiveNavigation();
});

// Function to update active navigation
function updateActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    // Remove active class from all links
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Add active class to current page link
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        const linkPage = link.getAttribute('data-page');
        
        if (currentPath.includes(linkPath) || 
            (currentPath.endsWith('/') && linkPage === 'home')) {
            link.classList.add('active');
        }
    });
}
