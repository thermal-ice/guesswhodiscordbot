
const  {setIntervalAsync}  = require('set-interval-async/fixed')



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
            // console.log("message length: " + this.messages.length);
            // console.log("Most recent id:" + this.mostRecentMsgId);
            // console.log(`Most recent (5) messages are: ${this.messages.slice(0,5)}`)


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


