var nodemailer = require("nodemailer");
var xoauth2 = require("xoauth2");

module.exports.emailRedirect = function(mailService, email, req, res) {
    switch (mailService) {
        case "gmail.com":
            res.redirect("https://mail.google.com/mail/u/?authuser=" + email);
            break;
        case "hotmail.com":
            res.redirect('https://login.live.com/login.srf?wa=wsignin1.0&rpsnv=13&ct=1498413278&rver=6.7.6643.0&wp=MBI_SSL_SHARED&wreply=https:%2F%2Fmail.live.com%2Fdefault.aspx&lc=1033&id=64855&mkt=en-us&cbcxt=mai');
            break;
        case "yahoo.com":
            res.redirect('https://login.yahoo.com/config/login_verify2?.redir');
            break;
        case "icloud.com":
            res.redirect('https://www.icloud.com/');
            break;
        case "aol.com":
            res.redirect('https://my.screenname.aol.com/_cqr/login/login.psp?sitedomain=sns.mail.aol.com&seamless=novl&lang=en&locale=US&authLev=0&siteState=uv%3AAOL%7Crt%3ASTD%7Cat%3ASNS%7Clc%3Aen_US%7Cld%3Amail.aol.com%7Csnt%3AScreenName%7Csid%3Acb2ae83d-da47-4daa-8e83-b56685cff267%7Cqp%3A%7C&offerId=newmail-en-us-v2');
            break;
        case "zoho.com":
            res.redirect('https://www.zoho.com/mail/login.html');
            break;
        case "gmx.com":
            res.redirect('https://www.gmx.com/#.2831486-header-navlogin2-1');
            break;
        case "mail.com":
            res.redirect('https://www.mail.com/int/');
            break;
        case "algonquinlive.com":
            res.redirect('https://sts.algonquincollege.com/adfs/ls/?client-request-id=0daad8ef-b793-49af-a589-3eb27d002b34&username=&wa=wsignin1.0&wtrealm=urn%3afederation%3aMicrosoftOnline&wctx=estsredirect%3d2%26estsrequest%3drQIIAdNiNtQztFIxgAAjXRCpa5CWZqibnApiIYEiIS6B9zdW8U7evt5zaafdploGbZNZjIKJOen5eYWlmXk5mWWpesn5uasY5TNKSgqKrfT180tLcvLzs_Xy09Iyk8GS-vnlifo7GBkvMDKuYjI3MzYzNjEwNDQztjQ3NrY0NLPQS05MMzBLNU7VTU01sNQ1MTaz1E0yTk7SNTAyMTdPMzdLNE0xusXE7-9YWpJhBCLyizKrUj8xcablF-XGF-QXl8xi1gfbYl-UmpiTa4vhPrVEoK6g1JTMotTkEtuSotLUVcxEBcAmZjag9tz8vFPMbPkFqXmZKRdYGF-x8BgwW3FwcAkwSDAoMPxgYVzECgyopXV7XWtLrLwXzsg5JfOJn-EUq35pWVWOd6BHXn6Ub5lfqmOJqU-wpXd5Rbl2eZhbnodfWWFVUJCRu2d2iGmgrYWV4QQ2xglsbLs4CQUmAA2');
            break;
        case "hushmail.com":
            res.redirect('https://www.hushmail.com/');
            break;
        case "inbox.com":
            res.redirect('https://www.inbox.com/login.aspx?gdi=true');
            break;
        case "lycos.com":
            res.redirect('http://www.mail.lycos.com/');
            break;
        case "yandex.com":
            res.redirect('https://mail.yandex.com/');
            break;
        case "tutanota.com":
            res.redirect('https://app.tutanota.com/#login');
            break;
        case "protomail.com":
            res.redirect('https://mail.protonmail.com/login');
            break;
        default:
            res.redirect('/manualverify');
    }
}

module.exports.sendEmail = function(email_address, subject, content, url, res) {

    var smtpTransporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            type: 'OAuth2',
            user: 'davidlin006811@@gmail.com',
            clientId: 'Your mailbox client ID',
            clientSecret: 'xxxxxx-xxxxxxxxxxxxxxxxx',
            refreshToken: 'x/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx_xxxxxxxx'
        },
    });

    /*
     var smtpTransport = nodemailer.createTransport({
         service: "gmail",

          
         auth: {
             user: "davidlin006811@gmail.com",
             pass: "Davidlin@@02040019"
         }
     });*/
    var mailOptions = {
        from: 'Sixian Lin<davidlin006811@gmail.com>',
        to: email_address,
        subject: subject,
        html: content
    }
    smtpTransporter.sendMail(mailOptions, function(err, success) {
        if (err) throw err;
        res.redirect(url);
    });
}
