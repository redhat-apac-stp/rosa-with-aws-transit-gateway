# ROSA with AWS Transit Gateway

This article describes how to implement a private ROSA STS cluster and leverage a centralised Egress VPC (for connecting to the Internet to download images and upload telemetry) and a Bastion VPC (for remote administration). The architecture of the solution is depicted in the following diagram.

<img src="https://github.com/redhat-apac-stp/rosa-with-aws-transit-gateway/blob/main/img/ROSA%20-%20AWS%20Transit%20Gateway.png">

The provisioning of VPCs, subnets and a bastion host will be done via the AWS CDK tool. This is then followed by installation of a managed OpenShift cluster via the ROSA CLI.

Setup the environment by following these steps:

1. Clone this repository to your local machine and change to the root directory.
	
	git clone git@github.com:redhat-apac-stp/rosa-with-aws-transit-gateway.git
	
	cd rosa-with-aws-transit-gateway
	
2. Install a recent version of nodejs (v14 or higher).

3. Update npm and install dependencies in the directory of the repository.

	sudo npm install -g npm

	sudo npm install

4. Install the latest AWS CLI as per https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html 

5. Configure your AWS profile and test authentication using an AWS STS Security Token.
	
	aws sts get-caller-identity
	
6. Install the latest AWS CDK.

	sudo npm install -g aws-cdk
	
7. Install the latest ROSA CLI for your platform from https://github.com/openshift/rosa/

8. Install the latest OC CLI for your platform from https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/

9. Create a SSH key pair in the AWS console which will be used later for connecting to the bastion host. Download the pem file to your local machine and change permissions to 400. Define a custom environment variable to point to the name of the key (e.g., bastion-rsa-key).

	BASTION_KEY=bastion-rsa-key

10. Define the following CDK environment variables.

	CDK_DEFAULT_ACCOUNT=XXXXXXXXXXXX
	
	CDK_DEFAULT_REGION=ap-southeast-1

11. Build, dry-run and deploy the stack which will take about 5 minutes to complete.

	npm run build
	
	cdk synth
	
	cdk deploy

12. Confirm login to the bastion host once it is running.

	ssh -i "/path/to/bastion-rsa-key.pem" ec2-user@ip-address-of-ec2-bastion-instance

13. Logout and install a private ROSA STS cluster. Select yes for both multi-AZ and Private Link and use the values displayed in EC2 Global View for the VPC CIDR and subnets. Foobar is an example name - substitute accordingly. 

	rosa create account-roles -y
	
	rosa create cluster --sts
	
	rosa create operator-roles -c foobar --mode auto -y
	
	rosa create oidc-provider -c foobar --mode auto -y
	
14. After the cluster is ready (rosa describe cluster -c foobar) create an administrative account and wait for a few minutes for it to become ready.

	rosa create admin -c foobar
	
15. Add the Bastion VPC to the private hosted zone in Route 53 that was created during the ROSA installation process.
	
16. Modify your local hosts file to support SSH tunnelling of API, authentication and web console routes.

	sudo vi /etc/hosts
	
	127.0.0.1   api.foobar.c63c.p1.openshiftapps.com

	127.0.0.1   console-openshift-console.apps.foobar.c63c.p1.openshiftapps.com
	
	127.0.0.1   oauth-openshift.apps.foobar.c63c.p1.openshiftapps.com

17. Launch an SSH tunnel using sudo to bind to low-numbered ports.

	sudo ssh -i "bastion-rsa-key.pem" ec2-user@ec2-13-212-240-215.ap-southeast-1.compute.amazonaws.com -L 6443:api.foobar.c63c.p1.openshiftapps.com:6443 -L 443:console-openshift-console.apps.foobar.c63c.p1.openshiftapps.com:443
	
18. From another terminal window connect to the API server from your local machine (not the bastion) via the tunnel.

	oc login https://api.foobar.c63c.p1.openshiftapps.com:6443 --username cluster-admin --password XXXXX-XXXXX-XXXXX-XXXXX

19. Similarly, open the OpenShift web console via a browser from your local machine.

	xdg-open https://console-openshift-console.apps.foobar.c63c.p1.openshiftapps.com
	sudo ssh 

20. Modify the security group protecting the bastion instance to only allow traffic from the public IP address associated with your local machine.
 


