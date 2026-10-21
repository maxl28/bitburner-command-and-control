import { Hosts, Network } from 'state/index'

let hosts, network

/** @param {NS} ns **/
export async function main(ns) {

  hosts = Hosts.load()
  network = Network.load()

  network.contracts = []

  hosts.hosts.forEach((hostname) => {
    const files = ns.ls(hostname)
    if (files && files.length) {
      const contracts = files.filter((file) => file.includes('.cct'))

      if (contracts.length) {
        contracts.forEach((contract) => {
          const contractData = {
            contract,
            hostname,
            type: ns.codingcontract.getContractType(contract, hostname),
            data: ns.codingcontract.getData(contract, hostname),
          }

          network.contracts.push(contractData)
        })
      }
    }
  })

  Network.save(network)
}