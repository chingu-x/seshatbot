import { Client, GatewayIntentBits } from 'discord.js'
import { GUILD_CATEGORY, GUILD_TEXT, GUILD_PUBLIC_THREAD} from './util/constants.js'
export default class Discord {
  
  constructor(environment) {
    this.environment = environment
    this.isDebug = this.environment.isDebug()

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
      ],
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

  async getChannel(channel) {
    if (channel === null || channel === undefined) {
      return -1
    }
    return await this.client.channels.fetch(channel.id)
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
  async getTeamChannels(client, guild, voyageName, categoryRegex, channelRegex) {
    // Locate all the categories for this Voyage
    let voyageCategories = []
    const guildChannels = Array.from(client.channels.cache)
    for (let guildChannel of guildChannels) {
      const channel = await client.channels.fetch(guildChannel[0])
      if (channel.type === GUILD_CATEGORY && channel.name.toUpperCase().substring(0,3) === voyageName.toUpperCase()) {
        voyageCategories.push(channel)
      }
    }

    // Retrieve the list of channels for this Voyage
    let voyageChannels = []
    for (let guildChannel of guildChannels) {
      const channel = await client.channels.cache.get(guildChannel[0])
      const category = voyageCategories.find((category) => channel.parentId === category.id)
      if (category !== undefined && channel.type === GUILD_TEXT) {
        voyageChannels.push({ channel: channel, category: category, threadChannel: null })
      } else if (channel.type === GUILD_PUBLIC_THREAD) {
        // Posts in forum channels are made in public threads. To get the 
        // forum channel follow the `parentId` attribute to navigate back to the
        // forum channel object.
        const forumChannel = await guild.channels.cache.get(channel.parentId)
        voyageChannels.push({ channel: forumChannel, category: category, threadChannel: channel })
      }
    }

    // Sort the team channels by their names 
    let sortedChannels = []
    for (let channel of voyageChannels) {
      if (channel.channel !== null && channel.channel !== undefined) {
        const result = channel.channel.name.match(channelRegex)
        if (result !== null) {
          sortedChannels.push(channel)
        }
      }
    }
    sortedChannels.sort((a, b) => {
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