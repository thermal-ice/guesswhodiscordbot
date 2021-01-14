
const Discord = require('discord.js')
const config = require('./config.json')
const ChannelMessageStorageFile = require('./channelMessageStorage')

const client = new Discord.Client();


//There is only 1 web dyno running at once. scale it back to 1


const prefix = "!";

function getRandomElemFromArr(array){
    return array[Math.floor(Math.random() * array.length)];

}

function messageOnlyContainsMentions(messageContent){
    const userMentionsRegex = Discord.MessageMentions.USERS_PATTERN;
    let filteredMsg = messageContent
        .replace(new RegExp(userMentionsRegex.source ,"g"),"") //add + g afterwards
        .trim();


    return filteredMsg.length === 0;
}

async function getMessages(channel, limit = 200){
    let out = [];
    if (limit <= 100) {
        let messages = await channel.messages.fetch({ limit: limit })
        out.push(...messages.array())
    } else {
        // let rounds = (limit / 100) + (limit % 100 ? 1 : 0)
        let last_id= ""
        let numCycles = 0;
        // for (let x = 0; x < rounds; x++) {
        //     const options = {
        //         limit: 100
        //     }
        //     if (last_id.length > 0) {
        //         options.before = last_id
        //     }
        //     try{
        //         const messages = await channel.messages.fetch(options,true).catch(console.error)
        //         if(messages.array().length === 0){
        //             break;
        //         }
        //
        //         let filteredMsgs = messages.array().filter ( m =>{
        //             return m !== undefined && (m.attachments.size > 0 ||m.content.length !== 0);
        //         })
        //
        //         out.push(...filteredMsgs)
        //         last_id = filteredMsgs[(filteredMsgs.length - 1)].id
        //     }catch (err){
        //         console.error(err)
        //     }
        //
        // }

        const options = {limit: 100};

        while(out.length <limit){
            if(last_id.length >0){
                options.before = last_id;
            }

            //TODO: need to change in future
            if((numCycles * 10) +1 > limit){
                console.error("We're stuck in an infinite loop when fetching messages somehow");
                break;
            }

            try{
                const messages = await channel.messages.fetch(options,true).catch(console.error);

                let msgsArr = messages.array();
                //exit conditions:
                if(msgsArr.length === 0){ //No more new messages, queried all messages in the channel
                    break;
                }


                let filteredMsgs = msgsArr.filter ( m =>{
                    return m !== undefined && (m.attachments.size > 0 || m.content.length > 0)
                        && !m.author.bot
                        && !m.content.match(/^(!whobot_help|!quiz)$/)
                        && !messageOnlyContainsMentions(m.content);
                });


                out.push(...filteredMsgs);
                last_id = msgsArr[(msgsArr.length - 1)].id;

            }catch (error){
                console.error(error);
            }

            numCycles++;
        }
    }
    return out
}



function getHelpMsg(){
    return "Type *!quiz* to get a random message from before. Then respond with a mention of who you believe it to be " +
        "(e.g @bob)."
}


function quizSendAndListen(quizMessage,channelMessageManagerInstance , filter){

    let messagesArr = channelMessageManagerInstance.getMessagesFromChannel(quizMessage.channel);
    if (messagesArr === -1){
        console.log("fuck, couldn't get messages for some reason");
        return;
    }
    let randomMsg = getRandomElemFromArr(messagesArr);
    let msgAuthor = randomMsg.author
    quizMessage.reply(` guess who said the message below: \n> ${randomMsg.content}`).then( () =>{
        if(randomMsg.attachments.size >0) {
            randomMsg.attachments.forEach( (messageAttachment)=>{
                quizMessage.channel.send(messageAttachment.url);
            })
        }
        quizMessage.channel.awaitMessages(filter,{max:1, time: 20000}).then(
            (collected)=>{
                let firstMsg = collected.first();
                if(firstMsg.mentions.members.size > 1 || firstMsg.mentions.members.size === 0){
                    return quizMessage.channel.send(`You MUST mention only 1 person. Try again dumbass. It was ${msgAuthor}`);
                }
                let guess = firstMsg.mentions.has(msgAuthor);
                if (guess){
                    return quizMessage.channel.send(`Correct guess! It indeed was ${msgAuthor.username} `); //message.author.username
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
            // console.log(message);
            // message.attachments.forEach((attachments) =>{
            //     message.channel.send(attachments.url);
            // })
            message.reply(getHelpMsg());

            break;

        case "quiz":

            const filter = (m) => m.author.id === message.author.id;

            if(!channelMessageManager.hasChannel(message.channel)){
                getMessages(message.channel,150).then( (messages)=>{
                    channelMessageManager.addNewMessagesForChannel(message.channel,messages);
                    quizSendAndListen(message,channelMessageManager,filter);
                }).catch(console.error);
            }else{
                quizSendAndListen(message,channelMessageManager,filter)
            }
            break;
    }

});


client.login(config.BOT_TOKEN).then( ()=>{
    client.user.setPresence({
        status: 'online',
        afk: false,
        activity: {
            name: `use !whobot_help"`, type: 'PLAYING',}
    });
});

// client.login(process.env.BOT_TOKEN).then( ()=>{
//     client.user.setPresence({
//         status: 'online',
//         afk: false,
//         activity: {
//             name: `use !whobot_help"`, type: 'PLAYING',}
//     });
// });

