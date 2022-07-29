import { Network, CC } from "core/state"
import { asyncRun } from 'core/run'
import { WORKER_SCRIPTS } from 'core/globals'


export async function main(ns) {

  let cc = CC.load(),
    network = Network.load()

  if ( !cc.flags.get('KillAll') ) return

  do {

    for (let node of network.nodes ) {
      for ( let script of WORKER_SCRIPTS ) {
        ns.scriptKill(script, node)
      }
    }

    await asyncRun(ns, 'task/scan.js')
    await asyncRun(ns, 'task/scan_analyze.js')

    network = Network.load()
  }  while ( network.taken.size > 0 )

  cc.flags.get('KillAll') = false

  CC.save(cc)
  Network.save(network)
}