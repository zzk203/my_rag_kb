# RAG Knowledge Base

基于 LangChain 的本地知识库问答系统，支持 PDF、Markdown、TXT 等多种文档格式。

## 功能特性

- **多格式文档支持**: PDF、Markdown、TXT、CSV、HTML、DOC/DOCX
- **灵活的文本分块**: 可配置 chunk size 和 overlap
- **多种检索模式**: 相似度检索、MMR 多样性检索、RAG 链式问答
- **持久化向量存储**: 使用 FAISS 本地存储
- **交互式命令行**: 支持交互式问答

## 安装

```bash
cd rag_kb
pip install -r requirements.txt
```

## 配置

复制 `.env.example` 为 `.env` 并配置:

```bash
cp .env.example .env
```

编辑 `.env`:
```
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
```

## 使用

### 1. 索引文档

```bash
python -m main --index --data-dir ./documents
```

### 2. 交互式问答

```bash
python -m main --interactive
```

### 3. 单次查询

```bash
python -m main --query "你的问题"
```

### Python API

```python
from rag_kb import RAGKnowledgeBase

kb = RAGKnowledgeBase(
    data_dir="./documents",
    vector_store_dir="./vector_store"
)

kb.index_documents()

result = kb.query("什么是 RAG？")
print(result["answer"])
```

## 项目结构

```
rag_kb/
├── config.py        # 配置管理
├── loader.py        # 文档加载器
├── vectorstore.py   # 向量存储管理
├── retrieval.py     # 检索和 RAG 链
├── main.py          # 主程序和 CLI
└── .env.example     # 环境变量模板
```

## 检索模式

- **rag**: 使用 LLM 基于检索结果生成答案（推荐）
- **raw**: 直接返回相似文档
- **mmr**: 使用最大边际相关性检索
