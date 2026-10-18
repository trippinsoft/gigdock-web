import assert from "node:assert/strict";
import { test } from "node:test";
import { getStripeKey } from "../src/lib/stripe-preview.server.ts";

function withEnv(values, fn) {
 const names = ["VERCEL_ENV", "STRIPE_SECRET_KEY", "STRIPE_BILLING_ENABLED"];
 const original = Object.fromEntries(names.map(k=>[k,process.env[k]]));
 try {
  for (const name of names) {
   if (values[name] === undefined) delete process.env[name];
   else process.env[name] = values[name];
  }
  fn();
 } finally {
  for (const name of names) {
   if (original[name] === undefined) delete process.env[name];
   else process.env[name] = original[name];
  }
 }
}

test("preview accepts only sandbox Stripe credentials",()=>{
 withEnv({VERCEL_ENV:"preview",STRIPE_SECRET_KEY:"sk_test_dummy"},()=>assert.equal(getStripeKey(),"sk_test_dummy"));
 withEnv({VERCEL_ENV:"preview",STRIPE_SECRET_KEY:"sk_live_dummy"},()=>assert.throws(getStripeKey));
});
test("production rejects live keys until explicitly enabled",()=>{
 withEnv({VERCEL_ENV:"production",STRIPE_SECRET_KEY:"sk_live_dummy"},()=>assert.throws(getStripeKey));
 withEnv({VERCEL_ENV:"production",STRIPE_SECRET_KEY:"sk_live_dummy",STRIPE_BILLING_ENABLED:"false"},()=>assert.throws(getStripeKey));
});
test("enabled production accepts live key and rejects sandbox key",()=>{
 withEnv({VERCEL_ENV:"production",STRIPE_SECRET_KEY:"sk_live_dummy",STRIPE_BILLING_ENABLED:"true"},()=>assert.equal(getStripeKey(),"sk_live_dummy"));
 withEnv({VERCEL_ENV:"production",STRIPE_SECRET_KEY:"sk_test_dummy",STRIPE_BILLING_ENABLED:"true"},()=>assert.throws(getStripeKey));
});
test("local and undeclared environments cannot connect Stripe",()=>{
 for(const env of [undefined,"development",""]) withEnv({VERCEL_ENV:env,STRIPE_SECRET_KEY:"sk_test_dummy"},()=>assert.throws(getStripeKey));
});
