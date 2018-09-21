(function() {
    const inviteButton = document.querySelector('.invite-button');
    const inviteTextField = document.querySelector('#invite-email');
    inviteButton.addEventListener('click', function() {
        const email = inviteTextField.value;
        inviteTextField.parentNode.MaterialTextfield.change('');
        if (email) {
            $.post('/api/staging/group/' + app.getGroupId() + '/invite', { email: email }, function() {
                refreshGroup(app.getGroupId());
            }).fail(function(error) {
                inviteTextField.value = email;
                alert(error);
            });
        }
    });
})();
