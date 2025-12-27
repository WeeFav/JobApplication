import functions_framework
import google.auth
from google.cloud import compute_v1
from googleapiclient import discovery
from google.cloud import aiplatform
import traceback

# -------------------- CONFIG --------------------
PROJECT_ID = "project-5ada955d-c99f-4efe-861"
REGION = "us-central1"

# Compute Engine
ZONE = "us-central1-c"
VM_NAME = "main-instance"

# Cloud SQL
SQL_INSTANCE = "main-db"
SQL_PROJECT = PROJECT_ID

# ------------------------------------------------

@functions_framework.http
def main(request):
    try:
        stop_compute_engine(PROJECT_ID, ZONE, VM_NAME)

        stop_cloud_sql(PROJECT_ID, SQL_INSTANCE)
        
        return "VM, Cloud SQL successfully stopped."

    except Exception as e:
        full_trace = traceback.format_exc()
        return {"status": "error", "message": str(e), "traceback": full_trace}, 500

def stop_compute_engine(project, zone, instance):
    client = compute_v1.InstancesClient()
    request = compute_v1.StopInstanceRequest(
        project=project,
        zone=zone,
        instance=instance,
    )
    operation = client.stop(request=request)
    operation.result()  # wait
    print(f"Stopped Compute Engine VM: {instance}")

def stop_cloud_sql(project, instance):
    service = discovery.build('sqladmin', 'v1beta4')
    request = service.instances().patch(
        project=project,
        instance=instance,
        body={"settings": {"activationPolicy": "NEVER"}}
    )
    response = request.execute()
    print(f"Cloud SQL instance '{instance}' deactivated/stopped.")