# My RAG Knowledge Base

基于 FastAPI + ChromaDB 的个人知识库问答系统，支持多格式文档导入、混合检索、RAG 智能问答。

## 技术栈

| 层级 | 选型 |
|------|------|
| 后端 | FastAPI, SQLAlchemy, SQLite |
| 向量库 | ChromaDB（增量索引、元数据过滤） |
| 文档解析 | Docling + pypdf / python-docx / python-pptx |
| 检索 | BM25 关键词 + 向量语义 + RRF 融合 |
| LLM | OpenAI 兼容 API / Ollama（本地） |

## 功能特性

- **多格式文档**: PDF / DOCX / PPTX / Markdown / TXT / HTML / 图片
- **增量索引**: 新增文档自动索引，删除文档同步清理向量
- **混合检索**: BM25 关键词 + ChromaDB 向量 + RRF 排序融合
- **RAG 问答**: 带来源引用的 LLM 问答，支持多轮对话
- **知识库分类**: 多个知识库独立管理，可配置不同模型
- **REST API**: 完整 CRUD + 搜索 + 问答接口
- **双模 LLM**: 同时支持云端 API 和本地 Ollama

## 快速开始

### 1. 配置

```bash
cp .env.example .env
# 编辑 .env 填入 API Key 和模型
```

### 2. 安装

```bash
cd backend
pip install -r requirements.txt
```

### 3. 启动

```bash
uvicorn app.main:app --reload
```

访问 http://localhost:8000/docs 查看交互式 API 文档。

### 4. 使用

```bash
# 创建知识库
curl -X POST http://localhost:8000/api/v1/collections \
  -H "Content-Type: application/json" \
  -d '{"name":"技术文档"}'

# 上传文档
curl -X POST http://localhost:8000/api/v1/collections/{id}/documents \
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
│   │   └── tasks/                # 后台任务
│   ├── data/                     # 运行时数据
│   │   ├── uploads/              # 上传文件
│   │   ├── chroma/               # ChromaDB 持久化
│   │   └── knowledge.db          # SQLite 元数据
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                     # (待开发)
├── docker-compose.yml
├── .env.example
└── README.md
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/collections` | 创建知识库 |
| `GET` | `/api/v1/collections` | 知识库列表 |
| `DELETE` | `/api/v1/collections/{id}` | 删除知识库 |
| `POST` | `/api/v1/documents/upload/{id}` | 上传文档 |
| `GET` | `/api/v1/documents` | 文档列表 |
| `DELETE` | `/api/v1/documents/{id}` | 删除文档 |
| `POST` | `/api/v1/search` | 搜索 |
| `POST` | `/api/v1/chat` | 问答 |
| `GET` | `/api/v1/chat/conversations` | 对话列表 |

## Docker 部署

```bash
docker compose up -d
```
