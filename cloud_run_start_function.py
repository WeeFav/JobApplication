import functions_framework
import google.auth
from google.cloud import compute_v1
from googleapiclient import discovery
from google.cloud import aiplatform
import traceback

# -------------- requirements.txt -----------------
# functions-framework==3.*
# google-auth
# google-cloud-compute
# google-api-python-client
# google-cloud-aiplatform

# -------------- CONFIG -----------------
PROJECT_ID = "project-5ada955d-c99f-4efe-861"
REGION = "us-central1"

# Compute Engine
ZONE = "us-central1-c"
VM_NAME = "main-instance"

# Cloud SQL
SQL_INSTANCE = "main-db"
SQL_PROJECT = PROJECT_ID

# ---------------------------------------

@functions_framework.http
def main(request):
    try:
        # START COMPUTE ENGINE VM
        start_compute_instance(PROJECT_ID, ZONE, VM_NAME)

        # START CLOUD SQL INSTANCE
        start_cloud_sql_instance(SQL_PROJECT, SQL_INSTANCE)

        return "VM, Cloud SQL successfully started."

    except Exception as e:
        full_trace = traceback.format_exc()
        return {"status": "error", "message": str(e), "traceback": full_trace}, 500

# START COMPUTE ENGINE VM
def start_compute_instance(project, zone, instance):
    client = compute_v1.InstancesClient()
    request = compute_v1.StartInstanceRequest(
        project=project,
        zone=zone,
        instance=instance,
    )
    operation = client.start(request=request)

    operation.result()  # wait
    print(f"Compute Engine VM '{instance}' started.")

# START CLOUD SQL INSTANCE
def start_cloud_sql_instance(project, instance):
    service = discovery.build('sqladmin', 'v1beta4')
    request = service.instances().patch(
        project=project,
        instance=instance,
        body={"settings": {"activationPolicy": "ALWAYS"}}
    )
    response = request.execute()
    print(f"Cloud SQL instance '{instance}' started/activated.")