# guesswhodiscordbot
Discord bot that sends messages from previous users, and let's you guess who sent it

Add the bot here:
https://discord.com/api/oauth2/authorize?client_id=796131952180592700&permissions=67584&scope=bot

Hosted on HerokuApp. Will migrate to GAE/AWS soon.

Type "!quiz" to get a random message, and tag someone (i.e @bob) to guess who it is. 
Only the person who sent the "!quiz" request can answer it.
It doesn't get previous messages from bots.

TODO: Add database support to keep score of how well you did. 
