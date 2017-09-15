# myparrotchat
![capture3a](https://user-images.githubusercontent.com/22565449/29981355-6a983fca-8f1b-11e7-9994-d98625e55f92.PNG)
### A web chat 
### A self-hosted chat app built with Node.js, Javascript, JQuery, Mongodb, Mongoose, Socket.io, Webrtc, CSS, Bootstrap, JSON, AJAX, and HTML
![capture_chat1](https://user-images.githubusercontent.com/22565449/30354466-b9309ba4-97fa-11e7-815c-0a46c94c5c52.PNG)

### Features
 - Private and password-protected users
 - Account activation by email, account register, user authentication and shadow password
 - Remember me / reset password by email
 - Offline messages / chat history
 - New message alerts / notifications
 - Text, emoji and photo submit
 - File upload / download
 - Peer to peer video and audio chat
 - Snapshot functionality in video chat
 - Multiple groups
 - Easy user and group search
 - Free contacter adding and removing 
 - An easy way to create group, remove group, join group, and withdraw from group freely 
 - One to one private chat and one to mutilple group chat
 - A simple way to toggle between deafult input panel and floating input panel
### Compatbility
 This application can run well on Chrome, Firefox and Opera. IE and Edage cannot support this application well, so please avoid using IE or Edge to access this application. This application has not been tested on safari yet, and I will update this information if I get the test result on Safari.
### Security Issues
The website https://www.myparrotchat.com uses a self-generated certificate. Most of web broswers treat it as a unsafe website and prevent the users from visiting this website. In fact, this website is ver safe. User authentication and shadow password can prevent illegal login and passowrd cracking. In addition, this website just asks the user to offer the basic information for register, and there is no important information saved on this website. To troubleshoot the security issues, please click [Here](https://github.com/davidlin006811/myparrotchat/wiki/Troubleshooting)

### Installation
If you want to run this application on local machine as your chat web server, please follow this [instruction](https://github.com/davidlin006811/myparrotchat/wiki/Installation) step by step. You will never get wrong.

### Panel Illustration
Please click [here](https://github.com/davidlin006811/myparrotchat/wiki/Illustration)

### Default Input Panel / Float textEditor Switch
If you don't like the style of default input panel and want to use a large multi-line input panel, you can right click the default input panel to enable Float textEditor. If Float textEditor is enabled, the functions of default input panel will be disabled so you can not use default input panel. If you want to switch back, please close the Float textEditor. The default input panel will be reenabled and reused.

### Known Issues

1. Security Issue. This website uses a self-generated certificate (I am very sorry about that. I don't intend to pay much on a personal website), but it is a safe website. Don't worry about the security. If you experience some security issues when visiting this website, please refer [here](https://github.com/davidlin006811/myparrotchat/wiki/Troubleshooting).

2. No "Paste" menu appears when right click input field. This is the limitation of all browsers. "Paste" event is a system event that a browser could not simulate. A way will be found to fix this issue in the next version.

3. Emoji icon can only be appended to the end of the string in float textEditor. It is caused by the limitation of HTML and the bug of Emoji plugin. If you need to insert emoji icons in float textEditor, please use CTRL + X and CREL + V or use default input field. This issue will be fixed in the next version.

4. No image displays in chat history. Because this application uses local storage to save data, and each user has only maximum 10 MB size space on local storage (it depends on which browser you use), so the images would not be saved on local storage. In the next version, data will be save on indexedDB, so that each user could store at least 250 MB data (it depands on the free space of your hard disk). 

### Manual(To be done)
