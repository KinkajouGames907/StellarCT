// --- User Profile and Reporting System for StellarChat ---

// IMPORTANT: You must have the Firebase SDKs for Firestore included in your project.
// Remove the following block to avoid redeclaration and project ID issues:
// const firebaseConfig = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_AUTH_DOMAIN",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_STORAGE_BUCKET",
//   messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//   appId: "YOUR_APP_ID"
// };
// 
// // Initialize Firebase
// firebase.initializeApp(firebaseConfig);
// const db = firebase.firestore();

// --- Modal Handling ---

document.addEventListener('DOMContentLoaded', () => {
    const userProfileModal = document.getElementById('user-profile-modal');
    const reportModal = document.getElementById('report-modal');
    const closeProfileBtn = document.querySelector('.close-button');
    const closeReportBtn = document.querySelector('.close-report-button');
    let reportedUserId = null; // To store the ID of the user being viewed/reported

    // ASSUMPTION: Your chat messages or user list items have a common class, e.g., '.user-message'.
    // Each of these items should have a 'data-userid' attribute containing the user's unique ID.
    // You will need to adjust this selector to match your app's structure.
    document.body.addEventListener('click', async (event) => {
        const userElement = event.target.closest('[data-userid]');
        if (userElement) {
            reportedUserId = userElement.dataset.userid;
            await displayUserProfile(reportedUserId);
            userProfileModal.style.display = 'flex';
        }
    });

    // --- Event Listeners for Buttons ---

    if(closeProfileBtn) closeProfileBtn.onclick = () => userProfileModal.style.display = 'none';
    if(closeReportBtn) closeReportBtn.onclick = () => reportModal.style.display = 'none';

    const reportBtn = document.getElementById('report-btn');
    if(reportBtn) reportBtn.onclick = () => {
        userProfileModal.style.display = 'none';
        reportModal.style.display = 'flex';
    };

    const submitReportBtn = document.getElementById('submit-report-btn');
    if(submitReportBtn) submitReportBtn.onclick = async () => {
        const reason = document.getElementById('report-reason').value;
        const details = document.getElementById('report-details').value;
        const userReporting = new UserReporting(new AccountLockManager());
        await userReporting.handleUserReport(reportedUserId, firebase.auth().currentUser.uid, reason, details);
        reportModal.style.display = 'none';
    };

    // Close modals if the background is clicked
    window.onclick = (event) => {
        if (event.target == userProfileModal) userProfileModal.style.display = 'none';
        if (event.target == reportModal) reportModal.style.display = 'none';
    };

    // --- Friend Request and DM Logic (Placeholders) ---
    const addFriendBtn = document.getElementById('add-friend-btn');
    if(addFriendBtn) addFriendBtn.onclick = () => {
        alert('Friend request sent!');
    };

    const dmBtn = document.getElementById('dm-btn');
    if(dmBtn) dmBtn.onclick = () => {
        alert('Opening DM...');
    };
});

// --- Firebase Logic ---

async function displayUserProfile(userId) {
    try {
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();

        if (doc.exists) {
            const userData = doc.data();
            document.getElementById('profile-username').textContent = userData.username || 'N/A';
            document.getElementById('profile-pfp').src = userData.photoURL || 'default-pfp.png';
            document.getElementById('profile-status').textContent = userData.status || 'No status';
            document.getElementById('profile-bio').textContent = userData.bio || 'No bio';
            document.getElementById('profile-joined').textContent = userData.joined ? new Date(userData.joined.seconds * 1000).toLocaleDateString() : 'N/A';
        } else {
            console.error('No such user!');
        }
    } catch (error) {
        console.error('Error getting user data:', error);
    }
}
