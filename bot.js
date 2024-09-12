// Importando a biblioteca Baileys e Axios para requisições HTTP
const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
const axios = require('axios');

// Autenticação e sessão salvas no arquivo 'auth_info.json'
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

// Prefixo inicial do bot
let prefix = '!';

// Iniciar o bot
async function startBot() {
    const socket = makeWASocket({
        auth: state,
        printQRInTerminal: true // Exibe o QR code no terminal para escanear
    });

    // Salvar o estado da sessão sempre que houver atualização
    socket.ev.on('creds.update', saveState);

    // Conexão e status de conexão
    socket.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot(); // Reconectar se a sessão cair
        } else if (connection === 'open') {
            console.log('Bot conectado ao WhatsApp!');
        }
    });

    // Listener de mensagens recebidas
    socket.ev.on('messages.upsert', async (message) => {
        const msg = message.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const sender = msg.key.participant || msg.key.remoteJid;

        if (!text) return;

        const command = text.trim().split(/\s+/)[0].slice(prefix.length);
        const args = text.trim().split(/\s+/).slice(1).join(' ');

        switch (command) {
            case 'menu':
                await socket.sendMessage(from, { text: "Comandos disponíveis: !menu, !play, !promover, !rebaixar, !ban, !setprefix, etc." });
                break;

            case 'play':
                if (!args) return socket.sendMessage(from, { text: 'Você precisa fornecer o título da música!' });

                await socket.sendMessage(from, { text: 'Realizando Download, Aguarde...' });
                try {
                    const response = await axios.get(`https://api.yourapi.com/dl/ytaudio?url=${args}&apikey=seutoken`);
                    const data = response.data.resultado[0];
                    const mensagem = `▶️ *Título*: ${data.title}\n🎤 *Canal*: ${data.author.name}\n⏳ *Duração*: ${data.timestamp}\n🔗 *Link*: ${data.url}\n👀 *Visualizações*: ${data.views}\n📝 *Descrição*: ${data.description}`;

                    await socket.sendMessage(from, { text: mensagem });
                    await socket.sendMessage(from, { audio: { url: data.url }, mimetype: 'audio/mp4' });
                } catch (err) {
                    console.log('Erro ao baixar música:', err);
                    await socket.sendMessage(from, { text: 'Falha ao realizar o download da música.' });
                }
                break;

            case 'promover':
                if (!msg.key.remoteJid.endsWith('@g.us')) return socket.sendMessage(from, { text: 'Este comando só funciona em grupos!' });
                if (!args) return socket.sendMessage(from, { text: 'Por favor, mencione o usuário para promover.' });
                const userPromote = args + '@s.whatsapp.net';
                await socket.groupParticipantsUpdate(from, [userPromote], 'promote');
                await socket.sendMessage(from, { text: `${args} foi promovido a administrador.` });
                break;

            case 'rebaixar':
                if (!msg.key.remoteJid.endsWith('@g.us')) return socket.sendMessage(from, { text: 'Este comando só funciona em grupos!' });
                if (!args) return socket.sendMessage(from, { text: 'Por favor, mencione o usuário para rebaixar.' });
                const userDemote = args + '@s.whatsapp.net';
                await socket.groupParticipantsUpdate(from, [userDemote], 'demote');
                await socket.sendMessage(from, { text: `${args} foi rebaixado a membro comum.` });
                break;

            case 'ban':
                if (!msg.key.remoteJid.endsWith('@g.us')) return socket.sendMessage(from, { text: 'Este comando só funciona em grupos!' });
                if (!args) return socket.sendMessage(from, { text: 'Por favor, mencione o usuário para banir.' });
                const userBan = args + '@s.whatsapp.net';
                await socket.groupParticipantsUpdate(from, [userBan], 'remove');
                await socket.sendMessage(from, { text: `${args} foi banido do grupo.` });
                break;

            case 'setprefix':
                if (!args) return socket.sendMessage(from, { text: 'Você precisa fornecer um novo prefixo.' });
                prefix = args;
                await socket.sendMessage(from, { text: `Prefixo alterado para: ${prefix}` });
                break;

            default:
                await socket.sendMessage(from, { text: `Comando não reconhecido! Use ${prefix}menu para ver os comandos disponíveis.` });
                break;
        }
    });
}

// Iniciar o bot
startBot();
