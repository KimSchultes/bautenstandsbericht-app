import Dexie, { type EntityTable } from 'dexie'
import type { Project, Report, Position, Photo } from './types'

export class AppDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  reports!: EntityTable<Report, 'id'>
  positions!: EntityTable<Position, 'id'>
  photos!: EntityTable<Photo, 'id'>

  constructor() {
    super('bautenstandsbericht-db')
    this.version(1).stores({
      projects: 'id, name',
      reports: 'id, projectId, [projectId+reportNumber]',
      positions: 'id, reportId, [reportId+order]',
      photos: 'id, positionId, [positionId+order]',
    })
  }
}

export const db = new AppDatabase()
