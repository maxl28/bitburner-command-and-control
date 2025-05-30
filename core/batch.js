export class Batch {
  
  static calc(ns, target, targetVolume = .3, maxThreads = 1000) {    
    if (target == null || !target['moneyAvailable']) {
      ns.tprint('ERROR: Can\'t resolve target: ', target.hostname, ': ', typeof target, JSON.stringify(target))
      return false
    }

    const hackAmount = target.moneyMax * targetVolume
    if (hackAmount > target.moneyAvailable) hackAmount = target.moneyAvailable

    return balance(ns, target, hackAmount, maxThreads)
  }
}

/**
 * 
 * @param {NS} ns
 * @param {Server} target Stored server object
 * @param {number} amount Money in $ to fetch from server 
 * @param {number} totalThreads Max number of concurrent threads
 * @returns {Array} List of [deltaT, 'hack/grow/weaken', threads, args]
 */
function balance(ns, target, amount, totalThreads) {
  let space = 'harvest'

  let tHack = Math.ceil(ns.hackAnalyzeThreads(target.hostname, amount))
  if (tHack > totalThreads) tHack = totalThreads
  
  const tWeaken1 = Math.ceil( Math.max(1, tHack / 4) )
  const tGrowth = Math.ceil(ns.growthAnalyze(target.hostname, 1+ target.moneyAvailable / amount))
  const tWeaken2 = Math.ceil( ns.growthAnalyzeSecurity(tGrowth) / .002 )

  let relTime = Math.max(target.weakenTime, target.growTime)
  const dHack = Math.max(0,  Math.ceil(relTime - target.hackTime)),
        dGrow = Math.max(0, Math.ceil(relTime - target.growTime)),
        dWeakA = Math.max(0, Math.ceil(relTime - target.weakenTime)),
        dWeakB = Math.ceil(target.growTime)

  // ToDo: implement balancing
  //if (totalThreads < (tHack/tHackStep + tWeaken1 + tGrowth)) {}

  let args = [target.hostname], now = Date.now()
  let taskData = [
    [now+dHack, Math.ceil(target.hackTime), 'hack', space, tHack, args],
    [now+dWeakA, Math.ceil(target.weakenTime), 'weaken', space, tWeaken1, args],
    [now+dGrow, Math.ceil(target.growTime), 'grow', space, tGrowth, args],
    [now+dWeakB, Math.ceil(target.weakenTime), 'weaken', space, tWeaken2, args]
  ]
  
  return taskData.sort((a,b) => a[0] > b[0] ? 1 : -1)
}