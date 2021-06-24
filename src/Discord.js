import DiscordJS from 'discord.js'
import FileOps from './FileOps.js'

export default class Discord {
  constructor(environment) {
    this.environment = environment
    this.isDebug = this.environment.isDebug()
    this.client = new DiscordJS.Client()

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

  findChannel(guild, channelName) {
    // Validate category ownership if channel name is formatted as
    // 'categoryname/channelname'
    const indexOfSlash = channelName.indexOf('/')
    const categoryName = indexOfSlash >= 0 ? channelName.substring(0,indexOfSlash) : ''
    const realChannelName = indexOfSlash >= 0 ? channelName.substring(indexOfSlash + 1) : channelName
    const channel = guild.channels.cache.find(channel => channel.name === realChannelName)
    let category = guild.channels.cache.find(category => 
      category.id === channel.parentID && category.type === 'category' && category.name === categoryName)
    if (category.length === 0) {
      return null
    }  
    return channel
  }

  // Get the team channels for the specified Voyage
  getChannelNames(guild, voyageName, channelPattern) {
    // Locate the owning category name. This assumes that category names are
    // formatted as 'v31-🔥' where '31' is any two digit voyage number.
    const category = guild.channels.cache.find(category => 
      category.type === 'category' && category.name === this.getCategoryName(voyageName))

    // Get the team channel names in this category. Team channel names are 
    // formatted as `teamname-team-nn` where `teamname` is an animal name, 
    // 'team' is a literal, and `nn` is a numeric team number 
    // (e.g. `bears-team-09')
    let channelNames = category.children.reduce((channels, channel) => {
      const result = channel.name.match(channelPattern)
      if (result) {
        channels.push(channel)
      }
      return channels
    }, [])
  }

  getCategoryName(voyageName) {
    return voyageName.concat('-🔥')
  }  
  
  getDiscordClient() {
    return this.client
  }

  isCategoryCreated(guild, categoryName) {
    return guild.channels.cache.array()
      .filter(channel => channel.type === 'category' && channel.name === categoryName)
  }

  isChannelCreated(guild, categoryName = '', channelName) {
    const channel = guild.channels.cache.array()
      .filter(channel => channel.name === channelName)
    
    // Validate that channel is owned by a category based on an optional category name parm
    if (categoryName !== '') {
      let category = this.isCategoryCreated(guild, categoryName)
      return category.length > 0 && category[0].name === categoryName ? channel : []
    }
    return channel
  }

}