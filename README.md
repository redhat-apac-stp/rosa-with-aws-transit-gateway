# ROSA with AWS Transit Gateway

This article describes how to implement a ROSA STS cluster with Private Link enabled and leverage a centralised Egress VPC (for routing to the Internet) and Bastion VPC (for remote administration). The architecture of the solution is depicted in the following diagram.

<img src="https://github.com/redhat-apac-stp/rosa-with-aws-transit-gateway/blob/main/ROSA%20-%20AWS%20Transit%20Gateway.png">

Most of the installation of this architecture will be driven via the AWS CDK followed by the ROSA CLI to install the cluster. AWS CDK generates CloudFormation templates based on a set of AWS resources defined using the TypeScript programming language. These templates are then deployed or destroyed as a single unit (referred to as a stack) and can also be updated based on a delta. 

Setup the environment by following these steps:

1. Clone this repository to your local machine and change directory
	
	git clone git@github.com:redhat-apac-stp/rosa-with-aws-transit-gateway.git
	
	cd rosa-with-aws-transit-gateway
	
3. Install a recent version of nodejs (e.g., v14.18 was used)
4. Update npm and install dependencies in the directory of the repository

	sudo npm install -g npm

	npm install

6. Install the latest AWS CLI as per https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html 
7. Configure your AWS profile and test authentication using an AWS STS Security Token
	
	aws sts get-caller-identity
	
9. Install the latest AWS CDK

	sudo npm install -g aws-cdk
	
10. Install the latest ROSA CLI from https://github.com/openshift/rosa/
11. Install the latest OC CLI from https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/
12. Create a SSH key pair in the AWS console which will be used later for connecting to the bastion host and store this key securely (chmod 400) on your local machine. Also define a custom environment variable to point to the name of the key (e.g., bastion-rsa-key)

	BASTION_KEY=bastion-rsa-key

10. Define the following CDK environment variables

	CDK_DEFAULT_ACCOUNT=ap-southeast-1
	
	CDK_DEFAULT_REGION=XXXXXXXXXXXX

11. Build, dry-run and deploy the stack

	npm run build
	
	cdk synth
	
	cdk deploy

12. Confirm login to the bastion host (it will take a little while to launch)

	ssh -i "/path/to/bastion-rsa-key.pem" ec2-user@ip-address-of-ec2-instance

13. Logout and install a multi-AZ ROSA STS cluster with Private Link enabled using the ROSA VPC CIDR block and subnets as reported in the EC2 Global View. 

	rosa create account-roles -y
	
	rosa create cluster --sts
	
	rosa create operator-roles -c foobar --mode auto -y
	
	rosa create oidc-provider -c foobar --mode auto -y
	
14. After the cluster is ready (rosa describe cluster -c foobar) create an administrative account and wait for a few minutes for it to become ready

	rosa create admin -c foobar
	
15. In the AWS console add the Bastion VPC to the private hosted zone in Route 53 that was created by the installation process. For this setup the hosted zone to be modified is foobar.c63c.p1.openshiftapps.com
	
16. Setup SSH tunneling to enable access to both the API endpoint and OpenShift web console

	sudo vi /etc/hosts
	
	127.0.0.1   api.foobar.c63c.p1.openshiftapps.com

	127.0.0.1   console-openshift-console.apps.foobar.c63c.p1.openshiftapps.com
	
	127.0.0.1   oauth-openshift.apps.foobar.c63c.p1.openshiftapps.com

	sudo ssh -i "bastion-rsa-key.pem" ec2-user@ec2-13-212-240-215.ap-southeast-1.compute.amazonaws.com -L 6443:api.foobar.c63c.p1.openshiftapps.com:6443 -L 443:console-openshift-console.apps.foobar.c63c.p1.openshiftapps.com:443
	
17. Connect to API endpoint from another window

	oc login https://api.foobar.c63c.p1.openshiftapps.com:6443 --username cluster-admin --password fkBAq-hPXIN-7EshB-9nLGP

18. Connect to the OpenShift web console from a browser

	xdg-open https://console-openshift-console.apps.foobar.c63c.p1.openshiftapps.com
	sudo ssh 



 


