
const Discord = require('discord.js')
const config = require('./config.json')
const ChannelMessageStorageFile = require('./channelMessageStorage')
const botConfigerations = require('./botConfigerations');


const client = new Discord.Client();


//There is only 1 web dyno running at once. scale it back to 1


const prefix = "!";
const numChoices = 4

function getRandomElemFromArr(array){
    return array[Math.floor(Math.random() * array.length)];

}

function addElemToRandomIndexInArr(array, elem){
    let index = Math.floor(Math.random() * array.length);
    array.splice(index,0,elem);
    return array;
}

function getNRandomFromArr(arr, n) {
    let result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        let x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
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
        let last_id= ""
        let numCycles = 0;

        const options = {limit: 100};

        while(out.length <limit){
            if(last_id.length >0){
                options.before = last_id;
            }

            //TODO: need to change in future
            if((numCycles * 5) +1 > limit){
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

function fetchUsersFromGuildExcludingOne(guild,userToExclude){
    return guild.members.fetch({limit: 80}).then(
        (members)=>{
            let filteredMembersArr = members.array().filter( (member) =>{
                return member.user.id !== userToExclude.id && !member.user.bot;
            });

            let filteredMembersUserNamesArr = filteredMembersArr.map( (member) =>{
                return member.user.username;
            })

            let finalUserNamesArr = getNRandomFromArr(filteredMembersUserNamesArr,numChoices);
            let userIndex = Math.floor(Math.random() * (numChoices +1));

            finalUserNamesArr.splice(userIndex,0,userToExclude.username);

            return [ userIndex, finalUserNamesArr];
        }
    ).catch(console.error);
}


function getTypeOfMessage(message){
    if (message.content.length > 0 && message.attachments.size >0) return "both";
    if (message.content.length > 0) return "text";
    if (message.attachments.size > 0) return "image";
    //Does not have text nor images, something weird happened
    return "neither";
}


async function awaitAndGetReactionsToMessage(quizMessage,authorIndex,choicesArr){
    const numbersEmojis = botConfigerations.numbersEmojis;


    const filter = (reaction, user) => {
        return numbersEmojis.includes(reaction.emoji.name) && user.id === quizMessage.author.id;
    };

    let msgToSend = ""

    choicesArr.forEach( (currVal,index) => {
        msgToSend += `${(index+1)}) ${currVal}  `;
    })


    let message =  await quizMessage.channel.send(`The choices are: ${msgToSend}`).catch(console.error)

    numbersEmojis.forEach( (emoji) => {
        message.react(emoji);
    })

    message.awaitReactions(filter, { max: 1, time: 10000, errors: ['time'] })
        .then(collected => {
            const reaction = collected.first();

            let emojiIndex = numbersEmojis.indexOf(reaction.emoji.name);

            if(emojiIndex === -1){
                quizMessage.reply("carlos fucked up somewhere");
                return;
            }

            if(emojiIndex === authorIndex){
                quizMessage.channel.send(`Correct, it indeed was: **${choicesArr[authorIndex]} **`)
            }else{
                quizMessage.channel.send(`Incorrect lmao! It's not **${choicesArr[emojiIndex]}**, it actually was **${choicesArr[authorIndex]}**`);
            }

        })
        .catch(collected => {
            message.reply(`Timed out, you need to pick one of the options dumbass. It was **${choicesArr[authorIndex]}**`);
        });
}

function quizSendAndListen(quizMessage,channelMessageManagerInstance , filter){

    let messagesArr = channelMessageManagerInstance.getMessagesFromChannel(quizMessage.channel);
    if (messagesArr === -1){
        quizMessage.channel.send("fuck, couldn't get messages for some reason");
        return;
    }
    let randomMsg = getRandomElemFromArr(messagesArr);
    let msgAuthor = randomMsg.author;



    let messageType = getTypeOfMessage(quizMessage);

    switch (messageType) {
        case "text":
            quizMessage.reply(`guess who said the message below: \n ${randomMsg.content}`).then( ()=>{
                fetchUsersFromGuildExcludingOne(quizMessage.guild , msgAuthor).then( (fetchResult) =>{
                    let index = fetchResult[0];
                    let userNamesArr = fetchResult[1];

                    awaitAndGetReactionsToMessage(quizMessage,index,userNamesArr).catch(console.error);
                });

            }).catch(console.error);

    }






    //
    // quizMessage.reply(` guess who said the message below: \n> ${randomMsg.content}`).then( () =>{
    //     if(randomMsg.attachments.size >0) {
    //         randomMsg.attachments.forEach( (messageAttachment)=>{
    //             quizMessage.channel.send(messageAttachment.url);
    //         })
    //     }
    //     quizMessage.channel.awaitMessages(filter,{max:1, time: 20000}).then(
    //         (collected)=>{
    //             let firstMsg = collected.first();
    //             if(firstMsg.mentions.members.size > 1 || firstMsg.mentions.members.size === 0){
    //                 return quizMessage.channel.send(`You MUST mention only 1 person. Try again dumbass. It was ${msgAuthor}`);
    //             }
    //             let guess = firstMsg.mentions.has(msgAuthor);
    //             if (guess){
    //                 return quizMessage.channel.send(`Correct guess! It indeed was ${msgAuthor.username} `); //message.author.username
    //             }else{
    //                 return quizMessage.channel.send(`incorrect guess! Right guess was  ${msgAuthor.username} !`);
    //             }
    //         }).catch(() =>{
    //         quizMessage.channel.send(`Timed out, hurry up dumbass. It was ${msgAuthor.username}`);
    //     });
    // }).catch(console.error);
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
        case "a":
            // console.log("step 1");
            // message.guild.members.fetch({limit: 5}).then(
            //     (members)=>{
            //         console.log("step 2")
            //         console.log(members);
            //     }
            // ).catch(console.error);
            // break;
            // fetchUsersFromGuildExcludingOne(message.guild,"blah");
            // fetchUsersFromGuildExcludingOne(message.guild,message.author)

            // awaitAndGetReactionsToMessage(message,2,["a",'b','c','d','e'])


            break;


        // case "whobot_help":
        //     // console.log(message);
        //     // message.attachments.forEach((attachments) =>{
        //     //     message.channel.send(attachments.url);
        //     // })
        //     message.reply(getHelpMsg());
        //
        //     break;

        case "quiz":

            const filter = (m) => m.author.id === message.author.id;

            if(!channelMessageManager.hasChannel(message.channel)){
                getMessages(message.channel,1000).then( (messages)=>{
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

