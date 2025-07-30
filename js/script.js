function toggleMobileMenu() {
  const navLinks = document.getElementById("navLinks");
  navLinks.classList.toggle("active");
}

// Close mobile menu when clicking outside
document.addEventListener("click", function (event) {
  const nav = document.querySelector(".nav");
  const navLinks = document.getElementById("navLinks");

  // Check if the clicked element is outside the nav and the navLinks are open
  if (!nav.contains(event.target) && navLinks.classList.contains("active")) {
    navLinks.classList.remove("active");
  }
});

// Smooth scrolling for anchor links (only applies to index.html internal links)
document.addEventListener("click", function (event) {
  // Check if the clicked element is an anchor tag and its href starts with '#'
  if (
    event.target.tagName === "A" &&
    event.target.getAttribute("href") &&
    event.target.getAttribute("href").startsWith("#")
  ) {
    // Prevent default anchor behavior
    event.preventDefault();

    // Get the target element's ID from the href
    const targetId = event.target.getAttribute("href").substring(1);
    const targetElement = document.getElementById(targetId);

    // If the target element exists, scroll to it smoothly
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth" });
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // --- Mobile Menu Toggle ---
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const navLinks = document.getElementById("navLinks");

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // --- ACCOUNT DELETION FLOW ---
  const deletionContainer = document.querySelector(".delete-flow-container");
  if (!deletionContainer) {
    return; // Exit if not on the account deletion page
  }

  // --- API Configuration ---
  const API_BASE_URL = "http://localhost:5000"; // Adjust to your real API base URL if needed

  /*
    =============================================================================
    == NEW SESSION-BASED BACKEND API REQUIREMENTS ==
    =============================================================================
    This flow is stateful and relies on a session ID.

    1. POST `${API_BASE_URL}/auth/send-otp`
       - PURPOSE: Initial sign-in.
       - BODY: { "identifier": "user@example.com" }
       - ACTION: Generates and sends a sign-in OTP.
       - RESPONSE (Success): { "success": true, "message": "Sign-in OTP sent." }

    2. POST `${API_BASE_URL}/auth/verify-otp`
       - PURPOSE: Verify sign-in OTP to create a secure session.
       - BODY: { "identifier": "user@example.com", "otp": "123456" }
       - ACTION: Validates the OTP. If correct, creates a temporary, secure session.
       - RESPONSE (Success): { "success": true, "message": "Sign-in successful.", "sessionId": "UNIQUE_SECURE_SESSION_ID" }
       - RESPONSE (Error):   { "success": false, "message": "Invalid OTP." }

    3. POST `${API_BASE_URL}/account/send-deletion-otp`
       - PURPOSE: Send the *final* deletion OTP, authorized by the session.
       - BODY: { "sessionId": "UNIQUE_SECURE_SESSION_ID" }
       - ACTION: Validates the session ID. If valid, sends a *new* OTP for final deletion confirmation.
       - RESPONSE (Success): { "success": true, "message": "Final deletion OTP sent." }

    4. POST `${API_BASE_URL}/account/delete`
       - PURPOSE: Verify the final OTP and permanently delete the account.
       - BODY: { "sessionId": "UNIQUE_SECURE_SESSION_ID", "otp": "654321" }
       - ACTION: Validates session and final OTP. If both are correct, deletes the account.
       - RESPONSE (Success): { "success": true, "message": "Account deleted successfully." }
    =============================================================================
    */

  // --- State Variables ---
  let currentUserIdentifier = "";
  let currentUserOtpToken = "";
  let currentSessionId = null; // Will hold the session ID after successful sign-in

  // --- Real API Service using fetch ---
  const apiService = {
    sendSignInOtp: async (identifier) => {
      return await postRequest(
        `${API_BASE_URL}/auth/organization/unsubscribe/sendOtp`,
        identifier
      );
    },
    verifySignInOtp: async (body) => {
      return await postRequest(
        `${API_BASE_URL}/auth/organization/unsubscribe/verifyOtp`,
        body
      );
    },
    sendDeletionOtp: async (sessionId) => {
      return await postRequest(
        `${API_BASE_URL}/auth/account/delete/sendOtp`,
        {},
        { "session-id": sessionId }
      );
    },
    deleteAccount: async (body, sessionId) => {
      return await postRequest(
        `${API_BASE_URL}/auth/account/delete/verifyOtp`,
        body,
        {
          "session-id": sessionId,
        }
      );
    },
  };

  // Generic POST request handler
  async function postRequest(url, body, headers = {}) {
    try {
      urlHeader = {
        ...headers,
        "Content-Type": "application/json",
      };
      const response = await fetch(url, {
        method: "POST",
        headers: urlHeader,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Error: ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error("API Call Failed:", error);
      return {
        success: false,
        message: error.message || "A network error occurred.",
      };
    }
  }

  // --- DOM Elements ---
  const steps = {
    signIn: document.getElementById("signInStep"),
    verifySignIn: document.getElementById("verifySignInStep"),
    confirmDeletion: document.getElementById("confirmDeletionStep"),
    verifyDeletion: document.getElementById("verifyDeletionStep"),
    success: document.getElementById("successStep"),
  };
  const inputs = {
    userIdentifier: document.getElementById("userIdentifier"),
    signInOtp: document.getElementById("signInOtp"),
    deleteOtp: document.getElementById("deleteOtp"),
  };
  const buttons = {
    sendSignInOtp: document.getElementById("sendSignInOtpBtn"),
    verifySignIn: document.getElementById("verifySignInBtn"),
    sendDeleteOtp: document.getElementById("sendDeleteOtpBtn"),
    confirmDelete: document.getElementById("confirmDeleteBtn"),
  };
  const messageArea = document.getElementById("messageArea");
  const displayIdentifier1 = document.getElementById("displayIdentifier1");
  const displayIdentifier2 = document.getElementById("displayIdentifier2");

  // --- Helper Functions ---
  const showStep = (stepName) =>
    Object.values(steps).forEach((s) => s.classList.add("hidden")) ||
    steps[stepName]?.classList.remove("hidden");
  const showMessage = (text, type) => (
    (messageArea.textContent = text),
    (messageArea.className = `message ${type}`)
  );
  const clearMessage = () => (
    (messageArea.textContent = ""), (messageArea.className = "message")
  );
  const disableButton = (btn, text) => (
    (btn.disabled = true), (btn.textContent = text)
  );
  const enableButton = (btn, text) => (
    (btn.disabled = false), (btn.textContent = text)
  );

  // --- Event Listeners with Session-Based Logic ---

  // Step 1: Send Sign-In OTP
  buttons.sendSignInOtp.addEventListener("click", async () => {
    const identifier = inputs.userIdentifier.value.trim();
    if (!identifier) {
      showMessage("Please enter your email or phone number.", "error");
      return;
    }

    let value = {
      phoneNumber: identifier,
      url: "test.edutech.local",
    };

    clearMessage();
    disableButton(buttons.sendSignInOtp, "Sending...");

    const response = await apiService.sendSignInOtp(value);

    if (response.data) {
      currentUserIdentifier = identifier;
      currentUserOtpToken = response.data;
      displayIdentifier1.textContent = currentUserIdentifier;
      displayIdentifier2.textContent = currentUserIdentifier; // Set it here for later use
      showMessage(response.message, "success");
      showStep("verifySignIn");
    } else {
      showMessage(response.message, "error");
    }
    enableButton(buttons.sendSignInOtp, "Send Sign-In OTP");
  });

  // Step 2: Verify Sign-In and Get Session ID
  buttons.verifySignIn.addEventListener("click", async () => {
    const otp = inputs.signInOtp.value.trim();
    if (otp.length !== 6) {
      showMessage("Please enter a valid 6-digit OTP.", "error");
      return;
    }

    clearMessage();
    disableButton(buttons.verifySignIn, "Verifying...");

    let payloadBody = {
      url: "test.edutech.local",
      uniqueToken: currentUserOtpToken,
      otp: otp,
    };

    const response = await apiService.verifySignInOtp(payloadBody);

    if (response.data) {
      currentSessionId = response.data.id; // << STORE THE SESSION ID
      clearMessage();
      showStep("confirmDeletion");
    } else {
      showMessage(
        response.message ||
          "Verification failed or session ID was not provided.",
        "error"
      );
    }
    enableButton(buttons.verifySignIn, "Sign In & Continue");
  });

  // Step 3: Send Deletion OTP using the Session ID
  buttons.sendDeleteOtp.addEventListener("click", async () => {
    if (!currentSessionId) {
      showMessage("Session is invalid. Please start over.", "error");
      showStep("signIn"); // Force restart if session is lost
      return;
    }

    clearMessage();
    disableButton(buttons.sendDeleteOtp, "Sending...");

    const response = await apiService.sendDeletionOtp(currentSessionId);

    if (response.data) {
      showMessage(response.message, "success");
      currentUserOtpToken = response.data;
      showStep("verifyDeletion");
    } else {
      showMessage(response.message, "error");
    }
    enableButton(buttons.sendDeleteOtp, "Yes, I'm Sure. Send Deletion OTP");
  });

  // Step 4: Confirm Deletion with Final OTP and Session ID
  buttons.confirmDelete.addEventListener("click", async () => {
    const otp = inputs.deleteOtp.value.trim();
    if (otp.length !== 6) {
      showMessage("Please enter a valid 6-digit OTP.", "error");
      return;
    }
    if (!currentSessionId) {
      showMessage("Session is invalid. Please start over.", "error");
      showStep("signIn");
      return;
    }

    clearMessage();
    disableButton(buttons.confirmDelete, "Deleting...");

    payloadBody = {
      uniqueToken: currentUserOtpToken,
      otp: otp,
    };

    const response = await apiService.deleteAccount(
      payloadBody,
      currentSessionId
    );

    if (response.data) {
      showStep("success");
    } else {
      showMessage(response.message, "error");
      enableButton(buttons.confirmDelete, "Confirm & Permanently Delete");
    }
  });
});
