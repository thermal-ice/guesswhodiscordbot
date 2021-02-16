# guesswhodiscordbot
Discord bot that sends messages from previous users, and let's you guess who sent it

Add the bot here:
https://discord.com/api/oauth2/authorize?client_id=796131952180592700&permissions=67584&scope=bot

Currently hosted on AWS EC2. Previously hosted on Heroku.

Type "!quiz" to get a random message, and the bot will return a random message along with 5 potential users who might've sent it. 
Simply select the corresponding number emoji when prompted.

Only the person who sent the "!quiz" request can answer it.
It doesn't get previous messages from bots, nor !quiz requests.

TODO: Add database support to keep score of how well you did. 
Will figure out how to use S3 soon.tm
