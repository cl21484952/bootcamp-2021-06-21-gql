# About

This project is to demonstrate the power of GraphQL using AWS DynamoDB + AWS Lambda + AWS API Gateway

# Setup

Assumes docker is used

```
docker run --rm -it -w "/workdir" -v "$(pwd):/workdir" node:14 bash

# Once inside docker
yarn install

# Setup AWS Credentials
# https://www.serverless.com/framework/docs/providers/aws/cli-reference/config-credentials/
npx sls config credentials --provider aws --key <YOUR_API_KEY> --secret <YOUR_SECRET_KEY>
npx sls deploy
```

Then open the URL shown
