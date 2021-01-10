
const Discord = require('discord.js')
const config = require('./config.json')
const  {setIntervalAsync}  = require('set-interval-async/fixed')


//
// const client = new Discord.Client();

class ChannelMessageStorage{
    constructor(messages, channel) {
        this.messages = messages; //Stores the message contents
        this.channel = channel; //Stores the channel Object
        this.mostRecentMsgId = messages[0].id;
        setIntervalAsync(async () =>{await this.fetchNewMsgs()},2000 );

        //1000 * 60 * 5

    }

    async fetchNewMsgs(){
        const options = {
            limit: 100,
            after: this.mostRecentMsgId
        }

            const theMsgs = await this.channel.messages.fetch(options, true);

            let newMsgs = theMsgs.array();


            if (newMsgs.length === 0) {
                return;
            }
            this.messages.unshift(newMsgs);
            this.mostRecentMsgId = newMsgs[0].id;
            console.log("message length: " + this.messages.length);
            console.log("Most recent id:" + this.mostRecentMsgId);
            console.log(`Most recent (5) messages are: ${this.messages.slice(0,5)}`)


    }

    getMessages(){
        return this.messages;
    }

}


class ChannelMessageStorageManager{
    constructor() {
        this.messageStoreDict = {};
    }

    //Channel id is the key, and ChannelMessageStorage is the value


    getMessagesFromChannel(channel){
        let channelId = channel.id;
        if(this.messageStoreDict.hasOwnProperty(channelId)){
            return this.messageStoreDict[channelId].getMessages();
        }else{
            return -1; //Some error
        }
    }

    hasChannel(channel){
        return this.messageStoreDict.hasOwnProperty(channel.id);
    }

    addNewMessagesForChannel(channel,messages){
        this.messageStoreDict[channel.id] = new ChannelMessageStorage(messages,channel);
    }
}

module.exports.ChannelMessageStorage = ChannelMessageStorage;
module.exports.ChannelMessageStorageManager = ChannelMessageStorageManager;


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
//
// client.login(config.BOT_TOKEN);


// let channelMessageManager = new ChannelMessageStorageManager()

// client.on("message", (message)=>{
//     if (message.author.bot) return;
//     const prefix = "!";
//     if (!message.content.startsWith(prefix)) return;
//
//     const commandBody = message.content.slice(prefix.length);
//     const args = commandBody.split(' ');
//     const command = args.shift().toLowerCase();
//
//     switch (command) {
//         case "whobot_help":
//             message.reply(getHelpMsg());
//             break;
//         case "a":
//             getMessages(message.channel,300).then( (msgs) =>{
//                 console.log("original message length " + msgs.length);
//                 if(!channelMessageManager.hasChannel(message.channel)){
//                     channelMessageManager.addNewMessagesForChannel(message.channel,msgs);
//                     console.log("added new channel, has keys: " +Object.keys(channelMessageManager.messageStoreDict))
//                 }
//
//             });
//
//             break;
//     }
// });

