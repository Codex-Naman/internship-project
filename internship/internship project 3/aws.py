import json

def lambda_handler(event, context):
    # Get the numbers from the event (expecting 'num1' and 'num2')
    num1 = event.get('num1')
    num2 = event.get('num2')
    
    # Check if both numbers are provided
    if num1 is None or num2 is None:
        return {
            'statusCode': 400,
            'body': json.dumps('Both num1 and num2 are required.')
        }
    
    # Perform the addition
    result = num1 + num2
    
    # Return the result as a JSON response
    return {
        'statusCode': 200,
        'body': json.dumps({'result': result})
    }
