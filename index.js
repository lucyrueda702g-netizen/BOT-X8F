require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder,
        PermissionFlagsBits, ChannelType, SlashCommandBuilder,
        ActionRowBuilder, ButtonBuilder, ButtonStyle,
        REST, Routes, ActivityType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// STORAGE
const guildConfigs  = new Map();
const economy       = new Map();
const bankStorage   = new Map();
const dailyCooldown = new Map();
const workCooldown  = new Map();
const fishCooldown  = new Map();
const mineCooldown  = new Map();
const xpData        = new Map();
const marriages     = new Map();
const pets          = new Map();
const inventory     = new Map();
const birthdays     = new Map();
const warnings      = new Map();
const afkUsers      = new Map();
const profiles      = new Map();
const reactionCount = new Map();

function getConfig(id) {
    if (!guildConfigs.has(id)) guildConfigs.set(id, {welcomeChannel:null,farewellChannel:null,logsChannel:null,levelChannel:null});
    return guildConfigs.get(id);
}
const getCoins = uid => economy.get(uid)||0;
const addCoins = (uid,n) => economy.set(uid, getCoins(uid)+n);
const removeCoins = (uid,n) => economy.set(uid, Math.max(0,getCoins(uid)-n));
const getBank = uid => bankStorage.get(uid)||0;
const getXP = uid => xpData.get(uid)||{xp:0,level:1};
function addXP(uid,n){
    const d=getXP(uid); d.xp+=n;
    const needed=d.level*100;
    if(d.xp>=needed){d.level++;d.xp-=needed;}
    xpData.set(uid,d); return d;
}
const getInventory = uid => inventory.get(uid)||[];
function addItem(uid,item){
    const inv=getInventory(uid);
    const ex=inv.find(i=>i.id===item.id);
    if(ex) ex.amount++; else inv.push({...item,amount:1});
    inventory.set(uid,inv);
}
const getWarnings = uid => warnings.get(uid)||[];
function addWarning(uid,w){const ws=getWarnings(uid);ws.push(w);warnings.set(uid,ws);}
const getProfile = uid => profiles.get(uid)||{bio:'Sin bio'};
function addReaction(uid,action){reactionCount.set(`${uid}-${action}`,(reactionCount.get(`${uid}-${action}`)||0)+1);}
const getReactions = (uid,action) => reactionCount.get(`${uid}-${action}`)||0;

const C = {
    green:0x57F287,red:0xED4245,blue:0x5865F2,yellow:0xFEE75C,
    purple:0x9B59B6,orange:0xE67E22,cyan:0x00BCD4,pink:0xFF69B4,
    gold:0xFFD700,white:0xFFFFFF,dark:0x2C2F33
};

const GIFS = {
    hug:['https://media.tenor.com/3FNiuJzs5N8AAAAC/anime-hug.gif'],
    pat:['https://media.tenor.com/zesU5pA2C0MAAAAC/pat-head.gif'],
    kiss:['https://media.tenor.com/JtBLWo5KZOsAAAAC/kiss-anime.gif'],
    slap:['https://media.tenor.com/1OuqpCPPH-QAAAAC/slap-anime.gif'],
    cry:['https://media.tenor.com/X1pks3cmM6YAAAAC/cry-anime.gif'],
    dance:['https://media.tenor.com/hUqZAJFIvusAAAAC/anime-dance.gif'],
    bite:['https://media.tenor.com/1bJpKOdYSbwAAAAC/anime-bite.gif'],
    poke:['https://media.tenor.com/M5DXqSBSS2kAAAAC/poke-anime.gif'],
    cuddle:['https://media.tenor.com/wOwOt5pxDQUAAAAC/cuddle-anime.gif'],
    wave:['https://media.tenor.com/EKGgHShv1hkAAAAC/wave-anime.gif'],
    nod:['https://media.tenor.com/MdH0VWAA2BUAAAAC/nod-anime.gif'],
    blush:['https://media.tenor.com/IgXz_iQ4pkYAAAAC/blush-anime.gif'],
    smile:['https://media.tenor.com/QEDqZDWM0dcAAAAC/smile-anime.gif'],
    stare:['https://media.tenor.com/2LfGCdm2fjsAAAAC/anime-stare.gif'],
    baka:['https://media.tenor.com/Sk8uuSjKd2cAAAAC/baka-anime.gif'],
    nom:['https://media.tenor.com/UGz5V8n56CYAAAAC/nom-anime.gif'],
    kill:['https://media.tenor.com/A1krmPj3TMMAAAAC/anime-kill.gif'],
    punch:['https://media.tenor.com/KO3_5MkqQiQAAAAC/anime-punch.gif'],
    run:['https://media.tenor.com/5G_ANshKxNAAAAAC/anime-run.gif'],
    think:['https://media.tenor.com/MlGGDGoh15kAAAAC/thinking-anime.gif'],
};
const randomGif = action => { const l=GIFS[action]||[]; return l[Math.floor(Math.random()*l.length)]||null; };

const SHOP_ITEMS = [
    {id:'rod',name:'🎣 Caña de pescar',price:200,desc:'Para pescar'},
    {id:'pickaxe',name:'⛏️ Pico',price:300,desc:'Para minar'},
    {id:'laptop',name:'💻 Laptop',price:500,desc:'Trabaja mejor'},
    {id:'ring',name:'💍 Anillo',price:1000,desc:'Para casarte'},
    {id:'seed',name:'🌱 Semilla',price:50,desc:'Para plantar'},
    {id:'potion',name:'🧪 Poción',price:150,desc:'Cura mascota'},
    {id:'lucky',name:'🍀 Trébol',price:800,desc:'Dobla coins'},
    {id:'chest',name:'📦 Cofre',price:600,desc:'Items misteriosos'},
    {id:'sword',name:'⚔️ Espada',price:700,desc:'Para batalla'},
    {id:'shield',name:'🛡️ Escudo',price:400,desc:'Protege en batalla'},
];

// COMMANDS BUILDER
const mkCmd = (name,desc) => new SlashCommandBuilder().setName(name).setDescription(desc);
const mkUser = (cmd,name,desc,req=false) => cmd.addUserOption(o=>o.setName(name).setDescription(desc).setRequired(req));
const mkStr = (cmd,name,desc,req=false) => cmd.addStringOption(o=>o.setName(name).setDescription(desc).setRequired(req));
const mkInt = (cmd,name,desc,req=false,min=null,max=null) => {
    let opt = o=>{ let x=o.setName(name).setDescription(desc).setRequired(req); if(min!==null)x=x.setMinValue(min); if(max!==null)x=x.setMaxValue(max); return x; };
    return cmd.addIntegerOption(opt);
};
const mkChan = (cmd,name,desc,req=false) => cmd.addChannelOption(o=>o.setName(name).setDescription(desc).setRequired(req));
const mkRole = (cmd,name,desc,req=false) => cmd.addRoleOption(o=>o.setName(name).setDescription(desc).setRequired(req));
const mkPerm = (cmd,perm) => cmd.setDefaultMemberPermissions(perm);

const commands = [
    // CONFIG
    mkCmd('setup','⚙️ Auto configura el servidor completo'),
    mkChan(mkCmd('setwelcome','👋 Canal de bienvenidas'),'canal','Canal',true),
    mkChan(mkCmd('setfarewell','👋 Canal de despedidas'),'canal','Canal',true),
    mkChan(mkCmd('setlogs','📋 Canal de logs'),'canal','Canal',true),
    mkChan(mkCmd('setlevel','✨ Canal de niveles'),'canal','Canal',true),
    mkCmd('testwelcome','🧪 Probar bienvenida'),
    mkCmd('testfarewell','🧪 Probar despedida'),
    // INFO
    mkCmd('ping','🏓 Latencia'),
    mkUser(mkCmd('userinfo','👤 Info usuario'),'usuario','Usuario'),
    mkCmd('serverinfo','🏠 Info servidor'),
    mkUser(mkCmd('avatar','🖼️ Avatar'),'usuario','Usuario'),
    mkCmd('botinfo','🤖 Info bot'),
    mkRole(mkCmd('roleinfo','🎭 Info rol'),'rol','Rol',true),
    mkChan(mkCmd('channelinfo','📢 Info canal'),'canal','Canal'),
    mkCmd('membercount','👥 Miembros'),
    mkCmd('stats','📈 Estadísticas'),
    mkCmd('invite','🔗 Invitación'),
    mkCmd('banner','🖼️ Banner servidor'),
    mkCmd('icon','🖼️ Ícono servidor'),
    mkCmd('emojis','😀 Emojis'),
    mkCmd('roles','🎭 Lista de roles'),
    mkCmd('boosts','🚀 Boosts'),
    // MODERACION
    mkPerm(mkStr(mkUser(mkCmd('ban','🔨 Banear'),'usuario','Usuario',true),'razon','Razón'),PermissionFlagsBits.BanMembers),
    mkPerm(mkStr(mkUser(mkCmd('kick','👢 Expulsar'),'usuario','Usuario',true),'razon','Razón'),PermissionFlagsBits.KickMembers),
    mkPerm(mkInt(mkUser(mkCmd('mute','🔇 Silenciar'),'usuario','Usuario',true),'minutos','Minutos',false,1,10080),PermissionFlagsBits.ModerateMembers),
    mkPerm(mkUser(mkCmd('unmute','🔊 Quitar silencio'),'usuario','Usuario',true),PermissionFlagsBits.ModerateMembers),
    mkPerm(mkStr(mkUser(mkCmd('warn','⚠️ Advertir'),'usuario','Usuario',true),'razon','Razón',true),PermissionFlagsBits.ModerateMembers),
    mkUser(mkCmd('warnings','⚠️ Ver advertencias'),'usuario','Usuario'),
    mkPerm(mkUser(mkCmd('clearwarnings','🗑️ Borrar advertencias'),'usuario','Usuario',true),PermissionFlagsBits.ModerateMembers),
    mkPerm(mkInt(mkCmd('clear','🗑️ Borrar mensajes'),'cantidad','Cantidad',true,1,100),PermissionFlagsBits.ManageMessages),
    mkPerm(mkChan(mkCmd('lock','🔒 Bloquear canal'),'canal','Canal'),PermissionFlagsBits.ManageChannels),
    mkPerm(mkChan(mkCmd('unlock','🔓 Desbloquear canal'),'canal','Canal'),PermissionFlagsBits.ManageChannels),
    mkPerm(mkInt(mkCmd('slowmode','🐌 Modo lento'),'segundos','Segundos',true,0,21600),PermissionFlagsBits.ManageChannels),
    mkPerm(mkStr(mkUser(mkCmd('nickname','✏️ Cambiar apodo'),'usuario','Usuario',true),'apodo','Apodo'),PermissionFlagsBits.ManageNicknames),
    mkPerm(mkRole(mkUser(mkCmd('role','🎭 Dar/quitar rol'),'usuario','Usuario',true),'rol','Rol',true),PermissionFlagsBits.ManageRoles),
    mkPerm(mkStr(mkCmd('unban','✅ Desbanear'),'id','ID usuario',true),PermissionFlagsBits.BanMembers),
    mkPerm(mkStr(mkUser(mkCmd('softban','🔨 Softban'),'usuario','Usuario',true),'razon','Razón'),PermissionFlagsBits.BanMembers),
    mkPerm(mkCmd('banlist','📋 Lista baneados'),PermissionFlagsBits.BanMembers),
    mkPerm(mkCmd('lockdown','🔒 Lockdown servidor'),PermissionFlagsBits.Administrator),
    // NIVELES
    mkUser(mkCmd('rank','✨ Ver rango'),'usuario','Usuario'),
    mkCmd('top','🏆 Top niveles'),
    mkPerm(mkInt(mkUser(mkCmd('addxp','⬆️ Agregar XP'),'usuario','Usuario',true),'cantidad','XP',true,1),PermissionFlagsBits.Administrator),
    // ECONOMIA
    mkUser(mkCmd('balance','💰 Ver balance'),'usuario','Usuario'),
    mkCmd('daily','💵 Recompensa diaria'),
    mkCmd('work','💼 Trabajar'),
    mkCmd('fish','🎣 Pescar'),
    mkCmd('mine','⛏️ Minar'),
    mkUser(mkCmd('rob','🦹 Robar'),'usuario','Usuario',true),
    mkInt(mkCmd('deposit','🏦 Depositar'),'cantidad','Cantidad',true,1),
    mkInt(mkCmd('withdraw','🏦 Retirar'),'cantidad','Cantidad',true,1),
    mkInt(mkUser(mkCmd('pay','💸 Pagar'),'usuario','Usuario',true),'cantidad','Cantidad',true,1),
    mkCmd('shop','🏪 Tienda'),
    mkStr(mkCmd('buy','🛒 Comprar item'),'item','ID del item',true),
    mkUser(mkCmd('inventory','🎒 Inventario'),'usuario','Usuario'),
    mkCmd('leaderboard','🏆 Top monedas'),
    mkInt(mkCmd('slots','🎰 Tragamonedas'),'apuesta','Apuesta',true,10),
    mkInt(mkCmd('blackjack','🃏 Blackjack'),'apuesta','Apuesta',true,10),
    new SlashCommandBuilder().setName('flip').setDescription('🪙 Apostar moneda').addStringOption(o=>o.setName('eleccion').setDescription('cara/cruz').setRequired(true).addChoices({name:'Cara',value:'cara'},{name:'Cruz',value:'cruz'})).addIntegerOption(o=>o.setName('apuesta').setDescription('Apuesta').setRequired(true).setMinValue(1)),
    // MATRIMONIOS
    mkUser(mkCmd('marry','💍 Proponer matrimonio'),'usuario','Usuario',true),
    mkCmd('divorce','💔 Divorciarse'),
    mkUser(mkCmd('partner','💑 Ver pareja'),'usuario','Usuario'),
    // MASCOTAS
    new SlashCommandBuilder().setName('adopt').setDescription('🐱 Adoptar mascota').addStringOption(o=>o.setName('nombre').setDescription('Nombre').setRequired(true)).addStringOption(o=>o.setName('tipo').setDescription('Tipo').setRequired(true).addChoices({name:'🐱 Gato',value:'gato'},{name:'🐶 Perro',value:'perro'},{name:'🐰 Conejo',value:'conejo'},{name:'🐉 Dragón',value:'dragon'})),
    mkUser(mkCmd('pet','🐾 Ver mascota'),'usuario','Usuario'),
    mkCmd('feed','🍖 Alimentar mascota'),
    mkCmd('play','🎮 Jugar con mascota'),
    mkCmd('heal','💊 Curar mascota'),
    mkStr(mkCmd('petname','✏️ Renombrar mascota'),'nombre','Nombre',true),
    // CUMPLEANOS
    mkStr(mkCmd('setbirthday','🎂 Registrar cumpleaños'),'fecha','Fecha DD/MM',true),
    mkUser(mkCmd('birthday','🎂 Ver cumpleaños'),'usuario','Usuario'),
    mkCmd('birthdays','🎂 Todos los cumpleaños'),
    // PERFIL
    mkUser(mkCmd('profile','👤 Ver perfil'),'usuario','Usuario'),
    mkStr(mkCmd('setbio','✏️ Establecer bio'),'bio','Tu bio',true),
    // ROLEPLAY
    mkUser(mkCmd('hug','🤗 Abrazar'),'usuario','Usuario',true),
    mkUser(mkCmd('pat','👋 Palmear'),'usuario','Usuario',true),
    mkUser(mkCmd('kiss','💋 Besar'),'usuario','Usuario',true),
    mkUser(mkCmd('slap','👋 Abofetear'),'usuario','Usuario',true),
    mkUser(mkCmd('bite','😈 Morder'),'usuario','Usuario',true),
    mkUser(mkCmd('poke','☝️ Tocar'),'usuario','Usuario',true),
    mkUser(mkCmd('cuddle','🥰 Abrazar fuerte'),'usuario','Usuario',true),
    mkUser(mkCmd('wave','👋 Saludar'),'usuario','Usuario'),
    mkUser(mkCmd('cry','😢 Llorar'),'usuario','Usuario'),
    mkUser(mkCmd('dance','💃 Bailar'),'usuario','Usuario'),
    mkUser(mkCmd('nod','🙂 Asentir'),'usuario','Usuario'),
    mkUser(mkCmd('blush','😊 Ruborizarse'),'usuario','Usuario'),
    mkUser(mkCmd('smile','😊 Sonreír'),'usuario','Usuario'),
    mkUser(mkCmd('stare','👀 Mirar fijamente'),'usuario','Usuario'),
    mkUser(mkCmd('baka','😤 Baka!'),'usuario','Usuario'),
    mkUser(mkCmd('nom','😋 Morder comiendo'),'usuario','Usuario'),
    mkUser(mkCmd('punch','👊 Golpear'),'usuario','Usuario',true),
    mkCmd('run','🏃 Correr'),
    mkCmd('think','🤔 Pensar'),
    mkUser(mkCmd('kill','⚔️ Atacar'),'usuario','Usuario',true),
    // DIVERSION
    mkStr(mkCmd('8ball','🎱 Bola mágica'),'pregunta','Pregunta',true),
    mkCmd('coinflip','🪙 Lanzar moneda'),
    mkInt(mkCmd('dice','🎲 Tirar dado'),'caras','Caras',false,2,100),
    new SlashCommandBuilder().setName('rps').setDescription('✊ Piedra papel tijeras').addStringOption(o=>o.setName('eleccion').setDescription('Elección').setRequired(true).addChoices({name:'✊ Piedra',value:'piedra'},{name:'📄 Papel',value:'papel'},{name:'✂️ Tijeras',value:'tijeras'})),
    mkCmd('quote','💭 Frase motivacional'),
    mkUser(mkUser(mkCmd('ship','💕 Shipear'),'usuario1','Usuario 1',true),'usuario2','Usuario 2',true),
    mkStr(mkCmd('rate','⭐ Valorar'),'cosa','Qué valorar',true),
    mkStr(mkCmd('choose','🤔 Elegir'),'opciones','Separadas por coma',true),
    mkCmd('trivia','🧠 Trivia'),
    mkCmd('joke','😄 Chiste'),
    mkCmd('meme','😂 Meme'),
    mkCmd('wyr','❓ Preferirías...'),
    mkCmd('nhie','🙈 Nunca he jamás'),
    mkCmd('truth','💬 Verdad'),
    mkCmd('dare','🔥 Reto'),
    mkUser(mkCmd('compliment','💖 Cumplido'),'usuario','Usuario',true),
    mkUser(mkCmd('insult','😤 Insulto broma'),'usuario','Usuario',true),
    mkUser(mkCmd('roast','🔥 Roast'),'usuario','Usuario',true),
    mkUser(mkCmd('howgay','🌈 Qué tan gay'),'usuario','Usuario'),
    mkUser(mkCmd('howcute','🥰 Qué tan cute'),'usuario','Usuario'),
    mkUser(mkCmd('howdumb','🤪 Qué tan tonto'),'usuario','Usuario'),
    mkCmd('fortune','🔮 Fortuna del día'),
    mkInt(mkCmd('password','🔐 Generar contraseña'),'longitud','Longitud',false,8,32),
    mkCmd('cat','🐱 Foto gatito'),
    mkCmd('dog','🐶 Foto perrito'),
    mkCmd('fox','🦊 Foto zorro'),
    mkCmd('panda','🐼 Foto panda'),
    // ANIME
    mkStr(mkCmd('anime','🎌 Info anime'),'nombre','Anime',true),
    mkStr(mkCmd('manga','📚 Info manga'),'nombre','Manga',true),
    mkCmd('waifu','🌸 Waifu aleatoria'),
    mkCmd('neko','🐱 Imagen neko'),
    // UTILIDADES
    mkStr(mkStr(mkCmd('embed','📝 Crear embed'),'titulo','Título',true),'descripcion','Descripción',true),
    mkStr(mkCmd('say','💬 Hablar como bot'),'mensaje','Mensaje',true),
    mkStr(mkChan(mkCmd('announce','📣 Anuncio'),'canal','Canal'),'mensaje','Mensaje',true),
    mkStr(mkCmd('poll','📊 Encuesta'),'pregunta','Pregunta',true),
    mkInt(mkStr(mkCmd('giveaway','🎉 Sorteo'),'premio','Premio',true),'ganadores','Ganadores',true,1),
    mkStr(mkInt(mkCmd('reminder','⏰ Recordatorio'),'minutos','Minutos',true,1),'mensaje','Mensaje',true),
    mkStr(mkCmd('afk','😴 Modo AFK'),'razon','Razón'),
    mkStr(mkStr(mkCmd('translate','🌐 Traducir'),'texto','Texto',true),'idioma','Idioma (es/en/fr)',true),
    mkStr(mkCmd('weather','🌤️ Clima'),'ciudad','Ciudad',true),
    mkStr(mkCmd('wikipedia','📖 Wikipedia'),'busqueda','Búsqueda',true),
    mkStr(mkCmd('color','🎨 Ver color'),'hex','Color hex',true),
    mkStr(mkCmd('qr','📱 Código QR'),'texto','Texto/URL',true),
    mkCmd('nowplaying','🎵 Qué escucha alguien'),
    mkCmd('help','❓ Ver todos los comandos'),
].map(c=>c.toJSON());

// READY
client.once('ready', async () => {
    console.log('✅ Bot: ' + client.user.tag + ' | Comandos: ' + commands.length);
    client.user.setActivity(commands.length + ' comandos | /help', { type: ActivityType.Watching });
    const rest = new REST({version:'10'}).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), {body:commands});
        console.log('✅ ' + commands.length + ' comandos registrados!');
    } catch(e) { console.error('❌', e.message); }
});

// XP ON MESSAGE
client.on('messageCreate', async msg => {
    if (msg.author.bot || !msg.guild) return;
    if (afkUsers.has(msg.author.id)) {
        afkUsers.delete(msg.author.id);
        msg.reply({embeds:[new EmbedBuilder().setDescription('✅ Ya no estás AFK ' + msg.author).setColor(C.green)],allowedMentions:{repliedUser:false}}).catch(()=>{});
    }
    for (const mentioned of msg.mentions.users.values()) {
        if (afkUsers.has(mentioned.id)) {
            const reason = afkUsers.get(mentioned.id);
            msg.reply({embeds:[new EmbedBuilder().setDescription('😴 **' + mentioned.username + '** está AFK' + (reason ? ': ' + reason : '')).setColor(C.yellow)],allowedMentions:{repliedUser:false}}).catch(()=>{});
        }
    }
    const xpGain = Math.floor(Math.random()*15)+5;
    const d = addXP(msg.author.id, xpGain);
    if (d.xp < xpGain) {
        const config = getConfig(msg.guild.id);
        const ch = config.levelChannel ? msg.guild.channels.cache.get(config.levelChannel) : msg.channel;
        if (ch) ch.send({embeds:[new EmbedBuilder().setDescription('🎉 ' + msg.author + ' subió al nivel **' + d.level + '**!').setColor(C.gold)]}).catch(()=>{});
    }
});

// WELCOME
client.on('guildMemberAdd', async member => {
    const config = getConfig(member.guild.id);
    if (!config.welcomeChannel) return;
    const ch = member.guild.channels.cache.get(config.welcomeChannel);
    if (!ch) return;
    const embed = new EmbedBuilder()
        .setTitle('👋 ¡Bienvenido a ' + member.guild.name + '!')
        .setDescription('¡Hola ' + member + '! 🎉\nEres el miembro número **' + member.guild.memberCount + '**')
        .setThumbnail(member.user.displayAvatarURL({dynamic:true,size:256}))
        .setColor(C.green)
        .addFields(
            {name:'📛 Usuario',value:member.user.tag,inline:true},
            {name:'📅 Cuenta creada',value:'<t:' + Math.floor(member.user.createdTimestamp/1000) + ':R>',inline:true},
        )
        .setFooter({text:'Miembro #' + member.guild.memberCount})
        .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('📜 Reglas').setStyle(ButtonStyle.Primary).setCustomId('rules_btn'),
        new ButtonBuilder().setLabel('💬 General').setStyle(ButtonStyle.Secondary).setCustomId('general_btn'),
    );
    await ch.send({content:'' + member,embeds:[embed],components:[row]});
    logAction(member.guild,'📥 Nuevo miembro',member.user.tag + ' se unió',C.green);
});

// FAREWELL
client.on('guildMemberRemove', async member => {
    const config = getConfig(member.guild.id);
    if (!config.farewellChannel) return;
    const ch = member.guild.channels.cache.get(config.farewellChannel);
    if (!ch) return;
    const embed = new EmbedBuilder()
        .setTitle('👋 Un miembro se fue')
        .setDescription('**' + member.user.tag + '** abandonó el servidor\nAhora somos **' + member.guild.memberCount + '** miembros')
        .setThumbnail(member.user.displayAvatarURL({dynamic:true}))
        .setColor(C.red).setTimestamp();
    await ch.send({embeds:[embed]});
    logAction(member.guild,'📤 Miembro salió',member.user.tag + ' se fue',C.red);
});

async function logAction(guild, title, description, color) {
    const config = getConfig(guild.id);
    if (!config.logsChannel) return;
    const ch = guild.channels.cache.get(config.logsChannel);
    if (!ch) return;
    await ch.send({embeds:[new EmbedBuilder().setTitle(title).setDescription(description).setColor(color||C.blue).setTimestamp()]}).catch(()=>{});
}

async function sendRoleplay(interaction, action, target, selfMsg, targetMsg, color) {
    const gif = randomGif(action);
    const u = interaction.user;
    const desc = target ? '**' + u.username + '** ' + targetMsg + ' **' + target.username + '**' : '**' + u.username + '** ' + selfMsg;
    addReaction(u.id, action);
    if (target) addReaction(target.id, 'received_' + action);
    const embed = new EmbedBuilder().setDescription(desc).setColor(color||C.pink).setFooter({text:u.username + ' ha hecho ' + action + ' ' + getReactions(u.id,action) + ' veces'});
    if (gif) embed.setImage(gif);
    await interaction.reply({embeds:[embed]});
}

// INTERACTIONS
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const {commandName:cmd, guild, member, user} = interaction;
    try {

    if (cmd==='help') {
        const embed = new EmbedBuilder().setTitle('❓ Lista de Comandos').setColor(C.blue)
            .addFields(
                {name:'⚙️ Config (7)',value:'`/setup` `/setwelcome` `/setfarewell` `/setlogs` `/setlevel` `/testwelcome` `/testfarewell`'},
                {name:'👤 Info (12)',value:'`/userinfo` `/serverinfo` `/avatar` `/ping` `/botinfo` `/stats` `/membercount` `/roles` `/emojis` `/boosts` `/banner` `/icon`'},
                {name:'🔨 Moderación (17)',value:'`/ban` `/kick` `/mute` `/unmute` `/warn` `/warnings` `/clearwarnings` `/clear` `/lock` `/unlock` `/slowmode` `/nickname` `/role` `/unban` `/softban` `/banlist` `/lockdown`'},
                {name:'✨ Niveles (3)',value:'`/rank` `/top` `/addxp`'},
                {name:'💰 Economía (15)',value:'`/balance` `/daily` `/work` `/fish` `/mine` `/rob` `/deposit` `/withdraw` `/pay` `/shop` `/buy` `/inventory` `/leaderboard` `/slots` `/blackjack`'},
                {name:'🎭 Roleplay (20)',value:'`/hug` `/pat` `/kiss` `/slap` `/bite` `/poke` `/cuddle` `/wave` `/cry` `/dance` `/nod` `/blush` `/smile` `/stare` `/baka` `/nom` `/punch` `/run` `/think` `/kill`'},
                {name:'💍 Matrimonios (3)',value:'`/marry` `/divorce` `/partner`'},
                {name:'🐾 Mascotas (6)',value:'`/adopt` `/pet` `/feed` `/play` `/heal` `/petname`'},
                {name:'🎂 Cumpleaños (3)',value:'`/birthday` `/setbirthday` `/birthdays`'},
                {name:'👤 Perfil (2)',value:'`/profile` `/setbio`'},
                {name:'🎮 Diversión (25)',value:'`/8ball` `/coinflip` `/dice` `/rps` `/quote` `/ship` `/rate` `/choose` `/trivia` `/joke` `/meme` `/wyr` `/nhie` `/truth` `/dare` `/compliment` `/insult` `/roast` `/howgay` `/howcute` `/howdumb` `/fortune` `/password` `/cat` `/dog`'},
                {name:'🎌 Anime (4)',value:'`/anime` `/manga` `/waifu` `/neko`'},
                {name:'🔧 Utilidades (12)',value:'`/embed` `/say` `/announce` `/poll` `/giveaway` `/reminder` `/afk` `/translate` `/weather` `/wikipedia` `/color` `/qr`'},
            )
            .setFooter({text:'Total: ' + commands.length + ' comandos'});
        return interaction.reply({embeds:[embed]});
    }

    if (cmd==='setup') {
        if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({content:'❌ Necesitas ser Admin',ephemeral:true});
        await interaction.deferReply();
        try {
            const catInfo = await guild.channels.create({name:'📋 INFO',type:ChannelType.GuildCategory});
            const rulesC  = await guild.channels.create({name:'📜・reglas',type:ChannelType.GuildText,parent:catInfo.id});
            const annoC   = await guild.channels.create({name:'📣・anuncios',type:ChannelType.GuildText,parent:catInfo.id});
            const catGen  = await guild.channels.create({name:'💬 GENERAL',type:ChannelType.GuildCategory});
            const genC    = await guild.channels.create({name:'💬・general',type:ChannelType.GuildText,parent:catGen.id});
            await guild.channels.create({name:'🎮・juegos',type:ChannelType.GuildText,parent:catGen.id});
            await guild.channels.create({name:'📸・fotos',type:ChannelType.GuildText,parent:catGen.id});
            await guild.channels.create({name:'🤖・comandos',type:ChannelType.GuildText,parent:catGen.id});
            await guild.channels.create({name:'🎵・música',type:ChannelType.GuildText,parent:catGen.id});
            const catMem  = await guild.channels.create({name:'👥 MIEMBROS',type:ChannelType.GuildCategory});
            const welC    = await guild.channels.create({name:'👋・bienvenidas',type:ChannelType.GuildText,parent:catMem.id});
            const farC    = await guild.channels.create({name:'👋・despedidas',type:ChannelType.GuildText,parent:catMem.id});
            await guild.channels.create({name:'✨・niveles',type:ChannelType.GuildText,parent:catMem.id});
            const catStaff = await guild.channels.create({name:'🔧 STAFF',type:ChannelType.GuildCategory,permissionOverwrites:[{id:guild.roles.everyone,deny:[PermissionFlagsBits.ViewChannel]}]});
            const logsC   = await guild.channels.create({name:'📋・logs',type:ChannelType.GuildText,parent:catStaff.id});
            await guild.channels.create({name:'⚙️・staff-chat',type:ChannelType.GuildText,parent:catStaff.id});
            const config = getConfig(guild.id);
            config.welcomeChannel=welC.id; config.farewellChannel=farC.id; config.logsChannel=logsC.id;
            await rulesC.send({embeds:[new EmbedBuilder().setTitle('📜 Reglas').setDescription('1️⃣ Respeta a todos\n2️⃣ No spam\n3️⃣ No NSFW\n4️⃣ Sigue las normas de Discord\n5️⃣ ¡Diviértete!').setColor(C.blue)]});
            await interaction.editReply({embeds:[new EmbedBuilder().setTitle('✅ ¡Servidor configurado!').setDescription('Se crearon **15 canales** automáticamente').setColor(C.green)
                .addFields({name:'👋 Bienvenidas',value:''+welC,inline:true},{name:'👋 Despedidas',value:''+farC,inline:true},{name:'📋 Logs',value:''+logsC,inline:true},{name:'📣 Anuncios',value:''+annoC,inline:true},{name:'💬 General',value:''+genC,inline:true},{name:'📜 Reglas',value:''+rulesC,inline:true})]});
        } catch(e) { await interaction.editReply({content:'❌ ' + e.message}); }
        return;
    }

    if (cmd==='setwelcome') { if(!member.permissions.has(PermissionFlagsBits.ManageGuild))return interaction.reply({content:'❌ Sin permisos',ephemeral:true}); const ch=interaction.options.getChannel('canal'); getConfig(guild.id).welcomeChannel=ch.id; return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Bienvenidas → '+ch).setColor(C.green)]}); }
    if (cmd==='setfarewell') { if(!member.permissions.has(PermissionFlagsBits.ManageGuild))return interaction.reply({content:'❌ Sin permisos',ephemeral:true}); const ch=interaction.options.getChannel('canal'); getConfig(guild.id).farewellChannel=ch.id; return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Despedidas → '+ch).setColor(C.green)]}); }
    if (cmd==='setlogs') { if(!member.permissions.has(PermissionFlagsBits.ManageGuild))return interaction.reply({content:'❌ Sin permisos',ephemeral:true}); const ch=interaction.options.getChannel('canal'); getConfig(guild.id).logsChannel=ch.id; return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Logs → '+ch).setColor(C.green)]}); }
    if (cmd==='setlevel') { if(!member.permissions.has(PermissionFlagsBits.ManageGuild))return interaction.reply({content:'❌ Sin permisos',ephemeral:true}); const ch=interaction.options.getChannel('canal'); getConfig(guild.id).levelChannel=ch.id; return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Niveles → '+ch).setColor(C.green)]}); }

    if (cmd==='testwelcome') {
        const config=getConfig(guild.id); const ch=config.welcomeChannel?guild.channels.cache.get(config.welcomeChannel):interaction.channel;
        await ch.send({embeds:[new EmbedBuilder().setTitle('👋 ¡Bienvenido!').setDescription('¡Hola '+user+'! Bienvenido a **'+guild.name+'**').setThumbnail(user.displayAvatarURL({dynamic:true})).setColor(C.green).setTimestamp()]});
        return interaction.reply({content:'✅ Test enviado',ephemeral:true});
    }
    if (cmd==='testfarewell') {
        const config=getConfig(guild.id); const ch=config.farewellChannel?guild.channels.cache.get(config.farewellChannel):interaction.channel;
        await ch.send({embeds:[new EmbedBuilder().setTitle('👋 Un miembro se fue').setDescription('**'+user.tag+'** abandonó el servidor').setThumbnail(user.displayAvatarURL({dynamic:true})).setColor(C.red).setTimestamp()]});
        return interaction.reply({content:'✅ Test enviado',ephemeral:true});
    }

    if (cmd==='ping') return interaction.reply({embeds:[new EmbedBuilder().setTitle('🏓 Pong!').addFields({name:'📡 Latencia',value:client.ws.ping+'ms',inline:true},{name:'⚡ API',value:(Date.now()-interaction.createdTimestamp)+'ms',inline:true}).setColor(C.blue)]});
    if (cmd==='membercount') return interaction.reply({embeds:[new EmbedBuilder().setDescription('👥 **'+guild.name+'** tiene **'+guild.memberCount+'** miembros').setColor(C.blue)]});
    if (cmd==='emojis') { const e=guild.emojis.cache.map(e=>''+e).join(' ').slice(0,1000)||'Sin emojis'; return interaction.reply({embeds:[new EmbedBuilder().setTitle('😀 Emojis').setDescription(e).setColor(C.blue)]}); }
    if (cmd==='roles') { const r=guild.roles.cache.filter(r=>r.id!==guild.id).sort((a,b)=>b.position-a.position).map(r=>''+r).slice(0,30).join(', '); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎭 Roles').setDescription(r||'Sin roles').setColor(C.blue)]}); }
    if (cmd==='boosts') return interaction.reply({embeds:[new EmbedBuilder().setTitle('🚀 Boosts').addFields({name:'Nivel',value:''+guild.premiumTier,inline:true},{name:'Boosts',value:''+guild.premiumSubscriptionCount,inline:true}).setColor(C.purple)]});
    if (cmd==='banner') { const b=guild.bannerURL({size:1024}); if(!b) return interaction.reply({content:'❌ Sin banner',ephemeral:true}); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🖼️ Banner').setImage(b).setColor(C.blue)]}); }
    if (cmd==='icon') { const ic=guild.iconURL({dynamic:true,size:1024}); if(!ic) return interaction.reply({content:'❌ Sin ícono',ephemeral:true}); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🖼️ Ícono').setImage(ic).setColor(C.blue)]}); }
    if (cmd==='invite') { const inv=await interaction.channel.createInvite({maxAge:86400}); return interaction.reply({embeds:[new EmbedBuilder().setDescription('🔗 **'+inv.url+'**').setColor(C.blue)]}); }
    if (cmd==='stats') { const t=guild.channels.cache.filter(c=>c.type===ChannelType.GuildText).size; const v=guild.channels.cache.filter(c=>c.type===ChannelType.GuildVoice).size; return interaction.reply({embeds:[new EmbedBuilder().setTitle('📈 Estadísticas').addFields({name:'👥',value:''+guild.memberCount,inline:true},{name:'💬',value:''+t,inline:true},{name:'🔊',value:''+v,inline:true},{name:'🎭',value:''+guild.roles.cache.size,inline:true},{name:'😀',value:''+guild.emojis.cache.size,inline:true},{name:'🚀',value:''+guild.premiumSubscriptionCount,inline:true}).setColor(C.blue)]}); }

    if (cmd==='userinfo') {
        const target=interaction.options.getUser('usuario')||user;
        const gm=await guild.members.fetch(target.id).catch(()=>null);
        const d=getXP(target.id);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('👤 '+target.tag).setThumbnail(target.displayAvatarURL({dynamic:true,size:256})).setColor(C.blue)
            .addFields({name:'🆔 ID',value:target.id,inline:true},{name:'📅 Creada',value:'<t:'+Math.floor(target.createdTimestamp/1000)+':R>',inline:true},{name:'📥 Unión',value:gm?'<t:'+Math.floor(gm.joinedTimestamp/1000)+':R>':'N/A',inline:true},{name:'✨ Nivel',value:''+d.level,inline:true},{name:'💰 Coins',value:''+getCoins(target.id),inline:true},{name:'💑 Pareja',value:marriages.has(target.id)?'<@'+marriages.get(target.id)+'>':'Soltero/a',inline:true},{name:'🎭 Roles',value:gm?gm.roles.cache.filter(r=>r.id!==guild.id).map(r=>''+r).join(', ')||'Ninguno':'N/A'}).setTimestamp()]});
    }
    if (cmd==='serverinfo') {
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🏠 '+guild.name).setThumbnail(guild.iconURL({dynamic:true})).setColor(C.blue)
            .addFields({name:'👑 Dueño',value:'<@'+guild.ownerId+'>',inline:true},{name:'👥 Miembros',value:''+guild.memberCount,inline:true},{name:'📢 Canales',value:''+guild.channels.cache.size,inline:true},{name:'🎭 Roles',value:''+guild.roles.cache.size,inline:true},{name:'😀 Emojis',value:''+guild.emojis.cache.size,inline:true},{name:'🚀 Boosts',value:''+guild.premiumSubscriptionCount,inline:true},{name:'📅 Creado',value:'<t:'+Math.floor(guild.createdTimestamp/1000)+':R>',inline:true}).setTimestamp()]});
    }
    if (cmd==='avatar') { const t=interaction.options.getUser('usuario')||user; return interaction.reply({embeds:[new EmbedBuilder().setTitle('🖼️ Avatar de '+t.username).setImage(t.displayAvatarURL({dynamic:true,size:1024})).setColor(C.blue)]}); }
    if (cmd==='botinfo') { return interaction.reply({embeds:[new EmbedBuilder().setTitle('🤖 Info del Bot').setThumbnail(client.user.displayAvatarURL()).setColor(C.purple).addFields({name:'📛',value:client.user.tag,inline:true},{name:'🏠 Servidores',value:''+client.guilds.cache.size,inline:true},{name:'⚡ Comandos',value:''+commands.length,inline:true},{name:'🟢 Uptime',value:'<t:'+Math.floor((Date.now()-client.uptime)/1000)+':R>',inline:true}).setTimestamp()]}); }
    if (cmd==='roleinfo') { const r=interaction.options.getRole('rol'); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎭 '+r.name).addFields({name:'🆔',value:r.id,inline:true},{name:'🎨',value:r.hexColor,inline:true},{name:'👥',value:''+r.members.size,inline:true},{name:'📌 Mencionable',value:r.mentionable?'Sí':'No',inline:true}).setColor(r.color||C.blue)]}); }
    if (cmd==='channelinfo') { const ch=interaction.options.getChannel('canal')||interaction.channel; return interaction.reply({embeds:[new EmbedBuilder().setTitle('📢 #'+ch.name).addFields({name:'🆔',value:ch.id,inline:true},{name:'📅',value:'<t:'+Math.floor(ch.createdTimestamp/1000)+':R>',inline:true}).setColor(C.blue)]}); }

    // MODERACION
    if (cmd==='ban') {
        const t=interaction.options.getUser('usuario'); const r=interaction.options.getString('razon')||'Sin razón';
        const gm=await guild.members.fetch(t.id).catch(()=>null);
        if(!gm?.bannable) return interaction.reply({content:'❌ No puedo banear',ephemeral:true});
        await gm.ban({reason:r});
        logAction(guild,'🔨 Ban',user.tag+' baneó a '+t.tag+' | '+r,C.red);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🔨 Baneado').addFields({name:'Usuario',value:t.tag,inline:true},{name:'Razón',value:r,inline:true}).setColor(C.red)]});
    }
    if (cmd==='softban') {
        const t=interaction.options.getUser('usuario'); const r=interaction.options.getString('razon')||'Sin razón';
        const gm=await guild.members.fetch(t.id).catch(()=>null);
        if(!gm?.bannable) return interaction.reply({content:'❌ No puedo',ephemeral:true});
        await gm.ban({deleteMessageDays:7,reason:r}); await guild.members.unban(t.id);
        return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Softban a **'+t.tag+'** (mensajes eliminados)').setColor(C.orange)]});
    }
    if (cmd==='kick') {
        const t=interaction.options.getUser('usuario'); const r=interaction.options.getString('razon')||'Sin razón';
        const gm=await guild.members.fetch(t.id).catch(()=>null);
        if(!gm?.kickable) return interaction.reply({content:'❌ No puedo expulsar',ephemeral:true});
        await gm.kick(r); logAction(guild,'👢 Kick',user.tag+' expulsó a '+t.tag,C.orange);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('👢 Expulsado').addFields({name:'Usuario',value:t.tag,inline:true},{name:'Razón',value:r,inline:true}).setColor(C.orange)]});
    }
    if (cmd==='mute') {
        const t=interaction.options.getUser('usuario'); const mins=interaction.options.getInteger('minutos')||10;
        const gm=await guild.members.fetch(t.id).catch(()=>null);
        if(!gm) return interaction.reply({content:'❌ No encontrado',ephemeral:true});
        await gm.timeout(mins*60*1000,'Muted');
        logAction(guild,'🔇 Mute',user.tag+' silenció a '+t.tag+' '+mins+'min',C.yellow);
        return interaction.reply({embeds:[new EmbedBuilder().setDescription('🔇 **'+t.tag+'** silenciado **'+mins+'min**').setColor(C.yellow)]});
    }
    if (cmd==='unmute') {
        const t=interaction.options.getUser('usuario'); const gm=await guild.members.fetch(t.id).catch(()=>null);
        if(!gm) return interaction.reply({content:'❌ No encontrado',ephemeral:true});
        await gm.timeout(null);
        return interaction.reply({embeds:[new EmbedBuilder().setDescription('🔊 **'+t.tag+'** puede hablar').setColor(C.green)]});
    }
    if (cmd==='warn') {
        const t=interaction.options.getUser('usuario'); const r=interaction.options.getString('razon');
        addWarning(t.id,{reason:r,date:new Date().toLocaleDateString(),by:user.tag});
        logAction(guild,'⚠️ Warn',user.tag+' advirtió a '+t.tag+': '+r,C.yellow);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('⚠️ Advertencia').addFields({name:'Usuario',value:t.tag,inline:true},{name:'Razón',value:r,inline:true},{name:'Total',value:''+getWarnings(t.id).length,inline:true}).setColor(C.yellow)]});
    }
    if (cmd==='warnings') {
        const t=interaction.options.getUser('usuario')||user; const ws=getWarnings(t.id);
        const desc=ws.length?ws.map((w,i)=>'**'+(i+1)+'.** '+w.reason+' — *'+w.date+' por '+w.by+'*').join('\n'):'Sin advertencias';
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('⚠️ Advertencias de '+t.username).setDescription(desc).setColor(C.yellow)]});
    }
    if (cmd==='clearwarnings') { const t=interaction.options.getUser('usuario'); warnings.set(t.id,[]); return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Advertencias eliminadas').setColor(C.green)]}); }
    if (cmd==='clear') { const deleted=await interaction.channel.bulkDelete(interaction.options.getInteger('cantidad'),true); return interaction.reply({embeds:[new EmbedBuilder().setDescription('🗑️ **'+deleted.size+'** mensajes borrados').setColor(C.red)],ephemeral:true}); }
    if (cmd==='lock') { const ch=interaction.options.getChannel('canal')||interaction.channel; await ch.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:false}); return interaction.reply({embeds:[new EmbedBuilder().setDescription('🔒 '+ch+' bloqueado').setColor(C.red)]}); }
    if (cmd==='unlock') { const ch=interaction.options.getChannel('canal')||interaction.channel; await ch.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:null}); return interaction.reply({embeds:[new EmbedBuilder().setDescription('🔓 '+ch+' desbloqueado').setColor(C.green)]}); }
    if (cmd==='lockdown') {
        for (const [,ch] of guild.channels.cache) { if(ch.type===ChannelType.GuildText) await ch.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:false}).catch(()=>{}); }
        logAction(guild,'🔒 LOCKDOWN',user.tag+' activó el lockdown',C.red);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🔒 LOCKDOWN ACTIVADO').setDescription('Todos los canales han sido bloqueados').setColor(C.red)]});
    }
    if (cmd==='slowmode') { await interaction.channel.setRateLimitPerUser(interaction.options.getInteger('segundos')); return interaction.reply({embeds:[new EmbedBuilder().setDescription('🐌 Modo lento: **'+interaction.options.getInteger('segundos')+'s**').setColor(C.yellow)]}); }
    if (cmd==='nickname') {
        const t=interaction.options.getUser('usuario'); const ap=interaction.options.getString('apodo')||null;
        const gm=await guild.members.fetch(t.id).catch(()=>null);
        if(!gm) return interaction.reply({content:'❌ No encontrado',ephemeral:true});
        await gm.setNickname(ap);
        return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Apodo '+(ap?'→ **'+ap+'**':'eliminado')).setColor(C.green)]});
    }
    if (cmd==='role') {
        const t=interaction.options.getUser('usuario'); const r=interaction.options.getRole('rol');
        const gm=await guild.members.fetch(t.id).catch(()=>null);
        if(!gm) return interaction.reply({content:'❌ No encontrado',ephemeral:true});
        if(gm.roles.cache.has(r.id)){await gm.roles.remove(r); return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Rol **'+r.name+'** quitado').setColor(C.red)]});}
        else{await gm.roles.add(r); return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Rol **'+r.name+'** dado a '+t).setColor(C.green)]});}
    }
    if (cmd==='unban') { await guild.members.unban(interaction.options.getString('id')).catch(()=>{}); return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Desbaneado').setColor(C.green)]}); }
    if (cmd==='banlist') { const bans=await guild.bans.fetch(); const desc=bans.size?bans.map(b=>'**'+b.user.tag+'** — '+(b.reason||'Sin razón')).slice(0,15).join('\n'):'Sin baneados'; return interaction.reply({embeds:[new EmbedBuilder().setTitle('📋 Baneados').setDescription(desc).setColor(C.red)]}); }

    // NIVELES
    if (cmd==='rank') {
        const t=interaction.options.getUser('usuario')||user; const d=getXP(t.id); const needed=d.level*100;
        const bar='█'.repeat(Math.floor((d.xp/needed)*10))+'░'.repeat(10-Math.floor((d.xp/needed)*10));
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('✨ Rango de '+t.username).setThumbnail(t.displayAvatarURL({dynamic:true})).addFields({name:'🎖️ Nivel',value:''+d.level,inline:true},{name:'⭐ XP',value:d.xp+'/'+needed,inline:true}).setDescription('`'+bar+'`').setColor(C.gold)]});
    }
    if (cmd==='top') {
        const sorted=[...xpData.entries()].sort((a,b)=>b[1].level-a[1].level||b[1].xp-a[1].xp).slice(0,10);
        const desc=sorted.length?sorted.map((e,i)=>'**'+(i+1)+'.** <@'+e[0]+'> — Nv.**'+e[1].level+'** ('+e[1].xp+' XP)').join('\n'):'Sin datos';
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🏆 Top Niveles').setDescription(desc).setColor(C.gold)]});
    }
    if (cmd==='addxp') {
        const t=interaction.options.getUser('usuario'); const amt=interaction.options.getInteger('cantidad');
        const d=addXP(t.id,amt);
        return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ +'+amt+' XP a **'+t.tag+'** | Nv.**'+d.level+'**').setColor(C.green)]});
    }

    // ECONOMIA
    if (cmd==='balance') { const t=interaction.options.getUser('usuario')||user; return interaction.reply({embeds:[new EmbedBuilder().setTitle('💰 Balance de '+t.username).addFields({name:'💵 Monedero',value:getCoins(t.id)+' 🪙',inline:true},{name:'🏦 Banco',value:getBank(t.id)+' 🪙',inline:true}).setColor(C.green)]}); }
    if (cmd==='daily') {
        const now=Date.now(); const last=dailyCooldown.get(user.id)||0;
        if(now-last<86400000) return interaction.reply({content:'⏰ Vuelve en **'+Math.ceil((86400000-(now-last))/3600000)+'h**',ephemeral:true});
        const amt=Math.floor(Math.random()*500)+100; addCoins(user.id,amt); dailyCooldown.set(user.id,now);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('💵 Recompensa diaria').setDescription('+**'+amt+'** 🪙\nTotal: **'+getCoins(user.id)+'** 🪙').setColor(C.green)]});
    }
    if (cmd==='work') {
        const now=Date.now(); const last=workCooldown.get(user.id)||0;
        if(now-last<3600000) return interaction.reply({content:'⏰ Trabaja en **'+Math.ceil((3600000-(now-last))/60000)+' min**',ephemeral:true});
        const jobs=['programador','chef','músico','streamer','youtuber','taxista','doctor'];
        const job=jobs[Math.floor(Math.random()*jobs.length)]; const amt=Math.floor(Math.random()*200)+50;
        addCoins(user.id,amt); workCooldown.set(user.id,now);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('💼 Trabajo').setDescription('Trabajaste como **'+job+'** y ganaste **'+amt+'** 🪙').setColor(C.green)]});
    }
    if (cmd==='fish') {
        const now=Date.now(); const last=fishCooldown.get(user.id)||0;
        if(now-last<1800000) return interaction.reply({content:'⏰ Pesca en **'+Math.ceil((1800000-(now-last))/60000)+' min**',ephemeral:true});
        if(!getInventory(user.id).find(i=>i.id==='rod')) return interaction.reply({content:'❌ Necesitas una 🎣 Caña de pescar. Cómprala en `/shop`',ephemeral:true});
        const amt=Math.floor(Math.random()*150)+20; addCoins(user.id,amt); fishCooldown.set(user.id,now);
        const fish=['🐟','🐠','🐡','🦐','🦑','🐙'];
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎣 Pesca').setDescription('Pescaste '+fish[Math.floor(Math.random()*fish.length)]+' y ganaste **'+amt+'** 🪙').setColor(C.cyan)]});
    }
    if (cmd==='mine') {
        const now=Date.now(); const last=mineCooldown.get(user.id)||0;
        if(now-last<2700000) return interaction.reply({content:'⏰ Mina en **'+Math.ceil((2700000-(now-last))/60000)+' min**',ephemeral:true});
        if(!getInventory(user.id).find(i=>i.id==='pickaxe')) return interaction.reply({content:'❌ Necesitas un ⛏️ Pico. Cómpralo en `/shop`',ephemeral:true});
        const amt=Math.floor(Math.random()*300)+50; addCoins(user.id,amt); mineCooldown.set(user.id,now);
        const m=['💎','🪨','🪙','🥇','🔮'];
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('⛏️ Minería').setDescription('Encontraste '+m[Math.floor(Math.random()*m.length)]+' y ganaste **'+amt+'** 🪙').setColor(C.orange)]});
    }
    if (cmd==='rob') {
        const t=interaction.options.getUser('usuario'); if(t.id===user.id) return interaction.reply({content:'❌ No puedes robarte a ti mismo',ephemeral:true});
        const tc=getCoins(t.id); if(tc<50) return interaction.reply({content:'❌ No tiene suficientes coins',ephemeral:true});
        if(Math.random()>0.4){ const stolen=Math.floor(Math.random()*Math.min(tc*0.3,500))+10; removeCoins(t.id,stolen); addCoins(user.id,stolen); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🦹 ¡Robo exitoso!').setDescription('Robaste **'+stolen+'** 🪙 a **'+t.username+'**').setColor(C.green)]}); }
        else{ const fine=Math.floor(Math.random()*100)+50; removeCoins(user.id,fine); return interaction.reply({embeds:[new EmbedBuilder().setTitle('👮 ¡Te atraparon!').setDescription('Fallaste y pagaste **'+fine+'** 🪙 de multa').setColor(C.red)]}); }
    }
    if (cmd==='deposit') {
        const amt=interaction.options.getInteger('cantidad'); if(getCoins(user.id)<amt) return interaction.reply({content:'❌ No tienes suficientes coins',ephemeral:true});
        removeCoins(user.id,amt); bankStorage.set(user.id,getBank(user.id)+amt);
        return interaction.reply({embeds:[new EmbedBuilder().setDescription('🏦 Depositaste **'+amt+'** 🪙').setColor(C.green)]});
    }
    if (cmd==='withdraw') {
        const amt=interaction.options.getInteger('cantidad'); if(getBank(user.id)<amt) return interaction.reply({content:'❌ No tienes eso en el banco',ephemeral:true});
        bankStorage.set(user.id,getBank(user.id)-amt); addCoins(user.id,amt);
        return interaction.reply({embeds:[new EmbedBuilder().setDescription('🏦 Retiraste **'+amt+'** 🪙').setColor(C.green)]});
    }
    if (cmd==='pay') {
        const t=interaction.options.getUser('usuario'); const amt=interaction.options.getInteger('cantidad');
        if(getCoins(user.id)<amt) return interaction.reply({content:'❌ No tienes suficientes coins',ephemeral:true});
        removeCoins(user.id,amt); addCoins(t.id,amt);
        return interaction.reply({embeds:[new EmbedBuilder().setDescription('💸 Enviaste **'+amt+'** 🪙 a **'+t.username+'**').setColor(C.green)]});
    }
    if (cmd==='shop') {
        const desc=SHOP_ITEMS.map(i=>'**'+i.name+'** — '+i.price+' 🪙\n*'+i.desc+'* | ID: `'+i.id+'`').join('\n\n');
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🏪 Tienda').setDescription(desc).setColor(C.gold).setFooter({text:'Usa /buy <id> para comprar'})]});
    }
    if (cmd==='buy') {
        const id=interaction.options.getString('item').toLowerCase(); const item=SHOP_ITEMS.find(i=>i.id===id);
        if(!item) return interaction.reply({content:'❌ Item no encontrado. Ver `/shop`',ephemeral:true});
        if(getCoins(user.id)<item.price) return interaction.reply({content:'❌ No tienes suficientes coins',ephemeral:true});
        removeCoins(user.id,item.price); addItem(user.id,{id:item.id,name:item.name});
        return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Compraste **'+item.name+'** por **'+item.price+'** 🪙').setColor(C.green)]});
    }
    if (cmd==='inventory') { const t=interaction.options.getUser('usuario')||user; const inv=getInventory(t.id); const desc=inv.length?inv.map(i=>i.name+' x'+i.amount).join('\n'):'Vacío'; return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎒 Inventario de '+t.username).setDescription(desc).setColor(C.blue)]}); }
    if (cmd==='leaderboard') { const s=[...economy.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10); const desc=s.length?s.map((e,i)=>'**'+(i+1)+'.** <@'+e[0]+'> — **'+e[1]+'** 🪙').join('\n'):'Sin datos'; return interaction.reply({embeds:[new EmbedBuilder().setTitle('🏆 Top Economía').setDescription(desc).setColor(C.gold)]}); }
    if (cmd==='slots') {
        const ap=interaction.options.getInteger('apuesta'); if(getCoins(user.id)<ap) return interaction.reply({content:'❌ No tienes suficientes coins',ephemeral:true});
        const sym=['🍒','🍋','🍊','💎','⭐','🎰']; const s1=sym[Math.floor(Math.random()*6)]; const s2=sym[Math.floor(Math.random()*6)]; const s3=sym[Math.floor(Math.random()*6)];
        let win=0; if(s1===s2&&s2===s3) win=ap*(s1==='💎'?10:s1==='⭐'?5:3); else if(s1===s2||s2===s3||s1===s3) win=ap;
        if(win>0){removeCoins(user.id,ap);addCoins(user.id,win);}else removeCoins(user.id,ap);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎰 Tragamonedas').setDescription('`[ '+s1+' | '+s2+' | '+s3+' ]`\n\n'+(win>0?'🏆 ¡Ganaste **'+win+'** 🪙!':'💀 Perdiste **'+ap+'** 🪙')).setColor(win>0?C.green:C.red)]});
    }
    if (cmd==='blackjack') {
        const ap=interaction.options.getInteger('apuesta'); if(getCoins(user.id)<ap) return interaction.reply({content:'❌ No tienes suficientes coins',ephemeral:true});
        const gc=()=>['A','2','3','4','5','6','7','8','9','10','J','Q','K'][Math.floor(Math.random()*13)];
        const cv=c=>isNaN(c)?(c==='A'?11:10):parseInt(c);
        const p=[gc(),gc()]; const d=[gc(),gc()];
        const ps=p.reduce((a,c)=>a+cv(c),0); const ds=d.reduce((a,c)=>a+cv(c),0);
        const win=ps===21||(ps<=21&&(ps>ds||ds>21));
        if(win)addCoins(user.id,ap);else removeCoins(user.id,ap);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🃏 Blackjack').addFields({name:'Tu mano ('+ps+')',value:p.join(' - '),inline:true},{name:'Dealer ('+ds+')',value:d.join(' - '),inline:true}).setDescription(win?'🏆 ¡Ganaste **'+ap+'** 🪙!':'💀 Perdiste **'+ap+'** 🪙').setColor(win?C.green:C.red)]});
    }
    if (cmd==='flip') {
        const el=interaction.options.getString('eleccion'); const ap=interaction.options.getInteger('apuesta');
        if(getCoins(user.id)<ap) return interaction.reply({content:'❌ No tienes suficientes coins',ephemeral:true});
        const r=Math.random()<0.5?'cara':'cruz'; const win=el===r;
        if(win)addCoins(user.id,ap);else removeCoins(user.id,ap);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🪙 Lanzamiento').setDescription('Salió **'+r+'**\n'+(win?'🏆 ¡Ganaste **'+ap+'** 🪙!':'💀 Perdiste **'+ap+'** 🪙')).setColor(win?C.green:C.red)]});
    }

    // MATRIMONIOS
    if (cmd==='marry') {
        const t=interaction.options.getUser('usuario'); if(t.id===user.id) return interaction.reply({content:'❌ No puedes casarte contigo mismo',ephemeral:true});
        if(marriages.has(user.id)) return interaction.reply({content:'❌ Ya estás casado/a. Usa `/divorce` primero',ephemeral:true});
        if(!getInventory(user.id).find(i=>i.id==='ring')) return interaction.reply({content:'❌ Necesitas un 💍 Anillo. Cómpralo en `/shop`',ephemeral:true});
        marriages.set(user.id,t.id); marriages.set(t.id,user.id);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('💍 ¡Matrimonio!').setDescription('**'+user.username+'** y **'+t.username+'** ¡se casaron! 🎉').setColor(C.pink)]});
    }
    if (cmd==='divorce') {
        if(!marriages.has(user.id)) return interaction.reply({content:'❌ No estás casado/a',ephemeral:true});
        const p=marriages.get(user.id); marriages.delete(user.id); marriages.delete(p);
        return interaction.reply({embeds:[new EmbedBuilder().setDescription('💔 Te divorciaste').setColor(C.red)]});
    }
    if (cmd==='partner') { const t=interaction.options.getUser('usuario')||user; const p=marriages.get(t.id); return interaction.reply({embeds:[new EmbedBuilder().setDescription(p?'💑 **'+t.username+'** está casado/a con <@'+p+'>':'💔 **'+t.username+'** está soltero/a').setColor(C.pink)]}); }

    // MASCOTAS
    if (cmd==='adopt') {
        if(pets.has(user.id)) return interaction.reply({content:'❌ Ya tienes mascota',ephemeral:true});
        const n=interaction.options.getString('nombre'); const tipo=interaction.options.getString('tipo');
        const em={gato:'🐱',perro:'🐶',conejo:'🐰',dragon:'🐉'};
        pets.set(user.id,{name:n,type:tipo,emoji:em[tipo],hp:100,hunger:100,happy:100});
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🐾 ¡Mascota adoptada!').setDescription('Tu nueva mascota **'+n+'** el '+em[tipo]+' está feliz!').setColor(C.green)]});
    }
    if (cmd==='pet') { const t=interaction.options.getUser('usuario')||user; const p=pets.get(t.id); if(!p) return interaction.reply({content:'❌ No tiene mascota',ephemeral:true}); return interaction.reply({embeds:[new EmbedBuilder().setTitle(p.emoji+' '+p.name).addFields({name:'❤️ HP',value:p.hp+'/100',inline:true},{name:'🍖 Hambre',value:p.hunger+'/100',inline:true},{name:'😊 Felicidad',value:p.happy+'/100',inline:true}).setColor(C.pink)]}); }
    if (cmd==='feed') { const p=pets.get(user.id); if(!p) return interaction.reply({content:'❌ No tienes mascota',ephemeral:true}); p.hunger=Math.min(100,p.hunger+30); p.happy=Math.min(100,p.happy+10); pets.set(user.id,p); return interaction.reply({embeds:[new EmbedBuilder().setDescription('🍖 **'+p.name+'** comió!').setColor(C.green)]}); }
    if (cmd==='play') { const p=pets.get(user.id); if(!p) return interaction.reply({content:'❌ No tienes mascota',ephemeral:true}); p.happy=Math.min(100,p.happy+25); p.hunger=Math.max(0,p.hunger-10); pets.set(user.id,p); return interaction.reply({embeds:[new EmbedBuilder().setDescription('🎾 Jugaste con **'+p.name+'**!').setColor(C.yellow)]}); }
    if (cmd==='heal') { const p=pets.get(user.id); if(!p) return interaction.reply({content:'❌ No tienes mascota',ephemeral:true}); if(!getInventory(user.id).find(i=>i.id==='potion')) return interaction.reply({content:'❌ Necesitas una 🧪 Poción',ephemeral:true}); p.hp=Math.min(100,p.hp+50); pets.set(user.id,p); return interaction.reply({embeds:[new EmbedBuilder().setDescription('💊 **'+p.name+'** se curó! HP: '+p.hp+'/100').setColor(C.green)]}); }
    if (cmd==='petname') { const p=pets.get(user.id); if(!p) return interaction.reply({content:'❌ No tienes mascota',ephemeral:true}); const old=p.name; p.name=interaction.options.getString('nombre'); pets.set(user.id,p); return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ **'+old+'** ahora se llama **'+p.name+'**').setColor(C.green)]}); }

    // CUMPLEANOS
    if (cmd==='setbirthday') { const f=interaction.options.getString('fecha'); if(!/^\d{2}\/\d{2}$/.test(f)) return interaction.reply({content:'❌ Formato: DD/MM',ephemeral:true}); birthdays.set(user.id,f); return interaction.reply({embeds:[new EmbedBuilder().setDescription('🎂 Cumpleaños: **'+f+'**').setColor(C.pink)]}); }
    if (cmd==='birthday') { const t=interaction.options.getUser('usuario')||user; const b=birthdays.get(t.id); return interaction.reply({embeds:[new EmbedBuilder().setDescription(b?'🎂 **'+t.username+'** cumple el **'+b+'**':'❓ Sin cumpleaños registrado').setColor(C.pink)]}); }
    if (cmd==='birthdays') { const all=[...birthdays.entries()].slice(0,15); const desc=all.length?all.map(([u,d])=>'<@'+u+'> — **'+d+'**').join('\n'):'Sin registros'; return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎂 Cumpleaños').setDescription(desc).setColor(C.pink)]}); }

    // PERFIL
    if (cmd==='profile') {
        const t=interaction.options.getUser('usuario')||user; const d=getXP(t.id); const p=getProfile(t.id);
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('👤 '+t.username).setThumbnail(t.displayAvatarURL({dynamic:true,size:256})).setDescription('*'+p.bio+'*').setColor(C.purple)
            .addFields({name:'✨ Nivel',value:''+d.level,inline:true},{name:'💰 Coins',value:''+getCoins(t.id),inline:true},{name:'💑 Pareja',value:marriages.has(t.id)?'<@'+marriages.get(t.id)+'>':'Soltero/a',inline:true},{name:'🐾 Mascota',value:pets.has(t.id)?pets.get(t.id).emoji+' '+pets.get(t.id).name:'Sin mascota',inline:true},{name:'🎂 Cumpleaños',value:birthdays.get(t.id)||'No registrado',inline:true}).setTimestamp()]});
    }
    if (cmd==='setbio') { const bio=interaction.options.getString('bio'); profiles.set(user.id,{bio}); return interaction.reply({embeds:[new EmbedBuilder().setDescription('✅ Bio: *'+bio+'*').setColor(C.green)]}); }

    // ROLEPLAY
    if (cmd==='hug') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'hug',t,'se abraza a sí mismo','abrazó',C.pink); }
    if (cmd==='pat') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'pat',t,'se palmea','palmea la cabeza de',C.yellow); }
    if (cmd==='kiss') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'kiss',t,'se besa','le dio un beso a',C.pink); }
    if (cmd==='slap') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'slap',t,'se abofetea','abofeteó a',C.red); }
    if (cmd==='bite') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'bite',t,'se muerde','mordió a',C.orange); }
    if (cmd==='poke') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'poke',t,'se toca','tocó a',C.blue); }
    if (cmd==='cuddle') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'cuddle',t,'se abraza','se acurrucó con',C.pink); }
    if (cmd==='wave') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'wave',t,'saluda','saludó a',C.cyan); }
    if (cmd==='cry') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'cry',t,'está llorando','llora con',C.blue); }
    if (cmd==='dance') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'dance',t,'está bailando','bailó con',C.purple); }
    if (cmd==='nod') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'nod',t,'asiente','asintió a',C.green); }
    if (cmd==='blush') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'blush',t,'está ruborizado','se ruborizó con',C.pink); }
    if (cmd==='smile') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'smile',t,'sonríe','sonrió a',C.yellow); }
    if (cmd==='stare') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'stare',t,'mira fijamente al vacío','miró fijamente a',C.dark); }
    if (cmd==='baka') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'baka',t,'¡BAKA!','le gritó BAKA a',C.red); }
    if (cmd==='nom') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'nom',t,'come algo','mordisqueó a',C.orange); }
    if (cmd==='punch') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'punch',t,'se golpea','golpeó a',C.red); }
    if (cmd==='run') { return sendRoleplay(interaction,'run',null,'está corriendo!','',C.orange); }
    if (cmd==='think') { return sendRoleplay(interaction,'think',null,'está pensando...','',C.blue); }
    if (cmd==='kill') { const t=interaction.options.getUser('usuario'); return sendRoleplay(interaction,'kill',t,'','atacó a',C.red); }

    // DIVERSION
    if (cmd==='8ball') {
        const r=['✅ Sí definitivamente','❌ No','🤔 Tal vez','💯 Claro que sí','⛔ Definitivamente no','🔮 Las señales apuntan a sí','❓ Pregunta de nuevo','🌟 Sin duda','💀 No lo creo'];
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎱 Bola Mágica').addFields({name:'❓',value:interaction.options.getString('pregunta')},{name:'🔮',value:r[Math.floor(Math.random()*r.length)]}).setColor(C.purple)]});
    }
    if (cmd==='coinflip') return interaction.reply({embeds:[new EmbedBuilder().setTitle('🪙 Moneda').setDescription('¡Salió **'+(Math.random()<0.5?'Cara':'Cruz')+'**!').setColor(C.yellow)]});
    if (cmd==='dice') { const c=interaction.options.getInteger('caras')||6; return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎲 d'+c).setDescription('¡Salió **'+(Math.floor(Math.random()*c)+1)+'**!').setColor(C.orange)]}); }
    if (cmd==='rps') {
        const em={piedra:'✊',papel:'📄',tijeras:'✂️'}; const el=['piedra','papel','tijeras'];
        const j=interaction.options.getString('eleccion'); const b=el[Math.floor(Math.random()*3)];
        let res; if(j===b)res='🤝 Empate'; else if((j==='piedra'&&b==='tijeras')||(j==='papel'&&b==='piedra')||(j==='tijeras'&&b==='papel'))res='🏆 ¡Ganaste!'; else res='💀 ¡Perdiste!';
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('✊ RPS').addFields({name:'Tú',value:em[j]+' '+j,inline:true},{name:'Bot',value:em[b]+' '+b,inline:true},{name:'Resultado',value:res}).setColor(res.includes('Ganaste')?C.green:res.includes('Empate')?C.yellow:C.red)]});
    }
    if (cmd==='quote') { const f=['El éxito es la suma de pequeños esfuerzos repetidos día tras día.','No cuentes los días, haz que los días cuenten.','Cree que puedes y ya estarás a medio camino.','El único modo de hacer un gran trabajo es amar lo que haces.']; return interaction.reply({embeds:[new EmbedBuilder().setTitle('💭 Frase del día').setDescription('*"'+f[Math.floor(Math.random()*f.length)]+'"*').setColor(C.purple)]}); }
    if (cmd==='ship') {
        const u1=interaction.options.getUser('usuario1'); const u2=interaction.options.getUser('usuario2'); const p=Math.floor(Math.random()*101);
        const bar='█'.repeat(Math.floor(p/10))+'░'.repeat(10-Math.floor(p/10));
        return interaction.reply({embeds:[new EmbedBuilder().setTitle('💕 Ship-o-Meter').setDescription('**'+u1.username+'** 💗 **'+u2.username+'**\n\n'+bar+' **'+p+'%**\n\n'+(p>=70?'💘 ¡Pareja perfecta!':p>=40?'💛 Hay algo...':'💔 No hay chemistry')).setColor(p>=70?C.red:C.yellow)]});
    }
    if (cmd==='rate') { const r=(Math.random()*10).toFixed(1); return interaction.reply({embeds:[new EmbedBuilder().setTitle('⭐ Valoración').setDescription('**'+interaction.options.getString('cosa')+'** — **'+r+'/10**\n'+'⭐'.repeat(Math.round(r))).setColor(C.yellow)]}); }
    if (cmd==='choose') { const ops=interaction.options.getString('opciones').split(',').map(o=>o.trim()).filter(Boolean); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🤔 Elijo...').setDescription('¡**'+ops[Math.floor(Math.random()*ops.length)]+'**!').setColor(C.blue)]}); }
    if (cmd==='trivia') { const q=[{p:'¿En qué año fue Discord creado?',r:'2015'},{p:'¿Cuántos colores tiene el arcoíris?',r:'7'},{p:'¿El planeta más grande del sistema solar?',r:'Júpiter'},{p:'¿Cuántos lados tiene un hexágono?',r:'6'},{p:'¿Capital de Francia?',r:'París'},{p:'¿Dónde se inventó la pizza?',r:'Italia'}]; const t=q[Math.floor(Math.random()*q.length)]; return interaction.reply({embeds:[new EmbedBuilder().setTitle('🧠 Trivia').addFields({name:'❓',value:t.p},{name:'💡 Respuesta',value:'||'+t.r+'||'}).setColor(C.purple)]}); }
    if (cmd==='joke') { const j=['¿Por qué el programador usa gafas? Porque no puede C#','¿Qué le dijo un 0 a un 8? Bonito cinturón','Mi contraseña es "incorrecto". Así cuando me digan que es incorrecta seré feliz','¿Por qué los programadores prefieren el oscuro? Porque la luz atrae bugs']; return interaction.reply({embeds:[new EmbedBuilder().setTitle('😄 Chiste').setDescription(j[Math.floor(Math.random()*j.length)]).setColor(C.yellow)]}); }
    if (cmd==='meme') { const m=['https://i.imgflip.com/4t0m5.jpg','https://i.imgflip.com/26jxvz.jpg','https://i.imgflip.com/1g8my4.jpg']; return interaction.reply({embeds:[new EmbedBuilder().setTitle('😂 Meme').setImage(m[Math.floor(Math.random()*m.length)]).setColor(C.orange)]}); }
    if (cmd==='wyr') { const s=[['volar','ser invisible'],['siempre tener frío','siempre tener calor'],['saber el futuro','cambiar el pasado'],['hablar todos los idiomas','tocar todos los instrumentos']]; const sc=s[Math.floor(Math.random()*s.length)]; const msg=await interaction.reply({embeds:[new EmbedBuilder().setTitle('❓ ¿Preferirías...?').setDescription('🅰️ **'+sc[0]+'**\n\no\n\n🅱️ **'+sc[1]+'**').setColor(C.blue)],fetchReply:true}); await msg.react('🅰️'); await msg.react('🅱️'); return; }
    if (cmd==='nhie') { const s=['nunca he jamás comido sushi','nunca he jamás salido del país','nunca he jamás mentido a mis padres','nunca he jamás ganado algo','nunca he jamás visto terror']; return interaction.reply({embeds:[new EmbedBuilder().setTitle('🙈 Nunca he jamás...').setDescription('**'+s[Math.floor(Math.random()*s.length)]+'**').setColor(C.purple)]}); }
    if (cmd==='truth') { const t=['¿Cuál es tu mayor miedo?','¿Alguna vez has mentido a alguien que quieres?','¿Cuál es tu secreto más vergonzoso?','¿En quién confías más?','¿Cuál ha sido tu momento más embarazoso?']; return interaction.reply({embeds:[new EmbedBuilder().setTitle('💬 Verdad').setDescription(t[Math.floor(Math.random()*t.length)]).setColor(C.green)]}); }
    if (cmd==='dare') { const d=['Escribe algo gracioso en el chat','Menciona a alguien al azar','Cambia tu apodo por 1 hora','Di algo en otro idioma','Haz una pregunta incómoda']; return interaction.reply({embeds:[new EmbedBuilder().setTitle('🔥 Reto').setDescription(d[Math.floor(Math.random()*d.length)]).setColor(C.red)]}); }
    if (cmd==='compliment') { const t=interaction.options.getUser('usuario'); const c=['**'+t.username+'** eres increíblemente talentoso! ✨','**'+t.username+'** iluminas cualquier lugar! 🌟','**'+t.username+'** eres una persona muy especial! 💖']; return interaction.reply({embeds:[new EmbedBuilder().setTitle('💖 Cumplido').setDescription(c[Math.floor(Math.random()*c.length)]).setColor(C.pink)]}); }
    if (cmd==='insult') { const t=interaction.options.getUser('usuario'); const i=['**'+t.username+'** es tan lento que tarda 2h en ver 60 Minutos 😂','**'+t.username+'** tiene tanta suerte... de suerte mala 💀']; return interaction.reply({embeds:[new EmbedBuilder().setTitle('😤 Insulto (broma)').setDescription(i[Math.floor(Math.random()*i.length)]).setColor(C.orange).setFooter({text:'Es solo de broma 😄'})]}); }
    if (cmd==='roast') { const t=interaction.options.getUser('usuario'); const r=['**'+t.username+'** tiene tantos seguidores... oh espera, cero.','**'+t.username+'** es tan olvidable que el bot tuvo que googlear su nombre.']; return interaction.reply({embeds:[new EmbedBuilder().setTitle('🔥 Roast').setDescription(r[Math.floor(Math.random()*r.length)]).setColor(C.red).setFooter({text:'Es de broma! 😄'})]}); }
    if (cmd==='howgay') { const t=interaction.options.getUser('usuario')||user; const p=Math.floor(Math.random()*101); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🌈 ¿Qué tan gay?').setDescription('**'+t.username+'** es **'+p+'%** gay 🌈').setColor(C.purple)]}); }
    if (cmd==='howcute') { const t=interaction.options.getUser('usuario')||user; const p=Math.floor(Math.random()*101); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🥰 ¿Qué tan cute?').setDescription('**'+t.username+'** es **'+p+'%** cute 🥰').setColor(C.pink)]}); }
    if (cmd==='howdumb') { const t=interaction.options.getUser('usuario')||user; const p=Math.floor(Math.random()*101); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🤪 ¿Qué tan tonto?').setDescription('**'+t.username+'** es **'+p+'%** tonto 🤪').setColor(C.yellow)]}); }
    if (cmd==='fortune') { const f=['🌟 Hoy tendrás mucha suerte!','💰 El dinero llegará pronto','💔 Cuida tus relaciones hoy','⚠️ Ten cuidado con las decisiones','🎉 Algo maravilloso te espera esta semana']; return interaction.reply({embeds:[new EmbedBuilder().setTitle('🔮 Fortuna del día').setDescription(f[Math.floor(Math.random()*f.length)]).setColor(C.purple)]}); }
    if (cmd==='password') { const len=interaction.options.getInteger('longitud')||16; const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'; const pwd=Array.from({length:len},()=>chars[Math.floor(Math.random()*chars.length)]).join(''); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🔐 Contraseña').setDescription('`'+pwd+'`').setColor(C.green)],ephemeral:true}); }
    if (cmd==='cat') return interaction.reply({embeds:[new EmbedBuilder().setTitle('🐱 Gatito').setImage('https://cataas.com/cat?'+Date.now()).setColor(C.orange)]});
    if (cmd==='dog') return interaction.reply({embeds:[new EmbedBuilder().setTitle('🐶 Perrito').setImage('https://place.dog/400/300?'+Date.now()).setColor(C.orange)]});
    if (cmd==='fox') return interaction.reply({embeds:[new EmbedBuilder().setTitle('🦊 Zorro').setDescription('🦊 ¡Que lindo zorro!').setColor(C.orange)]});
    if (cmd==='panda') return interaction.reply({embeds:[new EmbedBuilder().setTitle('🐼 Panda').setDescription('🐼 ¡Un panda adorable!').setColor(C.white)]});

    // ANIME
    if (cmd==='anime') { const n=interaction.options.getString('nombre'); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎌 Anime: '+n).setDescription('Busca **'+n+'** en [MyAnimeList](https://myanimelist.net/search/all?q='+encodeURIComponent(n)+')').setColor(C.purple)]}); }
    if (cmd==='manga') { const n=interaction.options.getString('nombre'); return interaction.reply({embeds:[new EmbedBuilder().setTitle('📚 Manga: '+n).setDescription('Busca **'+n+'** en [MyAnimeList](https://myanimelist.net/search/all?q='+encodeURIComponent(n)+')').setColor(C.blue)]}); }
    if (cmd==='waifu') return interaction.reply({embeds:[new EmbedBuilder().setTitle('🌸 Waifu').setImage('https://api.waifu.pics/sfw/waifu').setColor(C.pink)]});
    if (cmd==='neko') return interaction.reply({embeds:[new EmbedBuilder().setTitle('🐱 Neko').setImage('https://api.waifu.pics/sfw/neko').setColor(C.pink)]});

    // UTILIDADES
    if (cmd==='embed') { const embed=new EmbedBuilder().setTitle(interaction.options.getString('titulo')).setDescription(interaction.options.getString('descripcion')).setColor(C.blue).setTimestamp(); await interaction.channel.send({embeds:[embed]}); return interaction.reply({content:'✅',ephemeral:true}); }
    if (cmd==='say') { await interaction.channel.send(interaction.options.getString('mensaje')); return interaction.reply({content:'✅',ephemeral:true}); }
    if (cmd==='announce') { const ch=interaction.options.getChannel('canal')||interaction.channel; const embed=new EmbedBuilder().setTitle('📣 Anuncio').setDescription(interaction.options.getString('mensaje')).setColor(C.blue).setFooter({text:'Por '+user.tag}).setTimestamp(); await ch.send({content:'@everyone',embeds:[embed]}); return interaction.reply({content:'✅',ephemeral:true}); }
    if (cmd==='poll') { const embed=new EmbedBuilder().setTitle('📊 Encuesta').setDescription(interaction.options.getString('pregunta')).setColor(C.blue).setFooter({text:'Por '+user.tag}).setTimestamp(); const msg=await interaction.reply({embeds:[embed],fetchReply:true}); await msg.react('👍'); await msg.react('👎'); return; }
    if (cmd==='giveaway') { const embed=new EmbedBuilder().setTitle('🎉 ¡SORTEO!').setDescription('**Premio:** '+interaction.options.getString('premio')+'\n**Ganadores:** '+interaction.options.getInteger('ganadores')+'\n\nReacciona con 🎉 para participar!').setColor(C.yellow).setFooter({text:'Por '+user.tag}).setTimestamp(); const msg=await interaction.reply({embeds:[embed],fetchReply:true}); await msg.react('🎉'); return; }
    if (cmd==='reminder') { const mins=interaction.options.getInteger('minutos'); const msg=interaction.options.getString('mensaje'); await interaction.reply({embeds:[new EmbedBuilder().setDescription('⏰ Recordatorio en **'+mins+' min**: '+msg).setColor(C.blue)]}); setTimeout(async()=>{ await user.send('⏰ **Recordatorio:** '+msg).catch(()=>interaction.channel.send('⏰ '+user+' '+msg)); },mins*60*1000); return; }
    if (cmd==='afk') { const r=interaction.options.getString('razon')||'AFK'; afkUsers.set(user.id,r); return interaction.reply({embeds:[new EmbedBuilder().setDescription('😴 **'+user.username+'** está AFK: '+r).setColor(C.yellow)]}); }
    if (cmd==='translate') { const t=interaction.options.getString('texto'); const i=interaction.options.getString('idioma'); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🌐 Traducción').addFields({name:'Original',value:t},{name:'Traducido ('+i+')',value:'*Usa [Google Translate](https://translate.google.com/?text='+encodeURIComponent(t)+'&sl=auto&tl='+i+') para ver*'}).setColor(C.blue)]}); }
    if (cmd==='weather') { const c=interaction.options.getString('ciudad'); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🌤️ Clima en '+c).setDescription('[Ver en OpenWeather](https://openweathermap.org/find?q='+encodeURIComponent(c)+')').setColor(C.cyan)]}); }
    if (cmd==='wikipedia') { const b=interaction.options.getString('busqueda'); return interaction.reply({embeds:[new EmbedBuilder().setTitle('📖 Wikipedia: '+b).setDescription('[Ver en Wikipedia](https://es.wikipedia.org/wiki/'+encodeURIComponent(b)+')').setColor(C.white)]}); }
    if (cmd==='color') { const h=interaction.options.getString('hex').replace('#',''); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎨 Color #'+h.toUpperCase()).setDescription('**Hex:** #'+h.toUpperCase()+'\n**RGB:** '+parseInt(h.slice(0,2),16)+', '+parseInt(h.slice(2,4),16)+', '+parseInt(h.slice(4,6),16)).setColor(parseInt(h,16)).setImage('https://singlecolorimage.com/get/'+h+'/200x100')]}); }
    if (cmd==='qr') { const t=interaction.options.getString('texto'); return interaction.reply({embeds:[new EmbedBuilder().setTitle('📱 Código QR').setImage('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='+encodeURIComponent(t)).setColor(C.dark)]}); }
    if (cmd==='nowplaying') { const t=interaction.options.getUser('usuario')||user; const gm=await guild.members.fetch(t.id).catch(()=>null); const a=gm?.presence?.activities?.find(a=>a.type===2); if(!a) return interaction.reply({content:'❌ '+t.username+' no está escuchando música',ephemeral:true}); return interaction.reply({embeds:[new EmbedBuilder().setTitle('🎵 Escuchando').setDescription('**'+t.username+'**: '+a.state+' — '+a.details).setColor(C.green)]}); }

    } catch(e) {
        console.error('Error en '+cmd+':', e.message);
        const m={content:'❌ Error: '+e.message,ephemeral:true};
        if(interaction.deferred) await interaction.editReply(m).catch(()=>{});
        else if(!interaction.replied) await interaction.reply(m).catch(()=>{});
    }
});

client.login(process.env.TOKEN);
