import nextEnv from "@next/env";
import { readDeploymentPolicy } from "../lib/deployment-policy.ts";
import { readPaymentPolicy } from "../lib/commerce/payment-policy.ts";

nextEnv.loadEnvConfig(process.cwd());
const deployment = readDeploymentPolicy(process.env);
const payments = readPaymentPolicy(process.env);
console.log(JSON.stringify({ deployment, payments, readOnly: true, checksRemoteDatabaseIdentity: false, commercialPaymentsReleased: false }, null, 2));
if (!deployment.valid || (payments.mode !== "disabled" && !payments.ready)) process.exitCode = 2;
