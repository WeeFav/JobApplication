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

# Vertex AI Vector Search
VECTOR_INDEX = f"projects/{PROJECT_ID}/locations/{REGION}/indexes/6052074838116270080"
ENDPOINT = f"projects/{PROJECT_ID}/locations/{REGION}/indexEndpoints/2236725509268439040"
DEPLOYED_INDEX = "jobapplication_deployed_index"
MACHINE_TYPE = "e2-standard-2"
MIN_REPLICA_COUNT = 1
MAX_REPLICA_COUNT = 1
# ---------------------------------------

@functions_framework.http
def main(request):
    try:
        # START COMPUTE ENGINE VM
        start_compute_instance(PROJECT_ID, ZONE, VM_NAME)

        # START CLOUD SQL INSTANCE
        start_cloud_sql_instance(SQL_PROJECT, SQL_INSTANCE)

        # DEPLOY VECTOR SEARCH INDEX
        deploy_vector_index()

        return "VM, Cloud SQL, and Vector Index successfully started."

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

# DEPLOY VERTEX AI VECTOR SEARCH INDEX
def deploy_vector_index():
    aiplatform.init(project=PROJECT_ID, location=REGION)

    # Use existing endpoint or create new one
    if ENDPOINT:
        endpoint = aiplatform.MatchingEngineIndexEndpoint(index_endpoint_name=ENDPOINT)
    else:
        endpoint = aiplatform.MatchingEngineIndexEndpoint.create(
            display_name="vector-endpoint",
            public_endpoint_enabled=True
        )

    # Deploy index
    index = aiplatform.MatchingEngineIndex(index_name=VECTOR_INDEX)
    endpoint.deploy_index(
        index=index,
        deployed_index_id=DEPLOYED_INDEX,
        machine_type=MACHINE_TYPE,
        min_replica_count=MIN_REPLICA_COUNT,
        max_replica_count=MAX_REPLICA_COUNT,
    )

    print(f"Vector index deployed to endpoint: {endpoint.resource_name}")