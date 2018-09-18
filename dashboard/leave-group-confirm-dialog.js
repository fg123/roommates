(function() {
    const leaveGroupButton = document.querySelector('.leave-group-button');
    const dialog = document.querySelector('.leave-group-confirm-dialog');
    const confirmLeaveButton = document.querySelector(
        '.confirm-leave-button'
    );

    leaveGroupButton.addEventListener('click', function() {
        dialog.showModal();
    });

    dialog.querySelector('.close').addEventListener('click', function() {
        dialog.close();
    });

    confirmLeaveButton.addEventListener('click', function() {
        // TODO: Call endpoint
    });
})();
