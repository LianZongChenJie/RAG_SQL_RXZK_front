import { post, put, deleteRequest as del } from '../utils/http'

export interface SaveQuestionParams {
  question: string
  questionDesc?: string
  generatedSql: string
  tableData: string
  message: string
  chartData: string
}

export function saveQuestion(params: SaveQuestionParams) {
  return post('/qwRag/saveQuestion', params)
}

// 历史查询列表
export interface GetPageQuestionParams {
  pageNum: number
  pageSize: number
}

export interface QuestionRecord {
  id: number
  luserid: string
  question: string
  generatedSql: string
  tableData: string
  message: string
  chartData: string
  createTime: string
  number?: number
}

export interface GetPageQuestionResult {
  list: QuestionRecord[]
  total: number
  pageNum: number
  pageSize: number
  totalPages: number
}

export function getPageQuestion(params: GetPageQuestionParams) {
  return post<GetPageQuestionResult>('/qwRag/getPageQuestion', params)
}

// 删除问题记录
export function deleteQuestionById(id: string) {
  return del(`/qwRag/deleteQeustionById/${id}`)
}

// 置顶问题记录
export function topQuestion(id: string) {
  return put(`/qwRag/topQuestion/${id}`)
}
// 取消置顶问题记录 
export function cancelTop(id: string) {
  return put(`/qwRag/cancelTop/${id}`)
}
