
const Discord = require('discord.js')
// const config = require('./config.json')
const ChannelMessageStorageFile = require('./channelMessageStorage')

const client = new Discord.Client();



const prefix = "!";

function getRandomElemFromArr(array){
    return array[Math.floor(Math.random() * array.length)];

}

async function getMessages(channel, limit = 200){
    let out = [];
    if (limit <= 100) {
        let messages = await channel.messages.fetch({ limit: limit })
        out.push(...messages.array())
    } else {
        let rounds = (limit / 100) + (limit % 100 ? 1 : 0)
        let last_id= ""
        for (let x = 0; x < rounds; x++) {
            const options = {
                limit: 100
            }
            if (last_id.length > 0) {
                options.before = last_id
            }
            try{
                const messages = await channel.messages.fetch(options,true)
                if(messages.array().length === 0){
                    break;
                }

                let filteredMsgs = messages.array().filter ( m =>{
                    return m.length !== 0;
                })

                out.push(...filteredMsgs)
                last_id = filteredMsgs[(filteredMsgs.length - 1)].id
            }catch (err){
                console.error(err)
            }

        }
    }
    return out
}



function getHelpMsg(){
    return "Type *!quiz* to get a random message from before. Then respond with a mention of who you believe it to be " +
        "(e.g @bob)."
}

// function quizSendAndListen(message, messages, filter){
//     let randomMsg = getRandomElemFromArr(messages);
//     let msgAuthor = randomMsg.author
//     message.channel.send(randomMsg.content).then( () =>{
//         message.channel.awaitMessages(filter,{max:1, time: 20000}).then(
//             (collected)=>{
//                 let firstMsg = collected.first();
//                 if(firstMsg.mentions.members.size > 1 || firstMsg.mentions.members.size === 0){
//                     return message.channel.send("You MUST mention only 1 person. Try again dumbass");
//                 }
//                 let guess = firstMsg.mentions.has(msgAuthor);
//                 if (guess){
//                     return message.channel.send(`Correct guess! It indeed was ${msgAuthor.username} `);
//                 }else{
//                     return message.channel.send(`incorrect guess! Right guess was  ${msgAuthor.username} !`);
//                 }
//             }).catch(() =>{
//             message.channel.send(`Timed out, hurry up dumbass. It was ${msgAuthor.username}`);
//         });
//     }).catch(console.error);
// }

function quizSendAndListen(quizMessage,channelMessageManagerInstance , filter){

    let messagesArr = channelMessageManagerInstance.getMessagesFromChannel(quizMessage.channel);
    if (messagesArr === -1){
        console.log("fuck, couldn't get messages for some reason");
        return;
    }
    let randomMsg = getRandomElemFromArr(messagesArr);
    let msgAuthor = randomMsg.author
    quizMessage.reply(` guess who said the message below: \n> ${randomMsg.content}`).then( () =>{
        quizMessage.channel.awaitMessages(filter,{max:1, time: 20000}).then(
            (collected)=>{
                let firstMsg = collected.first();
                if(firstMsg.mentions.members.size > 1 || firstMsg.mentions.members.size === 0){
                    return quizMessage.channel.send(`You MUST mention only 1 person. Try again dumbass. It was ${msgAuthor}`);
                }
                let guess = firstMsg.mentions.has(msgAuthor);
                if (guess){
                    return quizMessage.channel.send(`Correct guess! It indeed was ${msgAuthor.username} `);
                }else{
                    return quizMessage.channel.send(`incorrect guess! Right guess was  ${msgAuthor.username} !`);
                }
            }).catch(() =>{
            quizMessage.channel.send(`Timed out, hurry up dumbass. It was ${msgAuthor.username}`);
        });
    }).catch(console.error);
}

//
// client.on('ready', ()=>{
//     console.log(`Logged in as ${client.user.tag}`);
//     client.user.setPresence({
//         status: "online",  // You can show online, idle... Do not disturb is dnd
//         game: {
//             name: "!whobot_help",  // The message shown
//             type: "PLAYING" // PLAYING, WATCHING, LISTENING, STREAMING,
//         }
//     });
// });


const channelMessageManager = new ChannelMessageStorageFile.ChannelMessageStorageManager();


client.on("message", (message)=>{
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    switch (command){
        case "whobot_help":
            message.reply(getHelpMsg());
            break;

        // case "ping":
        //     const timeTaken = Date.now() - message.createdTimestamp;
        //     message.reply(`Pong! This message had a latency of ${timeTaken}ms.`);
        //     break;
        //
        //
        // case "members":
        //     message.guild.members.fetch().then(
        //         (members) =>{
        //             let membersIdlist = [];
        //             members.forEach(guildMember =>{
        //                 membersIdlist.push(guildMember.guild.id);
        //                 message.channel.send(guildMember.user.username);
        //             });
        //             message.reply(membersIdlist);
        //         }
        //     ).catch(console.error);
        //     break;


        case "quiz":
            // const filter = (m) => m.author.id === message.author.id;
            //
            // if(mostRecentMsgs.length === 0){
            //     getMessages(message.channel,800).then(
            //         (messages) => {
            //             mostRecentMsgs = messages.filter( (m) =>{
            //                 return !m.author.bot && m.content.length !== 0;
            //             });
            //            quizSendAndListen(message, mostRecentMsgs, filter);
            //         }).catch(console.error);
            // }else{
            //     quizSendAndListen(message,mostRecentMsgs, filter);
            // }
            // break;

            const filter = (m) => m.author.id === message.author.id;

            if(!channelMessageManager.hasChannel(message.channel)){
                getMessages(message.channel,1000).then( (messages)=>{
                    let mostRecentMsgsFiltered = messages.filter( m =>{
                        return !m.author.bot && m.content.length !== 0;
                    });
                    channelMessageManager.addNewMessagesForChannel(message.channel,mostRecentMsgsFiltered);
                    quizSendAndListen(message,channelMessageManager,filter);
                }).catch(console.error);

            }else{
                quizSendAndListen(message,channelMessageManager,filter)
            }
            break;
    }

});


// client.login(config.BOT_TOKEN);
//
// client.login(config.BOT_TOKEN).then( ()=>{
//     client.user.setPresence({
//         status: 'online',
//         afk: false,
//         activity: {
//             name: `use !whobot_help"`, type: 'PLAYING',}
//     });
// });

client.login(process.env.BOT_TOKEN).then( ()=>{
    client.user.setPresence({
        status: 'online',
        afk: false,
        activity: {
            name: `use !whobot_help"`, type: 'PLAYING',}
    });
});

