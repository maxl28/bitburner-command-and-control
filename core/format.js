export function formatTableCell(size, ...args) {
	var out = '|'

	for (const arg of args) {
		if (arg.length >= size) {
			out += '&nbsp;' + arg.substr(0, size) + '&nbsp;|'
		} else {
			out += '&nbsp;'

			for (var a = 0; a < size - arg.length; a++) {
				out += '&nbsp;'
			}

			out += arg + '&nbsp;|'
		}
	}

	return out
}

export function formatTable(cellSize, header, body) {
	var table = ',' + '_'.repeat(cellSize * header.length + 3 * header.length - 1) + ',\n'

	table += formatTableCell(cellSize, ...header) + '\n'

	table += '|'
	for (var c = 0; c < cellSize * header.length + 3 * header.length - 1; c++)
		table += '='
	table += '|\n'

	for (var r = 0; r < body.length; r++) {
		table += formatTableCell(cellSize, ...body[r]) + '\n'
	}

	return table
}

export function formatMoney(amount, sign = ',') {
	return String(amount).replace(/(.)(?=(\d{3})+$)/g, '$1' + sign)
}

export function formatPipe(pipe, level = '', taskMap = new Map()) {
	let out = ''

	for (let i = 0; i < pipe.tasks.list.length; i++) {
		const entry = pipe.tasks.list[i]

		const isEndChar = i >= pipe.tasks.list.length - 1

		if (entry.hasOwnProperty('pipeType')) {
			out += `${level}${isEndChar ? '┗' : '┣'}━{${entry.isDone ? '•' : '&nbsp;'}} [${
				entry.pipeType
			}] ${entry.title}\n`
			out += formatPipe(entry, level + (isEndChar ? '&nbsp;&nbsp;' : '┃&nbsp;'), taskMap)
		} else {
			out += `${level}${isEndChar ? '┖' : '┠'}─{${entry.isDone ? '•' : '&nbsp;'}} [${
				entry.doneThreads
			}/${entry.threads}] ${entry.script} ${
				Array.isArray(entry.args) ? entry.args.join('\s') : ''
			}  ${
				taskMap.has(entry.UID)
					? '@ ' + taskMap.get(entry.UID) + ' thread(s)'
					: ''
			}\n`
		}
	}

	return out
}

let barGraphDefaultConfig = {
	title: 'Graph',
	xResolution: 140,
	yResolution: 20,
	xLabelLength: 16,
	mergeXStrategy: 'merge_evenly_by_max',
	mergeYStrategy: 'merge_evenly_by_avg'
}
export function formatBarGraph(ns, data, userConfig = {}) {
	// Overwrite default config vars with user settings
	const config = { ...barGraphDefaultConfig, ...userConfig }

	let yMax = 0,
		yMin = 10 * 1000 * 1000 * 1000 * 1000

	for (let [x, y] of data) {
		if (y > yMax) yMax = y
		if (y < yMin) yMin = y
	}

	let yStep = (yMax - yMin) / config.yResolution,
		xSegments = Math.round(config.xResolution / config.xLabelLength) + 1

	let chunks = data

	// ToDo: sort and merge data
	if (data.length > config.xResolution)
		chunks = data.splice(
			data.length - 1 - config.xResolution,
			config.xResolution
		)

	let lines = []
	for (let y = config.yResolution; y > 0; y--) {
		let line = ''
		for (let x = 0; x < config.xResolution; x++) {
			let isHitFull = chunks.length > x && chunks[x][1] >= y * yStep,
				isHitHalf = chunks.length > x && chunks[x][1] >= y * yStep - yStep / 2

			if (isHitFull) line += '┃'
			else if (isHitHalf) line += '╻'
			else if (y < 1 && chunks.length > x && chunks[x][1] > 0) line += '․'
			else line += ' '
		}
		lines.push(line)
	}

	lines = lines.reverse()
	let yAxis = [],
		yAxisSpace = 9
	for (let i = 0; i < lines.length; i++) {
		let axis = ''

		if (i % Math.floor(config.yResolution / 5) == 0) {
			axis += ns.nFormat(i * yStep, '$ 0.000a')
			axis += ' '.repeat(yAxisSpace + 1 - axis.length) + '┽' + ' '
		} else {
			axis += ' '.repeat(yAxisSpace + 1 - axis.length) + '|' + ' '
		}

		yAxis.push(axis + lines[i])
	}
	yAxis.push(
		ns.nFormat(yMax, '$ 0.000a') +
		' '.repeat(yAxisSpace + 1 - ns.nFormat(yMax, '$ 0.000a').length) + '┽' + ' ')


	
	let	xAxis = [
			[
				' '.repeat(yAxisSpace + 3),
				'┟─' + '┴─'.repeat(Math.round(config.xLabelLength / 2) - 2),
				('╁─' + '┴─'.repeat(Math.round(config.xLabelLength / 2) - 2)).repeat(
					xSegments-1
				),
			].join(''),
			/*[
				...Array.from({ length: yAxisSpace + 1 }, (v) => ' '),
				'┃',
				...Array.from({ length: xSegments }, (v) =>
					' '.repeat(config.xResolution / xSegments - 1)
				).join('┃')
			].join(''),*/
			[
				' '.repeat(yAxisSpace + 3),
				...Array.from({ length: xSegments }, (v, i) => {
					let label =
						chunks.length > i * config.xLabelLength
							? '' +
							  formatTime(chunks[i * config.xLabelLength][0]).split(' ')[0]
							: 'N/A'

					return (
						label +
						' '.repeat(Math.max(0, config.xLabelLength - label.length - 2))
					)
				})
			].join(''),
			[
				' '.repeat(yAxisSpace + 3),
				...Array.from({ length: xSegments }, (v, i) => {
					let label =
						chunks.length > i * config.xLabelLength
							? '' +
							  formatTime(chunks[i * config.xLabelLength][0]).split(' ')[1]
							: ''

					return (
						label +
						' '.repeat(Math.max(0, config.xLabelLength - label.length - 2))
					)
				})
			].join('')
		]

	let graph = [...yAxis.reverse(), ...xAxis]

	return ['', ` -- ${config.title} -- `, '', graph.join('\n')].join('\n')
}

export function formatTime(ts) {
	const pad = (n, s = 2) => `${new Array(s).fill(0)}${n}`.slice(-s)
	const d = new Date(ts)

	return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(
		d.getDate()
	)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function formatNodeMap(graph, rootNode = 'home') {
	let out = `+{ ${rootNode} }\n`
	out += loopNode(graph, rootNode, ' ')

	return out
}

function loopNode(graph, rootNode, prefix = '', doneHosts = []) {
	let out = '',
		i = 0,
		num = Object.entries(graph[rootNode]).length - 1

	if (!doneHosts.includes(rootNode)) doneHosts.push(rootNode)

	for (let neighbour of graph[rootNode]) {
		if (neighbour.indexOf('p-node') > -1) {
			num--
			continue
		}
		if (doneHosts.includes(neighbour)) {
			num--
			continue
		}

		let isEnd = i >= num

		out += `${prefix}${isEnd ? '┖' : '┠'}{ ${neighbour} }\n`
		doneHosts.push(neighbour)

		out += loopNode(graph, neighbour, prefix + (isEnd ? '  ' : '┃ '), doneHosts)

		i++
	}

	return out
}
