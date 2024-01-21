import { Client, GatewayIntentBits } from 'discord.js'
import { GUILD_CATEGORY, GUILD_TEXT, GUILD_PUBLIC_THREAD, GUILD_FORUM} from './util/constants.js'
export default class Discord {
  
  constructor(environment) {
    this.environment = environment
    this.isDebug = this.environment.isDebug()

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,      ],
    })
    this.login = null
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
  async fetchAllMessages(channel, schedule, teamNo, callback, messageSummary, userMostRecentMsgDates) {
    let isMoreMessages = true
    let fetchOptions = { limit: 100 }
    try {
      do {
        const messages = await channel.messages.fetch(fetchOptions)
        if (messages.size > 0) {
          for (let [messageID, message] of messages) {
            await callback(schedule, teamNo, message, messageSummary, userMostRecentMsgDates) // Invoke the callback function to process messages
          }
          fetchOptions = { limit: 100, before: messages.last().id }
        } else {
          isMoreMessages = false // Stop fetching messages for this channel
        }
      } while (isMoreMessages)
      return
    } catch (error) {
      console.log(error)
      throw new Error(`Error retrieving messages for channel: ${ channel.name } ${ error }`)
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
      catch(error) {
        console.error('='.repeat(30))
        console.error(`Error retrieving user ${ discordId } from Discord:`)
        console.error(err)
        this.client.destroy() // Terminate this Discord bot
        reject(null)
      }
    })
  }

  // Get the team channels and their parent categories for the specified Voyage. 
  async getTeamChannels(voyageName, categoryRegex, channelRegex) {
    // Locate all the categories for this Voyage
    let voyageCategories = []
    let guildChannels = await this.guild.channels.fetch()
    let categoryIds = []
    guildChannels.forEach(guildChannel => {
      if (guildChannel.type === GUILD_CATEGORY && guildChannel.name.toUpperCase().substring(0,3) === voyageName.toUpperCase()) {
        voyageCategories.push(guildChannel)
        categoryIds.push(guildChannel.id)
      }
    })

    // Retrieve the list of channels for this Voyage
    // Start by building a list of all text and forum channels owned by the
    // selected categories
    let voyageChannels = []
    guildChannels.forEach(channel => {
      const categoryFound = categoryIds.includes(channel.parentId)
      if (categoryFound === true) {
        voyageChannels.push(channel)
      }
    })

    // Sort the team channels by their names 
    let sortedChannels = []
    for (let channel of voyageChannels) {
      const result = channel.name.match(channelRegex)
      if (result !== null) {
        sortedChannels.push(channel)
      }
    }
    sortedChannels.sort((a, b) => {
      // Sort in ascending team number sequence
      return parseInt(a.name.substr(a.name.length - 2)) >= parseInt(b.name.substr(b.name.length - 2)) 
        ? 1 
        : -1
    })
    
    return sortedChannels
  }

  setGuild(guild) {
    this.guild = guild
  }

}