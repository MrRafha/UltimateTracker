FROM python:3.12-slim

WORKDIR /app

# Instala dependências primeiro (cache de layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código
COPY . .

# Railway injeta PORT automaticamente; fallback para 8000
EXPOSE 8000

# Roda migrations automáticas e sobe o servidor
CMD alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
