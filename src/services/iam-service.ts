import {
  ListRolesCommand,
  GetRoleCommand,
  CreateRoleCommand,
  DeleteRoleCommand,
  ListAttachedRolePoliciesCommand,
  AttachRolePolicyCommand,
  DetachRolePolicyCommand,
  ListPoliciesCommand,
  CreatePolicyCommand,
  DeletePolicyCommand,
  GetPolicyVersionCommand,
  type Role,
  type Policy,
  type AttachedPolicy,
  type PolicyVersion,
} from "@aws-sdk/client-iam";
import { type AwsConfig, createIAMClient } from "../config/aws-config";

export type { Role, Policy, AttachedPolicy, PolicyVersion };

export async function listRoles(config: AwsConfig): Promise<Role[]> {
  const client = createIAMClient(config);
  const response = await client.send(new ListRolesCommand({}));
  return response.Roles ?? [];
}

export async function getRole(
  config: AwsConfig,
  roleName: string
): Promise<Role> {
  const client = createIAMClient(config);
  const response = await client.send(new GetRoleCommand({ RoleName: roleName }));
  if (!response.Role) {
    throw new Error(`Role "${roleName}" not found`);
  }
  return response.Role;
}

export async function listRolePolicies(
  config: AwsConfig,
  roleName: string
): Promise<AttachedPolicy[]> {
  const client = createIAMClient(config);
  const response = await client.send(
    new ListAttachedRolePoliciesCommand({ RoleName: roleName })
  );
  return response.AttachedPolicies ?? [];
}

export async function listPolicies(config: AwsConfig): Promise<Policy[]> {
  const client = createIAMClient(config);
  const response = await client.send(new ListPoliciesCommand({ Scope: "Local" }));
  return response.Policies ?? [];
}

export async function createRole(
  config: AwsConfig,
  roleName: string,
  assumeRolePolicyDocument: string,
  description?: string
): Promise<Role> {
  const client = createIAMClient(config);
  const response = await client.send(
    new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: assumeRolePolicyDocument,
      Description: description,
    })
  );
  return response.Role!;
}

export async function deleteRole(
  config: AwsConfig,
  roleName: string
): Promise<void> {
  const client = createIAMClient(config);
  const policies = await listRolePolicies(config, roleName);
  for (const policy of policies) {
    if (policy.PolicyArn) {
      await client.send(
        new DetachRolePolicyCommand({
          RoleName: roleName,
          PolicyArn: policy.PolicyArn,
        })
      );
    }
  }
  await client.send(new DeleteRoleCommand({ RoleName: roleName }));
}

export async function createPolicy(
  config: AwsConfig,
  policyName: string,
  policyDocument: string,
  description?: string
): Promise<Policy> {
  const client = createIAMClient(config);
  const response = await client.send(
    new CreatePolicyCommand({
      PolicyName: policyName,
      PolicyDocument: policyDocument,
      Description: description,
    })
  );
  return response.Policy!;
}

export async function deletePolicy(
  config: AwsConfig,
  policyArn: string
): Promise<void> {
  const client = createIAMClient(config);
  await client.send(new DeletePolicyCommand({ PolicyArn: policyArn }));
}

export async function attachRolePolicy(
  config: AwsConfig,
  roleName: string,
  policyArn: string
): Promise<void> {
  const client = createIAMClient(config);
  await client.send(
    new AttachRolePolicyCommand({ RoleName: roleName, PolicyArn: policyArn })
  );
}

export async function detachRolePolicy(
  config: AwsConfig,
  roleName: string,
  policyArn: string
): Promise<void> {
  const client = createIAMClient(config);
  await client.send(
    new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policyArn })
  );
}

export async function getPolicyVersion(
  config: AwsConfig,
  policyArn: string,
  versionId: string
): Promise<PolicyVersion> {
  const client = createIAMClient(config);
  const response = await client.send(
    new GetPolicyVersionCommand({ PolicyArn: policyArn, VersionId: versionId })
  );
  if (!response.PolicyVersion) {
    throw new Error(`Policy version "${versionId}" not found for "${policyArn}"`);
  }
  return response.PolicyVersion;
}
