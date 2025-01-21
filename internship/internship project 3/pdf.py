import json
import base64
import boto3
from datetime import datetime

def lambda_handler(event, context):
    # Get the base64-encoded file data and the file name from the event
    file_data = event.get('file_data')
    file_name = event.get('file_name')
    bucket_name = 'my-documents-bucket'  # Replace with your S3 bucket name
    
    # Validate input data
    if not file_data or not file_name:
        return {
            'statusCode': 400,
            'body': json.dumps('Both file_data and file_name are required.')
        }
    
    try:
        # Decode the base64 file data
        file_bytes = base64.b64decode(file_data)
        
        # Prepare the file to be uploaded
        s3 = boto3.client('s3')
        
        # Generate a unique key for the file (optional: you can use a timestamp or UUID)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        s3_key = f"{timestamp}_{file_name}"
        
        # Upload the file to S3
        s3.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=file_bytes,
            ContentType="application/pdf"  # Change this if the file type is different
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'File uploaded successfully!', 'file_key': s3_key})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error uploading file: {str(e)}')
        }
