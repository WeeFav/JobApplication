import functions_framework
import requests
import traceback

@functions_framework.http
def main(request):
    try:
        response = requests.post(
            "http://10.128.0.3:8080/daily-scrape",
            json={
                "numJobs": 10,
                "jobsite": "linkedin"
            },
            headers={
                "Content-Type": "application/json"
            },
        )

        return "Success", 200

    except Exception as e:
        full_trace = traceback.format_exc()
        return {"status": "error", "message": str(e), "traceback": full_trace}, 500
