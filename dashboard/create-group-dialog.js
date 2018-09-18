(function() {
    const dialogOpenButton = document.querySelector('.dialog-open-create-group');
    const dialog = document.querySelector('.create-group-dialog');
    const field = document.querySelector('input#group-name');
    const dialogSubmitButton = document.querySelector(
        '.create-group-submit-button'
    );

    dialogOpenButton.addEventListener('click', function() {
        dialog.showModal();
    });

    dialog.querySelector('.close').addEventListener('click', function() {
        dialog.close();
    });

    field.addEventListener('input', function() {
        if (field.value) {
            dialogSubmitButton.MaterialButton.enable();
        } else {
            dialogSubmitButton.MaterialButton.disable();
        }
    });

    dialogSubmitButton.addEventListener('click', function() {
        const name = field.value;
        $.post('/api/staging/groups', { name: name }, function() {
            refreshGroups();
            field.value = '';
            dialog.close();
        }).fail(function(error) {
            alert(error);
        });
    });
})();
