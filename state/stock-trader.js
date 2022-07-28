import { StorageEntry } from 'core/storage-entry'


export class StockTrader extends StorageEntry {

	static storageKey = 'State.StockTrader'
	static storageValue = StockTrader

	positionsLong = new Map()
	positionsShort = new Map()

	corpus = 0

	history = new Map()
	// Note tick timestamps
	ticks = []

	/**
	 * 
	 * @param {array} symbols Result provided by ns.stock.getSymbols()
	 * @param {array} positions Results of ns.stock.getPosition() in same order as {symbols} parameter.
	 * @param {number} corpus
	 */
	constructor(symbols, positions, corpus) {
		super()

		for ( let i = 0; i < symbols.length; i++ ) {
			// Clear and prepare history storage for each inidividual stock.
			this.history.set(symbols[i], [])

			// Do we have existing Long positions in this stock?
			if ( positions[i][0] > 0 ) {
				positionsLong.set( symbols[i], [positions[i][0], positions[i][1]] )
			}
			// Do we have existing Short positions in this stock?
			if ( positions[i][2] > 0 ) {
				positionsShort.set( symbols[i], [positions[i][2], positions[i][3]] )
			}
		}

		this.corpus = corpus
	}

	/**
	 * 
	 * @param {array} data [SYM, Ask, Bid]
	 */
	doTick(data) {
		// Mark tick timestamp for future reference.
		this.ticks.push(Date.now())

		// Sort stock data
		for ( let stock of data ) {
			this.history.set(`${stock[0]}_Ask`, this.history.get(`${stock[0]}_Ask`).push(stock[1]))
			this.history.set(`${stock[0]}_Bid`, this.history.get(`${stock[0]}_Bid`).push(stock[2]))
		}
	}

	/**
	 * Calculate the simple moving average.
	 * 
	 * 
	 * @param {string} symbol 			Stock symbol to fetch data for.
	 * @param {string} channel 			Either 'Ask' or 'Bid'
	 * @param {number} type					SMA chunk size
	 * @param {number} fromPosition Starting position in historical data array.
	 * @returns 
	 */
	calcSMA(symbol, channel, subsetSize = 20, fromPosition = 0) {
		// ToDo: cache SMA results for performance

		// Fetch stock data
		let data = this.history.get(`${symbol}_${channel}`).slice(fromPosition)

		// Prepare result storage
		let result = []

		// Data set to small for moving average
		if( subsetSize > data.length ) return []

		//ToDo: when iterating reuse previous result for performance.
		for ( let i = subsetSize; i < data.length; i++) {
			let subset = data.slice(i-subsetSize, i+1)
			
			result.push( subset.reduce( (p, v) => p+v ) / chunkSize )
		}

		return result
	}

	/**
	 * Calculate current profit percentage as float value.
	 * 
	 * @param {number} currentPricePerShare Current stock price needed for calculation
	 */
	calcProfit(symbol, avgPositionPrice) {
		let stockData = this.history.get(symbol)
		let currentPricePerShare = stockData[stockData.length - 1]

		return (currentPricePerShare - avgPositionPrice) / avgPositionPrice
	}
}