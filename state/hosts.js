import { StorageEntry } from 'core/storage-entry'
import { findPaths, graphify } from 'core/util'

export class Hosts extends StorageEntry {
	static storageKey = 'State.Hosts'
	static storageValue = Hosts

	/**
	 * @param {Map<String,String[]>} neighbours
	 */
	neighbours = new Map()

	purchased = []
	hosts = []
	owned = []
	targets = new Map()

	servers = {}

	constructor() {
		super()
	}

	/**
	 * Find relatively short path in Hosts.nodes
	 * from {origin} to {destination}
	 *
	 * @param {origin} string
	 * @param {destination} string
	 *
	 * @returns []String
	 */
	path(origin, destination) {
		return findPaths(graphify(this.neighbours), origin, destination)
	}
}