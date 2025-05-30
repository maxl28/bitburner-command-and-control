import { FileSystem } from "/data/file-system.js";
export async function main(ns) {
  // Disable verbose logging for specific methods to clean up the output.
  const DISABLED_LOGS = [
    'sleep', 'getHackingLevel', 'getServerMaxMoney', 'getServerMinSecurityLevel', 'getServerSecurityLevel',
    'getServerMoneyAvailable', 'getServerMaxRam', 'getServerUsedRam',
  ];
  DISABLED_LOGS.forEach(log => ns.disableLog(log));

  // Opens a tail window in the game to display log outputs.
  ns.tail();

  // File system management for tracking servers and targets.
  const rooted_servers = new FileSystem(ns, "/data/rooted-servers.txt");
  const hackable_targets = new FileSystem(ns, "/data/hackable-targets.txt");
  const best_target = new FileSystem(ns, "/data/best-target.txt");

  // Constants for script execution.
  const RAM_PER_THREAD = ns.getScriptRam("/shared/weaken.js"); // RAM requirement per thread.
  const RESERVED_HOME_RAM = 20; // Amount of RAM reserved on the 'home' server.
  const BATCH_THREAD_DELAY = 100; // Delay between batch operations in milliseconds.
  const CALCULATION_DELAY = 5; // Delay for recalculations to manage execution speed vs performance.
  const LOOP_DELAY = 1000 * 3; // Delay after completing an iteration over all targets and servers.
  const INITIAL_HACK_THREADS = 8; // Initial number of threads reserved for hacking operations.
  let batch_number = 1; // Identifier for each batch operation to ensure uniqueness.

  while (true) {
    // Read server and target data from files.
    const SERVERS = await rooted_servers.read();
    const TARGETS = await hackable_targets.read();
    const BEST_TARGET = await best_target.read();

    // Determine if the game is in an early stage.
    let is_early_game = ns.getHackingLevel() < 750;

    for (let target of TARGETS) {
      if (is_early_game) target = BEST_TARGET; // Focus on the best target during early game stages.

      // Gather target's financial and security details.
      let max_money = ns.getServerMaxMoney(target);
      let min_security_level = ns.getServerMinSecurityLevel(target);
      let security_level = ns.getServerSecurityLevel(target);
      let money = Math.max(1, ns.getServerMoneyAvailable(target)); // Avoid division by zero.
      let has_growth_been_calculated = false;
      let required_grow_threads = 0;
      let batch_delay = 0;

      for (let server of SERVERS) {
        // Calculate the number of available threads for operations.
        let available_ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server) - (server === "home" ? RESERVED_HOME_RAM : 0);
        let available_threads = Math.floor(available_ram / RAM_PER_THREAD);

        if (available_threads < 1) continue; // Skip servers with no available threads.

        // Adjust operations based on server's security state and financial potential.
        let cores = (server === "home") ? ns.getServer("home").cpuCores : 1; // Multi-core support for home server.
        let security_decrease = ns.weakenAnalyze(1, cores);
        let hack_weaken_ratio = ns.hackAnalyzeSecurity(1, target) / security_decrease;
        let grow_weaken_ratio = ns.growthAnalyzeSecurity(1, target, cores) / cores;

        // Prioritize operations based on server state: weaken, grow, or hack.
        if (security_level > min_security_level) {
          // Security reduction operations.
          let reduced_security_level = security_decrease * available_threads;
          if (security_level - reduced_security_level < min_security_level) {
            available_threads = Math.ceil((security_level - min_security_level) / security_decrease);
            security_level = min_security_level;
          } else {
            security_level -= reduced_security_level;
          }
          ns.exec("/shared/weaken.js", server, available_threads, target, 0, batch_number++);

        } else if (money < max_money && (required_grow_threads != 0 || !has_growth_been_calculated)) {
          // Money maximization operations.
          if (!has_growth_been_calculated) {
            required_grow_threads = Math.ceil(ns.growthAnalyze(target, max_money / money, cores));
            has_growth_been_calculated = true;
          }
          available_threads = Math.min(required_grow_threads, available_threads);
          required_grow_threads -= available_threads;
          security_level += ns.growthAnalyzeSecurity(available_threads, target, cores);
          ns.exec("/shared/grow.js", server, available_threads, target, 0, batch_number++);

        } else {
          if (available_threads < 4) continue; // Minimally need 4 threads to run a HWGW batch.

          // Hack-Weaken-Grow-Weaken batch operations.
          let hack_amount = ns.hackAnalyze(target); // Percentage of money per hack thread.
          if (hack_amount == 0) continue;

          let hack_threads = Math.ceil(available_threads / INITIAL_HACK_THREADS);
          let grow_threads, weaken_threads, weaken_threads_2, is_over_allocated = false;

          while (true) { // Optimal thread calculation loop.
            // Calculate the minimum number of threads to hack the server.
            if (hack_amount * hack_threads > 1) hack_threads = Math.ceil(1 / hack_amount);

            // Calculate grow and weaken threads required to account for hack threads.
            grow_threads = Math.ceil(ns.growthAnalyze(target, 1 / (1 - Math.min(0.99, hack_amount * hack_threads)), cores));
            weaken_threads = Math.ceil(hack_weaken_ratio * hack_threads);
            weaken_threads_2 = Math.max(1, Math.ceil(grow_weaken_ratio * grow_threads)); // grow threads could be 0 so we set it to 1.

            // Calculate batch thread utilization.
            let thread_usage = (hack_threads + grow_threads + weaken_threads + weaken_threads_2) / available_threads;

            // Prioritize operations based on thread allocation state: over, under, good.
            if (thread_usage > 1) {
              // Over allocation.
              if (hack_threads > 1) {
                hack_threads--; // Adjust hack threads to manage over-allocation.
                is_over_allocated = true;
              } else break; // Recompute.

            } else if (Math.floor((1 - thread_usage) * hack_threads) > 1) {
              // Under allocation.
              let additional_threads = Math.floor((1 - thread_usage) * hack_threads / 2);

              // Checking if adding threads won't cause an over-hack.
              if (hack_amount * (hack_threads + additional_threads) <= 1) {
                hack_threads += additional_threads; // Adjust hack threads to manage under-allocation.
              } else break; // Recompute.

              if (is_over_allocated) break; // flag to prevent softlock from increasing and reducing by 1 thread.

            } else break; // Good allocation.

            await ns.sleep(CALCULATION_DELAY);
          }

          ns.exec("/shared/weaken.js", server, weaken_threads, target, batch_delay, batch_number);
          ns.exec("/shared/weaken.js", server, weaken_threads_2, target, batch_delay + BATCH_THREAD_DELAY * 2, batch_number);
          ns.exec("/shared/grow.js", server, grow_threads, target, batch_delay + BATCH_THREAD_DELAY + ns.getWeakenTime(target) - ns.getGrowTime(target), batch_number);
          ns.exec("/shared/hack.js", server, hack_threads, target, batch_delay - BATCH_THREAD_DELAY + ns.getWeakenTime(target) - ns.getHackTime(target), batch_number++);
          
          // Prevents intersection of HWGW batches.
          batch_delay += 4 * BATCH_THREAD_DELAY;
        }
        await ns.sleep(CALCULATION_DELAY);
      }
      await ns.sleep(CALCULATION_DELAY);
    }
    await ns.sleep(LOOP_DELAY);
  }
}