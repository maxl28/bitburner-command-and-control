import { CC, Network } from 'state/index'
import { tryDispatch } from 'core/run'
import { SCRIPT_COSTS } from 'core/globals'

export async function main(ns) {
  let cc = CC.load()
  let network = Network.load()

  let running = ns.ps('home').filter(el => el.filename.startsWith('worker/daemon_')).map(el => el.filename.slice(14))

  for (let ident of Array.from(network.daemons.keys())) {
    if (running.includes(ident+'.js') || !network.daemons.has(ident)) continue;

    ns.tprint(`[CC@${cc.host}] Starting Daemon ${ident}...`)

    const script = network.daemons.get(ident)

    if (tryDispatch(
      ns,
      [['home', SCRIPT_COSTS[script]]], // ToDo: replace hardcore override... imports not on every network host.
      [script, SCRIPT_COSTS[script]],
      1,
      'daemon',
      Date.now()
    ) > 0) cc.notify(ns, 'info', `Daemon ${ident} started!`, 4*1000)
    else {
      cc.notify(ns, 'error', `Failed to start Daemon ${ident}!`, 2*1000);

      let checkFile = script[0] == '/' ? script.slice(1) : script;
      for (let entry of ns.getRecentScripts()) {
        if (entry.filename == checkFile) {
          ns.tprint(`Daemon death log '${checkFile}':\n ${JSON.stringify(entry.logs)}`)
        }
      }
    }
  }
}