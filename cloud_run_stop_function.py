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

# Vertex AI
ENDPOINT = f"projects/{PROJECT_ID}/locations/{REGION}/indexEndpoints/2236725509268439040"
DEPLOYED_INDEX = "jobapplication_deployed_index"
# ------------------------------------------------

@functions_framework.http
def main(request):
    try:
        stop_compute_engine(PROJECT_ID, ZONE, VM_NAME)

        stop_cloud_sql(PROJECT_ID, SQL_INSTANCE)

        undeploy_index()
        
        return "VM, Cloud SQL, and Vector Index successfully stopped."

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

def undeploy_index():
    aiplatform.init(project=PROJECT_ID, location=REGION)

    endpoint = aiplatform.MatchingEngineIndexEndpoint(index_endpoint_name=ENDPOINT)

    # Optional: undeploy deployed indexes first
    if endpoint.deployed_indexes:
        for d in endpoint.deployed_indexes:
            print(f"Undeploying index: {d.id}")
            endpoint.undeploy_index(d.id).wait()