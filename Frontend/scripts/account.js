const API_URL = "http://localhost:5000";

// Function to show notification banner
function showBanner(message, type = "error") {
    const banner = document.getElementById("notification-banner");
    const messageElement = document.getElementById("notification-message");
    
    if (banner && messageElement) {
        messageElement.textContent = message;
        banner.classList.remove("hidden");
        banner.classList.remove("success");
        
        if (type === "success") {
            banner.classList.add("success");
        }
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            banner.classList.add("hidden");
        }, 3000);
    }
}

// Toggle theme function
function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

// Toggle mobile nav menu
document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("navActions").classList.toggle("open");
});

function updateThemeIcon() {
    const isDark = document.body.classList.contains('dark');
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) {
        themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Load user data
async function loadUserData() {
    const token = localStorage.getItem("authToken");
    const userInfoContainer = document.getElementById("userInfo");
    
    console.log("Loading user data, token exists:", !!token);
    
    if (!token) {
        // Redirect to login if not authenticated
        console.log("No auth token found, redirecting to login");
        window.location.href = "login.html";
        return;
    }
    
    // Update navigation
    const navLogin = document.getElementById("navLogin");
    const navLogout = document.getElementById("navLogout");
    if (navLogin) navLogin.classList.add("hidden");
    if (navLogout) {
        navLogout.classList.remove("hidden");
        navLogout.classList.remove("initially-hidden");
    }
    
    try {
        console.log("Fetching user info from API");
        const response = await fetch(`${API_URL}/user-info`, {
            method: "GET",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json" 
            }
        });
        
        if (!response.ok) {
            throw new Error("Failed to fetch user data");
        }
        
        const data = await response.json();
        console.log("User data received:", data);
        
        // Display user data
        if (userInfoContainer && data.email) {
            userInfoContainer.innerHTML = `
                <div class="user-card">
                    <img src="${data.avatar || 'assets/favicon_io/user.png'}" alt="User Avatar" class="user-avatar">
                    <h3>${data.name || data.email.split('@')[0]}</h3>
                    <p>${data.email}</p>
                    <div class="badge-container">
                        <span class="badge premium-badge">Premium User</span>
                        <span class="badge verified-badge"><i class="fas fa-check-circle"></i> Verified</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error loading user data:", error);
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
    }
}

// Initialize page on load
document.addEventListener("DOMContentLoaded", function() {
    console.log("Account page loaded");

    // Close notification banner when X is clicked
    const closeBannerBtn = document.getElementById("closeBannerBtn");
    if (closeBannerBtn) {
        closeBannerBtn.addEventListener("click", function() {
            document.getElementById("notification-banner").classList.add("hidden");
        });
    }
    
    // Theme Toggle setup
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Check for saved theme preference
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
        
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Settings toggle
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsSection = document.getElementById("settingsSection");

    if (settingsBtn && settingsSection) {
        settingsBtn.addEventListener("click", function(e) {
            e.preventDefault();
            settingsSection.classList.toggle("hidden");
            settingsBtn.classList.toggle("active");
        });
    }

    // 2FA Toggle setup
    const twoFactorToggle = document.getElementById("twoFactorToggle");
    if (twoFactorToggle) {
        // Get initial 2FA status
        fetch(`${API_URL}/user/2fa-status`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("authToken")}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch 2FA status');
            }
            return response.json();
        })
        .then(data => {
            twoFactorToggle.checked = data.twoFactorEnabled;
        })
        .catch(error => {
            console.error("Error fetching 2FA status:", error);
            showBanner("Failed to load 2FA status");
        });

        // Handle 2FA toggle
        twoFactorToggle.addEventListener("change", async function() {
            try {
                const response = await fetch(`${API_URL}/user/toggle-2fa`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        enabled: this.checked
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    showBanner(this.checked ? "Two-Factor Authentication enabled" : "Two-Factor Authentication disabled", "success");
                } else {
                    // Revert toggle if failed
                    this.checked = !this.checked;
                    showBanner(data.error || "Failed to update 2FA settings");
                }
            } catch (error) {
                // Revert toggle if failed
                this.checked = !this.checked;
                showBanner("Server error. Please try again.");
            }
        });
    }

    // Logout functionality
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        console.log("Logout button found, adding event listener");
        logoutButton.addEventListener("click", function() {
            // Clear all local/session storage
            localStorage.clear();
            sessionStorage.clear();
            console.log("Logout button clicked");
            localStorage.removeItem("authToken");
            showBanner("Logged out successfully!", "success");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);
        });
    } else {
        console.log("Logout button not found");
    }

    // Load user data
    loadUserData();
}); 