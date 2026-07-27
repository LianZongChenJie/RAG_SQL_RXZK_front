import { get } from "@/utils/http_source";

// 数据集列表响应中的单个项目
export interface DataSetItemResponse {
  lId?: string;
  strName: string;
  nType: number;
  strDbName: string;
  strTableName: string;
  lQuestionnaireId?: string;
  lSnapshotId?: string;
  lRespondentId?: string;
  lOrgId?: string;
  icon?: string;
  strTitleList?: string;
  strOptionList?: string;
  // 统一id: nType=1时为nType+lId，否则为nType+lQuestionnaireId
  id: string;
}
// 单个导航栏菜单结构
export interface MetricMenuItem {
  lId?: string;
  strCode?: string;
  strName?: string;
  strPcode?: string;
  lPid?: string;
  nSort?: number;
  nIsSpecial?: number;
  strDesc?: string;
  nDecimalPlace?: number;
  strOutType?: string;
  children?: MetricMenuItem[];
  sqlStr?: string;
  // 调研数据专用字段
  strFullTableName?: string;
  strAnswerColumn?: string;
  strType?: string;
  lSnapshotId?: string;
  lRespondentId?: string;
  lOrgId?: string;
  // 调研组合题/五维题的标题和选项列表（数组类型）
  strTitleList?: string[];
  strOptionList?: string[];
}

// 数据集列表响应结构
export interface DataSetListResponse<T = any> {
  return: {
    nCode: number;
    strText: string;
    strInfo: string;
  };
  response: {
    cdoList: T;
    lOrgId?: string;
  };
}

// 根据组织ID获取数据集列表
export function getDataSetList() {
  return get<DataSetListResponse<DataSetItemResponse[]>>(
    "/sqlrag/getDataSetList",
  ).then((res) => {
    if (res.response?.cdoList) {
      res.response.cdoList = res.response.cdoList.map((item) => ({
        ...item,
        nType: item.nType && Number(item.nType) === 1 ? 1 : 2,
        id: `${item.nType}_${item.nType === 1 ? item.lId : item.lQuestionnaireId || item.lId}`,
      }));
    }
    return res;
  });
}
/**
 * 获取下方导航栏的菜单
 * 客观数据
 * @returns
 */
export function getMetricMenu() {
  return get<DataSetListResponse<MetricMenuItem[]>>(
    "/sqlrag/getMetricMenu",
  );
}

/**
 * 获取下方导航栏的菜单
 * 调研数据
 * @returns
 */
export interface ResearchMenuParams {
  lQuestionnaireId: string | number;
  strTableName: string;
}

export function getResearchMenu(params: ResearchMenuParams) {
  return get<DataSetListResponse<MetricMenuItem[]>>(
    "/sqlrag/getResearchMetricMenu",
    params,
  );
}
