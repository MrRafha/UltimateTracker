FROM python:3.12-slim

WORKDIR /app

# Instala dependências primeiro (cache de layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código
COPY . .

CMD ["python", "main.py"]
