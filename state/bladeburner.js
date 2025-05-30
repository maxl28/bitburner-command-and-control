import { StorageEntry } from 'core/storage-entry'

export class Bladeburner extends StorageEntry {

  static storageKey = 'State.Bladeburner'
  static storageValue = Bladeburner

  _actions = {}
  _actionsLastUpdate = Date.now()
  
  _skills = {}
  _skillsLastUpdate = Date.now()

  _blackOp = {}
  _blackOpLastUpdate = Date.now()

  _cities = {}
  _citiesLastUpdate = Date.now()


  constructor() { super() }

  get actions() { return this._actions }
  set actions(val) { this._actions = val; this._actionsLastUpdate = Date.now() }

  get skills() { return this._skills }
  set skills(val) { this._skills = val; this._skillsLastUpdate = Date.now() }

  get blackOp() { return this._blackOp }
  set blackOp(val) { this._blackOp = val; this._blackOpLastUpdate = Date.now() }

  get cities() { return this._cities }
  set cities(val) { this._cities = val; this._citiesLastUpdate = Date.now() }
}