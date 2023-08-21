import { Client, GatewayIntentBits } from 'discord.js'

const GUILD_CATEGORY = 4
const GUILD_TEXT = 0
export default class Discord {
  
  constructor(environment) {
    this.environment = environment
    this.isDebug = this.environment.isDebug()

    /*
    const myIntents = new IntentsBitField()
    myIntents.add(IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildPresences, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildMessages)
    this.client = new Client({ intents: myIntents })
    */
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
      ],
    })
    this.login = this.client.login(process.env.DISCORD_TOKEN)
    this.guild = null

    // Since extraction occurs within the `client.on` block these promises are
    // returned to the extract/audit callers and resolved by calling 
    // `this.commandResolve()` when functions like `createVoyageChannels()` 
    // have completed.
    this.commandResolve = null
    this.commandReject = null
    this.commandPromise = new Promise((resolve, reject) => {
      this.commandResolve = resolve
      this.commandReject = reject
    })
  }

  // Fetch all messages from the selected Discord team channels.
  // Note that the `callback` routine is invoked for each message to
  // accumulate any desired metrics.
  async fetchAllMessages(channel, schedule, teamNo, callback, messageSummary) {
    let isMoreMessages = true
    let fetchOptions = { limit: 100 }
    try {
      do {
        const messages = await channel.messages.fetch(fetchOptions)
        if (messages.size > 0) {
          for (let [messageID, message] of messages) {
            await callback(schedule, teamNo, message, messageSummary) // Invoke the callback function to process messages
          }
          fetchOptions = { limit: 100, before: messages.last().id }
        } else {
          isMoreMessages = false // Stop fetching messages for this channel
        }
      } while (isMoreMessages)
      return
    } catch (err) {
      console.log(err)
      throw new Error(`Error retrieving messages for channel: ${channel.name} ${err}`)
    }
  }

  getDiscordClient() {
    return this.client
  }
    
  // Retrieve the users Discord name using their unique id
  getGuildUser(discordId) {
    return new Promise(async (resolve, reject) => {
      try {
        const user = this.guild.members.fetch(discordId)
        resolve(user)
      }
      catch(err) {
        console.log('='.repeat(30))
        console.log(`Error retrieving user ${ discordId } from Discord:`)
        console.log(err)
        this.client.destroy() // Terminate this Discord bot
        reject(null)
      }
    })
  }

  // Get the team channels and their parent categories for the specified Voyage. 
  getTeamChannels(guild, voyageName, categoryRegex, channelRegex) {
    // Locate all the categories for this Voyage
    let voyageCategories = []
    guild.channels.cache.forEach((channel) => {
      if (channel.type === GUILD_CATEGORY && channel.name.toUpperCase().substring(0,3) === voyageName.toUpperCase()) {
        voyageCategories.push(channel)
      }
    })

    // Retrieve the list of channels for this Voyage
    let voyageChannels = []
    guild.channels.cache.forEach((channel) => {
      const category = voyageCategories.find((category) => channel.parentId === category.id)
      if (category !== undefined && channel.type === GUILD_TEXT) {
        voyageChannels.push({ channel: channel, category: category })
      }
    })

    // Sort the team channels by their names 
    let sortedChannels = voyageChannels
    .reduce((channels, channel) => {
      const result = channel.channel.name.match(channelRegex)
      if (result !== null) {
        channels.push(channel)
      }
      return channels
    }, [])
    .sort((a, b) => {
      // Sort in ascending team number sequence
      return parseInt(a.channel.name.substr(a.channel.name.length - 2)) >= parseInt(b.channel.name.substr(b.channel.name.length - 2)) 
        ? 1 
        : -1
    })
    
    return sortedChannels
  }

  setGuild(guild) {
    this.guild = guild
  }

}