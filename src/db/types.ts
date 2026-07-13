export interface DistributionEntry {
  id: string
  name: string
  role: string
}

export interface CompanyEntry {
  id: string
  name: string
  trade: string
}

export interface Project {
  id: string
  name: string
  address: string
  distributionList: DistributionEntry[]
  defaultCompanies: CompanyEntry[]
  reportCounter: number
  logoBlob?: Blob
  createdAt: string
  updatedAt: string
}

export type ReportStatus = 'draft' | 'final'

export interface ReportCompany {
  name: string
  trade: string
}

export interface Report {
  id: string
  projectId: string
  reportNumber: number
  date: string // ISO date (yyyy-mm-dd)
  inspectionInfo: string // Uhrzeit/Dauer der Begehung, Freitext
  author: string
  presentCompanies: ReportCompany[]
  targetStatusText: string
  targetStatusDate?: string
  specialNotes: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
}

export interface Position {
  id: string
  reportId: string
  order: number
  note: string
}

export interface Photo {
  id: string
  positionId: string
  order: number
  blob: Blob
  createdAt: string
}
