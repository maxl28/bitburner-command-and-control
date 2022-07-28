export function isNumeric(n) {
	
	return !isNaN(parseFloat(n)) && isFinite(n);
}

export function* findPaths(graph, src, dst, path = [], visited = new Set()) {
	if (src === dst) yield path.concat(dst)
	else if (graph[src] && !visited.has(src)) {
		visited.add(src)
		path.push(src)

		for (const neighbor of graph[src])
			yield* findPaths(graph, neighbor, dst, path, visited)

		visited.delete(src)
		path.pop(src)
	}
}

export function graphify(routes) {
	const graph = {}

	for (let [host, neighbors] of routes) {
		if (host == null) continue

		if (!graph[host]) {
			graph[host] = graph[host] = neighbors
		}
	}

	return graph
}

export function splitMemory(memory, pipe, strategy = 'evenly') {
	// Prepare result
	let chunks = {
		total:
			typeof memory === 'object'
				? memory._total
				: isNumeric(memory)
				? memory
				: 0,
		data: {}
	}
	let remainingTasks = pipe.remaining()

	// First pass on task list to filter out predfined memory shares.
	let usedRAM = 0,
		usedCount = 0
	for (let entry of pipe.tasks.list) {
		if (entry.isDone) continue

		if (typeof memory === 'object' && memory.hasOwnProperty(entry.title)) {
			const chunkRAM = memory[entry.title] * chunks.total
			usedRAM += chunkRAM
			chunks.data[entry.UID] = chunkRAM
			usedCount++
		}
	}

	// Have we assigned all tasks a memory chunk? Return early.
	if (remainingTasks - usedCount <= 0) return chunks

	// Second pass on task list to split remaining memory by speified strategy.
	for (let entry of pipe.tasks.list) {
		if (entry.isDone) continue

		switch (strategy) {
			case 'evenly':
				if (!chunks.data.hasOwnProperty(entry.UID)) {
					chunks.data[entry.UID] =
						(chunks.total - usedRAM) / (remainingTasks - usedCount)
				}
				break

			default:
				throw new Error(
					`Unknown strategy '${strategy}' in splitMemory`
				)
		}
	}

	return chunks
}