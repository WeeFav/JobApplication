FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    fluxbox \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt
RUN playwright install chrome

COPY . .

ENV PYTHONUNBUFFERED=1
ENV DISPLAY=172.21.224.1:0.0
ENV DISPLAY=:99

CMD ["watchfiles", "--filter", "python", "python /app/main.py", "/app"]