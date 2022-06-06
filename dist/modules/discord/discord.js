"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SJSDiscord = void 0;
const rest_1 = require("@discordjs/rest");
const discord_js_1 = require("discord.js");
const lodash_1 = require("lodash");
const rxjs_1 = require("rxjs");
const utils_1 = require("../../shared/utils/utils");
const v9_1 = require("discord-api-types/v9");
const commands_1 = require("./commands");
const twitch_source_1 = require("../sources/twitch.source");
const trovo_source_1 = require("../sources/trovo.source");
const youtube_source_1 = require("../sources/youtube.source");
class SJSDiscord {
    constructor(opts, configService, sslCert) {
        this.commands = new discord_js_1.Collection();
        this.sources = {};
        this.configService = configService;
        this.rest = new rest_1.REST({ version: '9' }).setToken(opts.token);
        this.client = new discord_js_1.Client({
            intents: [discord_js_1.Intents.FLAGS.GUILDS, discord_js_1.Intents.FLAGS.GUILD_MESSAGES],
            makeCache: discord_js_1.Options.cacheWithLimits({
                MessageManager: {
                    maxSize: 50,
                },
            }),
        });
        this.client.on('ready', this.onReady.bind(this));
        this.client.on('guildCreate', this.onGuildCreate.bind(this));
        this.client.on('guildDelete', this.onGuildDelete.bind(this));
        this.client.on('guildDelete', this.onGuildDelete.bind(this));
        this.client.on('interactionCreate', this.onInteractionCreate.bind(this));
        if (opts.sources.twitch)
            this.sources.twitch = new twitch_source_1.TwitchSource(opts.sources.twitch, sslCert, configService);
        if (opts.sources.trovo)
            this.sources.trovo = new trovo_source_1.TrovoSource(opts.sources.trovo, configService);
        if (opts.sources.youtube)
            this.sources.youtube = new youtube_source_1.YoutubeSource(opts.sources.youtube, configService);
        this.setBotCommands();
    }
    init(opts) {
        const INIT_CHAIN = [(0, rxjs_1.defer)(() => this.client.login(opts.token))];
        if (opts.sources.twitch && this.sources.twitch) {
            const SOURCE = this.sources.twitch;
            INIT_CHAIN.push(SOURCE.init(opts.sources.twitch).pipe((0, rxjs_1.tap)(() => SOURCE.subscribeToStreamChanges(this.client))));
        }
        if (opts.sources.trovo && this.sources.trovo) {
            const SOURCE = this.sources.trovo;
            INIT_CHAIN.push(SOURCE.init().pipe((0, rxjs_1.tap)(() => SOURCE.subscribeToStreamChanges(this.client))));
        }
        if (opts.sources.youtube && this.sources.youtube) {
            const SOURCE = this.sources.youtube;
            INIT_CHAIN.push(SOURCE.init().pipe((0, rxjs_1.tap)(() => SOURCE.subscribeToStreamChanges(this.client))));
        }
        return (0, rxjs_1.combineLatest)(INIT_CHAIN);
    }
    setBotCommands() {
        for (let factory of Object.values(commands_1.Commands)) {
            const command = factory(this.configService, this.sources);
            this.commands.set(command.data.name, command);
        }
    }
    registerBotCommands(clientId) {
        return (0, rxjs_1.defer)(() => this.rest.put(v9_1.Routes.applicationCommands(clientId), {
            body: this.commands.map((command) => command.data.toJSON()),
        })).pipe((0, rxjs_1.catchError)(() => (0, rxjs_1.of)(null)));
    }
    removeDeprecatedCommands() {
        if (this.client.application) {
            const app = this.client.application;
            return (0, rxjs_1.defer)(() => app.commands.fetch()).pipe((0, rxjs_1.switchMap)((commands) => {
                const CURRENT_COMMANDS = this.commands.map((cmd) => cmd.data.name);
                const COMMANDS_TO_DELETE = commands.filter((cmd) => !CURRENT_COMMANDS.includes(cmd.name));
                return (0, rxjs_1.iif)(() => COMMANDS_TO_DELETE.size > 0, (0, rxjs_1.combineLatest)(COMMANDS_TO_DELETE.map((cmd) => (0, rxjs_1.defer)(() => cmd.delete()))).pipe((0, rxjs_1.tap)(() => {
                    console.log(`[${(0, utils_1.getNow)()}] [streambot.js] {Discord} Cleaned up ${COMMANDS_TO_DELETE.size} deprecated commands`);
                })), rxjs_1.EMPTY);
            }));
        }
        else
            return rxjs_1.EMPTY;
    }
    onReady() {
        var _a, _b;
        (_a = this.client.user) === null || _a === void 0 ? void 0 : _a.setActivity(this.configuration.botStatus, { type: 'PLAYING' });
        this.client.guilds.cache.each((guild) => {
            const settings = this.configuration.guilds[guild.id];
            if (settings) {
                (0, lodash_1.defaultsDeep)(settings, this.getGuildDefaults(guild));
                settings.guildName = guild.name;
            }
            else {
                this.configuration.guilds[guild.id] = this.getGuildDefaults(guild);
            }
        });
        if (this.client.user) {
            this.registerBotCommands(this.client.user.id)
                .pipe((0, rxjs_1.switchMap)((result) => {
                if (result) {
                    return this.removeDeprecatedCommands();
                }
                else {
                    console.error(`[${(0, utils_1.getNow)()}] [streambot.js] {Discord} Failed to register global commands`);
                    return rxjs_1.EMPTY;
                }
            }))
                .subscribe();
        }
        this.configService.saveChanges();
        console.log(`[${(0, utils_1.getNow)()}] [streambot.js] {Discord} Logged in as ${(_b = this.client.user) === null || _b === void 0 ? void 0 : _b.tag}`);
    }
    onGuildCreate(guild) {
        const settings = this.configuration.guilds[guild.id];
        if (settings) {
            (0, lodash_1.defaultsDeep)(settings, this.getGuildDefaults(guild));
            settings.guildName = guild.name;
        }
        else {
            this.configuration.guilds[guild.id] = this.getGuildDefaults(guild);
        }
        this.configService.saveChanges();
    }
    onGuildDelete(guild) {
        if (this.configuration.guilds[guild.id]) {
            delete this.configuration.guilds[guild.id];
        }
        this.configService.saveChanges();
    }
    onInteractionCreate(interaction) {
        if (!interaction.isCommand())
            return;
        const COMMAND = this.commands.get(interaction.commandName);
        COMMAND === null || COMMAND === void 0 ? void 0 : COMMAND.execute(interaction);
    }
    getGuildDefaults(guild) {
        return {
            guildId: guild.id,
            guildName: guild.name,
            announcementMessage: '',
            sources: {
                twitch: {},
                trovo: {},
                youtube: {},
            },
        };
    }
    get configuration() {
        return this.configService.getConfiguration();
    }
    get expressMiddleware() {
        var _a;
        return (_a = this.sources.twitch) === null || _a === void 0 ? void 0 : _a.expressMiddleware;
    }
}
exports.SJSDiscord = SJSDiscord;
