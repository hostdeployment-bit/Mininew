// API Base URL - Utilise l'URL relative pour Render
const API_BASE = '';

// Éléments DOM
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const passwordStrength = document.getElementById('passwordStrength');
const passwordError = document.getElementById('passwordError');

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 MINI INCONNU XD V3 initialized');
    setupEventListeners();
    checkAuthStatus();
});

// Configuration des événements
function setupEventListeners() {
    // Formulaires
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Validation en temps réel du mot de passe
    const registerPassword = document.getElementById('registerPassword');
    const registerConfirmPassword = document.getElementById('registerConfirmPassword');
    
    if (registerPassword) {
        registerPassword.addEventListener('input', validatePasswordStrength);
    }
    
    if (registerConfirmPassword) {
        registerConfirmPassword.addEventListener('input', validatePasswordMatch);
    }
}

// Vérifier le statut d'authentification
async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();
        
        if (data.authenticated) {
            // Rediriger vers le dashboard si déjà connecté
            window.location.href = '/dashboard';
        }
    } catch (error) {
        console.log('User not authenticated');
    }
}

// Afficher le formulaire d'inscription
function showRegister() {
    loginSection.classList.remove('active');
    registerSection.classList.add('active');
}

// Afficher le formulaire de connexion
function showLogin() {
    registerSection.classList.remove('active');
    loginSection.classList.add('active');
}

// Gestion de la connexion
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Validation basique
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    // Désactiver le bouton
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        // Réactiver le bouton
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Gestion de l'inscription
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('registerName').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        confirmPassword: document.getElementById('registerConfirmPassword').value,
        referralCode: document.getElementById('referralCode').value,
        acceptTerms: document.getElementById('acceptTerms').checked
    };

    // Validation
    if (!validateRegistration(formData)) {
        return;
    }

    // Désactiver le bouton
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Account created successfully!', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            showNotification(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        // Réactiver le bouton
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Validation de l'inscription
function validateRegistration(formData) {
    // Vérifier que tous les champs requis sont remplis
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        showNotification('Please fill in all required fields', 'error');
        return false;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        showNotification('Please enter a valid email address', 'error');
        return false;
    }

    // Validation mot de passe
    if (formData.password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return false;
    }

    // Vérifier que les mots de passe correspondent
    if (formData.password !== formData.confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return false;
    }

    // Vérifier les conditions d'utilisation
    if (!formData.acceptTerms) {
        showNotification('Please accept the terms and conditions', 'error');
        return false;
    }

    return true;
}

// Validation de la force du mot de passe
function validatePasswordStrength() {
    const password = document.getElementById('registerPassword').value;
    const strengthBar = document.getElementById('passwordStrength');
    
    if (!strengthBar) return;

    let strength = 0;
    let tips = "";

    // Vérifier la longueur
    if (password.length >= 8) {
        strength += 1;
    } else {
        tips += "Make password longer. ";
    }

    // Vérifier les caractères spéciaux
    if (password.match(/[!@#$%^&*(),.?":{}|<>]/)) {
        strength += 1;
    } else {
        tips += "Add special characters. ";
    }

    // Vérifier les chiffres
    if (password.match(/\d/)) {
        strength += 1;
    } else {
        tips += "Add numbers. ";
    }

    // Vérifier les majuscules
    if (password.match(/[A-Z]/)) {
        strength += 1;
    } else {
        tips += "Add uppercase letters. ";
    }

    // Mettre à jour la barre de force
    strengthBar.className = 'password-strength';
    
    if (password.length === 0) {
        strengthBar.style.width = '0%';
        strengthBar.style.background = 'var(--border)';
    } else if (strength <= 1) {
        strengthBar.classList.add('strength-weak');
    } else if (strength === 2) {
        strengthBar.classList.add('strength-fair');
    } else if (strength === 3) {
        strengthBar.classList.add('strength-good');
    } else {
        strengthBar.classList.add('strength-strong');
    }
}

// Validation de la correspondance des mots de passe
function validatePasswordMatch() {
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const errorElement = document.getElementById('passwordError');
    const confirmInput = document.getElementById('registerConfirmPassword');

    if (!errorElement || !confirmInput) return;

    if (confirmPassword && password !== confirmPassword) {
        errorElement.style.display = 'block';
        confirmInput.parentElement.classList.add('error');
    } else {
        errorElement.style.display = 'none';
        confirmInput.parentElement.classList.remove('error');
    }
}

// Connexion avec Google (placeholder)
function loginWithGoogle() {
    showNotification('Google login coming soon!', 'info');
    // window.location.href = '/auth/google';
}

// Connexion avec GitHub (placeholder)
function loginWithGithub() {
    showNotification('GitHub login coming soon!', 'info');
    // window.location.href = '/auth/github';
}

// Affichage des notifications
function showNotification(message, type = 'info') {
    // Supprimer les notifications existantes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Styles pour la notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        max-width: 400px;
        word-wrap: break-word;
    `;

    // Couleurs selon le type
    if (type === 'success') {
        notification.style.background = 'var(--success)';
    } else if (type === 'error') {
        notification.style.background = 'var(--error)';
    } else {
        notification.style.background = 'var(--primary)';
    }

    document.body.appendChild(notification);

    // Supprimer après 5 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Ajouter les animations CSS manquantes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .fa-spin {
        animation: fa-spin 1s linear infinite;
    }
    
    @keyframes fa-spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
    
    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
    }
    
    .form-group.error input {
        border-color: var(--error) !important;
        background: #fef5f5;
    }
`;
document.head.appendChild(style);

// Exposer les fonctions globales
window.showRegister = showRegister;
window.showLogin = showLogin;
window.loginWithGoogle = loginWithGoogle;
window.loginWithGithub = loginWithGithub;
