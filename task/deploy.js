import { Network, CC } from 'state/index'
import { WORKER_SCRIPTS } from 'core/globals'

export async function main(ns) {

  let cc = CC.load(),
    network = Network.load()

  for ( let node of network.nodes ) {

    for ( let script of WORKER_SCRIPTS ) {

      await ns.scp(script, cc.host, node)
    }
  }
}