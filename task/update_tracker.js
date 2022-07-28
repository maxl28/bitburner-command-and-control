import { Tracker, CC } from 'state/index' 

export async function main(ns) {
  let cc      = CC.load(),
      tracker = Tracker.load(),
      tStamp  = Date.now()

  let yieldHnet = 0
  for ( let node of cc.hacknet ) {
    yieldHnet += node.production
  }

  tracker.scripts.push([tStamp, ns.getScriptIncome()])
  tracker.hnet.push([tStamp, yieldHnet])

  Tracker.save(tracker)
}