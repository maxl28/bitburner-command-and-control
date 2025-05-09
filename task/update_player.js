import { CC } from 'state/index'

export async function main(ns) {

  let cc = CC.load()

  cc.hacknet = Array.from({length: ns.hacknet.numNodes() }, (v,i) => ns.hacknet.getNodeStats(i))

  cc.player = ns.getPlayer()

  CC.save(cc)
}