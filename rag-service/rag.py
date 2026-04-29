import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_qdrant import QdrantVectorStore
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from dotenv import load_dotenv

load_dotenv()

# We can use an in-memory Qdrant client for simplicity, 
# or connect to a local/remote instance.
qdrant_client = QdrantClient(":memory:") 
# qdrant_client = QdrantClient("http://localhost:6333")

embeddings = OpenAIEmbeddings()

# Set up collection if it doesn't exist (only needed if persistent)
collection_name = "cognix_documents"
if not qdrant_client.collection_exists(collection_name):
    qdrant_client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
    )

vector_store = QdrantVectorStore(
    client=qdrant_client,
    collection_name=collection_name,
    embedding=embeddings,
)

def ingest_document(file_path: str, session_id: str):
    """
    Loads a PDF, splits it into chunks, and stores them in Qdrant 
    with the session_id as metadata.
    """
    loader = PyPDFLoader(file_path)
    docs = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)

    # Add session_id to metadata so we can filter later
    for split in splits:
        split.metadata["session_id"] = session_id
        
    vector_store.add_documents(documents=splits)
    
    return {"chunks_added": len(splits)}

def answer_query(query: str, session_id: str):
    """
    Retrieves relevant chunks for the given session_id and generates an answer.
    """
    # Create a retriever that filters by session_id
    retriever = vector_store.as_retriever(
        search_kwargs={
            "filter": {
                "must": [
                    {
                        "key": "metadata.session_id",
                        "match": {"value": session_id}
                    }
                ]
            }
        }
    )

    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)

    template = """Answer the question based only on the following context:

{context}

Question: {question}
"""
    prompt = ChatPromptTemplate.from_template(template)

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    # Return a generator that yields chunks
    return rag_chain.stream(query)
