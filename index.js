
const Discord = require('discord.js')
const config = require('./config.json')

const client = new Discord.Client();

const prefix = "!";

let mostRecentMsgs = [];

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
                out.push(...messages.array())
                last_id = messages.array()[(messages.array().length - 1)].id
            }catch (err){
                console.error(err)
            }

        }
    }
    return out
}

function printLength(arr){
    console.log(arr.length);
}

function getHelpMsg(){
    return "Type *!quiz* to get a random message from before. Then respond with a mention of who you believe it to be " +
        "(e.g @bob)."
}



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
        case "ping":
            const timeTaken = Date.now() - message.createdTimestamp;
            message.reply(`Pong! This message had a latency of ${timeTaken}ms.`);
            break;
        case "lastmsg":
            message.reply(`Last message was: ${message.channel.lastMessage}`);
            break;
        case "random":
            message.channel.messages.fetch().then(messages => {
                message.channel.send(messages.filter(m => m.content[0]!=='!').random().content)
            }).catch(console.error);
            break;
        case "200":
            message.channel.messages.fetch({limit:100}).then( (messages) => {
                msgArr = messages.array();
                console.log(msgArr.length)
                console.log(msgArr[0],msgArr[50],msgArr[99]);
            }).catch(console.error);
            break;
        case "getstuff":
            message.content
            getMessages(message.channel,400).then(printLength).catch(console.error);
            break;
        case "members":
            message.guild.members.fetch().then(
                (members) =>{
                    let membersIdlist = [];
                    members.forEach(guildMember =>{
                        membersIdlist.push(guildMember.guild.id);
                        message.channel.send(guildMember.user.username);
                    });
                    message.reply(membersIdlist);
                }
            ).catch(console.error);
            break;
        case "quiz":
            const filter = (m) => m.author.id === message.author.id;
            if(mostRecentMsgs.length === 0){
                getMessages(message.channel,500).then(
                    (messages) => {
                        mostRecentMsgs = messages;
                        let randomMsg = getRandomElemFromArr(messages);
                        let msgAuthor = randomMsg.author
                        message.channel.send(randomMsg.content).then( () =>{
                            message.channel.awaitMessages(filter,{max:1, time: 20000}).then(
                                (collected)=>{
                                    let guess = collected.first().mentions.has(msgAuthor);
                                    if (guess){
                                        return message.channel.send("Correct guess!");
                                    }else{
                                        return message.channel.send(`incorrect guess! Right guess was  ${msgAuthor.username} !`);
                                    }
                                }).catch(() =>{
                                message.channel.send(`Timed out, hurry up dumbass. It was ${msgAuthor.username}`);
                            });
                        }).catch(console.error);
                    }).catch(console.error);
            }else{
                let randomMsg = getRandomElemFromArr(mostRecentMsgs);
                let msgAuthor = randomMsg.author
                message.channel.send(randomMsg.content).then( () =>{
                    message.channel.awaitMessages(filter,{max:1, time: 10000}).then(
                        (collected)=>{
                            let guess = collected.first().mentions.has(msgAuthor);
                            if (guess){
                                return message.channel.send("Correct guess!");
                            }else{
                                return message.channel.send(`incorrect guess! Right guess was  ${msgAuthor.username} !`);
                            }
                        }).catch(() =>{
                        message.channel.send(`Timed out, hurry up dumbass. It was ${msgAuthor.username}`);
                    });
                }).catch(console.error);
            }

    }

});




client.login(config.BOT_TOKEN);

//
// return m.mentions.has(randomMsg.author) && !m.author.bot;
// }, {max: 1, time: 10000}).then(
//     (collected) => {
//         message.channel.send("correct message").catch(console.error);
//     }
// ).catch( (collected) => {
//     message.channel.send("Wrong").catch(console.error);
//     console.error(collected)
// })


