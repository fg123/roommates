function bindButtonToDialog(buttonSelector, dialogSelector) {
    var button = document.querySelector(buttonSelector);
    var dialog = document.querySelector(dialogSelector);
    button.addEventListener('click', function() {
        dialog.showModal();
    });
    dialog.querySelector('.close').addEventListener('click', function() {
        dialog.close();
    });
}

bindButtonToDialog('.dialog-open-create-group', '.create-group-dialog');
bindButtonToDialog('.dialog-open-join-group', '.join-group-dialog');
