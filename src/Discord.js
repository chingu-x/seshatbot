import { Client, IntentsBitField } from 'discord.js'

const GUILD_CATEGORY = 4
const GUILD_TEXT = 0
export default class Discord {
  
  constructor(environment) {
    this.environment = environment
    this.isDebug = this.environment.isDebug()

    const myIntents = new IntentsBitField()
    myIntents.add(IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildPresences, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildMessages)
    this.client = new Client({ intents: myIntents })

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
            callback(schedule, teamNo, message, messageSummary) // Invoke the callback function to process messages
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

  // Get the team channels for the specified Voyage from each category. 
  getChannelNames(guild, voyageName, categoryRegex, channelRegex) {
    // Locate all the categories for this Voyage
    let voyageCategories = []
    guild.channels.cache.forEach((channel) => {
      if (channel.type === GUILD_CATEGORY && channel.name.toUpperCase().substring(0,3) === voyageName.toUpperCase()) {
        console.log('Discord.js getChannelNames - channel.name: ', channel.name)
        voyageCategories.push(channel)
      }
    })

    // Retrieve the list of channels for this Voyage
    let voyageChannels = []
    guild.channels.cache.forEach((channel) => {
      const category = voyageCategories.find((category) => channel.parentId === category.id)
      if (category !== undefined && channel.type === GUILD_TEXT) {
        console.log('Discord.js getChannelNames - channel.name: ', channel.name, ' channel.parentId: ', channel.parentId)
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

    console.log('Discord.js getChannelNames - sortedChannels: ', sortedChannels)
    
    return {category, sortedChannels }
  }
  
  getDiscordClient() {
    return this.client
  }

}