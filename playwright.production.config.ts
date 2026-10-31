import { defineConfig, devices } from "@playwright/test";
const baseURL=process.env.FAURIO_URL;
if(!baseURL || new URL(baseURL).protocol!=="https:") throw new Error("Set FAURIO_URL to the HTTPS deployment to verify.");
export default defineConfig({testDir:"./tests/production",timeout:45000,workers:1,reporter:[["list"],["html",{outputFolder:"playwright-report/production",open:"never"}]],
  use:{baseURL,trace:"retain-on-failure",screenshot:"only-on-failure"},projects:[{name:"production-desktop",use:{...devices["Desktop Chrome"],channel:"chrome"}},{name:"production-mobile",use:{...devices["Desktop Chrome"],channel:"chrome",viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]});
