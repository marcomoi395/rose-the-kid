const {
    Client,
    REST,
    Routes,
    Events,
    GatewayIntentBits,
    Partials,
} = require('discord.js');
const path = require('path');
const commands = require('../utils/commmands.js');
const ConfessionModel = require('../models/confession.model.js');
const allowedChannels = require('../utils/allowedChannels.js');

class DiscordBot {
    constructor(payload) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
            partials: [Partials.Channel],
        });
        this.registerCommands(commands);
        this.registerEvents();
        this.token = payload.token;
    }

    registerEvents() {
        this.client.on(Events.ClientReady, () => {
            console.log(`Logged in as ${this.client.user.tag}!`);
        });

        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            if (interaction.commandName === 'ping') {
                await interaction.reply('Pong!');
            }

            if (interaction.commandName === 'confession') {
                if (allowedChannels.confession !== interaction.channelId) {
                    const msg = await interaction.reply({
                        content: 'Confession không hoạt động trong kênh này',
                        fetchReply: true,
                        ephemeral: false,
                    });

                    setTimeout(async () => {
                        try {
                            await msg.delete();
                        } catch (err) {
                            console.error('Không xóa được message:', err);
                        }
                    }, 30_000);
                    return;
                }

                const channel = interaction.channel;
                const authorId = interaction.user.id;

                const collector = channel.createMessageCollector({
                    time: 300_000, // 300s (comment 60s là sai nhịp)
                    max: 1,
                    filter: (m) =>
                        m.author.id === authorId && m.channelId === channel.id,
                });

                await interaction.reply({
                    content:
                        'Hãy gửi **tin nhắn kế tiếp** của bạn trong 300 giây. (Gõ `cancel` để huỷ)',
                    ephemeral: true,
                });

                collector.on('collect', async (m) => {
                    const text = (m.content || '').trim();

                    if (text.toLowerCase() === 'cancel') {
                        await interaction.followUp({
                            content: 'Đã huỷ confession.',
                            ephemeral: true,
                        });
                        return;
                    }

                    let contentFormatted;
                    const textArray = text.split('\n');

                    if (textArray.length > 1) {
                        contentFormatted = {
                            title: textArray[0],
                            content: textArray.slice(1).join('\n'),
                        };
                    } else {
                        contentFormatted = {
                            content: text,
                        };
                    }

                    try {
                        await ConfessionModel.create(contentFormatted);
                        await interaction.followUp({
                            content:
                                'Đã nhận confession và lưu vào DB. Cảm ơn ní!',
                            ephemeral: true,
                        });
                    } catch (err) {
                        console.error('Lỗi lưu DB:', err);
                        await interaction.followUp({
                            content: 'Có lỗi khi lưu vào DB. Thử lại sau nhé.',
                            ephemeral: true,
                        });
                    }

                    setTimeout(() => {
                        if (m.deletable) m.delete().catch(() => {});
                    }, 20_000);
                });

                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await interaction.followUp({
                            content:
                                'Hết thời gian 300s mà chưa nhận được tin nhắn tiếp theo.',
                            ephemeral: true,
                        });
                    }
                });
            }
        });
    }

    async startBot() {
        try {
            await this.client.login(this.token);
            console.log('Bot đã được khởi động thành công.');
        } catch (error) {
            console.error('Lỗi khi khởi động bot:', error);
        }
    }

    async registerCommands(commands = []) {
        try {
            const rest = new REST({ version: '10' }).setToken(
                process.env.BOT_DISCORD_TOKEN,
            );
            console.log('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationCommands(process.env.BOT_DISCORD_ID),
                {
                    body: commands,
                },
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    }

    async sendMessageToChannel(channelId, message) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (channel) {
                await channel.send(message);
            } else {
                console.log(`Channel with ID ${channelId} not found`);
            }
        } catch (error) {
            console.error('Error sending message to channel:', error);
        }
    }

    async sendFile(channelId) {
        const filePath = path.join(__dirname, 'example.txt');

        try {
            const channel = await this.client.channels.fetch(channelId);

            if (channel) {
                await channel.send({
                    content: 'OK',
                    files: [filePath],
                });
            } else {
                console.log(`Channel with ID ${channelId} not found`);
            }
        } catch (err) {
            console.error('Error sending file:', err);
            this.sendMessageToChannel(channelId, 'Error sending file');
        }
    }
}

module.exports = DiscordBot;
