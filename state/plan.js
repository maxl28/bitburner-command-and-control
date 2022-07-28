import { StorageEntry } from 'core/storage-entry'
import { Pipeline } from 'core/queue'
import { fetchOrCreateObject, save } from 'core/orm'

export class Plan extends StorageEntry {

  static storageKey = 'State.Plan'
	static storageValue = Plan
  
  /** 
   * @var Pipeline
   */
  network = new Pipeline()
  
  /** 
   * @var Pipeline
   */
  bladeburner = new Pipeline()

  constructor() {
    super()
  }

  save() {
    save(`${Plan.storageKey}.Network`, this.network)
    save(`${Plan.storageKey}.Bladeburner`, this.bladeburner)
  }

  /** @override */
  static load() {
    let pl = new Plan()

    pl.network = Pipeline.parse( 
      fetchOrCreateObject(`${Plan.storageKey}.Network`, Pipeline, 'Async', [], 'Network') 
    )

    pl.bladeburner = Pipeline.parse( 
      fetchOrCreateObject(`${Plan.storageKey}.Bladeburner`, Pipeline, 'Sync', [], 'Bladeburner')
    )

    return pl
  }
}