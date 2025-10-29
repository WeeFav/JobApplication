FROM python:3.10

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt
RUN playwright install chrome

COPY . .

ENV PYTHONUNBUFFERED=1
ENV DISPLAY=172.21.224.1:0.0 

CMD ["watchfiles", "python /app/main.py", "/app"]