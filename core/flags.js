export class Flags {

  __flagData = []

  __props = new Map()

  /**
   * 
   * @param {Array} data
   */
  constructor(data) {
    this.__flagData = data
  }

  parse(ns) {
    const flagNames = this.__flagData.map(v => v[0])
    const flagPropNames = this.__flagData.map(v => {
      return v[0].split('-').map(part => {
        return part[0].toUpperCase() + part.slice(1)
      } ).join('')
    })
    
    for( let i = 0; i < flagNames.length; i++ ) {
      const index = ns.args.lastIndexOf( flagNames[i] )

      let prop = this.__flagData[i][1]
      if ( index > -1 ) {
        if ( typeof prop === 'boolean' ) {
          prop = true
        } else {
          if ( ns.args.length > index+1 ) {
            prop = Number( ns.args[index+1] )
          } else {
            ns.tprint(`Error: flag '${flagNames[i]}' requires an additional argument!`)
            ns.exit()
          }
        }
      }

      this.__props.set(flagPropNames[i], prop)
    }
  }
  get(prop) {
    return this.__props.has(prop) ?
      this.__props.get(prop) :
      null
  }

  set(prop, val) {
    if ( this.__props.has(prop) && typeof prop == this.__props.get(prop) ) {
      this.__props.set(prop, val)
    }
  }

  keys() {
    return this.__flagData.map(v => v[0])
  }

  help() {

    let msg = ""

    for ( let flag of this.__flagData ) {
      msg += `+ ${flag[0]}\n`
      if ( typeof flag[1] !== 'boolean' ) {
        msg += `++ Default: ${flag[1]}\n`
      }
      msg += flag[2].split('\n').map(v => "    " + v).join('\n') + '\n\n'
    }

    return msg
  }

}