function showUserProfile(userId) {
    const modal = document.getElementById('user-profile-modal');
    displayUserProfile(userId);
    modal.style.display = 'flex';
}

document.addEventListener('click', (event) => {
    const target = event.target;
    if (target.classList.contains('message-author')) {
        const userId = target.getAttribute('data-userid');
        showUserProfile(userId);
    }
});
