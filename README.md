# 🤖 Knight Bot

> ## ✨ This version: improved by [Bevon Manyara](https://brivocc.github.io)
>
> A fork of [mruniquehacker/Knightbot-MD](https://github.com/mruniquehacker/Knightbot-MD) (MIT), kept up to date with the original (v3.0.8), plus:
>
> **Easy phone numbers**
> - Set your details in a **`.env` file** instead of editing code (copy `.env.example`)
> - Numbers work **in any format**: `0712 345 678`, `+254712345678` or `254712345678` (default country code 254, changeable)
> - **`.setowner <number>`**: change the owner number **from WhatsApp**, no restart needed (only the current owner can)
> - `.sudo add 0712 345 678` now accepts local numbers too
>
> **New Kenyan commands**
> - `.holidays [year]`: Kenyan public holidays, with Easter dates calculated and a countdown to the next one
> - `.county <name|number>`: county number and headquarters for all 47 counties (`.county list`)
> - `.kes 100 usd` / `.kes 5000 to eur`: live exchange rates to and from Kenya shillings
> - `.sheng <word>`: meanings of common Sheng words
>
> **🛒 Sales & customer care (new)**
> Customers chat with the bot in private and it works like a shop assistant:
> - Welcome menu, **product list with prices**, cart (`add P3 2`), **checkout** (name + delivery location)
> - **M-Pesa** Till / Paybill instructions with the order number as account; customers send `paid <M-Pesa code>`
> - **Order tracking** (`4`), delivery & opening hours, **FAQ auto-replies**, and **talk to a person** (`7`)
> - **AI assistant** (optional, Claude API): answers free questions in English/Swahili from *your* products and FAQs only,
>   and hands over to you when unsure. Prompt caching, low effort, daily cost cap
> - **Owner alerts** on WhatsApp for every new order, payment code and help request
> - Manage everything from WhatsApp: `.shop`, `.addproduct`, `.editproduct`, `.stock`, `.addfaq`, `.orders`, `.paid`, `.delivered`, `.reply`
> - Groups keep working as a normal group bot; the owner keeps all bot commands
>
> **Safety & quality**
> - 🔒 **Security fix:** owner check no longer matches *any* sender whose ID merely contains the owner's digits (a stranger with a long `@lid` ID could become owner)
> - 🔒 **`.gitignore` fixed:** it was saved as UTF-16, so Git ignored it and `session/` (your WhatsApp login) and `.env` could be uploaded by mistake
> - ⏳ **Anti-spam cooldown:** one command every `COMMAND_COOLDOWN` seconds per user (owner and sudo exempt)
> - ✅ **Automated tests:** `npm test` (no WhatsApp needed)
>
> ### Quick start (this version)
> ```bash
> git clone https://github.com/brivocc/Knightbot-MD.git && cd Knightbot-MD
> npm install
> cp .env.example .env      # then edit .env: OWNER_NUMBER=0712345678
> npm test                  # optional: check everything works
> npm start                 # enter the pairing code in WhatsApp > Linked devices
> ```
> ⚠️ WhatsApp bots like this use an unofficial library and can get a number banned. Use a spare number, and never spam.
>
> All credit for the original bot goes to **Professor / [mruniquehacker](https://github.com/mruniquehacker)**. The original README follows.

---

This is a WhatsApp bot built using the Baileys library for group management, including features like tagging all members, muting/unmuting, and many more. It's designed to help admins efficiently manage WhatsApp groups.

<div align="center"> 
  <a href="https://git.io/typing-svg"> 
    <img src="https://readme-typing-svg.demolab.com?font=Ribeye&size=50&pause=1000&color=33ff00&center=true&width=910&height=100&lines=Knight-Bot;Multi+Device+Whatsapp+Bot;Coded+By+Professor" alt="Typing SVG" />
  </a> 
</div> 

<div align="center"> 
  <a href="https://youtube.com/@mr_unique_hacker"> 
    <img src="https://github.com/mruniquehacker/Knightbot-MD/blob/main/assets/bot_image.jpg" alt="Knight Bot" height="300"> 
  </a> 
</div>

<div align="center">
  <img src="https://img.shields.io/github/followers/mruniquehacker?style=for-the-badge&label=Followers" alt="Followers"/>
  <img src="https://img.shields.io/github/stars/mruniquehacker/Knightbot-MD?style=for-the-badge&label=Stars" alt="Stars"/>
  <img src="https://img.shields.io/github/forks/mruniquehacker/Knightbot-MD?style=for-the-badge&label=Forks" alt="Forks"/>
  <img src="https://img.shields.io/github/watchers/mruniquehacker/Knightbot-MD?style=for-the-badge&label=Watchers" alt="Watchers"/>
</div>

---

## 🤝 Sponsors

### Swiftproxy
<div align="center">
  <a href="https://www.swiftproxy.net/?ref=Knightbot" target="_blank">
    <img src="assets/swift.png" alt="Swiftproxy" width="520" />
  </a>
</div>

<br>

<div align="left">
  <a href="https://www.swiftproxy.net/?ref=Knightbot" target="_blank"><b>Swiftproxy</b></a> provides 90M+ residential IPs across 220+ locations worldwide, helping developers maintain reliable connections for WhatsApp bot hosting, automation, and location-specific web access. Supports rotating and static residential proxies, HTTP(S), and SOCKS5.<br><br>
  <b>Special Offer:</b> Free testing available, with 10% off using code <b>PROXY90</b>.
</div>

<br>

<div align="left">
  <a href="https://www.swiftproxy.net/?ref=Knightbot" target="_blank">
    <img src="https://img.shields.io/badge/Try%20Swiftproxy-2563EB?style=for-the-badge" alt="Try Swiftproxy"/>
  </a>
</div>

<br>

### RapidProxy
<div align="center">
  <a href="https://www.rapidproxy.io/?ref=Knightbot" target="_blank">
    <img src="assets/rapid.jpg" alt="RapidProxy" width="520" />
  </a>
</div>

<br>

<div align="left">
  <a href="https://www.rapidproxy.io/?ref=Knightbot" target="_blank"><b>RapidProxy</b></a> delivers fast, reliable proxy infrastructure for large-scale data operations. With high concurrency, non-expiring traffic, and AI-powered CAPTCHA bypass, it ensures efficient, uninterrupted data collection—trusted by developers worldwide.<br><br>
  90M+ Residential IPs • Smart Rotation • High Success Rate • Built for Scale<br><br>
  <b>Special Offer:</b> <a href="https://www.rapidproxy.io/?ref=Knightbot" target="_blank">Try it free</a> — Pricing from $0.65/GB with non-expiring traffic. Use code <b>RAPID10</b> for 10% off.
</div>

<br>

<div align="left">
  <a href="https://www.rapidproxy.io/?ref=Knightbot" target="_blank">
    <img src="https://img.shields.io/badge/Try%20now-28a745?style=for-the-badge" alt="Try now"/>
  </a>
</div>

<br>

### Petrosky VPS
<div align="left">
  Reliable VPS hosting for WhatsApp bots and 24/7 panels. Deploy Knight Bot on a stable server with easy management.<br><br>
  <a href="https://client.petrosky.io/aff.php?aff=394" target="_blank">
    <img src="https://img.shields.io/badge/Petrosky%20VPS-0078E7?style=for-the-badge" alt="Petrosky VPS"/>
  </a>
</div>

---

## 🚀 Steps to Deploy Bot

### Step 1: Fork the Repository

Click the button below to fork the Knight Bot repository to your GitHub account:

<div align="center">
  <a href="https://github.com/mruniquehacker/Knightbot-MD/fork">
    <img src="https://img.shields.io/badge/Fork-Repository-blue?style=for-the-badge" alt="Fork the repository"/>
  </a>
</div>

---

### Step 2: Get Pair Code

Deploy the bot and easily connect it to your WhatsApp account by pair code. Click the button below to deploy the bot on Replit.

<div align="center">
  <a href="https://knight-bot-paircode.onrender.com" target="_blank">
    <img src="https://img.shields.io/badge/GET%20PAIR%20CODE-Easy%20Method-ff4d4d?style=for-the-badge" alt="Generate Pair Code"/>
  </a>
</div>


### After getting creds.json file, upload it to session folder

---

### Step 3: Deploy Now

For further customization and setup guidance, click the button below:

<div align="center">
  <a href="https://youtu.be/-oz_u1iMgf8">
    <img src="https://img.shields.io/badge/Deploy Tutorial-dc3545?style=for-the-badge&logo=youtube" alt="YouTube Link"/>
  </a>
  <a href="https://bot-hosting.net/?aff=1068419752923508776">
    <img src="https://img.shields.io/badge/Deploy on Panel-28a745?style=for-the-badge" alt="Deploy on Panel"/>
  </a>
</div>

### Deploy on VPS

<div align="center">
  <a href="https://client.petrosky.io/aff.php?aff=394" target="_blank">
    <img src="https://img.shields.io/badge/petrosky vps-0078E7?style=for-the-badge" alt="petrosky vps"/>
  </a>
</div>

### Deploy on Below Panel
<div align="center">
<a href="https://dashboard.katabump.com/auth/login#d6b7d6" target="_blank">
  <img src="https://img.shields.io/badge/Katabump-D6B7D6?style=for-the-badge&logo=server&logoColor=black" alt="Katabump"/>
</a>
</div>

### Join Us

<div align="center">
  <a href="https://t.me/+3QhFUZHx-nhhZmY1">
    <img src="https://img.shields.io/badge/Join%20Telegram-0078E7?style=for-the-badge&logo=telegram&logoColor=white" alt="Join Telegram"/>
  </a>
  <a href="https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A">
    <img src="https://img.shields.io/badge/Join%20WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Join WhatsApp"/>
  </a>
  <a href="mailto:itsurboyvk@gmail.com">
    <img src="https://img.shields.io/badge/Contact-itsurboyvk%40gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Contact"/>
  </a>
</div>

---

## ⚙️ Features

- **Tag all group members** with the `.tagall` command
- **Admin restricted usage** (Only group admins can use certain commands)
- **Games** like Tic-Tac-Toe for interactive group engagement
- **Text-to-Speech** with `.tts`
- **Sticker creation** with `.sticker`
- **Anti-link detection** for group safety
- **Warn and manage group members** with admin control

---

## 📖 About

The Knight WhatsApp Bot assists group admins by providing them with tools to efficiently manage large WhatsApp groups. The bot uses the Baileys library to interact with the WhatsApp Web API and supports multi-device features.

It is lightweight and can be easily customized to add more commands as per your requirements. The bot runs in a Node.js environment and provides QR code-based authentication to link your WhatsApp account.

---

## 🛠️ Setup & Installation

### Prerequisites

- Node.js installed on your system
- Git installed (for cloning the repository)

### Step-by-Step Setup

1. **Clone the repository:**

    ```bash
    git clone https://github.com/mruniquehacker/Knightbot-MD.git
    cd Knightbot-MD
    ```

2. **Install the dependencies:**

    ```bash
    npm install
    ```

3. **Run the bot:**

    ```bash
    node index.js
    ```

4. **Scan the QR code:**

    Once the bot starts, a QR code will appear in the terminal. Scan this QR code using the Linked Devices feature in WhatsApp to connect your WhatsApp account with the bot.

---

## ☕ Support Me

<div align="center">

<a href="https://buymeacoffee.com/mruniquehacker" target="_blank">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support%20Developer-FF813F?style=for-the-badge&logo=buy-me-a-coffee&logoColor=white" alt="Buy Me a Coffee">
</a>

</div>

If you find this project helpful and want to support the developer, consider buying me a coffee! Your support helps maintain and improve this open-source project.

<div align="center">

<img src="assets/bmc_qr.png" alt="Buy Me a Coffee QR Code" width="200">

</div>

---

## 📄 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT) - see the [LICENSE](https://github.com/mruniquehacker/Knightbot-MD/blob/main/LICENSE) file for details.

---

## 🙌 Contributions

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/mruniquehacker/Knightbot-MD/issues).

---

## 🌟 Show your support

If you like this project, please give it a [⭐️ star on GitHub](https://github.com/mruniquehacker/Knightbot)!


## Credits

- [Professor](https://github.com/mruniquehacker)
- [Baileys](https://github.com/adiwajshing/Baileys)
- [TechGod143](https://github.com/TechGod143) for pair code
- [Dgxeon](https://github.com/Dgxeon) for pair code

---

## ⚠️ Important Warning

**Note:** This bot is created for educational purposes only. This is NOT an official WhatsApp bot. Using this bot may lead to your WhatsApp account being banned. Use it at your own risk. The developers will not be responsible for any consequences or account bans that may occur while using this bot.

## 📝 Legal

- This project is not affiliated with, authorized, maintained, sponsored or endorsed by WhatsApp or any of its affiliates or subsidiaries.
- This is an independent and unofficial software. Use at your own risk.
- Do not spam people with this bot.
- Do not use this bot to send bulk messages or for illegal purposes.
- The developers assume no liability and are not responsible for any misuse or damage caused by this program.

### License
This project is licensed under the MIT License. However, you must:
- Use this software in compliance with all applicable laws and regulations
- Include original license and copyright notices
- Credit original authors
- Not use for spam or malicious purposes

## 📜 Copyright Notice

Copyright (c) 2024 Professor. All rights reserved.

This project contains code from various open source projects:
- Baileys (MIT License)
- Other libraries as listed in package.json
