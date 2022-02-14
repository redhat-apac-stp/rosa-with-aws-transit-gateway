# ROSA with AWS Transit Gateway

This article describes how to implement a ROSA STS cluster with PrivateLink enabled and leverage a centralised Egress VPC (for connecting to the Internet to download images and upload telemetry) and a Bastion VPC (for remote administration). The architecture of the solution is depicted in the following diagram.

<img src="https://github.com/redhat-apac-stp/rosa-with-aws-transit-gateway/blob/main/img/ROSA%20-%20AWS%20Transit%20Gateway.png">

The provisioning of VPCs, subnets and a bastion host will be done via the AWS CDK tool. This is then followed by installation of a managed OpenShift cluster via the ROSA CLI.

1. Clone this repository to your workstation and change to the root directory

```
cd rosa-with-aws-transit-gateway
```

2. Install dependencies

```
npm install
```
	
3. Define environment variables required during deployment of the CDK stack

```
export BASTION_KEY=bastion-rsa-key		(this should match the name of a registered key-pair under Network & Security in EC2 services) 
export CDK_DEFAULT_ACCOUNT=XXXXXXXXXXXX		(this should match the account ID into which ROSA is being installed)
export CDK_DEFAULT_REGION=YYYYYYYYYYYY		(this should match the region into which ROSA is being installed)
```

3. Dryrun and deploy the CDK stack if there are no errors reported

```
npx cdk synth
npx cdk deploy
```

4. Confirm connectivity to the bastion host after modifying the inbound rule for the security group to only allow access from the "My IP" source

```
ssh -i /path/to/bastion-rsa-key.pem ec2-user@ec2-54-169-90-78.ap-southeast-1.compute.amazonaws.com
```

5. Create a ROSA STS cluser with PrivateLink enabled; select ROSA VPC private subnets and configure the machine CIDR to 10.1.0.0/16.

```
rosa create cluster --sts
rosa create operator-roles --cluster foobar --mode auto -y
rosa create oidc-provider --cluster foobar --mode auto -y
```

6. Create the admin user once the cluster is finished provisioning (status shows ready)

```
rosa list cluster
rosa create admin -c foobar
```

7. Modify /etc/hosts and add the following lines, substitute xxxx with the random string assigned to the API and console URL by the installer (refer to rosa describe cluster)

```
127.0.0.1   api.foobar.xxxx.p1.openshiftapps.com
127.0.0.1   console-openshift-console.apps.foobar.xxxx.p1.openshiftapps.com
127.0.0.1   oauth-openshift.apps.foobar.xxxx.p1.openshiftapps.com
```

8. Edit the private hosted zone created by the ROSA installer and associate it with the bastion VPC


9. Setup a tunnel to the bastion host to redirect API and console access

```
sudo ssh -i /path/to/bastion-rsa-key.pem ec2-user@ec2-54-251-74-193.ap-southeast-1.compute.amazonaws.com -L 6443:api.foobar.w616.p1.openshiftapps.com:6443 -L 443:console-openshift-console.apps.foobar.w616.p1.openshiftapps.com:443
```

10. From another terminal window connect to the API server from your local machine (not the bastion) via the tunnel.

	oc login https://api.foobar.c63c.p1.openshiftapps.com:6443 --username cluster-admin --password XXXXX-XXXXX-XXXXX-XXXXX

11. Similarly, open the OpenShift web console via a browser from your local machine.

	xdg-open https://console-openshift-console.apps.foobar.c63c.p1.openshiftapps.com


12. Teardown the cluster and purge all resources

```
rosa delete cluster -c foobar -y
rosa delete operator-roles -c XXXXXXXXXXXXXXXXXXXXXXXXXXX 
rosa delete oidc-provider -c XXXXXXXXXXXXXXXXXXXXXXXXXXX
npx cdk destroy
```
