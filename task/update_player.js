import { CC } from 'state/index'

export async function main(ns) {

  let cc = CC.load()

  cc.sourceFiles = ns.getOwnedSourceFiles()
  cc.hacknet = Array.from({length: ns.hacknet.numNodes() }, (v,i) => ns.hacknet.getNodeStats(i))

  CC.save(cc)
}