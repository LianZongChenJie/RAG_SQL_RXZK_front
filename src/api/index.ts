import { get } from '../utils/http';
export interface ChatParams {
  tableName?: string
  message: string
  messageDesc?: string
  lId?: string
  code?: string
  sqlStr?: string
  dbName?: string
  dbType?: number
  lQuestionnaireId?: string
  strAnswerColumn?: string
  strType?: string
  strName?: string
  strDesc?: string
  outType?: string
  snapshotId?: string
  lRespondentId?: string
  lOrgId?: string;
  strTitleList?: string[];
  strOptionList?: string[];

}

import { chatWithQwenStream } from './stream'
export type { ChatStreamCallbacks } from './stream'
export { chatWithQwenStream }

// 原接口
export function starem(params: ChatParams) {
  return get('/qwRag/starem', params)
}
