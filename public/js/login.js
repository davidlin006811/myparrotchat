$(document).ready(function() {
    var userVal = false,
        pwdVal = false;
    $("#userInput").blur(function() {
        if (login.user.value) {
            $("#userValidation").html("");
            userVal = true;
        } else {
            $("#userValidation").html("! Email address can not be empty");
            userVal = false;
        }
    });
    $("#passwordInput").blur(function() {
        if (login.password.value) {
            $("#passwordValidation").html("");
            pwdVal = true;
        } else {
            $("#passwordValidation").html("! Password can not be empty");
            pwdVal = false;
        }
    })
    $("#login").on('submit', function(e) {
        // validation code here
        if (!userVal || !pwdVal) {
            e.preventDefault();
        }
    });
});