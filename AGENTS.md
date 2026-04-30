# AGENTS.md

## 快速开始

```bash
# 后端
cd backend
cp .env.example .env        # 编辑 KEY
pip install -r requirements.txt
rm -f data/knowledge.db      # schema 变更时需删除重建
uvicorn app.main:app --reload

# 前端
cd frontend
npm install
npm run dev                  # 代理 /api → localhost:8000

# Docker
docker compose up -d
```

## Python 3.8 兼容

- 系统 sqlite3 = 3.31，ChromaDB 要求 ≥ 3.35。
- `backend/app/__init__.py` 用 `pysqlite3-binary` 覆写 `sqlite3` 模块。
- 任何 import chromadb 之前必须执行此覆写。

## .env 加载

- `config.py` 通过绝对路径查找：`backend/.env` → 回退项目根目录。
- 运行目录不影响 .env 查找。

## 后端

- API 入口：`backend/app/main.py`
- 文档上传使用 FastAPI `BackgroundTasks` 异步索引，不阻塞响应。
- 创建知识库时 `provider` 可选，为空默认 `"openai"`。
- 每个知识库可独立配置 `api_key` / `base_url` / `llm_model` / `embedding_model`。
- 不填继承 `.env` 全局值。
- **索引时必须将 `chunk.id`（DB 主键）写入 ChromaDB 元数据**，否则向量检索和关键词检索的 chunk_id 不匹配，RRF 融合会错乱。详见 `indexing_service.py` 的 `split_doc.metadata["chunk_id"] = cr.id` 部分。
- **检索结果必须查询 Document 表填充 filename**。ChromaDB 不存储文件名，`retrieval_service.py` 中 `_vector_search` 需通过 `document_id` 回查 DB。

### 测试

```bash
cd backend
rm -f data/knowledge.db && python test_api.py
```

## 前端

- React 18 + Vite + TypeScript + Ant Design 5
- API 封装在 `src/api/`（axios 拦截器处理 FastAPI 422 detail 数组）
- Zustand 全局状态在 `src/store/`
- 上传用原生 `<input type="file">`，**不要用 Ant Design Upload**（beforeUpload 的 RcFile 无 originFileObj 取不到文件）

### 构建

```bash
cd frontend
npx tsc --noEmit            # 类型检查
npx vite build              # 生产构建
```

## Playwright 测试注意事项

- **不要混用 curl API 调用和 UI 断言**，避免历史数据干扰。
- 测试上传流时：click "选择文件" → upload 文件 → click "上 传" → 断言表格中出现文档。
- 浏览器会话结束后 `.playwright-cli/` 应清理，已加入 `.gitignore`。
- **Playwright 测试前先删数据库 `backend/data/`**，确保无残留数据。

## 项目结构

```
rag_kb/
├── backend/app/        # FastAPI 后端
│   ├── models/         # SQLAlchemy ORM
│   ├── schemas/        # Pydantic 请求响应
│   ├── services/       # 业务逻辑
│   ├── api/            # REST 路由
│   └── tasks/          # BackgroundTasks
├── frontend/src/       # React 前端
│   ├── api/            # axios 封装
│   ├── components/     # 公共组件
│   ├── pages/          # 页面
│   └── store/          # zustand
└── docker-compose.yml  # 前后端编排
```
