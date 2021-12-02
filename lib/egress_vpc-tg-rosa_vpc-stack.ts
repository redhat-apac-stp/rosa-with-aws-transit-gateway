import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import { SubnetType, CfnRoute} from '@aws-cdk/aws-ec2';
import { ManagedPolicy, Role, ServicePrincipal, CfnInstanceProfile, PolicyDocument, PolicyStatement, Effect } from '@aws-cdk/aws-iam';

export class EgressVpcTgRosaVpcStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props ? : cdk.StackProps) {
    super(scope, id, props);
    const egressVPC = new ec2.Vpc(this, 'EgressVpc', {
      cidr: "10.0.0.0/16",
      maxAzs: 2,
      subnetConfiguration: [{
          cidrMask: 28,
          name: 'EgressVpcPublic',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 28,
          name: 'EgressVpcPrivate',
          subnetType: SubnetType.PRIVATE,
        },
      ]
    });

    const rosaVPC = new ec2.Vpc(this, 'RosaVpc', {
      cidr: "10.1.0.0/16",
      maxAzs: 3,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [{
        cidrMask: 24,
        name: 'RosaVpcIsolated',
        subnetType: SubnetType.ISOLATED,
	},
      ],
    });

    const bastionVPC = new ec2.Vpc(this, 'BastionVpc', {
      cidr: "10.2.0.0/16",
      maxAzs: 1,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [{
        cidrMask: 28,
        name: 'BastionVpcPublic',
        subnetType: SubnetType.PUBLIC,
	},
      ],
    });

    const TransitGateway = new ec2.CfnTransitGateway(this, 'TransitGateway', {
      description: "TransitGateway",
      vpnEcmpSupport: 'enable',
      defaultRouteTableAssociation: 'disable',
      defaultRouteTablePropagation: 'disable',
      tags: [{
        key: 'Name',
        value: "TransitGateway"
      }],
    });

    const TransitGatewayAttachmentEgress = new ec2.CfnTransitGatewayAttachment(this, 'TransitGatewayAttachmentEgress', {
      transitGatewayId: TransitGateway.ref,
      vpcId: egressVPC.vpcId,
      subnetIds: [egressVPC.privateSubnets[0].subnetId, egressVPC.privateSubnets[1].subnetId],
      tags: [{
        key: 'Name',
        value: "EgressVpcPrivateSubnetAttachment"
      }],
    });
    TransitGatewayAttachmentEgress.addDependsOn(TransitGateway);

    const TransitGatewayAttachmentRosa = new ec2.CfnTransitGatewayAttachment(this, 'TransitGatewayAttachmentRosa', {
      transitGatewayId: TransitGateway.ref,
      vpcId: rosaVPC.vpcId,
      subnetIds: [rosaVPC.isolatedSubnets[0].subnetId, rosaVPC.isolatedSubnets[1].subnetId, rosaVPC.isolatedSubnets[2].subnetId],
      tags: [{
        key: 'Name',
        value: "RosaVpcIsolatedSubnetAttachment"
      }],
    });
    TransitGatewayAttachmentEgress.addDependsOn(TransitGateway);

    const TransitGatewayAttachmentBastion = new ec2.CfnTransitGatewayAttachment(this, 'TransitGatewayAttachmentBastion', {
      transitGatewayId: TransitGateway.ref,
      vpcId: bastionVPC.vpcId,
      subnetIds: [bastionVPC.publicSubnets[0].subnetId],
      tags: [{
        key: 'Name',
        value: "BastionVpcPublicSubnetAttachment"
      }],
    });
    TransitGatewayAttachmentEgress.addDependsOn(TransitGateway);

    for (let subnet of egressVPC.publicSubnets) {
      new CfnRoute(this, subnet.node.uniqueId, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: rosaVPC.vpcCidrBlock,
        transitGatewayId: TransitGateway.ref,
      }).addDependsOn(TransitGatewayAttachmentEgress);
      new CfnRoute(this, subnet.node.uniqueId+1, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: bastionVPC.vpcCidrBlock,
        transitGatewayId: TransitGateway.ref,
      }).addDependsOn(TransitGatewayAttachmentEgress);
    };

    for (let subnet of rosaVPC.isolatedSubnets) {
      new CfnRoute(this, subnet.node.uniqueId, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: "0.0.0.0/0",
        transitGatewayId: TransitGateway.ref,
      }).addDependsOn(TransitGatewayAttachmentRosa);
      new CfnRoute(this, subnet.node.uniqueId+1, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: bastionVPC.vpcCidrBlock,
        transitGatewayId: TransitGateway.ref,
      }).addDependsOn(TransitGatewayAttachmentRosa);
    };

    for (let subnet of bastionVPC.publicSubnets) {
      new CfnRoute(this, subnet.node.uniqueId+1, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: rosaVPC.vpcCidrBlock,
        transitGatewayId: TransitGateway.ref,
      }).addDependsOn(TransitGatewayAttachmentBastion);
    };

    const TgRouteTable = new ec2.CfnTransitGatewayRouteTable(this, "TgEgressRouteTable", {
      transitGatewayId: TransitGateway.ref,
      tags: [{
        key: 'Name',
        value: "TgRouteDomain"
      }],
    }); 
    const TransitGatewayRouteTable = new ec2.CfnTransitGatewayRoute(this, "TransitGatewayToEgressVpcRoute", {
      transitGatewayRouteTableId: TgRouteTable.ref,
      transitGatewayAttachmentId: TransitGatewayAttachmentEgress.ref,
      destinationCidrBlock: "0.0.0.0/0"
    });
    const TgRouteTableAssociationEgressVPC = new ec2.CfnTransitGatewayRouteTableAssociation(this, 'EgressVpcTgAssociation', {
      transitGatewayAttachmentId: TransitGatewayAttachmentEgress.ref,
      transitGatewayRouteTableId: TransitGatewayRouteTable.transitGatewayRouteTableId,
    });
    const TgRouteTablePropagationEgressVPC = new ec2.CfnTransitGatewayRouteTablePropagation(this, 'EgressVpcTgPropagation', {
      transitGatewayAttachmentId: TransitGatewayAttachmentEgress.ref,
      transitGatewayRouteTableId: TransitGatewayRouteTable.transitGatewayRouteTableId,
    });
    const TgRouteTableAssociationRosaVpc = new ec2.CfnTransitGatewayRouteTableAssociation(this, 'RosaVpcTgAssociation', {
      transitGatewayAttachmentId: TransitGatewayAttachmentRosa.ref,
      transitGatewayRouteTableId: TransitGatewayRouteTable.transitGatewayRouteTableId,
    });
    const TgRouteTablePropagationRosaVpc = new ec2.CfnTransitGatewayRouteTablePropagation(this, 'RosaVpcTgPropagation', {
      transitGatewayAttachmentId: TransitGatewayAttachmentRosa.ref,
      transitGatewayRouteTableId: TransitGatewayRouteTable.transitGatewayRouteTableId,
    });
    const TgRouteTableAssociationBastionVpc = new ec2.CfnTransitGatewayRouteTableAssociation(this, 'BastionVpcTgAssociation', {
      transitGatewayAttachmentId: TransitGatewayAttachmentBastion.ref,
      transitGatewayRouteTableId: TransitGatewayRouteTable.transitGatewayRouteTableId,
    });
    const TgRouteTablePropagationBastionVpc = new ec2.CfnTransitGatewayRouteTablePropagation(this, 'BastionVpcTgPropagation', {
      transitGatewayAttachmentId: TransitGatewayAttachmentBastion.ref,
      transitGatewayRouteTableId: TransitGatewayRouteTable.transitGatewayRouteTableId,
    });

    const bastionSecurityGroup = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
      vpc: bastionVPC,
      securityGroupName: 'BastionSecurityGroup',
      description: 'Security group for bastion host',
      allowAllOutbound: true,
    });
    bastionSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH access');

    const bastionHostLinux = new ec2.BastionHostLinux(this, 'BastionHostLinux', {
      vpc: bastionVPC,
      securityGroup: bastionSecurityGroup,
      subnetSelection: { 
        subnetType: ec2.SubnetType.PUBLIC 
      },
    });
    bastionHostLinux.instance.instance.addPropertyOverride('KeyName', process.env.BASTION_KEY);
  }
}
