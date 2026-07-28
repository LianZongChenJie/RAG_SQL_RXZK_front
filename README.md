# 项目说明
  睿信中科，项目周期 2月
  项目开始时间：
  项目参与人：李强，王茂瑞；
  20260622 首次交流
  


# SQL RAG 智能问答系统

基于 **Vue 3 + TypeScript + Element Plus + ECharts** 构建的 SQL RAG（检索增强生成）智能问答前端应用，面向**学生就业数据分析**场景。

## 功能特性

- **数据源管理** — 从后端加载数据集列表（客观数据集 & 调研数据集），支持搜索与切换
- **快速导航** — 根据所选数据集类型，展示可折叠的多级导航菜单，支持预定义指标/维度快捷查询
- **千问智能体对话** — 通过 SSE（Server-Sent Events）流式接口与阿里通义千问交互，支持：
  - 逐字打字机效果输出文本回复
  - 实时渲染 ECharts 图表
  - 动态展示表格数据（支持单表/多表）
  - 显示生成的 SQL 语句及查询进度
- **问答历史管理** — 自动保存对话记录，支持按时间分组、置顶、删除及回看

## 技术栈

| 技术            | 说明                 |
| --------------- | -------------------- |
| Vue 3           | Composition API      |
| TypeScript      | 类型安全             |
| Vite            | 构建工具             |
| Element Plus    | UI 组件库            |
| ECharts         | 图表渲染             |
| Axios           | HTTP 客户端          |
| Vue Router      | 前端路由             |

## 项目结构

```
src/
├── main.ts                   # 应用入口
├── App.vue                   # 根组件
├── api/                      # API 请求层
│   ├── sqlRag.ts             # SQL RAG 相关接口
│   ├── stream.ts             # SSE 流式对话实现
│   └── sourceApi/            # 数据源 API
├── components/               # 业务组件
│   ├── ChatPanel.vue         # 主对话面板
│   ├── DataSourceSelect.vue  # 数据源选择器
│   ├── DynamicTable.vue      # 动态表格渲染
│   ├── EChartsRenderer.vue   # 图表渲染
│   ├── LeftMenu.vue          # 左侧菜单容器
│   ├── QuestionHistory.vue   # 历史记录面板
│   ├── QuickAccess.vue       # 客观数据快速导航
│   └── ResearchQuickAccess.vue # 调研数据快速导航
├── router/                   # 路由配置
├── utils/                    # 工具函数
│   ├── http.ts               # 通用 HTTP 封装
│   ├── http_source.ts        # 数据源 HTTP 封装
│   └── icons.ts              # 图标映射
└── views/
    └── Home.vue              # 主页（三栏布局）
```

## 环境要求

- Node.js ^20.19.0 或 >=22.12.0
- npm（随 Node.js 一同安装）

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 环境变量

| 变量名                 | 说明           | 默认值                        |
| ---------------------- | -------------- | ----------------------------- |
| `VITE_API_BASE_URL`    | RAG 后端 API   | `http://localhost:9091`       |
| `VITE_DATA_ANALYZE_URL`| 数据源 API     | `http://dataanalyze.wnsse.cn` |

开发环境配置见 `.env.development`，生产环境配置见 `.env.production`。

## 代理配置

开发模式下通过 Vite 代理转发请求：

- `/api` → RAG 后端 (`VITE_API_BASE_URL`)
- `/rest/v1` → 数据源分析 API (`VITE_DATA_ANALYZE_URL`)
