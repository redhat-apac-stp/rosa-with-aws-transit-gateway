# ROSA with AWS Transit Gateway

This article describes how to implement a ROSA STS cluster with Private Link enabled and leverage a centralised Egress VPC (for routing to the Internet) and Bastion VPC (for remote administration). The architecture of the solution is depicted in the following diagram.


Most of the installation of this architecture will be driven via the AWS CDK followed by the ROSA CLI to install the cluster. AWS CDK generates CloudFormation templates based on a set of AWS resources defined using the TypeScript programming language. These templates are then deployed or destroyed as a single unit (referred to as a stack) and can also be updated based on a delta. 

Setup the environment by following these steps:

1. Clone this repository to your local machine and change to the target directory
2. Install a recent version of nodejs (e.g., v14.18 was used)
3. Update npm (e.g., sudo npm install -g npm) and install dependencies (e.g., npm install)
4. Install the latest AWS CLI as per https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html 
5. Configure your AWS profile and test authentication using an AWS STS Security Token (e.g., aws sts get-caller-identity) 
6. Install the latest AWS CDK (e.g., sudo npm install -g aws-cdk)
7. Install the latest ROSA CLI from https://github.com/openshift/rosa/
8. Install the latest OC CLI from https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/
9. Create a SSH key pair in the AWS console which will be used later for connecting to the bastion host and store this key securely (chmod 400) on your local machine. Also define a custom environment variable to point to the name of the key (e.g., bastion-rsa-key)

	BASTION_KEY=bastion-rsa-key

10. Define the following CDK environment variables

	CDK_DEFAULT_ACCOUNT=ap-southeast-1
	
	CDK_DEFAULT_REGION=XXXXXXXXXXXX

11. Either use npm run build for a one-time build or npm run watch (from a separate window) for continous builds
12. Perform a dry-run of the stack deployment (e.g., cdk synth) and fix any errors
13. Deploy the stack (e.g., cdk deploy) and review what was created in the AWS console under EC2 Global View
14. Confirm login to the bastion host (it will take a little while to launch)

	ssh -i "/path/to/bastion-rsa-key.pem" ec2-user@ip-address-of-ec2-instance

15. Logout and install a multi-AZ ROSA STS cluster with Private Link enabled using the ROSA VPC CIDR block and subnets as reported in the EC2 Global View. 

	rosa create account-roles -y
	
	rosa create cluster --sts
	
	rosa create operator-roles -c foobar --mode auto -y
	
	rosa create oidc-provider -c foobar --mode auto -y
	
16. After the cluster is ready (rosa describe cluster -c foobar) create an administrative account and wait for a few minutes for it to become ready

	rosa create admin -c foobar
	
17. Setup SSH tunneling to enable access to both the API endpoint and OpenShift web console

	vi /etc/hosts
	
	127.0.0.1   api.foobar.c63c.p1.openshiftapps.com
	127.0.0.1   console-openshift-console.apps.foobar.c63c.p1.openshiftapps.com
	127.0.0.1   oauth-openshift.apps.foobar.c63c.p1.openshiftapps.com





 


