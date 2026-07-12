export type GenerateOparlDerivativesEnv = {
  councilOrganizationId: string;
};

export function tryGetGenerateOparlDerivativesEnv(): GenerateOparlDerivativesEnv {
  const councilOrganizationId = Deno.env.get('OPARL_COUNCIL_ORGANIZATION_ID');
  if (!councilOrganizationId) {
    console.error('Environment variable OPARL_COUNCIL_ORGANIZATION_ID must be set.');
    Deno.exit(1);
  }

  return { councilOrganizationId };
}
