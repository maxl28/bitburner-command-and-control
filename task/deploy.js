import { Hosts, CC } from 'state/index'
import { WORKER_SCRIPTS } from 'core/globals'

export async function main(ns) {

  let cc = CC.load(),
      hosts = Hosts.load()

  for ( let node of hosts.owned ) {

    for ( let script of WORKER_SCRIPTS ) {

      await ns.scp(script, node, cc.host)
    }
  }
}