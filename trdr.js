const stockSymbols = ['ECP', 'BLD', 'OMTK', 'FSIG', 'FLCM', 'CTYS']
const avgTrackers = {}
const profitTrackers = {}
const risingTrackers = {}
const firstInvests = {}

let corpus

function localeHHMMSS(ms = 0) {
  if (!ms) {
    ms = new Date().getTime()
  }

  return new Date(ms).toLocaleTimeString()
}

const average = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length

function getMoney(ns) {
  return ns.getPlayer().money
}

function processTick(ns, stockSymbol) {
  const profitMargin = 0.05
  const minimumMoneyToInvest = corpus * .1
  let profitTracker = profitTrackers[stockSymbol] || {}
  let positionChanged = false
  let avgTracker = avgTrackers[stockSymbol] || []
  let rising = risingTrackers[stockSymbol]
  avgTracker.push(ns.stock.getPrice(stockSymbol))
  avgTracker = avgTracker.slice(-40)

  if (avgTracker.length === 40) {
    let profitPercentage
    let profitMarginCrossed = false
    const avg40 = average(avgTracker)
    const avg10 = average(avgTracker.slice(-10))

    if (profitTracker.volume && profitTracker.position) {
      const stockSaleGain = ns.stock.getSaleGain(stockSymbol, profitTracker.volume, profitTracker.position)
      profitPercentage = (stockSaleGain - profitTracker.volume * profitTracker.value) / (profitTracker.volume * profitTracker.value)

      if (profitPercentage > profitMargin) {
        profitMarginCrossed = true
      }
    }

    if (profitMarginCrossed) {
      /* Bit-8 REQUIRED
      const shortSellValue = ns.stock.sellShort(stockSymbol, 9999999999999999999999999)
      if (shortSellValue && profitTracker.volume) {
        const profit = profitTracker.volume * (profitTracker.value - shortSellValue) - 200000
        corpus += profit

        const message = `[${localeHHMMSS()}] ${stockSymbol}, profitPercentage: ${ns.nFormat(profitPercentage, '0.0%')}, selling shorts,
          profitTracker.volume: ${profitTracker.volume}, profitTracker.value: ${ns.nFormat(profitTracker.value, '$0.000a')},
          shortSellValue: ${ns.nFormat(shortSellValue, '$0.000a')},
          profit: ${ns.nFormat(profit, '$0.000a')}, corpus: ${ns.nFormat(corpus, '$0.000a')}`
          .replace(/\r/g, '')
          .replace(/\n/g, '')
          .replace(/\s+/g, ' ')
          .trim()
        ns.tprint(message)

        profitTracker = {
          position: '',
          value: 0,
          volume: 0,
        }
      }
      */

      const longSellValue = ns.stock.sell(stockSymbol, 9999999999999999999999999)
      if (longSellValue && profitTracker.volume) {
        const profit = profitTracker.volume * (longSellValue - profitTracker.value) - 200000
        corpus += profit

        const message = `[${localeHHMMSS()}] ${stockSymbol}, profitPercentage: ${ns.nFormat(profitPercentage, '0.0%')}, selling longs,
          profitTracker.volume: ${profitTracker.volume}, profitTracker.value: ${ns.nFormat(profitTracker.value, '$0.000a')},
          longSellValue: ${ns.nFormat(longSellValue, '$0.000a')},
          profit: ${ns.nFormat(profit, '$0.000a')}, corpus: ${ns.nFormat(corpus, '$0.000a')}`
          .replace(/\r/g, '')
          .replace(/\n/g, '')
          .replace(/\s+/g, ' ')
          .trim()
        ns.tprint(message)

        ns.toast(
          `[Trader] Sell ${stockSymbol} - ${profitTracker.volume} shares for ${ns.nFormat(profit, '$0.000a')}`,
          'warning',
          10 * 1000
        )

        profitTracker = {
          position: '',
          value: 0,
          volume: 0,
        }
      }
    }

    if (rising !== avg10 > avg40 || profitMarginCrossed) {
      positionChanged = true
      rising = avg10 > avg40
    }

    // Detect position change AND prevent sell&rebuy behaviour
    if (positionChanged && !profitMarginCrossed) {
      if (rising) {
        // It's rising now, sell short, buy long
        /* Bit-8 REQUIRED
        const shortSellValue = ns.stock.sellShort(stockSymbol, 9999999999999999999999999)
        if (shortSellValue && profitTracker.volume) {
          const profit = profitTracker.volume * (profitTracker.value - shortSellValue) - 200000
          corpus += profit

          const message = `[${localeHHMMSS()}] ${stockSymbol}, selling shorts,
            profitTracker.volume: ${profitTracker.volume}, profitTracker.value: ${ns.nFormat(profitTracker.value, '$0.000a')},
            shortSellValue: ${ns.nFormat(shortSellValue, '$0.000a')},
            profit: ${ns.nFormat(profit, '$0.000a')}, corpus: ${ns.nFormat(corpus, '$0.000a')}`
            .replace(/\r/g, '')
            .replace(/\n/g, '')
            .replace(/\s+/g, ' ')
            .trim()
          ns.tprint(message)
          ns.print(message)

          profitTracker = {
            position: '',
            value: 0,
            volume: 0,
          }
        }
        */

        const moneyToInvest = firstInvests[stockSymbol] ? getMoney(ns) * .75 : Math.floor(corpus / 6)
        if (moneyToInvest >= minimumMoneyToInvest) {
          let volume = Math.floor(moneyToInvest / ns.stock.getAskPrice(stockSymbol))
          volume = Math.min(volume, ns.stock.getMaxShares(stockSymbol))

          if (volume > 0) {
            const longBuyValue = ns.stock.buy(stockSymbol, volume)

            const message = `[${localeHHMMSS()}] ${stockSymbol}, buying longs,
              volume: ${volume},
              price per share: ${ns.nFormat(longBuyValue, '$0.000a')},
              invested: ${ns.nFormat(volume * longBuyValue, '$0.000a')},
              moneyToInvest: ${ns.nFormat(moneyToInvest, '$0.000a')},
              corpus: ${ns.nFormat(corpus, '$0.000a')}`
              .replace(/\r/g, '')
              .replace(/\n/g, '')
              .replace(/\s+/g, ' ')
              .trim()
            ns.tprint(message)
            ns.print(message)

            ns.toast(
              `[Trader] Buy ${stockSymbol} - ${volume} shares for ${ns.nFormat(longBuyValue, '$0.000a')} each`,
              'warning',
              10 * 1000
            )


            if (longBuyValue && volume) {
              firstInvests[stockSymbol] = true
              profitTracker = {
                position: 'Long',
                value: longBuyValue,
                volume,
              }
            }
          } else {
            var msg = `[${localeHHMMSS()}] ERROR #1: ${stockSymbol}, buying longs, volume: ${volume},
              getMoney(ns): ${getMoney(ns)}, Math.floor(corpus / 6): ${Math.floor(corpus / 6)},
              moneyToInvest: ${ns.nFormat(moneyToInvest, '$0.000a')}`
            ns.tprint(msg)
            ns.print(msg)
          }
        } else {
          var msg = `[${localeHHMMSS()}] ERROR #2: ${stockSymbol}, buying longs,
            getMoney(ns): ${getMoney(ns)}, Math.floor(corpus / 6): ${Math.floor(corpus / 6)},
            moneyToInvest: ${ns.nFormat(moneyToInvest, '$0.000a')}`
          ns.tprint(msg)
          ns.print(msg)
        }
      } else {
        // It's falling now, sell long, buy short
        const longSellValue = ns.stock.sell(stockSymbol, 9999999999999999999999999)
        if (longSellValue && profitTracker.volume) {
          const profit = profitTracker.volume * (longSellValue - profitTracker.value) - 200000
          corpus += profit

          const message = `[${localeHHMMSS()}] ${stockSymbol}, selling longs,
            profitTracker.volume: ${profitTracker.volume}, profitTracker.value: ${ns.nFormat(profitTracker.value, '$0.000a')},
            longSellValue: ${ns.nFormat(longSellValue, '$0.000a')},
            profit: ${ns.nFormat(profit, '$0.000a')}, corpus: ${ns.nFormat(corpus, '$0.000a')}`
            .replace(/\r/g, '')
            .replace(/\n/g, '')
            .replace(/\s+/g, ' ')
            .trim()
          ns.tprint(message)
          ns.print(message)

          ns.toast(
            `[Trader] Selling ${profitTracker.volume}L@${stockSymbol} for ${ns.nFormat(profit, '$0.000a')}`,
            'warning',
            10 * 1000
          )

          profitTracker = {
            position: '',
            value: 0,
            volume: 0,
          }
        }

        /*
        const moneyToInvest = firstInvests[stockSymbol] ? getMoney(ns) : Math.floor(corpus / 6)
        if (moneyToInvest >= minimumMoneyToInvest) {
          let volume = Math.floor(moneyToInvest / ns.stock.getBidPrice(stockSymbol))
          volume = Math.min(volume, ns.stock.getMaxShares(stockSymbol))

          if (volume > 0) {

            const shortBuyValue = ns.stock.short(stockSymbol, volume)

            const message = `[${localeHHMMSS()}] ${stockSymbol}, buying shorts,
              volume: ${volume},
              price per share: ${ns.nFormat(shortBuyValue, '$0.000a')},
              invested: ${ns.nFormat(volume * shortBuyValue, '$0.000a')},
              moneyToInvest: ${ns.nFormat(moneyToInvest, '$0.000a')},
              corpus: ${ns.nFormat(corpus, '$0.000a')}`
              .trim()
            ns.tprint(message)
            ns.print(message)

            ns.toast(`[Trader] Buy ${stockSymbol} - ${volume}@${ns.nFormat(shortBuyValue, '$0.000a')}`, 'warning', 10*1000)

            if (shortBuyValue && volume) {
              firstInvests[stockSymbol] = true
              profitTracker = {
                position: 'Short',
                value: shortBuyValue,
                volume,
              }
            }
          } else {
            var msg = `[${localeHHMMSS()}] ERROR #3: ${stockSymbol}, buying shorts, volume: ${volume},
              getMoney(ns): ${getMoney(ns)}, Math.floor(corpus / 6): ${Math.floor(corpus / 6)},
              moneyToInvest: ${ns.nFormat(moneyToInvest, '$0.000a')}`

            ns.tprint(msg)
            ns.print(msg)
          }
        } else {
          var msg = `[${localeHHMMSS()}] ERROR #4: ${stockSymbol}, buying shorts,
            getMoney(ns): ${getMoney(ns)}, Math.floor(corpus / 6): ${Math.floor(corpus / 6)},
            moneyToInvest: ${ns.nFormat(moneyToInvest, '$0.000a')}`

          log(msg)
        }*/
      }
    }
  }

  avgTrackers[stockSymbol] = avgTracker
  profitTrackers[stockSymbol] = profitTracker
  risingTrackers[stockSymbol] = rising
}

function log(ns, msg) {
  ns.print(msg)
  ns.tprint(msg)
}

/** @param {NS} ns */
export async function main(ns) {

  let tickCounter = 1

  // Start trading with 25% of our current $$$
  corpus = getMoney(ns) * .25


  stockSymbols.forEach((stockSymbol) => {
    const [sharesLong, avgPriceLong, sharesShort, avgPriceShort] = ns.stock.getPosition(stockSymbol)

    corpus += sharesLong * avgPriceLong + sharesShort * avgPriceShort
  })

  log(ns, `[${localeHHMMSS()}] Tick counter: 1, corpus: ${ns.nFormat(corpus, '$0.000a')}`)
  while (true) {
    for (let i = 0; i < stockSymbols.length; i++) {
      const stockSymbol = stockSymbols[i]
      processTick(ns, stockSymbol)
      await ns.sleep(1)
    }
    if (tickCounter % 10 === 0) {
      log(ns, `[${localeHHMMSS()}] Tick counter: ${tickCounter}, corpus: ${ns.nFormat(corpus, '$0.000a')}`)
    }

    if (tickCounter % 50 === 0) {
      log(ns, `[${localeHHMMSS()}] Tick counter: ${tickCounter}, corpus: ${ns.nFormat(corpus, '$0.000a')}`)
    }
    await ns.sleep(5995)
    tickCounter++
  }
}