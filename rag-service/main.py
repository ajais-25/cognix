from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
import tempfile
import os
from rag import ingest_document, answer_query

app = FastAPI(title="Cognix RAG Service")

class ChatRequest(BaseModel):
    query: str
    session_id: str

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), session_id: str = Form(...)):
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Create a temporary file to save the uploaded PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        # Process the PDF and load into Qdrant
        result = ingest_document(tmp_file_path, session_id)
        
        # Clean up
        os.unlink(tmp_file_path)
        
        return {"status": "success", "message": "Document ingested successfully", "details": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        response_stream = answer_query(request.query, request.session_id)
        return StreamingResponse(response_stream, media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to answer query: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
