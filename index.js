require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, 
        PermissionFlagsBits, ChannelType, SlashCommandBuilder,
        ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection,
        REST, Routes, ActivityType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// ── CONFIG STORAGE (en memoria, puedes usar una DB) ──────────
const guildConfigs = new Map();

function getConfig(guildId) {
    if (!guildConfigs.has(guildId)) {
        guildConfigs.set(guildId, {
            welcomeChannel: null,
            farewellChannel: null,
            logsChannel: null,
            muteRole: null,
            prefix: '!'
        });
    }
    return guildConfigs.get(guildId);
}

// ── COLORS ───────────────────────────────────────────────────
const COLORS = {
    green:  0x57F287,
    red:    0xED4245,
    blue:   0x5865F2,
    yellow: 0xFEE75C,
    purple: 0x9B59B6,
    orange: 0xE67E22,
    cyan:   0x00BCD4,
    white:  0xFFFFFF,
};

// ── SLASH COMMANDS ────────────────────────────────────────────
const commands = [
    // ── AUTO CONFIG ──
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('⚙️ Auto configura todos los canales del servidor automáticamente'),

    // ── BIENVENIDAS / DESPEDIDAS ──
    new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('👋 Establece el canal de bienvenidas')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de bienvenidas').setRequired(true)),

    new SlashCommandBuilder()
        .setName('setfarewell')
        .setDescription('👋 Establece el canal de despedidas')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de despedidas').setRequired(true)),

    new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription('📋 Establece el canal de logs')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de logs').setRequired(true)),

    new SlashCommandBuilder()
        .setName('testwelcome')
        .setDescription('🧪 Prueba el mensaje de bienvenida'),

    new SlashCommandBuilder()
        .setName('testfarewell')
        .setDescription('🧪 Prueba el mensaje de despedida'),

    // ── INFO ──
    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('👤 Info de un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(false)),

    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('🏠 Info del servidor'),

    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('🖼️ Ver avatar de un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(false)),

    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Ver latencia del bot'),

    new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('🤖 Info del bot'),

    new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('🎭 Info de un rol')
        .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true)),

    new SlashCommandBuilder()
        .setName('channelinfo')
        .setDescription('📢 Info de un canal')
        .addChannelOption(o => o.setName('canal').setDescription('Canal').setRequired(false)),

    new SlashCommandBuilder()
        .setName('membercount')
        .setDescription('👥 Ver cantidad de miembros'),

    new SlashCommandBuilder()
        .setName('firstmessage')
        .setDescription('📜 Ver el primer mensaje de un canal'),

    // ── MODERACIÓN ──
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 Banear un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('👢 Expulsar un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('🔇 Silenciar un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('🔊 Quitar silencio a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ Advertir a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('🗑️ Borrar mensajes')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('🔒 Bloquear un canal')
        .addChannelOption(o => o.setName('canal').setDescription('Canal').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('🔓 Desbloquear un canal')
        .addChannelOption(o => o.setName('canal').setDescription('Canal').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('🐌 Establecer modo lento')
        .addIntegerOption(o => o.setName('segundos').setDescription('Segundos (0 = desactivar)').setRequired(true).setMinValue(0).setMaxValue(21600))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName('nickname')
        .setDescription('✏️ Cambiar apodo de un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addStringOption(o => o.setName('apodo').setDescription('Nuevo apodo (vacío para quitar)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

    new SlashCommandBuilder()
        .setName('role')
        .setDescription('🎭 Dar/quitar rol a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('✅ Desbanear un usuario')
        .addStringOption(o => o.setName('id').setDescription('ID del usuario').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    // ── UTILIDAD ──
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('📝 Crear un embed personalizado')
        .addStringOption(o => o.setName('titulo').setDescription('Título').setRequired(true))
        .addStringOption(o => o.setName('descripcion').setDescription('Descripción').setRequired(true))
        .addStringOption(o => o.setName('color').setDescription('Color (hex sin #)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('say')
        .setDescription('💬 Hacer hablar al bot')
        .addStringOption(o => o.setName('mensaje').setDescription('Mensaje').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('📣 Hacer un anuncio')
        .addStringOption(o => o.setName('mensaje').setDescription('Mensaje').setRequired(true))
        .addChannelOption(o => o.setName('canal').setDescription('Canal').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('poll')
        .setDescription('📊 Crear una encuesta')
        .addStringOption(o => o.setName('pregunta').setDescription('Pregunta').setRequired(true)),

    new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('🎉 Iniciar un sorteo')
        .addStringOption(o => o.setName('premio').setDescription('Premio').setRequired(true))
        .addIntegerOption(o => o.setName('ganadores').setDescription('Cantidad de ganadores').setRequired(true).setMinValue(1))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

    new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('⏰ Crear un recordatorio')
        .addIntegerOption(o => o.setName('minutos').setDescription('En cuántos minutos').setRequired(true).setMinValue(1))
        .addStringOption(o => o.setName('mensaje').setDescription('Mensaje').setRequired(true)),

    new SlashCommandBuilder()
        .setName('invite')
        .setDescription('🔗 Crear enlace de invitación del servidor'),

    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('📈 Ver estadísticas del servidor'),

    // ── DIVERSIÓN ──
    new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('🎱 Pregunta a la bola mágica')
        .addStringOption(o => o.setName('pregunta').setDescription('Pregunta').setRequired(true)),

    new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('🪙 Tirar una moneda'),

    new SlashCommandBuilder()
        .setName('dice')
        .setDescription('🎲 Tirar un dado')
        .addIntegerOption(o => o.setName('caras').setDescription('Número de caras').setRequired(false).setMinValue(2).setMaxValue(100)),

    new SlashCommandBuilder()
        .setName('rps')
        .setDescription('✊ Piedra, papel o tijeras')
        .addStringOption(o => o.setName('eleccion').setDescription('Tu elección').setRequired(true)
            .addChoices(
                {name:'✊ Piedra', value:'piedra'},
                {name:'📄 Papel', value:'papel'},
                {name:'✂️ Tijeras', value:'tijeras'}
            )),

    new SlashCommandBuilder()
        .setName('meme')
        .setDescription('😂 Ver un meme aleatorio'),

    new SlashCommandBuilder()
        .setName('quote')
        .setDescription('💭 Frase motivacional aleatoria'),

    new SlashCommandBuilder()
        .setName('hug')
        .setDescription('🤗 Abrazar a alguien')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)),

    new SlashCommandBuilder()
        .setName('slap')
        .setDescription('👋 Abofetear a alguien')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)),

    new SlashCommandBuilder()
        .setName('ship')
        .setDescription('💕 Shipear dos usuarios')
        .addUserOption(o => o.setName('usuario1').setDescription('Usuario 1').setRequired(true))
        .addUserOption(o => o.setName('usuario2').setDescription('Usuario 2').setRequired(true)),

    new SlashCommandBuilder()
        .setName('rate')
        .setDescription('⭐ Valorar algo')
        .addStringOption(o => o.setName('cosa').setDescription('Qué valorar').setRequired(true)),

    new SlashCommandBuilder()
        .setName('choose')
        .setDescription('🤔 Elegir entre opciones')
        .addStringOption(o => o.setName('opciones').setDescription('Opciones separadas por coma').setRequired(true)),

    new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('🧠 Pregunta de trivia aleatoria'),

    new SlashCommandBuilder()
        .setName('joke')
        .setDescription('😄 Chiste aleatorio'),

    // ── MÚSICA (info) ──
    new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('🎵 Ver qué música está escuchando alguien')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(false)),

    // ── ECONOMÍA ──
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('💰 Ver tu balance')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(false)),

    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('💵 Recoger tu recompensa diaria'),

    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 Ver tabla de clasificación'),

].map(cmd => cmd.toJSON());

// ── REGISTER COMMANDS ─────────────────────────────────────────
client.once('ready', async () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    
    // Set activity
    client.user.setActivity('Steal a Brainrot | /help', { type: ActivityType.Watching });

    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('📝 Registrando comandos slash...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log(`✅ ${commands.length} comandos registrados!`);
    } catch(e) {
        console.error('❌ Error registrando comandos:', e);
    }
});

// ── WELCOME ───────────────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
    const config = getConfig(member.guild.id);
    if (!config.welcomeChannel) return;

    const channel = member.guild.channels.cache.get(config.welcomeChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(`👋 ¡Bienvenido al servidor!`)
        .setDescription(`¡Hola ${member}! Bienvenido a **${member.guild.name}**\nEres el miembro número **${member.guild.memberCount}**`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setColor(COLORS.green)
        .addFields(
            { name: '📛 Usuario', value: member.user.tag, inline: true },
            { name: '📅 Cuenta creada', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:R>`, inline: true },
        )
        .setImage('https://i.imgur.com/AfFp7pu.png')
        .setFooter({ text: `ID: ${member.user.id}` })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('📜 Ver Reglas')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('rules'),
        new ButtonBuilder()
            .setLabel('🎮 Canales')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('channels'),
    );

    await channel.send({ content: `${member}`, embeds: [embed], components: [row] });
    
    // Log
    logAction(member.guild, '📥 Nuevo miembro', `${member.user.tag} se unió`, COLORS.green);
});

// ── FAREWELL ──────────────────────────────────────────────────
client.on('guildMemberRemove', async (member) => {
    const config = getConfig(member.guild.id);
    if (!config.farewellChannel) return;

    const channel = member.guild.channels.cache.get(config.farewellChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(`👋 Un miembro se fue`)
        .setDescription(`**${member.user.tag}** ha abandonado el servidor\nNos quedan **${member.guild.memberCount}** miembros`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setColor(COLORS.red)
        .addFields(
            { name: '📅 Se unió', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp/1000)}:R>` : 'Desconocido', inline: true },
        )
        .setFooter({ text: `ID: ${member.user.id}` })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
    logAction(member.guild, '📤 Miembro salió', `${member.user.tag} se fue`, COLORS.red);
});

// ── LOGS HELPER ───────────────────────────────────────────────
async function logAction(guild, title, description, color = COLORS.blue) {
    const config = getConfig(guild.id);
    if (!config.logsChannel) return;
    const ch = guild.channels.cache.get(config.logsChannel);
    if (!ch) return;
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
    await ch.send({ embeds: [embed] }).catch(() => {});
}

// ── ECONOMY STORAGE ───────────────────────────────────────────
const economy = new Map();
const dailyCooldown = new Map();

function getBalance(userId) {
    return economy.get(userId) || 0;
}

function addBalance(userId, amount) {
    economy.set(userId, getBalance(userId) + amount);
}

// ── INTERACTION HANDLER ───────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guild, member, user } = interaction;

    try {
        // ── SETUP ──
        if (commandName === 'setup') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Necesitas ser Administrador', ephemeral: true });
            }

            await interaction.deferReply();

            const categoryNames = ['📋 INFO', '💬 GENERAL', '🎮 JUEGOS', '📣 ANUNCIOS', '🔧 STAFF'];
            const channels = {
                welcome: null, farewell: null, logs: null,
                general: null, rules: null, announcements: null
            };

            // Create categories and channels
            try {
                // Category INFO
                const catInfo = await guild.channels.create({
                    name: '📋 INFO',
                    type: ChannelType.GuildCategory,
                });

                channels.rules = await guild.channels.create({
                    name: '📜・reglas',
                    type: ChannelType.GuildText,
                    parent: catInfo.id,
                });

                channels.announcements = await guild.channels.create({
                    name: '📣・anuncios',
                    type: ChannelType.GuildText,
                    parent: catInfo.id,
                });

                // Category GENERAL
                const catGeneral = await guild.channels.create({
                    name: '💬 GENERAL',
                    type: ChannelType.GuildCategory,
                });

                channels.general = await guild.channels.create({
                    name: '💬・general',
                    type: ChannelType.GuildText,
                    parent: catGeneral.id,
                });

                await guild.channels.create({
                    name: '🎮・juegos',
                    type: ChannelType.GuildText,
                    parent: catGeneral.id,
                });

                await guild.channels.create({
                    name: '📸・fotos',
                    type: ChannelType.GuildText,
                    parent: catGeneral.id,
                });

                // Category MIEMBROS
                const catMembers = await guild.channels.create({
                    name: '👥 MIEMBROS',
                    type: ChannelType.GuildCategory,
                });

                channels.welcome = await guild.channels.create({
                    name: '👋・bienvenidas',
                    type: ChannelType.GuildText,
                    parent: catMembers.id,
                });

                channels.farewell = await guild.channels.create({
                    name: '👋・despedidas',
                    type: ChannelType.GuildText,
                    parent: catMembers.id,
                });

                // Category STAFF
                const catStaff = await guild.channels.create({
                    name: '🔧 STAFF',
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] }
                    ]
                });

                channels.logs = await guild.channels.create({
                    name: '📋・logs',
                    type: ChannelType.GuildText,
                    parent: catStaff.id,
                });

                await guild.channels.create({
                    name: '⚙️・staff-chat',
                    type: ChannelType.GuildText,
                    parent: catStaff.id,
                });

                // Save config
                const config = getConfig(guild.id);
                config.welcomeChannel = channels.welcome.id;
                config.farewellChannel = channels.farewell.id;
                config.logsChannel = channels.logs.id;

                // Send rules message
                await channels.rules.send({
                    embeds: [new EmbedBuilder()
                        .setTitle('📜 Reglas del servidor')
                        .setDescription('1. Respeta a todos los miembros\n2. No spam\n3. No contenido NSFW\n4. Sigue las normas de Discord\n5. Diviértete!')
                        .setColor(COLORS.blue)]
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ ¡Servidor configurado!')
                    .setDescription('Se crearon todos los canales automáticamente')
                    .setColor(COLORS.green)
                    .addFields(
                        { name: '👋 Bienvenidas', value: `${channels.welcome}`, inline: true },
                        { name: '👋 Despedidas', value: `${channels.farewell}`, inline: true },
                        { name: '📋 Logs', value: `${channels.logs}`, inline: true },
                        { name: '📣 Anuncios', value: `${channels.announcements}`, inline: true },
                        { name: '💬 General', value: `${channels.general}`, inline: true },
                        { name: '📜 Reglas', value: `${channels.rules}`, inline: true },
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } catch(e) {
                await interaction.editReply({ content: `❌ Error: ${e.message}` });
            }
        }

        // ── SET WELCOME ──
        else if (commandName === 'setwelcome') {
            if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Sin permisos', ephemeral: true });
            const channel = interaction.options.getChannel('canal');
            getConfig(guild.id).welcomeChannel = channel.id;
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`✅ Canal de bienvenidas: ${channel}`).setColor(COLORS.green)] });
        }

        // ── SET FAREWELL ──
        else if (commandName === 'setfarewell') {
            if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Sin permisos', ephemeral: true });
            const channel = interaction.options.getChannel('canal');
            getConfig(guild.id).farewellChannel = channel.id;
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`✅ Canal de despedidas: ${channel}`).setColor(COLORS.green)] });
        }

        // ── SET LOGS ──
        else if (commandName === 'setlogs') {
            if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Sin permisos', ephemeral: true });
            const channel = interaction.options.getChannel('canal');
            getConfig(guild.id).logsChannel = channel.id;
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`✅ Canal de logs: ${channel}`).setColor(COLORS.green)] });
        }

        // ── TEST WELCOME ──
        else if (commandName === 'testwelcome') {
            const config = getConfig(guild.id);
            const ch = config.welcomeChannel ? guild.channels.cache.get(config.welcomeChannel) : interaction.channel;
            const embed = new EmbedBuilder()
                .setTitle('👋 ¡Bienvenido al servidor!')
                .setDescription(`¡Hola ${user}! Bienvenido a **${guild.name}**`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setColor(COLORS.green).setTimestamp();
            await ch.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ Mensaje de prueba enviado', ephemeral: true });
        }

        // ── TEST FAREWELL ──
        else if (commandName === 'testfarewell') {
            const config = getConfig(guild.id);
            const ch = config.farewellChannel ? guild.channels.cache.get(config.farewellChannel) : interaction.channel;
            const embed = new EmbedBuilder()
                .setTitle('👋 Un miembro se fue')
                .setDescription(`**${user.tag}** ha abandonado el servidor`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setColor(COLORS.red).setTimestamp();
            await ch.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ Mensaje de prueba enviado', ephemeral: true });
        }

        // ── PING ──
        else if (commandName === 'ping') {
            const embed = new EmbedBuilder()
                .setTitle('🏓 Pong!')
                .addFields(
                    { name: '📡 Latencia', value: `${client.ws.ping}ms`, inline: true },
                    { name: '⚡ API', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true },
                ).setColor(COLORS.blue);
            await interaction.reply({ embeds: [embed] });
        }

        // ── USER INFO ──
        else if (commandName === 'userinfo') {
            const target = interaction.options.getUser('usuario') || user;
            const gMember = await guild.members.fetch(target.id).catch(() => null);
            const embed = new EmbedBuilder()
                .setTitle(`👤 ${target.tag}`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .setColor(COLORS.blue)
                .addFields(
                    { name: '🆔 ID', value: target.id, inline: true },
                    { name: '📅 Cuenta creada', value: `<t:${Math.floor(target.createdTimestamp/1000)}:R>`, inline: true },
                    { name: '📥 Se unió', value: gMember ? `<t:${Math.floor(gMember.joinedTimestamp/1000)}:R>` : 'N/A', inline: true },
                    { name: '🎭 Roles', value: gMember ? gMember.roles.cache.filter(r => r.id !== guild.id).map(r => `${r}`).join(', ') || 'Ninguno' : 'N/A', inline: false },
                ).setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }

        // ── SERVER INFO ──
        else if (commandName === 'serverinfo') {
            const embed = new EmbedBuilder()
                .setTitle(`🏠 ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .setColor(COLORS.blue)
                .addFields(
                    { name: '👑 Dueño', value: `<@${guild.ownerId}>`, inline: true },
                    { name: '👥 Miembros', value: `${guild.memberCount}`, inline: true },
                    { name: '📢 Canales', value: `${guild.channels.cache.size}`, inline: true },
                    { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
                    { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
                    { name: '📅 Creado', value: `<t:${Math.floor(guild.createdTimestamp/1000)}:R>`, inline: true },
                ).setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }

        // ── AVATAR ──
        else if (commandName === 'avatar') {
            const target = interaction.options.getUser('usuario') || user;
            const embed = new EmbedBuilder()
                .setTitle(`🖼️ Avatar de ${target.username}`)
                .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setColor(COLORS.blue);
            await interaction.reply({ embeds: [embed] });
        }

        // ── BOT INFO ──
        else if (commandName === 'botinfo') {
            const embed = new EmbedBuilder()
                .setTitle('🤖 Info del Bot')
                .setThumbnail(client.user.displayAvatarURL())
                .setColor(COLORS.purple)
                .addFields(
                    { name: '📛 Nombre', value: client.user.tag, inline: true },
                    { name: '🏠 Servidores', value: `${client.guilds.cache.size}`, inline: true },
                    { name: '👥 Usuarios', value: `${client.users.cache.size}`, inline: true },
                    { name: '⚡ Comandos', value: `${commands.length}`, inline: true },
                    { name: '📅 Creado', value: `<t:${Math.floor(client.user.createdTimestamp/1000)}:R>`, inline: true },
                    { name: '🟢 Uptime', value: `<t:${Math.floor((Date.now()-client.uptime)/1000)}:R>`, inline: true },
                ).setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }

        // ── MEMBER COUNT ──
        else if (commandName === 'membercount') {
            const embed = new EmbedBuilder()
                .setTitle('👥 Miembros')
                .setDescription(`**${guild.name}** tiene **${guild.memberCount}** miembros`)
                .setColor(COLORS.blue);
            await interaction.reply({ embeds: [embed] });
        }

        // ── BAN ──
        else if (commandName === 'ban') {
            const target = interaction.options.getUser('usuario');
            const razon = interaction.options.getString('razon') || 'Sin razón';
            const gMember = await guild.members.fetch(target.id).catch(() => null);
            if (!gMember) return interaction.reply({ content: '❌ Usuario no encontrado', ephemeral: true });
            if (!gMember.bannable) return interaction.reply({ content: '❌ No puedo banear a este usuario', ephemeral: true });
            await gMember.ban({ reason: razon });
            const embed = new EmbedBuilder()
                .setTitle('🔨 Usuario baneado')
                .addFields(
                    { name: 'Usuario', value: target.tag, inline: true },
                    { name: 'Razón', value: razon, inline: true },
                    { name: 'Por', value: user.tag, inline: true },
                ).setColor(COLORS.red).setTimestamp();
            await interaction.reply({ embeds: [embed] });
            logAction(guild, '🔨 Ban', `${user.tag} baneó a ${target.tag} | Razón: ${razon}`, COLORS.red);
        }

        // ── KICK ──
        else if (commandName === 'kick') {
            const target = interaction.options.getUser('usuario');
            const razon = interaction.options.getString('razon') || 'Sin razón';
            const gMember = await guild.members.fetch(target.id).catch(() => null);
            if (!gMember?.kickable) return interaction.reply({ content: '❌ No puedo expulsar a este usuario', ephemeral: true });
            await gMember.kick(razon);
            const embed = new EmbedBuilder()
                .setTitle('👢 Usuario expulsado')
                .addFields(
                    { name: 'Usuario', value: target.tag, inline: true },
                    { name: 'Razón', value: razon, inline: true },
                ).setColor(COLORS.orange).setTimestamp();
            await interaction.reply({ embeds: [embed] });
            logAction(guild, '👢 Kick', `${user.tag} expulsó a ${target.tag}`, COLORS.orange);
        }

        // ── MUTE ──
        else if (commandName === 'mute') {
            const target = interaction.options.getUser('usuario');
            const razon = interaction.options.getString('razon') || 'Sin razón';
            const gMember = await guild.members.fetch(target.id).catch(() => null);
            if (!gMember) return interaction.reply({ content: '❌ Usuario no encontrado', ephemeral: true });
            await gMember.timeout(10 * 60 * 1000, razon); // 10 min
            const embed = new EmbedBuilder()
                .setTitle('🔇 Usuario silenciado')
                .addFields({ name: 'Usuario', value: target.tag, inline: true }, { name: 'Duración', value: '10 minutos', inline: true })
                .setColor(COLORS.yellow).setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }

        // ── UNMUTE ──
        else if (commandName === 'unmute') {
            const target = interaction.options.getUser('usuario');
            const gMember = await guild.members.fetch(target.id).catch(() => null);
            if (!gMember) return interaction.reply({ content: '❌ Usuario no encontrado', ephemeral: true });
            await gMember.timeout(null);
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`✅ ${target.tag} ya puede hablar`).setColor(COLORS.green)] });
        }

        // ── WARN ──
        else if (commandName === 'warn') {
            const target = interaction.options.getUser('usuario');
            const razon = interaction.options.getString('razon');
            const embed = new EmbedBuilder()
                .setTitle('⚠️ Advertencia')
                .addFields({ name: 'Usuario', value: target.tag, inline: true }, { name: 'Razón', value: razon, inline: true })
                .setColor(COLORS.yellow).setTimestamp();
            await interaction.reply({ embeds: [embed] });
            logAction(guild, '⚠️ Warn', `${user.tag} advirtió a ${target.tag}: ${razon}`, COLORS.yellow);
        }

        // ── CLEAR ──
        else if (commandName === 'clear') {
            const amount = interaction.options.getInteger('cantidad');
            const deleted = await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`🗑️ Borrados **${deleted.size}** mensajes`).setColor(COLORS.red)], ephemeral: true });
        }

        // ── LOCK ──
        else if (commandName === 'lock') {
            const ch = interaction.options.getChannel('canal') || interaction.channel;
            await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`🔒 ${ch} bloqueado`).setColor(COLORS.red)] });
        }

        // ── UNLOCK ──
        else if (commandName === 'unlock') {
            const ch = interaction.options.getChannel('canal') || interaction.channel;
            await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`🔓 ${ch} desbloqueado`).setColor(COLORS.green)] });
        }

        // ── SLOWMODE ──
        else if (commandName === 'slowmode') {
            const secs = interaction.options.getInteger('segundos');
            await interaction.channel.setRateLimitPerUser(secs);
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`🐌 Modo lento: **${secs}s**`).setColor(COLORS.yellow)] });
        }

        // ── NICKNAME ──
        else if (commandName === 'nickname') {
            const target = interaction.options.getUser('usuario');
            const apodo = interaction.options.getString('apodo') || null;
            const gMember = await guild.members.fetch(target.id).catch(() => null);
            if (!gMember) return interaction.reply({ content: '❌ Usuario no encontrado', ephemeral: true });
            await gMember.setNickname(apodo);
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`✅ Apodo ${apodo ? `cambiado a **${apodo}**` : 'eliminado'}`).setColor(COLORS.green)] });
        }

        // ── ROLE ──
        else if (commandName === 'role') {
            const target = interaction.options.getUser('usuario');
            const rol = interaction.options.getRole('rol');
            const gMember = await guild.members.fetch(target.id).catch(() => null);
            if (!gMember) return interaction.reply({ content: '❌ Usuario no encontrado', ephemeral: true });
            if (gMember.roles.cache.has(rol.id)) {
                await gMember.roles.remove(rol);
                await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`✅ Rol **${rol.name}** eliminado de ${target}`).setColor(COLORS.red)] });
            } else {
                await gMember.roles.add(rol);
                await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`✅ Rol **${rol.name}** dado a ${target}`).setColor(COLORS.green)] });
            }
        }

        // ── UNBAN ──
        else if (commandName === 'unban') {
            const id = interaction.options.getString('id');
            await guild.members.unban(id).catch(() => null);
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`✅ Usuario desbaneado`).setColor(COLORS.green)] });
        }

        // ── EMBED ──
        else if (commandName === 'embed') {
            const titulo = interaction.options.getString('titulo');
            const desc = interaction.options.getString('descripcion');
            const colorHex = interaction.options.getString('color');
            const color = colorHex ? parseInt(colorHex, 16) : COLORS.blue;
            const embed = new EmbedBuilder().setTitle(titulo).setDescription(desc).setColor(color).setTimestamp();
            await interaction.channel.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ Embed enviado', ephemeral: true });
        }

        // ── SAY ──
        else if (commandName === 'say') {
            const msg = interaction.options.getString('mensaje');
            await interaction.channel.send(msg);
            await interaction.reply({ content: '✅', ephemeral: true });
        }

        // ── ANNOUNCE ──
        else if (commandName === 'announce') {
            const msg = interaction.options.getString('mensaje');
            const ch = interaction.options.getChannel('canal') || interaction.channel;
            const embed = new EmbedBuilder()
                .setTitle('📣 Anuncio')
                .setDescription(msg)
                .setColor(COLORS.blue)
                .setFooter({ text: `Por ${user.tag}` })
                .setTimestamp();
            await ch.send({ content: '@everyone', embeds: [embed] });
            await interaction.reply({ content: '✅ Anuncio enviado', ephemeral: true });
        }

        // ── POLL ──
        else if (commandName === 'poll') {
            const pregunta = interaction.options.getString('pregunta');
            const embed = new EmbedBuilder()
                .setTitle('📊 Encuesta')
                .setDescription(pregunta)
                .setColor(COLORS.blue)
                .setFooter({ text: `Por ${user.tag}` })
                .setTimestamp();
            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            await msg.react('👍');
            await msg.react('👎');
        }

        // ── GIVEAWAY ──
        else if (commandName === 'giveaway') {
            const premio = interaction.options.getString('premio');
            const ganadores = interaction.options.getInteger('ganadores');
            const embed = new EmbedBuilder()
                .setTitle('🎉 ¡SORTEO!')
                .setDescription(`**Premio:** ${premio}\n**Ganadores:** ${ganadores}\n\nReacciona con 🎉 para participar!`)
                .setColor(COLORS.yellow)
                .setFooter({ text: `Organizado por ${user.tag}` })
                .setTimestamp();
            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            await msg.react('🎉');
        }

        // ── REMINDER ──
        else if (commandName === 'reminder') {
            const mins = interaction.options.getInteger('minutos');
            const msg = interaction.options.getString('mensaje');
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`⏰ Te recordaré en **${mins} minuto(s)**: ${msg}`).setColor(COLORS.blue)] });
            setTimeout(async () => {
                await user.send(`⏰ **Recordatorio:** ${msg}`).catch(() => {
                    interaction.channel.send(`⏰ ${user} **Recordatorio:** ${msg}`);
                });
            }, mins * 60 * 1000);
        }

        // ── INVITE ──
        else if (commandName === 'invite') {
            const inv = await interaction.channel.createInvite({ maxAge: 86400, maxUses: 0 });
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`🔗 **Invitación:** ${inv.url}`).setColor(COLORS.blue)] });
        }

        // ── STATS ──
        else if (commandName === 'stats') {
            const textCh = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
            const voiceCh = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
            const embed = new EmbedBuilder()
                .setTitle(`📈 Estadísticas de ${guild.name}`)
                .addFields(
                    { name: '👥 Miembros', value: `${guild.memberCount}`, inline: true },
                    { name: '💬 Canales texto', value: `${textCh}`, inline: true },
                    { name: '🔊 Canales voz', value: `${voiceCh}`, inline: true },
                    { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
                    { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
                ).setColor(COLORS.blue).setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }

        // ── 8BALL ──
        else if (commandName === '8ball') {
            const pregunta = interaction.options.getString('pregunta');
            const respuestas = ['✅ Sí', '❌ No', '🤔 Tal vez', '💯 Definitivamente sí', '⛔ Definitivamente no', '🔮 Las señales apuntan a sí', '❓ Pregunta de nuevo'];
            const resp = respuestas[Math.floor(Math.random() * respuestas.length)];
            const embed = new EmbedBuilder()
                .setTitle('🎱 Bola Mágica')
                .addFields({ name: '❓ Pregunta', value: pregunta }, { name: '🔮 Respuesta', value: resp })
                .setColor(COLORS.purple);
            await interaction.reply({ embeds: [embed] });
        }

        // ── COINFLIP ──
        else if (commandName === 'coinflip') {
            const result = Math.random() < 0.5 ? '🪙 Cara' : '🪙 Cruz';
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🪙 Lanzamiento de moneda').setDescription(`¡Salió **${result}**!`).setColor(COLORS.yellow)] });
        }

        // ── DICE ──
        else if (commandName === 'dice') {
            const caras = interaction.options.getInteger('caras') || 6;
            const result = Math.floor(Math.random() * caras) + 1;
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🎲 Dado de ${caras} caras`).setDescription(`¡Salió **${result}**!`).setColor(COLORS.orange)] });
        }

        // ── RPS ──
        else if (commandName === 'rps') {
            const elecciones = ['piedra', 'papel', 'tijeras'];
            const emojis = { piedra: '✊', papel: '📄', tijeras: '✂️' };
            const jugador = interaction.options.getString('eleccion');
            const bot = elecciones[Math.floor(Math.random() * 3)];
            let resultado;
            if (jugador === bot) resultado = '🤝 ¡Empate!';
            else if ((jugador==='piedra'&&bot==='tijeras')||(jugador==='papel'&&bot==='piedra')||(jugador==='tijeras'&&bot==='papel')) resultado = '🏆 ¡Ganaste!';
            else resultado = '💀 ¡Perdiste!';
            const embed = new EmbedBuilder()
                .setTitle('✊ Piedra, Papel o Tijeras')
                .addFields({ name: 'Tú', value: `${emojis[jugador]} ${jugador}`, inline: true }, { name: 'Bot', value: `${emojis[bot]} ${bot}`, inline: true }, { name: 'Resultado', value: resultado })
                .setColor(resultado.includes('Ganaste') ? COLORS.green : resultado.includes('Empate') ? COLORS.yellow : COLORS.red);
            await interaction.reply({ embeds: [embed] });
        }

        // ── QUOTE ──
        else if (commandName === 'quote') {
            const frases = [
                'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
                'No cuentes los días, haz que los días cuenten.',
                'El único modo de hacer un gran trabajo es amar lo que haces.',
                'Cree que puedes y ya estarás a medio camino.',
                'La vida es lo que pasa mientras estás ocupado haciendo otros planes.',
            ];
            const frase = frases[Math.floor(Math.random() * frases.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('💭 Frase del día').setDescription(`*"${frase}"*`).setColor(COLORS.purple)] });
        }

        // ── HUG ──
        else if (commandName === 'hug') {
            const target = interaction.options.getUser('usuario');
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`🤗 **${user.username}** le dio un abrazo a **${target.username}**!`).setColor(COLORS.green)] });
        }

        // ── SLAP ──
        else if (commandName === 'slap') {
            const target = interaction.options.getUser('usuario');
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`👋 **${user.username}** abofeteó a **${target.username}**!`).setColor(COLORS.red)] });
        }

        // ── SHIP ──
        else if (commandName === 'ship') {
            const u1 = interaction.options.getUser('usuario1');
            const u2 = interaction.options.getUser('usuario2');
            const pct = Math.floor(Math.random() * 101);
            const bar = '█'.repeat(Math.floor(pct/10)) + '░'.repeat(10-Math.floor(pct/10));
            const embed = new EmbedBuilder()
                .setTitle('💕 Ship-o-Meter')
                .setDescription(`**${u1.username}** 💗 **${u2.username}**\n\n${bar} **${pct}%**\n\n${pct>=70?'💘 ¡Pareja perfecta!':pct>=40?'💛 Hay algo...':'💔 No hay chemistry'}`)
                .setColor(pct>=70 ? COLORS.red : COLORS.yellow);
            await interaction.reply({ embeds: [embed] });
        }

        // ── RATE ──
        else if (commandName === 'rate') {
            const cosa = interaction.options.getString('cosa');
            const rating = (Math.random() * 10).toFixed(1);
            const stars = '⭐'.repeat(Math.round(rating));
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('⭐ Valoración').setDescription(`**${cosa}** recibe un **${rating}/10**\n${stars}`).setColor(COLORS.yellow)] });
        }

        // ── CHOOSE ──
        else if (commandName === 'choose') {
            const opciones = interaction.options.getString('opciones').split(',').map(o => o.trim()).filter(Boolean);
            const eleccion = opciones[Math.floor(Math.random() * opciones.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🤔 Elijo...').setDescription(`¡Elijo **${eleccion}**!`).setColor(COLORS.blue)] });
        }

        // ── TRIVIA ──
        else if (commandName === 'trivia') {
            const preguntas = [
                { p: '¿En qué año fue creado Discord?', r: '2015' },
                { p: '¿Cuántos colores tiene el arcoíris?', r: '7' },
                { p: '¿Cuál es el planeta más grande del sistema solar?', r: 'Júpiter' },
                { p: '¿Cuántos lados tiene un hexágono?', r: '6' },
                { p: '¿En qué país se inventó la pizza?', r: 'Italia' },
            ];
            const q = preguntas[Math.floor(Math.random() * preguntas.length)];
            const embed = new EmbedBuilder()
                .setTitle('🧠 Trivia')
                .addFields({ name: '❓ Pregunta', value: q.p }, { name: '💡 Respuesta', value: `||${q.r}||` })
                .setColor(COLORS.purple);
            await interaction.reply({ embeds: [embed] });
        }

        // ── JOKE ──
        else if (commandName === 'joke') {
            const chistes = [
                '¿Por qué el programador usa gafas? Porque no puede C#',
                '¿Qué le dijo un 0 a un 8? Bonito cinturón',
                '¿Por qué los programadores prefieren el oscuro? Porque la luz atrae a los bugs',
                'Mi contraseña es "incorrecto". Así cuando me digan que es incorrecta yo seré feliz',
            ];
            const chiste = chistes[Math.floor(Math.random() * chistes.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('😄 Chiste').setDescription(chiste).setColor(COLORS.yellow)] });
        }

        // ── MEME ──
        else if (commandName === 'meme') {
            const memes = [
                'https://i.imgflip.com/4t0m5.jpg',
                'https://i.imgflip.com/26jxvz.jpg',
                'https://i.imgflip.com/1g8my4.jpg',
            ];
            const meme = memes[Math.floor(Math.random() * memes.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('😂 Meme').setImage(meme).setColor(COLORS.orange)] });
        }

        // ── NOWPLAYING ──
        else if (commandName === 'nowplaying') {
            const target = interaction.options.getUser('usuario') || user;
            const gMember = await guild.members.fetch(target.id).catch(() => null);
            const activity = gMember?.presence?.activities?.find(a => a.type === 2);
            if (!activity) return interaction.reply({ content: `❌ ${target.username} no está escuchando música`, ephemeral: true });
            const embed = new EmbedBuilder()
                .setTitle('🎵 Escuchando ahora')
                .setDescription(`**${target.username}** está escuchando:\n**${activity.state}** — ${activity.details}`)
                .setColor(COLORS.green);
            await interaction.reply({ embeds: [embed] });
        }

        // ── BALANCE ──
        else if (commandName === 'balance') {
            const target = interaction.options.getUser('usuario') || user;
            const bal = getBalance(target.id);
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('💰 Balance').setDescription(`**${target.username}** tiene **${bal} 💵 monedas**`).setColor(COLORS.green)] });
        }

        // ── DAILY ──
        else if (commandName === 'daily') {
            const now = Date.now();
            const last = dailyCooldown.get(user.id) || 0;
            const diff = now - last;
            const cooldown = 24 * 60 * 60 * 1000;
            if (diff < cooldown) {
                const remaining = Math.ceil((cooldown - diff) / 1000 / 60 / 60);
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription(`⏰ Ya recogiste tu recompensa. Vuelve en **${remaining}h**`).setColor(COLORS.red)], ephemeral: true });
            }
            const amount = Math.floor(Math.random() * 500) + 100;
            addBalance(user.id, amount);
            dailyCooldown.set(user.id, now);
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('💵 Recompensa diaria').setDescription(`¡Recibiste **${amount} 💵 monedas**!\nTotal: **${getBalance(user.id)}**`).setColor(COLORS.green)] });
        }

        // ── LEADERBOARD ──
        else if (commandName === 'leaderboard') {
            const sorted = [...economy.entries()].sort((a,b) => b[1]-a[1]).slice(0,10);
            if (sorted.length === 0) return interaction.reply({ content: '❌ No hay datos aún', ephemeral: true });
            const desc = sorted.map((e,i) => `${i+1}. <@${e[0]}> — **${e[1]} 💵**`).join('\n');
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 Tabla de clasificación').setDescription(desc).setColor(COLORS.gold)] });
        }

        // ── ROLE INFO ──
        else if (commandName === 'roleinfo') {
            const rol = interaction.options.getRole('rol');
            const embed = new EmbedBuilder()
                .setTitle(`🎭 ${rol.name}`)
                .addFields(
                    { name: '🆔 ID', value: rol.id, inline: true },
                    { name: '🎨 Color', value: rol.hexColor, inline: true },
                    { name: '👥 Miembros', value: `${rol.members.size}`, inline: true },
                    { name: '📌 Mencionable', value: rol.mentionable ? 'Sí' : 'No', inline: true },
                    { name: '📌 Separado', value: rol.hoist ? 'Sí' : 'No', inline: true },
                ).setColor(rol.color || COLORS.blue);
            await interaction.reply({ embeds: [embed] });
        }

        // ── CHANNEL INFO ──
        else if (commandName === 'channelinfo') {
            const ch = interaction.options.getChannel('canal') || interaction.channel;
            const embed = new EmbedBuilder()
                .setTitle(`📢 ${ch.name}`)
                .addFields(
                    { name: '🆔 ID', value: ch.id, inline: true },
                    { name: '📅 Creado', value: `<t:${Math.floor(ch.createdTimestamp/1000)}:R>`, inline: true },
                    { name: '📌 NSFW', value: ch.nsfw ? 'Sí' : 'No', inline: true },
                ).setColor(COLORS.blue);
            await interaction.reply({ embeds: [embed] });
        }

    } catch(e) {
        console.error(`Error en ${commandName}:`, e);
        const msg = { content: `❌ Error: ${e.message}`, ephemeral: true };
        if (interaction.deferred) await interaction.editReply(msg).catch(()=>{});
        else if (!interaction.replied) await interaction.reply(msg).catch(()=>{});
    }
});

// ── LOGIN ─────────────────────────────────────────────────────
client.login(process.env.TOKEN);
