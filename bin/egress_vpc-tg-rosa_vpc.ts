#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { EgressVpcTgRosaVpcStack } from '../lib/egress_vpc-tg-rosa_vpc-stack';

const app = new cdk.App();
new EgressVpcTgRosaVpcStack(app, 'EgressVpcTgRosaVpcStack', {
  env: {
    	account: process.env.CDK_DEFAULT_ACCOUNT,
	region: process.env.CDK_DEFAULT_REGION,
  }
});  
