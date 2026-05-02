# My RAG Knowledge Base

基于 FastAPI + ChromaDB 的个人知识库问答系统，支持多格式文档导入、混合检索、RAG 智能问答。

## 技术栈

| 层级 | 选型 |
|------|------|
| 后端 | FastAPI, SQLAlchemy, SQLite |
| 向量库 | ChromaDB（增量索引、元数据过滤） |
| 文档解析 | Docling + pypdf / python-docx / python-pptx |
| 图片 OCR | EasyOCR（可选，按知识库开关） |
| 检索 | BM25 关键词 + 向量语义 + RRF 融合 |
| LLM | OpenAI 兼容 API / Ollama（本地） |
| Embedding | 支持与 LLM 不同供应商，独立配置 provider/key/url |

## 功能特性

- **多格式文档**: PDF / DOCX / PPTX / Markdown / TXT / HTML / 图片
- **增量索引**: 新增文档自动索引，删除文档同步清理向量
- **混合检索**: BM25 关键词 + ChromaDB 向量 + RRF 排序融合
- **RAG 问答**: 带来源引用的 LLM 问答，支持多轮对话，结果高亮
- **知识库分类**: 多个知识库独立管理，可配置不同模型和供应商
- **REST API**: 完整 CRUD + 搜索 + 问答接口
- **LLM & Embedding 解耦**: LLM 和 Embedding 可使用不同供应商和 API Key
- **Debug 模式**: `DEBUG=true` 环境变量开启性能计时日志
- **E2E 测试**: Playwright 自动化测试框架（13 用例）
- **文档来源跳转**: 问答回复中的来源可点击跳转到文档页并高亮定位
- **安全防护**: SSRF 拦截（内网地址黑名单）+ 文件类型白名单 + 大小限制

## 快速开始

### 1. 配置

```bash
cp .env.example backend/.env
# 编辑 backend/.env 填入 API Key 和模型
```

> `.env` 文件位于 `backend/` 目录下。`config.py` 会自动从 `backend/.env` 加载，
> 若不存在则尝试从项目根目录加载。Docker 部署时由 Compose 注入环境变量。

### .env 参考

```ini
# LLM 配置
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Embedding 配置（留空继承 LLM 的 OPENAI_API_KEY / OPENAI_BASE_URL）
EMBEDDING_MODEL=text-embedding-3-small
# EMBEDDING_API_KEY=sk-xxx
# EMBEDDING_BASE_URL=https://api.openai.com/v1

# 文档分块
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
TOP_K=5
```

### 2. 安装

```bash
cd backend
pip install -r requirements.txt
```

### 3. 启动

**后端：**
```bash
cd backend
uvicorn app.main:app --reload
# API 文档: http://localhost:8000/docs
```

**后端（Debug 模式，输出性能日志）：**
```bash
cd backend
DEBUG=true uvicorn app.main:app --reload --log-level debug
```

**前端（开发模式）：**
```bash
cd frontend
npm install
npm run dev
# 访问: http://localhost:3000
```

**或使用 Docker 一键启动：**
```bash
docker compose up -d
# 前端: http://localhost:3000
# API: http://localhost:8000/docs
```

### 4. 使用

```bash
# 创建知识库（不指定模型则使用 .env 默认值）
curl -X POST http://localhost:8000/api/v1/collections \
  -H "Content-Type: application/json" \
  -d '{"name":"技术文档"}'

# LLM 和 Embedding 使用同一供应商
curl -X POST http://localhost:8000/api/v1/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name":"中文知识库",
    "provider":"openai",
    "api_key":"your-zhipu-api-key",
    "base_url":"https://open.bigmodel.cn/api/paas/v4",
    "llm_model":"glm-4.7-flash",
    "embedding_model":"embedding-3"
  }'

# LLM 用云端 API，Embedding 用本地 Ollama（不同供应商）
curl -X POST http://localhost:8000/api/v1/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name":"混合供应商库",
    "provider":"openai",
    "api_key":"sk-openai",
    "llm_model":"gpt-4o-mini",
    "embedding_provider":"ollama",
    "embedding_model":"bge-m3"
  }'

# 上传文档
curl -X POST http://localhost:8000/api/v1/documents/upload/1 \
  -F "file=@doc.pdf"

# 搜索
curl -X POST http://localhost:8000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query":"什么是RAG","collection_id":1}'

# 问答
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"什么是RAG","collection_id":1}'
```

> `.env` 中的配置是全局默认值。新建知识库时，`llm_model` / `embedding_model` 留空自动继承 `.env` 对应值。`embedding_provider` / `embedding_api_key` / `embedding_base_url` 留空时继承链为：**用户填写 → `.env` Embedding 专属 → `.env` LLM 配置**。例如 embedding_api_key 的优先级：`collection.embedding_api_key > EMBEDDING_API_KEY > collection.api_key > OPENAI_API_KEY`。

## 项目结构

```
rag_kb/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py             # 配置管理
│   │   ├── models/               # SQLAlchemy 数据模型
│   │   ├── schemas/              # Pydantic 请求/响应模型
│   │   ├── services/             # 业务逻辑层
│   │   │   ├── parser_service.py    # 文档解析
│   │   │   ├── splitter_service.py  # 文本分块
│   │   │   ├── indexing_service.py  # 向量索引
│   │   │   ├── retrieval_service.py # 混合检索
│   │   │   ├── qa_service.py        # RAG 问答
│   │   │   └── llm_service.py       # LLM 工厂
│   │   ├── api/                  # REST API 路由
│   │   ├── tasks/                # 后台任务（BackgroundTasks）
│   │   └── utils/                # 工具
│   │       ├── logging_config.py # Debug 日志 + 性能计时装饰器
│   │       └── url_validator.py  # SSRF 防护（base_url 校验）
│   ├── data/                     # 运行时数据
│   │   ├── uploads/              # 上传文件
│   │   ├── chroma/               # ChromaDB 持久化
│   │   └── knowledge.db          # SQLite 元数据
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                     # React + Ant Design 5 前端
│   ├── src/
│   │   ├── pages/                # 页面 (Chat/Document/Collection)
│   │   ├── components/           # 公共组件
│   │   ├── api/                  # API 调用封装
│   │   ├── store/                # zustand 状态管理
│   │   └── types/                # TypeScript 类型定义
│   ├── tests/                    # Playwright E2E 测试
│   │   ├── fixtures.ts           # 共享 fixture + 测试文件准备
│   │   ├── knowledge-base.spec.ts
│   │   ├── document-upload.spec.ts
│   │   └── chat-search.spec.ts
│   ├── playwright.config.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/collections` | 创建知识库（可指定 api_key/base_url/provider/model） |
| `GET` | `/api/v1/collections` | 知识库列表 |
| `GET` | `/api/v1/collections/{id}` | 知识库详情 |
| `PUT` | `/api/v1/collections/{id}` | 更新知识库配置 |
| `DELETE` | `/api/v1/collections/{id}` | 删除知识库（级联删除文档和向量） |
| `GET` | `/api/v1/collections/{id}/stats` | 知识库统计 |
| `POST` | `/api/v1/documents/upload/{collection_id}` | 上传文档 |
| `GET` | `/api/v1/documents` | 文档列表（支持 collection_id 筛选） |
| `GET` | `/api/v1/documents/{id}` | 文档详情 |
| `PUT` | `/api/v1/documents/{id}` | 更新文档标签 |
| `DELETE` | `/api/v1/documents/{id}` | 删除文档（同步清理向量） |
| `POST` | `/api/v1/documents/{id}/reindex` | 重新索引文档 |
| `GET` | `/api/v1/documents/{id}/download` | 下载文档原文 |
| `GET` | `/api/v1/documents/{id}/content` | 获取文档纯文本内容 |
| `GET` | `/api/v1/documents/{id}/chunks` | 查看文档分块 |
| `POST` | `/api/v1/search` | 混合搜索（支持 hybrid / vector / keyword） |
| `POST` | `/api/v1/chat` | RAG 问答（支持多轮对话） |
| `GET` | `/api/v1/chat/conversations` | 对话列表 |
| `GET` | `/api/v1/chat/conversations/{id}` | 对话详情 |
| `DELETE` | `/api/v1/chat/conversations/{id}` | 删除对话 |
| `GET` | `/health` | 健康检查 |

## E2E 测试

```bash
cd frontend
npm run test:e2e                            # 终端运行 13 个用例
npm run test:e2e:ui                         # 可视化 UI 模式
npm run test:e2e:report                     # 查看 HTML 报告（含截图/视频）
```

测试覆盖：知识库 CRUD、文档上传（含非法类型拒绝、重复检测）、搜索验证、对话流程、来源跳转高亮。

### 注意事项

- 测试自动启动后端和前端，后端使用 `rm -f knowledge.db` 每次获得全新数据库。
- **依赖外部 API**：文档索引（embedding）和对话（LLM）需要 `.env` 中的 API Key 可用且响应在超时内。
- **Ant Design 按钮文本**：中文环境下双汉字按钮文本会插入空格（"上 传"），选择器需用类名而非文本匹配。
- 运行前确保端口 8000 和 3000 未被占用，或杀掉旧进程后重试。

## Docker 部署

```bash
# 部署、启动
docker compose up -d
# 重新构建
docker compose build
# 停止服务但保留容器
docker compose stop
# 停止服务并删除容器
docker compose down
# 停止服务并删除容器 + 数据卷（会清空 knowledge.db 和 ChromaDB）
docker compose down -v
```
