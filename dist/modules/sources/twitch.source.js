"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitchSource = void 0;
const api_1 = require("@twurple/api");
const auth_1 = require("@twurple/auth");
const eventsub_1 = require("@twurple/eventsub");
const moment_1 = __importDefault(require("moment"));
const rxjs_1 = require("rxjs");
const twitch_source_model_1 = require("../../shared/interfaces/twitch.source.model");
const utils_1 = require("../../shared/utils/utils");
class TwitchSource {
    constructor(opts, sslCert, configService) {
        this.subscriptions = {};
        this.streamChanges = new rxjs_1.Subject();
        this.isExpressMiddleware = Boolean(opts.expressMiddleware);
        this.configService = configService;
        const { clientId, clientSecret, hostName } = opts;
        const authProvider = new auth_1.ClientCredentialsAuthProvider(clientId, clientSecret);
        const adapter = new eventsub_1.DirectConnectionAdapter({ hostName, sslCert });
        this.apiClient = new api_1.ApiClient({ authProvider });
        this.eventSubListener = new eventsub_1.EventSubListener({
            apiClient: this.apiClient,
            secret: clientSecret,
            adapter,
            logger: {
                minLevel: twitch_source_model_1.LogLevel.CRITICAL,
                emoji: false,
            },
        });
        this.eventSubMiddleware = new eventsub_1.EventSubMiddleware({
            apiClient: this.apiClient,
            hostName,
            pathPrefix: '/twitch',
            secret: clientSecret,
        });
    }
    init() {
        return (0, rxjs_1.iif)(() => this.isExpressMiddleware, (0, rxjs_1.defer)(() => this.eventSubMiddleware.markAsReady()), (0, rxjs_1.defer)(() => this.eventSubListener.listen())).pipe((0, rxjs_1.tap)(() => {
            console.log(`[${(0, utils_1.getNow)()}] [streambot.js] {Twitch} Listening`);
        }), (0, rxjs_1.switchMap)(() => {
            return (0, rxjs_1.combineLatest)(Object.values(this.configuration.guilds).map((guild) => (0, rxjs_1.combineLatest)(Object.values(guild.sources.twitch).map((streamer) => this.setStreamerSubscription(guild.guildId, streamer.userId))).pipe((0, rxjs_1.tap)((streamers) => {
                console.log(`[${(0, utils_1.getNow)()}] [streambot.js] {Twitch} Subscribed to ${streamers.length} channels on server ${guild.guildName}`);
            }))));
        }), (0, rxjs_1.switchMap)(() => this.reauthorizeInvalidSubscriptions()));
    }
    addStreamers(guildId, displayNames) {
        const newStreamers = [];
        for (let displayName of displayNames) {
            const streamer = Object.values(this.configuration.guilds[guildId].sources.twitch).find((str) => str.displayName.toLowerCase() === displayName.toLowerCase());
            if (!streamer)
                newStreamers.push(this.getUser(displayName));
        }
        return (0, rxjs_1.combineLatest)(newStreamers).pipe((0, rxjs_1.take)(1), (0, rxjs_1.map)((streamers) => streamers.filter((streamer) => streamer !== null)), (0, rxjs_1.tap)((streamers) => {
            streamers.forEach((streamer) => {
                this.configuration.guilds[guildId].sources.twitch[streamer.userId] = streamer;
                this.configService.saveChanges();
                this.setStreamerSubscription(guildId, streamer.userId).subscribe();
            });
        }));
    }
    removeStreamers(guildId, displayNames) {
        const allStreamers = Object.values(this.configuration.guilds[guildId].sources.twitch);
        const foundStreamers = displayNames
            .map((displayName) => allStreamers.find((str) => str.displayName.toLowerCase() === displayName.toLowerCase()))
            .filter((streamer) => streamer);
        const removeStreamers = foundStreamers.map((streamer) => this.removeStreamerSubscription(guildId, streamer));
        return (0, rxjs_1.combineLatest)(removeStreamers);
    }
    subscribeToStreamChanges(client) {
        return this.streamChanges
            .pipe((0, rxjs_1.tap)((streamChanges) => {
            const settings = this.configuration.guilds[streamChanges.guildId];
            const channelId = settings.channelId;
            if (channelId) {
                (0, rxjs_1.combineLatest)([
                    (0, rxjs_1.defer)(() => streamChanges.stream.getBroadcaster()),
                    (0, rxjs_1.defer)(() => streamChanges.stream.getStream()),
                    (0, rxjs_1.defer)(() => client.channels.fetch(channelId)),
                ])
                    .pipe((0, rxjs_1.catchError)(() => rxjs_1.EMPTY), (0, rxjs_1.switchMap)(([broadcaster, stream, channel]) => {
                    if (!stream)
                        return rxjs_1.EMPTY;
                    const msgOptions = {
                        content: settings.announcementMessage.replace('{DISPLAYNAME}', broadcaster.displayName),
                        embeds: [
                            {
                                title: stream.title,
                                description: `https://www.twitch.tv/${broadcaster.displayName}`,
                                color: 0x9147ff,
                                timestamp: new Date(),
                                footer: {
                                    text: stream.gameName,
                                },
                                author: {
                                    name: broadcaster.displayName,
                                    url: `https://www.twitch.tv/${broadcaster.displayName}`,
                                    icon_url: broadcaster.profilePictureUrl,
                                },
                                thumbnail: {
                                    url: stream.thumbnailUrl.replace('{width}', '320').replace('{height}', '180'),
                                },
                            },
                        ],
                    };
                    const lastStreamMessageId = this.configuration.guilds[streamChanges.guildId].sources.twitch[streamChanges.userId].lastStreamMessageId;
                    return lastStreamMessageId === undefined
                        ? (0, rxjs_1.defer)(() => channel.send(msgOptions))
                        : (0, rxjs_1.defer)(() => channel.messages.fetch(lastStreamMessageId)).pipe((0, rxjs_1.catchError)(() => (0, rxjs_1.of)(null)), (0, rxjs_1.switchMap)((msg) => {
                            if (msg === null)
                                return (0, rxjs_1.defer)(() => channel.send(msgOptions));
                            const MESSAGE_TIMESTAMP = (0, moment_1.default)(msg.embeds[0].timestamp);
                            const THREE_HOURS_AGO = (0, moment_1.default)().subtract(6, 'hours');
                            return MESSAGE_TIMESTAMP.isAfter(THREE_HOURS_AGO)
                                ? (0, rxjs_1.defer)(() => msg.edit(msgOptions))
                                : (0, rxjs_1.defer)(() => channel.send(msgOptions));
                        }));
                }), (0, rxjs_1.tap)((message) => {
                    var _a;
                    if (!Array.isArray(message)) {
                        const streamer = this.configuration.guilds[streamChanges.guildId].sources.twitch[streamChanges.userId];
                        streamer.lastStreamMessageId = message.id;
                        if ((_a = message.embeds[0].author) === null || _a === void 0 ? void 0 : _a.name) {
                            streamer.displayName = message.embeds[0].author.name;
                        }
                        this.configService.saveChanges();
                    }
                }))
                    .subscribe();
            }
        }))
            .subscribe();
    }
    setStreamerSubscription(guildId, userId) {
        return (0, rxjs_1.iif)(() => this.isExpressMiddleware, (0, rxjs_1.defer)(() => this.eventSubMiddleware.subscribeToStreamOnlineEvents(userId, (stream) => {
            if (stream)
                this.streamChanges.next({ guildId, userId, stream });
        })).pipe((0, rxjs_1.tap)((subscription) => {
            if (!this.subscriptions[guildId])
                this.subscriptions[guildId] = {};
            this.subscriptions[guildId][userId] = subscription;
        })), (0, rxjs_1.defer)(() => this.eventSubListener.subscribeToStreamOnlineEvents(userId, (stream) => {
            if (stream)
                this.streamChanges.next({ guildId, userId, stream });
        })).pipe((0, rxjs_1.tap)((subscription) => {
            if (!this.subscriptions[guildId])
                this.subscriptions[guildId] = {};
            this.subscriptions[guildId][userId] = subscription;
        })));
    }
    removeStreamerSubscription(guildId, streamer) {
        const subscription = this.subscriptions[guildId][streamer.userId];
        return (0, rxjs_1.defer)(() => subscription.stop()).pipe((0, rxjs_1.tap)(() => {
            delete this.subscriptions[guildId][streamer.userId];
            delete this.configuration.guilds[guildId].sources.twitch[streamer.userId];
            this.configService.saveChanges();
        }));
    }
    getAllSubscriptionsStatus() {
        return Object.entries(this.subscriptions)
            .map(([guildId, subscriptions]) => {
            const guildSubs = Object.entries(subscriptions)
                .map(([userId, sub]) => `${this.configuration.guilds[guildId].sources.twitch[userId].displayName}: ${sub.verified}`)
                .join('\n');
            return `Guild ${this.configuration.guilds[guildId].guildName}:\n` + guildSubs;
        })
            .join('\n\n');
    }
    reauthorizeInvalidSubscriptions() {
        const INVALID_SUBSCRIPTIONS = [];
        Object.entries(this.subscriptions).forEach(([guildId, userIds]) => {
            Object.entries(userIds).forEach(([userId, subscription]) => {
                if (!subscription.verified) {
                    INVALID_SUBSCRIPTIONS.push({ guildId, userId, subscription });
                }
            });
        });
        return (0, rxjs_1.combineLatest)(INVALID_SUBSCRIPTIONS.map((invalid) => {
            return (0, rxjs_1.defer)(() => invalid.subscription.stop()).pipe((0, rxjs_1.switchMap)(() => this.setStreamerSubscription(invalid.guildId, invalid.userId)));
        })).pipe((0, rxjs_1.tap)((subscriptions) => {
            console.log(`[${(0, utils_1.getNow)()}] [streambot.js] {Twitch} Reauthorized ${subscriptions.length} subscriptions`);
        }));
    }
    getUser(userName) {
        return (0, rxjs_1.iif)(() => twitch_source_model_1.TWITCH_NAME_REGEX.test(userName), (0, rxjs_1.defer)(() => this.apiClient.users.getUserByName(userName)), (0, rxjs_1.of)(null)).pipe((0, rxjs_1.catchError)(() => (0, rxjs_1.of)(null)), (0, rxjs_1.map)((user) => {
            if (user) {
                return { userId: user.id, displayName: user.displayName };
            }
            else
                return null;
        }));
    }
    get configuration() {
        return this.configService.getConfiguration();
    }
    get expressMiddleware() {
        return this.eventSubMiddleware;
    }
}
exports.TwitchSource = TwitchSource;
